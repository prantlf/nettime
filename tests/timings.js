const test = require('tap')
const {
  events, getDuration, getMilliseconds, computeAverageDurations, createTimingsFromDurations
} = require('../lib/timings')

const eventCopy = {
  socketOpen: 'Socket Open',
  dnsLookup: 'DNS Lookup',
  tcpConnection: 'TCP Connection',
  tlsHandshake: 'TLS Handshake',
  firstByte: 'First Byte',
  contentTransfer: 'Content Transfer',
  socketClose: 'Socket Close'
}

test.test('test timing event names', test => {
  test.deepEqual(Object.keys(events), Object.keys(eventCopy))
  test.deepEqual(Object.values(events), Object.values(eventCopy))
  test.end()
})

test.test('test getting duration', test => {
  test.deepEqual(getDuration([0, 100], [0, 200]), [0, 100])
  test.deepEqual(getDuration([0, 100], [1, 200]), [1, 100])
  test.deepEqual(getDuration([0, 200], [1, 100]), [0, 999999900])
  test.end()
})

test.test('test getting milliseconds', test => {
  test.deepEqual(getMilliseconds([0, 1e6]), 1)
  test.deepEqual(getMilliseconds([1, 1000]), 1000.001)
  test.end()
})

test.test('test computing average durations', test => {
  const input = [
    {
      socketOpen: [0, 100],
      tcpConnection: [0, 300]
    },
    {
      socketOpen: [0, 100],
      tcpConnection: [1, 100]
    }
  ]
  const expected = {
    socketOpen: [0, 100],
    dnsLookup: undefined,
    tcpConnection: [0.5, 100],
    tlsHandshake: undefined,
    firstByte: undefined,
    contentTransfer: undefined,
    socketClose: undefined
  }
  const actual = computeAverageDurations(input)
  test.deepEqual(actual, expected)
  test.end()
})

test.test('test checking unexpected defined event timings', test => {
  const input = [
    {
      socketOpen: [0, 100],
      tcpConnection: [0, 300]
    },
    {
      socketOpen: [0, 100],
      dnsLookup: [0, 500],
      tcpConnection: [1, 100]
    }
  ]
  try {
    computeAverageDurations(input)
    test.fail()
  } catch (error) {
  }
  test.end()
})

test.test('test checking unexpected undefined event timings', test => {
  const input = [
    {
      socketOpen: [0, 100],
      dnsLookup: [0, 500],
      tcpConnection: [0, 300]
    },
    {
      socketOpen: [0, 100],
      tcpConnection: [1, 100]
    }
  ]
  try {
    computeAverageDurations(input)
    test.fail()
  } catch (error) {
  }
  test.end()
})

test.test('test creating timings from durations', test => {
  const input = {
    socketOpen: [0, 100],
    dnsLookup: undefined,
    tcpConnection: [0.5, 100],
    tlsHandshake: undefined,
    firstByte: undefined,
    contentTransfer: undefined,
    socketClose: undefined
  }
  const expected = {
    socketOpen: [0, 100],
    tcpConnection: [0.5, 200]
  }
  const actual = createTimingsFromDurations(input)
  test.deepEqual(actual, expected)
  test.end()
})
