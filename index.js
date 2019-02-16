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
	const tasks = [
		{buffer: true, duration: c.from.bufferBefore}
	]
	let prevStop = c.from.stop
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

	// todo: post processing
	return threads.map(thread => ({legs: thread.journey}))
}

module.exports = fetchJourneysForCommute
