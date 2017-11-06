'use strict'

const Buffer = require('safe-buffer').Buffer
const http = require('http')
const https = require('https')
const url = require('url')

function nettime (options) {
  const parameters = getParameters()
  const protocol = parameters.protocol === 'http:' ? http : https
  const timings = {}
  var start, response
  return new Promise((resolve, reject) => {
    start = process.hrtime()
    protocol.get(parameters, localResponse => {
      let firstByte

      function checkFirstByte () {
        if (!firstByte) {
          timings.firstByte = getTiming()
          firstByte = true
        }
      }

      response = localResponse
      response.on('readable', checkFirstByte)
      .on('data', checkFirstByte)
      .on('end', () => {
        timings.contentTransfer = getTiming()
      })
    })
    .on('socket', socket => {
      timings.socketOpen = getTiming()
      socket.on('lookup', () => {
        timings.dnsLookup = getTiming()
      })
      .on('connect', () => {
        timings.tcpConnection = getTiming()
      })
      .on('secureConnect', () => {
        timings.tlsHandshake = getTiming()
      })
      .on('close', () => {
        timings.socketClose = getTiming()
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
    const headers = parameters.headers = options.headers || {}
    const credentials = options.credentials
    if (credentials) {
      headers['authorization'] = 'Basic ' + Buffer.from(
        credentials.username + ':' + credentials.password).toString('base64')
    }
    parameters.agent = false
    return parameters
  }

  function getTiming () {
    return getDuration(start, process.hrtime())
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
