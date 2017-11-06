'use strict'

const Buffer = require('safe-buffer').Buffer
const fs = require('fs')
const http = require('http')
const https = require('https')
const os = require('os')
const url = require('url')

function nettime (options) {
  const parameters = getParameters()
  const protocol = parameters.protocol === 'http:' ? http : https
  const timings = {}
  var start, response
  return new Promise((resolve, reject) => {
    const outputFile = options.outputFile
    const returnResponse = options.returnResponse
    var data = (outputFile || returnResponse) && new Buffer([])
    function writeOutputFile () {
      if (options.includeHeaders && response) {
        let prolog = ['HTTP/' + response.httpVersion + ' ' +
              response.statusCode + ' ' + response.statusMessage]
        let headers = response.headers
        if (headers) {
          Array.prototype.push.apply(prolog, Object.keys(headers)
            .map(key => key + ': ' + headers[key]))
        }
        prolog.push(os.EOL)
        data = Buffer.concat([Buffer.from(prolog.join(os.EOL)), data])
      }
      return new Promise(resolve => {
        fs.writeFile(outputFile, data, function (error) {
          if (error) {
            console.error(error.message)
            process.exitCode = 2
          }
          resolve()
        })
      })
    }

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
      .on('data', chunk => {
        checkFirstByte()
        if (data) {
          data = Buffer.concat([data, Buffer.from(chunk)])
        }
      })
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
        function returnResult () {
          const result = {
            timings: timings
          }
          if (response) {
            result.httpVersion = response.httpVersion
            result.statusCode = response.statusCode
            result.statusMessage = response.statusMessage
          }
          if (returnResponse) {
            if (options.includeHeaders && response) {
              result.headers = response.headers
            }
            if (data) {
              result.response = data
            }
          }
          resolve(result)
        }

        if (outputFile && data) {
          writeOutputFile().then(returnResult)
        } else {
          returnResult()
        }
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
    parameters.method = options.method
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
