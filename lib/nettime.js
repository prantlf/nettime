'use strict'

const http = require('http')
const https = require('https')
const url = require('url')

function nettime (options) {
  const parameters = getParameters()
  const protocol = parameters.protocol === 'http:' ? http : https
  const timings = {}
  var start, response
  return new Promise((resolve, reject) => {
    start = getTime(process.hrtime())
    protocol.get(parameters, localResponse => {
      let firstByte

      response = localResponse
      response.on('data', () => {
        if (!firstByte) {
          timings.firstByte = getDuration()
          firstByte = true
        }
      })
      .on('end', () => {
        timings.contentTransfer = getDuration()
      })
    })
    .on('socket', socket => {
      timings.socketOpen = getDuration()
      socket.on('lookup', () => {
        timings.dnsLookup = getDuration()
      })
      .on('connect', () => {
        timings.tcpConnection = getDuration()
      })
      .on('secureConnect', () => {
        timings.tlsHandshake = getDuration()
      })
      .on('close', () => {
        timings.socketClose = getDuration()
        resolve({
          statusCode: response ? response.statusCode : 0,
          statusMessage: response ? response.statusMessage : '',
          timings: timings
        })
      })
    })
    .on('error', reject)
  })

  function getParameters () {
    if (typeof options === 'string') {
      let url = options
      options = {
        url: url
      }
    }
    const parameters = url.parse(options.url)
    const rejectUnauthorized = options.rejectUnauthorized
    if (rejectUnauthorized !== undefined) {
      parameters.rejectUnauthorized = rejectUnauthorized
    }
    parameters.agent = false
    return parameters
  }

  function getDuration () {
    const duration = getTime(process.hrtime()) - start
    return [Math.round(duration / 1e9), duration % 1e9]
  }

  function getTime (timing) {
    return timing[0] * 1e9 + timing[1]
  }
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
  return timing[0] * 1000 + Math.round(timing[1] / 1000) / 1000
}

nettime.getDuration = getDuration
nettime.getMilliseconds = getMilliseconds
module.exports = nettime
