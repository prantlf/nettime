'use strict'

const getDuration = require('./nettime').getDuration
const sprintf = require('sprintf-js').sprintf
const labels = {
  socketOpen: 'Socket Open',
  dnsLookup: 'DNS Lookup',
  tcpConnection: 'TCP Connection',
  responseBegin: 'Response Start',
  responseEnd: 'Response Finish',
  socketClose: 'Socket Close'
}

module.exports = function (timings, unit) {
  const print = unit === 's+ns' ? printNanoseconds : printMilliseconds
  print(timings)
}

function printMilliseconds (timings) {
  var lastTiming = [0, 0]
  console.log('Phase           Finished Duration')
  console.log('---------------------------------')
  for (let part in labels) {
    let timing = timings[part]
    if (timing) {
      let duration = getDuration(lastTiming, timing)
      console.log(sprintf('%-15s %3d.%03ds %3d.%03ds',
        labels[part], timing[0], parseInt(timing[1] / 1e6),
        duration[0], parseInt(duration[1] / 1e6)))
      lastTiming = timing
    }
  }
}

function printNanoseconds (timings) {
  var lastTiming = [0, 0]
  console.log('Phase           Finished       Duration')
  console.log('---------------------------------------------')
  for (let part in labels) {
    let timing = timings[part]
    if (timing) {
      let duration = getDuration(lastTiming, timing)
      console.log(sprintf('%-15s %3ds %7.3fms %3ds %7.3fms',
        labels[part], timing[0], parseInt(timing[1] / 1000) / 1000,
        duration[0], parseInt(duration[1] / 1000) / 1000))
      lastTiming = timing
    }
  }
}
