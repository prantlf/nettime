'use strict'

const request = require('request')

function nettime (options) {
  if (typeof options === 'string') {
    let url = options
    options = {
      url: url
    }
  }
  return new Promise((resolve, reject) => {
    const req = request({
      url: options.url,
      time: true
    }, (error, response) => {
      if (error) {
        reject(error)
      } else {
        let timings = req.timings
        resolve({
          statusCode: response.statusCode,
          timings: {
            socketOpen: getTiming(timings.socket),
            dnsLookup: getTiming(timings.lookup),
            tcpConnection: getTiming(timings.connect),
            responseBegin: getTiming(timings.response),
            responseEnd: getTiming(timings.end)
          }
        })
      }
    })
  })
}

function getTiming (duration) {
  const seconds = parseInt(duration / 1000)
  return [seconds, parseInt(duration * 1e6 - seconds * 1e9)]
}

function getDuration (start, end) {
  let seconds = end[0] - start[0]
  let nanoseconds = end[1] - start[1]
  if (nanoseconds < 0) {
    --seconds
    nanoseconds += 1e9
  }
  return [seconds, nanoseconds]
}

function getMilliseconds (timing) {
  return timing[0] * 1000 + parseInt(timing[1] / 1000) / 1000
}

nettime.getDuration = getDuration
nettime.getMilliseconds = getMilliseconds
module.exports = nettime
