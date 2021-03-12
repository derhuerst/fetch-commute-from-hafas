'use strict'

const createHafas = require('bvg-hafas')
const fetchJourneysForCommute = require('.')

const second = 1000
const minute = 60 * second
const seestr = '900000009103'
const friedrichstr = '900000100001'
const potsdamerPlatz = '900000100020'

const commute = {
	title: 'via Friedrichstr.',
	from: {stop: seestr, bufferBefore: 6 * minute},
	transfers: [
		{stop: friedrichstr, buffer: 30 * second}
	],
	to: {stop: potsdamerPlatz, bufferAfter: 2 * minute},
	products: {bus: false}
}

const hafas = createHafas('fetch-commute-from-hafas example')
const when = new Date('2021-03-18T10:00:00+01:00')

fetchJourneysForCommute(hafas, commute, when)
.then((journeys) => {
	console.log(require('util').inspect(journeys, {depth: null, colors: true}))
})
.catch((err) => {
	console.error(err)
	process.exit(1)
})
