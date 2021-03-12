'use strict'

const flatten = require('lodash/flatten')
const debug = require('debug')('fetch-commute-from-hafas')

const RESULTS_PER_STEP = 3 // todo: make customisable

const initalThreads = (c, initialWhen) => {
	const transfers = c.transfers || []

	const steps = [
		...transfers,
		{stop: c.to.stop, buffer: c.to.bufferAfter}
	]
	let prevStop = c.from.stop
	const tasks = []
	for (const {stop, buffer} of steps) {
		tasks.push({from: prevStop, to: stop})
		prevStop = stop
		tasks.push({buffer: true, duration: buffer})
	}

	return [
		{err: null, when: initialWhen, tasks, journey: []}
	]
}

// todo: customisable timezone
const formatWhen = t => new Date(t).toISOString()

const iterator = (hafas, hafasOpts) => async (thread) => {
	debug('thread', thread)
	if (thread.err || thread.tasks.length === 0) return thread
	const [task] = thread.tasks

	if (task.buffer) {
		const newLeg = {
			walking: true,
			departure: formatWhen(thread.when),
			arrival: formatWhen(thread.when + task.duration)
		}
		if (thread.journey.length > 0 && thread.tasks.length > 1) newLeg.transfer = true
		return [{
			...thread,
			when: thread.when + task.duration,
			tasks: thread.tasks.slice(1),
			journey: [...thread.journey, newLeg]
		}]
	}

	const opts = {
		remarks: false, startWithWalking: false,
		...hafasOpts,
		departure: thread.when,
		results: RESULTS_PER_STEP
	}
	const {journeys} = await hafas.journeys(task.from, task.to, opts)
	if (journeys.length === 0) {
		const err = new Error('no journeys found')
		err.from = task.from
		err.to = task.to
		err.opts = opts
		return [{...thread, err}]
	}

	// one new thread for each valid & uncancelled journey
	return journeys
	.map(j => j.legs.find(l => !l.walking && !l.cancelled))
	.filter(newLeg => !!newLeg)
	.map((newLeg) => ({
		when: +new Date(newLeg.arrival),
		tasks: thread.tasks.slice(1),
		journey: [...thread.journey, newLeg]
	}))
}

const fetchJourneysForCommute = async (hafas, commute, initialWhen) => {
	initialWhen = +new Date(initialWhen)
	const iterate = iterator(hafas, { // todo: make customisable
		products: commute.products || {}
	})

	let threads = initalThreads(commute, initialWhen)
	while (true) {
		debug('iteration')
		const workLeft = threads.some(thread => !thread.err && thread.tasks.length > 0)
		debug('work left?', workLeft)
		if (!workLeft) break
		threads = flatten(await Promise.all(threads.map(iterate)))
	}

	return threads.map(({err, journey}) => {
		if (err) return {err, journey: null}

		const depOfFirst = +new Date(journey[0].departure)
		const firstWalkingLeg = {
			walking: true,
			departure: new Date(depOfFirst - commute.from.bufferBefore).toISOString(),
			arrival: new Date(depOfFirst).toISOString()
		}
		return {
			err: null,
			journey: {legs: [firstWalkingLeg, ...journey]}
		}
	})
}

module.exports = fetchJourneysForCommute
