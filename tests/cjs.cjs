const test = require('tehanu')(__filename)
const { strictEqual } = require('assert')
const nettime = require('nettime')
const {
  events, getDuration, getMilliseconds, computeAverageDurations, createTimingsFromDurations
} = require('../lib/timings.cjs')
const { printTimings } = require('../lib/printer.cjs')

test('test carried exported methods', () => {
  strictEqual(nettime.nettime, nettime)
  strictEqual(typeof nettime.getDuration, 'function')
  strictEqual(typeof nettime.getMilliseconds, 'function')
  strictEqual(typeof nettime.isRedirect, 'function')
  strictEqual(typeof events, 'object')
  strictEqual(typeof getDuration, 'function')
  strictEqual(typeof getMilliseconds, 'function')
  strictEqual(typeof computeAverageDurations, 'function')
  strictEqual(typeof createTimingsFromDurations, 'function')
  strictEqual(typeof printTimings, 'function')
})
