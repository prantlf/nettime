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
  var lastTiming = [0, 0]
  console.log('Phase             Finished Duration')
  console.log('-----------------------------------')
  for (const part in labels) {
    const timing = timings[part]
    if (timing) {
      const duration = getDuration(lastTiming, timing)
      console.log(sprintf('%-17s %3d.%03ds %3d.%03ds',
        labels[part], timing[0], Math.round(timing[1] / 1e6),
        duration[0], Math.round(duration[1] / 1e6)))
      lastTiming = timing
    }
  }
  console.log('-----------------------------------')
}

function printNanoseconds (timings) {
  var lastTiming = [0, 0]
  console.log('Phase             Finished       Duration')
  console.log('-----------------------------------------------')
  for (const part in labels) {
    const timing = timings[part]
    if (timing) {
      const duration = getDuration(lastTiming, timing)
      console.log(sprintf('%-17s %3ds %7.3fms %3ds %7.3fms',
        labels[part], timing[0], Math.round(timing[1] / 1000) / 1000,
        duration[0], Math.round(duration[1] / 1000) / 1000))
      lastTiming = timing
    }
  }
  console.log('-----------------------------------------------')
}

function printTimings (timings, timeUnit) {
  const print = timeUnit === 's+ns' ? printNanoseconds : printMilliseconds
  print(timings)
}

module.exports = printTimings
