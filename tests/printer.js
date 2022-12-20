import tehanu from 'tehanu'
import { ok } from 'assert'
import { printTimings } from '../lib/printer.js'

const test = tehanu(import.meta.url)

const example = {
  timings: {
    socketOpen: [0, 15936126],
    dnsLookup: [0, 16554700],
    tcpConnection: [0, 29498118],
    tlsHandshake: [0, 75912898],
    firstByte: [0, 166826235],
    contentTransfer: [0, 208424267],
    socketClose: [0, 209561300]
  },
  httpVersion: '1.1',
  statusCode: 200,
  statusMessage: 'OK'
}
const { timings } = example

test('test printing seconds', () => {
  const output = printTimings(timings, 's')
  ok(/\ds/.test(output), 'seconds')
  ok(!/\dms/.test(output), 'not milliseconds')
})

test('test printing seconds and nanoseconds', () => {
  const output = printTimings(timings, 's+ns')
  ok(/\ds/.test(output), 'seconds')
  ok(/\dms/.test(output), 'milliseconds')
})

test('test printing seconds with incomplete timing', () => {
  const timings2 = timings
  delete timings2.tlsHandshake
  printTimings(timings2, 's')
})

test('test printing nanoseconds with incomplete timing', () => {
  const timings2 = timings
  delete timings2.tlsHandshake
  printTimings(timings2, 's+ns')
})
