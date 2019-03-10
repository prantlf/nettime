'use strict'

const Buffer = require('safe-buffer').Buffer
const fs = require('fs')
const http = require('http')
const https = require('https')
const os = require('os')
const url = require('url')

function nettime (options) {
  return new Promise((resolve, reject) => {
    const timings = {}
    const outputFile = options.outputFile
    const returnResponse = options.returnResponse
    const includeHeaders = options.includeHeaders
    let data = (outputFile || returnResponse) && Buffer.from([])
    let start
    let response

    function returnResult () {
      const result = {
        timings: timings
      }
      if (response) {
        result.httpVersion = response.httpVersion
        result.statusCode = response.statusCode
        result.statusMessage = response.statusMessage
        if (includeHeaders) {
          result.headers = response.headers
        }
      }
      if (returnResponse && data) {
        result.response = data
      }
      resolve(result)
    }

    function writeOutputFile () {
      if (includeHeaders && response) {
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
      return new Promise(resolve =>
        fs.writeFile(outputFile, data, error => {
          if (error) {
            if (options.failOnOutputFileError === false) {
              console.error(error.message)
              process.exitCode = 2
            } else {
              return reject(error)
            }
          }
          resolve()
        }))
    }

    function listenToSocket (socket) {
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
        .on('close', checkSocketClosed)
    }

    function listenToResponse (response) {
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
    }

    let firstByte
    function checkFirstByte () {
      if (!firstByte) {
        timings.firstByte = getTiming()
        firstByte = true
      }
    }

    let socketClosed
    function checkSocketClosed () {
      if (!socketClosed) {
        timings.socketClose = getTiming()
        if (outputFile && data) {
          writeOutputFile().then(returnResult)
        } else {
          returnResult()
        }
      }
    }

    const parameters = getParameters()
    const httpVersion = options.httpVersion
    const scheme = parameters.protocol
    let protocol
    if (httpVersion === '2.0') {
      if (scheme !== 'https:') {
        let error = new Error('HTTP/2 supports only the "https:" protocol.')
        error.code = 'ERR_INSECURE_SCHEME'
        throw error
      }
      protocol = require('http2')
    } else {
      protocol = scheme === 'http:' ? http : https
    }

    start = process.hrtime()

    let request
    if (httpVersion === '2.0') {
      let origin = scheme + '//' + parameters.hostname
      const port = parameters.port
      if (port) {
        origin += ':' + port
      }
      const client = protocol.connect(origin, {
        rejectUnauthorized: parameters.rejectUnauthorized
      })
        .on('socketError', reject)
        .on('error', reject)
      listenToSocket(client.socket)

      const headers = parameters.headers
      headers[':method'] = parameters.method
      headers[':path'] = parameters.pathname
      request = client.request(headers)
        .on('response', headers => {
          const statusCode = headers[':status']
          response = {
            headers: headers,
            httpVersion: '2.0',
            statusCode: statusCode,
            statusMessage: http.STATUS_CODES[statusCode]
          }
        })
      listenToResponse(request)
      request.on('end', () =>
        (client.close || client.destroy).call(client, checkSocketClosed))
        .setEncoding('utf8')
    } else {
      request = protocol.request(parameters, (localResponse) => {
        listenToResponse(response = localResponse)
        response.setEncoding('utf8')
      })
        .on('socket', listenToSocket)
        .on('error', reject)
      if (httpVersion === '1.0') {
        const storeHeader = request._storeHeader
        request._storeHeader = (firstLine, headers) => {
          firstLine = firstLine.replace(/HTTP\/1.1\r\n$/, 'HTTP/1.0\r\n')
          return storeHeader.call(request, firstLine, headers)
        }
      }
    }

    const timeout = options.timeout
    if (timeout) {
      request
        .on('timeout', () => {
          request.abort()
          const error = new Error('Connection timed out.')
          error.code = 'ETIMEDOUT'
          reject(error)
        })
        .setTimeout(timeout)
    }

    const inputData = options.data
    if (inputData) {
      request.write(inputData)
    }
    request.end()

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
      const data = options.data
      if (data) {
        if (!headers['content-type']) {
          headers['content-type'] = 'application/x-www-form-urlencoded'
        }
        headers['content-length'] = Buffer.byteLength(data)
      }
      parameters.method = options.method || (data ? 'POST' : 'GET')
      parameters.agent = false
      return parameters
    }

    function getTiming () {
      return getDuration(start, process.hrtime())
    }
  })
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
