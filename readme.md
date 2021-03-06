# fetch-commute-from-hafas

**For a set commuting instructions, fetch journeys from [HAFAS](https://npmjs.com/package/hafas-client).**

[![npm version](https://img.shields.io/npm/v/fetch-commute-from-hafas.svg)](https://www.npmjs.com/package/fetch-commute-from-hafas)
[![build status](https://api.travis-ci.org/derhuerst/fetch-commute-from-hafas.svg?branch=master)](https://travis-ci.org/derhuerst/fetch-commute-from-hafas)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/fetch-commute-from-hafas.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Installation

```shell
npm install fetch-commute-from-hafas
```


## Usage

```js
const createHafas = require('bvg-hafas')
const fetchJourneysForCommute = require('fetch-commute-from-hafas')

const commute = {
	title: 'Seestr. to Potsdamer Platz via Friedrichstr.',
	from: {
		stop: '900000009103', // U Seestr.
		bufferBefore: 6 * 60 * 1000 // 6 minutes
	},
	transfers: [{
		stop: '900000100001', // S+U Friedrichstr.
		buffer: 30 * 1000 // 30 seconds
	}],
	to: {
		stop: '900000100020', // S+U Potsdamer Platz
		bufferAfter: 2 * 60 * 1000 // 2 minutes
	},
	products: {bus: false}
}
const when = new Date('2019-02-18T10:00:00+01:00')

const hafas = createHafas('render-berlin-commute example')
fetchJourneysForCommute(hafas, commute, when)
.then((results) => {
	for (const res of results) {
		if (!res.err) console.log(res.journey)
	}
})
.catch(console.error)
```


## Related

- [`manual-hafas-routing`](https://github.com/derhuerst/manual-hafas-routing) – An experiment for manual routing via HAFAS.
- [`hafas-find-alternative-legs`](https://github.com/derhuerst/hafas-find-alternative-legs) – Given a [`hafas-client`](https://npmjs.com/package/hafas-client) journey, get alternatives for each leg from HAFAS.
- [`hafas-collect-departures-at`](https://github.com/derhuerst/hafas-collect-departures-at) – Utility to collect departures, using any HAFAS client.


## Contributing

If you have a question or need support using `fetch-commute-from-hafas`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, refer to [the issues page](https://github.com/derhuerst/fetch-commute-from-hafas/issues).
