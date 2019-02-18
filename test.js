'use strict'

const test = require('tape')
// const createHafas = require('bvg-hafas')
const fetchJourneys = require('.')

const minute = 60 * 1000
const toIsoStr = t => new Date(t).toISOString()
const fromIsoStr = iso => +new Date(iso)

// const seestr = '900000009103'
// const friedrichstr = '900000100001'
// const potsdamerPlatz = '900000100020'

// const hafas = createHafas('fetch-commute-from-hafas test')

test('simple', (t) => {
	const commute = {
		from: {stop: 'A', bufferBefore: 2 * minute},
		transfers: [
			{stop: 'B', buffer: 3 * minute}
		],
		to: {stop: 'C', bufferAfter: 4 * minute},
		products: {bus: false}
	}
	const when = 1000 * minute
	const depAtA = when + 5 * minute
	const arrAtB = depAtA + 10 * minute
	const depAtB = arrAtB + 6 * minute
	const arrAtC = depAtB + 11 * minute
	const w1 = {
		walking: true,
		departure: toIsoStr(depAtA - 2 * minute),
		arrival: toIsoStr(depAtA)
	}
	const w2 = {
		walking: true,
		departure: toIsoStr(arrAtB),
		arrival: toIsoStr(arrAtB + 3 * minute)
	}
	const w3 = {
		walking: true,
		departure: toIsoStr(arrAtC),
		arrival: toIsoStr(arrAtC + 4 * minute)
	}
	const j1l1 = {
		id: 'j1-l1',
		cancelled: false,
		departure: toIsoStr(depAtA),
		arrival: toIsoStr(arrAtB)
	}
	const j2l1 = {
		id: 'j2-l1',
		cancelled: false,
		departure: toIsoStr(depAtB),
		arrival: toIsoStr(arrAtC)
	}

	let call = 0
	const mockJourneys = async (from, to, opt) => {
		call++
		t.ok(opt)
		t.deepEqual(opt.products, {bus: false})

		if (call === 1) {
			t.equal(from, 'A')
			t.equal(to, 'B')
			t.equal(fromIsoStr(opt.departure), when)
			return [
				{legs: [j1l1]}
			] // todo: 2nd journey
		}
		if (call === 2) {
			t.equal(from, 'B')
			t.equal(to, 'C')
			t.equal(fromIsoStr(opt.departure), arrAtB + 3 * minute)
			return [
				{legs: [j2l1]}
			] // todo: leg with `cancelled: true`
		}
		t.fail('journeys() called too often')
		return []
	}

	const hafasMock = {journeys: mockJourneys}
	fetchJourneys(hafasMock, commute, when)
	.then((results) => {
		t.deepEqual(results, [{
			err: null,
			journey: {legs: [w1, j1l1, w2, j2l1, w3]}
		}])
		t.end()
	})
	.catch(t.ifError)
})

test('0 journeys', (t) => {
	const commute = {
		from: {stop: 'A', bufferBefore: 0},
		to: {stop: 'C', bufferAfter: 0}
	}
	const when = 1000 * minute

	const mockJourneys = (from, to, opt) => Promise.resolve([])
	const hafasMock = {journeys: mockJourneys}
	fetchJourneys(hafasMock, commute, when)
	.then(([result]) => {
		t.ok(result.err)
		t.equal(result.err.message, 'no journeys found')
		t.equal(result.err.from, 'A')
		t.equal(result.err.to, 'C')
		t.ok(result.err.opts)
		t.end()
	})
	.catch(t.ifError)
})

// todo: more complex example
