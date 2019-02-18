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

	// todo: use seamless-immutable
	return [
		{when: initialWhen, tasks, journey: []}
	]
}

// todo: customisable timezone
const formatWhen = t => new Date(t).toISOString()

const iterator = (hafas, hafasOpts) => async (thread) => {
	debug('thread', thread)
	if (thread.tasks.length === 0) return thread
	const [task] = thread.tasks

	if (task.buffer) {
		const newLeg = {
			walking: true,
			departure: formatWhen(thread.when),
			arrival: formatWhen(thread.when + task.duration)
		}
		return [{
			when: thread.when + task.duration,
			tasks: thread.tasks.slice(1),
			journey: [...thread.journey, newLeg]
		}]
	}

	const journeys = await hafas.journeys(task.from, task.to, {
		remarks: false, startWithWalking: false,
		...hafasOpts,
		departure: new Date(thread.when),
		results: RESULTS_PER_STEP
	})

	// one new thread for each valid & uncancelled journey
	return journeys
	.map(j => j.legs.find(l => !l.walking))
	.filter(newLeg => newLeg && !newLeg.cancelled)
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
		const workLeft = threads.some(thread => thread.tasks.length > 0)
		debug('work left?', workLeft)
		if (!workLeft) break
		threads = flatten(await Promise.all(threads.map(iterate)))
	}

	return threads.map(({journey}) => {
		const depOfFirst = +new Date(journey[0].departure)
		const firstWalkingLeg = {
			walking: true,
			departure: new Date(depOfFirst - commute.from.bufferBefore).toISOString(),
			arrival: new Date(depOfFirst).toISOString()
		}
		return {legs: [firstWalkingLeg, ...journey]}
	})
}

module.exports = fetchJourneysForCommute
