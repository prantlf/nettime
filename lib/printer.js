const { getDuration } = require('./timings')
const { sprintf } = require('sprintf-js')

const labels = {
  socketOpen: 'Socket Open',
  dnsLookup: 'DNS Lookup',
  tcpConnection: 'TCP Connection',
  tlsHandshake: 'TLS Handshake',
  firstByte: 'First Byte',
  contentTransfer: 'Content Transfer',
  socketClose: 'Socket Close'
}

function printMilliseconds (timings) {
  let lastTiming = [0, 0]
  const output = [
    'Phase             Finished Duration',
    '-----------------------------------'
  ]
  for (const part in labels) {
    const timing = timings[part]
    if (timing) {
      const timeFraction = Math.round(timing[1] / 1e6)
      const duration = getDuration(lastTiming, timing)
      const durationFraction = Math.round(duration[1] / 1e6)
      output.push(sprintf('%-17s %3d.%03ds %3d.%03ds',
        labels[part], timing[0], timeFraction, duration[0], durationFraction))
      lastTiming = timing
    }
  }
  output.push('-----------------------------------')
  return output
}

function printNanoseconds (timings) {
  let lastTiming = [0, 0]
  const output = [
    'Phase             Finished       Duration',
    '-----------------------------------------------'
  ]
  for (const part in labels) {
    const timing = timings[part]
    if (timing) {
      const timeFraction = Math.round(timing[1] / 1000) / 1000
      const duration = getDuration(lastTiming, timing)
      const durationFraction = Math.round(duration[1] / 1000) / 1000
      output.push(sprintf('%-17s %3ds %7.3fms %3ds %7.3fms',
        labels[part], timing[0], timeFraction, duration[0], durationFraction))
      lastTiming = timing
    }
  }
  output.push('-----------------------------------------------')
  return output
}

function printTimings (timings, timeUnit) {
  const print = timeUnit === 's+ns' ? printNanoseconds : printMilliseconds
  return print(timings).join('\n')
}

module.exports = printTimings
