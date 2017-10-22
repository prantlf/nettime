'use strict'

const http = require('http')
const https = require('https')
const url = require('url')

function nettime (options) {
  if (typeof options === 'string') {
    let url = options
    options = {
      url: url
    }
  }
  const connection = url.parse(options.url)
  const protocol = connection.protocol === 'http:' ? http : https
  const timings = {}
  var start, response
  const rejectUnauthorized = options.rejectUnauthorized
  if (rejectUnauthorized !== undefined) {
    connection.rejectUnauthorized = rejectUnauthorized
  }
  connection.agent = false
  return new Promise((resolve, reject) => {
    start = getTime(process.hrtime())
    protocol.get(connection, localResponse => {
      response = localResponse
      response.once('readable', () => {
        timings.firstByte = getDuration()
      })
      .on('data', () => {
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
          timings: timings
        })
      })
    })
    .on('error', reject)
  })

  function getDuration () {
    const duration = getTime(process.hrtime()) - start
    return [parseInt(duration / 1e9), duration % 1e9]
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
  return timing[0] * 1000 + parseInt(timing[1] / 1000) / 1000
}

nettime.getDuration = getDuration
nettime.getMilliseconds = getMilliseconds
module.exports = nettime
