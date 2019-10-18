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

test.test('test printing seconds', test => {
  printTimings(example.timings, 's')
  test.end()
})

test.test('test printing seconds and nanoseconds', test => {
  printTimings(example.timings, 's+ns')
  test.end()
})
