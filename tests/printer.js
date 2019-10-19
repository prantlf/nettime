const test = require('tap')
const printTimings = require('../lib/printer')

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

test.test('test printing seconds', test => {
  const output = printTimings(timings, 's')
  test.ok(/\ds/.test(output))
  test.ok(!/\dms/.test(output))
  test.end()
})

test.test('test printing seconds and nanoseconds', test => {
  const output = printTimings(timings, 's+ns')
  test.ok(/\ds/.test(output))
  test.ok(/\dms/.test(output))
  test.end()
})

test.test('test printing seconds with incomplete timing', test => {
  const timings2 = timings
  delete timings2.tlsHandshake
  printTimings(timings2, 's')
  test.end()
})

test.test('test printing nanoseconds with incomplete timing', test => {
  const timings2 = timings
  delete timings2.tlsHandshake
  printTimings(timings2, 's+ns')
  test.end()
})
