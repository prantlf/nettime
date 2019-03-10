'use strict'

const fs = require('fs')
const http = require('http')
let http2
try {
  http2 = require('http2')
} catch (error) {
  console.warn('Skipping HTTP 2 tests:', error.message)
}
const https = require('https')
const nettime = require('..')
const path = require('path')
const test = require('tap')

const ipAddress = '127.0.0.1'
const unsecurePort = 8899
const securePort = 9988
const http2Port = 9898
const servers = []
let lastRequest

function createServer (protocol, port, options) {
  if (protocol) {
    return new Promise((resolve, reject) => {
      const server = options
        ? (protocol.createSecureServer || protocol.createServer)(options, serve)
        : protocol.createServer(serve)
      server.on('error', reject)
        .listen(port, ipAddress, () => {
          servers.push(server)
          resolve()
        })
    })
  }
}

function readCertificate (name) {
  return fs.readFileSync(path.join(__dirname, name + '.pem'))
}

function serve (request, response) {
  setTimeout(() => {
    const url = request.url
    const download = url === '/download'
    const upload = url === '/upload'
    var data

    function sendResponse () {
      const ok = download || upload
      lastRequest = {
        data: data,
        headers: request.headers,
        httpVersion: request.httpVersion,
        method: request.method
      }
      response.writeHead(ok ? 200 : url === '/' ? 204 : 404, {
        test: 'ok'
      })
      if (ok) {
        response.write('data')
      }
      response.end()
    }

    if (upload) {
      data = ''
      request.on('data', chunk => {
        data += chunk
      })
        .on('end', sendResponse)
    } else {
      sendResponse()
    }
  }, 2)
}

function startServers () {
  const secureOptions = {
    key: readCertificate('key'),
    cert: readCertificate('cert')
  }
  return createServer(http, unsecurePort)
    .then(createServer.bind(null, https, securePort, secureOptions))
    .then(createServer.bind(null, http2, http2Port, secureOptions))
}

function stopServers () {
  var server
  while ((server = servers.pop())) {
    server.close()
  }
}

function makeRequest (protocol, host, port, path, options) {
  const https = protocol === 'https'
  const url = protocol + '://' + host + ':' + port + (path || '')
  let credentials, headers, method, outputFile, failOnOutputFileError
  let returnResponse, includeHeaders, data, httpVersion, timeout
  if (options) {
    if (options.username) {
      credentials = options
    } else if (options.method) {
      method = options.method
    } else if (options.outputFile) {
      outputFile = options.outputFile
      includeHeaders = options.includeHeaders
      failOnOutputFileError = options.failOnOutputFileError
    } else if (options.returnResponse) {
      returnResponse = true
      includeHeaders = options.includeHeaders
    } else if (options.includeHeaders) {
      includeHeaders = options.includeHeaders
    } else if (options.data) {
      data = options.data
    } else if (options.httpVersion) {
      httpVersion = options.httpVersion
    } else if (options.timeout) {
      timeout = options.timeout
    } else {
      headers = options
    }
  }
  return nettime(https || options ? {
    url: url,
    credentials: credentials,
    data: data,
    failOnOutputFileError: failOnOutputFileError,
    headers: headers,
    httpVersion: httpVersion,
    includeHeaders: includeHeaders,
    method: method,
    outputFile: outputFile,
    rejectUnauthorized: false,
    returnResponse: returnResponse,
    timeout: timeout
  } : url)
    .then(checkRequest.bind(null, {
      httpVersion: httpVersion,
      returnResponse: returnResponse,
      includeHeaders: includeHeaders
    }))
}

function checkRequest (options, result) {
  const httpVersion = options.httpVersion || '1.1'
  const timings = result.timings
  const tcpConnection = timings.tcpConnection
  const firstByte = timings.firstByte
  let resultCount = 4
  test.equal(typeof result, 'object')
  if (options.returnResponse) {
    ++resultCount
  }
  if (options.includeHeaders) {
    ++resultCount
  }
  test.equal(Object.keys(result).length, resultCount)
  if (httpVersion === '1.0') {
    result.httpVersion = '1.0'
  }
  test.equal(result.httpVersion, httpVersion)
  test.equal(lastRequest.httpVersion, httpVersion)
  test.equal(typeof timings, 'object')
  checkTiming(timings.socketOpen)
  checkTiming(tcpConnection)
  checkTiming(firstByte)
  checkTiming(timings.contentTransfer)
  checkTiming(timings.socketClose)
  test.ok(getDuration(tcpConnection, firstByte) >= 1 * 1e6)
  return result
}

function getDuration (start, end) {
  let seconds = end[0] - start[0]
  let nanoseconds = end[1] - start[1]
  if (nanoseconds < 0) {
    --seconds
    nanoseconds += 1e9
  }
  return seconds * 1e9 + nanoseconds
}

function checkTiming (timing) {
  test.ok(Array.isArray(timing))
  test.equal(timing.length, 2)
  test.equal(typeof timing[0], 'number')
  test.equal(typeof timing[1], 'number')
}

function checkNull (timing) {
  test.same(timing, null)
}

test.equal(typeof nettime, 'function')

test.test('start testing servers', test => {
  startServers()
    .then(test.end)
    .catch(test.threw)
})

test.test('test with a hostname', test => {
  return makeRequest('http', 'localhost', unsecurePort)
    .then(result => {
      const timings = result.timings
      test.equal(result.statusCode, 204)
      test.equal(result.statusMessage, 'No Content')
      test.equal(Object.keys(timings).length, 6)
      checkTiming(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with an IP address', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download')
    .then(result => {
      const timings = result.timings
      test.equal(result.statusCode, 200)
      test.equal(result.statusMessage, 'OK')
      test.equal(Object.keys(timings).length, 5)
      checkNull(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with the HTTPS protocol', test => {
  return makeRequest('https', ipAddress, securePort)
    .then(result => {
      const timings = result.timings
      test.equal(result.statusCode, 204)
      test.equal(Object.keys(timings).length, 6)
      checkNull(timings.dnsLookup)
      checkTiming(timings.tlsHandshake)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with a missing web page', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/missing')
    .then(result => {
      const timings = result.timings
      test.equal(result.statusCode, 404)
      test.equal(result.statusMessage, 'Not Found')
      test.equal(Object.keys(timings).length, 5)
      checkNull(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test timed out connection to an unreachable host', test => {
  return makeRequest('http', '192.0.2.1', 80, '/', {
    timeout: 10
  })
    .then(test.fail)
    .catch(error => {
      test.ok(error instanceof Error)
      test.equal(error.code, 'ETIMEDOUT')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with an invalid URL', test => {
  return makeRequest('dummy', ipAddress, 1)
    .then(test.fail)
    .catch(error => {
      test.ok(error instanceof Error)
      test.ok(error.message.indexOf('dummy:') > 0)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with custom headers', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    TestHeader: 'Test value'
  })
    .then(() => {
      const headers = lastRequest.headers
      test.ok(headers)
      test.equal(Object.keys(headers).length, 3)
      test.equal(headers.connection, 'close')
      test.equal(headers.host, '127.0.0.1:8899')
      test.equal(headers.testheader, 'Test value')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with credentials', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    username: 'guest',
    password: 'secret'
  })
    .then(result => {
      const headers = lastRequest.headers
      test.ok(headers)
      test.equal(Object.keys(headers).length, 3)
      test.equal(headers.connection, 'close')
      test.equal(headers.host, '127.0.0.1:8899')
      test.equal(headers.authorization, 'Basic Z3Vlc3Q6c2VjcmV0')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with the HEAD verb', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    method: 'HEAD'
  })
    .then(result => {
      test.equal(lastRequest.method, 'HEAD')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test returning of received data', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    returnResponse: true
  })
    .then(result => {
      const response = result.response
      test.ok(!result.headers)
      test.ok(response)
      test.equal(response.length, 4)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test returning of received data with headers', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    returnResponse: true,
    includeHeaders: true
  })
    .then(result => {
      const response = result.response
      const headers = result.headers
      test.ok(headers)
      test.equal(headers.test, 'ok')
      test.ok(response)
      test.equal(response.length, 4)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test returning of received headers alone', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    includeHeaders: true
  })
    .then(result => {
      const headers = result.headers
      test.ok(headers)
      test.equal(headers.test, 'ok')
      test.ok(!result.response)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test writing an output file', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    outputFile: 'test.out'
  })
    .then(result => {
      const stat = fs.statSync('test.out')
      test.ok(stat)
      test.equal(stat.size, 4)
      fs.unlinkSync('test.out')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test writing an output file with headers', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    outputFile: 'test.out',
    includeHeaders: true
  })
    .then(result => {
      const stat = fs.statSync('test.out')
      test.ok(stat)
      test.ok(stat.size > 4)
      fs.unlinkSync('test.out')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test failure when writing to an output file', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    outputFile: '/'
  })
    .then(test.fail)
    .catch(error => {
      test.ok(error instanceof Error)
      test.equal(error.code, 'EISDIR')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test an ignored failure when writing to an output file', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    outputFile: '/',
    failOnOutputFileError: false
  })
    .then(() => {
      test.equal(process.exitCode, 2)
      process.exitCode = 0
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test posting data', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/upload', {
    data: 'test=ok'
  })
    .then(result => {
      test.equal(lastRequest.method, 'POST')
      test.equal(lastRequest.data, 'test=ok')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test HTTP 1.0', test => {
  return makeRequest('http', ipAddress, unsecurePort, '/download', {
    httpVersion: '1.0'
  })
    .catch(test.threw)
    .then(test.end)
})

if (http2) {
  test.test('test HTTP 2.0 with the http scheme', test => {
    return makeRequest('http', ipAddress, http2Port, '/download', {
      httpVersion: '2.0'
    })
      .then(test.fail)
      .catch(error => {
        test.ok(error instanceof Error)
        test.equal(error.code, 'ERR_INSECURE_SCHEME')
      })
      .catch(test.threw)
      .then(test.end)
  })

  test.test('test HTTP 2.0 with the https scheme', test => {
    return makeRequest('https', ipAddress, http2Port, '/download', {
      httpVersion: '2.0'
    })
      .catch(test.threw)
      .then(test.end)
  })
}

test.test('stop testing servers', test => {
  stopServers()
  test.end()
})

test.test('test getting duration', test => {
  test.deepEqual(nettime.getDuration([0, 100], [0, 200]), [0, 100])
  test.deepEqual(nettime.getDuration([0, 100], [1, 200]), [1, 100])
  test.deepEqual(nettime.getDuration([0, 200], [1, 100]), [0, 999999900])
  test.end()
})

test.test('test getting milliseconds', test => {
  test.deepEqual(nettime.getMilliseconds([0, 1e6]), 1)
  test.deepEqual(nettime.getMilliseconds([1, 1000]), 1000.001)
  test.end()
})
