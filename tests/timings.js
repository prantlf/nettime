import tehanu from 'tehanu'
import { deepStrictEqual, fail } from 'assert'
import {
  events, getDuration, getMilliseconds, computeAverageDurations, createTimingsFromDurations
} from '../lib/timings.js'

const test = tehanu(import.meta.url)

const eventCopy = {
  socketOpen: 'Socket Open',
  dnsLookup: 'DNS Lookup',
  tcpConnection: 'TCP Connection',
  tlsHandshake: 'TLS Handshake',
  firstByte: 'First Byte',
  contentTransfer: 'Content Transfer',
  socketClose: 'Socket Close'
}

test('test timing event names', () => {
  deepStrictEqual(Object.keys(events), Object.keys(eventCopy))
  deepStrictEqual(Object.values(events), Object.values(eventCopy))
})

test('test getting duration', () => {
  deepStrictEqual(getDuration([0, 100], [0, 200]), [0, 100])
  deepStrictEqual(getDuration([0, 100], [1, 200]), [1, 100])
  deepStrictEqual(getDuration([0, 200], [1, 100]), [0, 999999900])
})

test('test getting milliseconds', () => {
  deepStrictEqual(getMilliseconds([0, 1e6]), 1)
  deepStrictEqual(getMilliseconds([1, 1000]), 1000.001)
})

test('test computing average durations', () => {
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
  deepStrictEqual(actual, expected)
})

test('test checking unexpected defined event timings', () => {
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
    fail('unexpected event timings')
  } catch {
    /* ignored */
  }
})

test('test checking unexpected undefined event timings', () => {
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
    fail('unexpected undefined event timings')
  } catch {
    /* ignored */
  }
})

test('test creating timings from durations', () => {
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
  deepStrictEqual(actual, expected)
})
