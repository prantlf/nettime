const { readFileSync, statSync, unlinkSync } = require('fs')
const http = require('http')
let http2
try {
  http2 = require('http2')
} catch (error) {
  console.warn('Skipping HTTP 2 tests:', error.message)
}
const https = require('https')
const { join } = require('path')
const test = require('tap')
const exported = require('..')
const { nettime, isRedirect } = exported
const { getDuration, getMilliseconds } = require('../lib/timings')

const ipAddress = '127.0.0.1'
const insecurePort = 8899
const securePort = 9988
const http2Port = 9898
const servers = []
let lastRequest

function createServer (protocol, port, options) {
  if (protocol) {
    return new Promise((resolve, reject) => {
      const creator = protocol.createSecureServer || protocol.createServer
      const server = options ? creator(options, serve) : protocol.createServer(serve)
      server
        .on('error', reject)
        .listen(port, ipAddress, () => {
          servers.push(server)
          resolve()
        })
    })
  }
}

function readCertificate (name) {
  return readFileSync(join(__dirname, `${name}.pem`))
}

function serve (request, response) {
  setTimeout(respond, 2)

  function respond () {
    const url = request.url
    const download = url === '/download'
    const upload = url === '/upload'
    const redirect = url === '/redirect'
    let data

    function sendResponse () {
      const ok = download || upload || redirect
      const headers = request.headers
      const httpVersion = request.httpVersion
      const method = request.method
      const responseHeaders = { test: 'ok' }
      if (redirect) {
        responseHeaders.location = `http://${request.headers.host}/download`
      }
      lastRequest = { data, headers, httpVersion, method }
      response.writeHead(ok
        ? redirect ? 302 : 200
        : url === '/' ? 204 : 404, responseHeaders)
      if (ok) {
        response.write('data')
      }
      response.end()
    }

    if (upload) {
      data = ''
      request
        .on('data', chunk => (data += chunk))
        .on('end', sendResponse)
    } else {
      sendResponse()
    }
  }
}

function startServers () {
  const secureOptions = {
    key: readCertificate('key'),
    cert: readCertificate('cert')
  }
  return createServer(http, insecurePort)
    .then(createServer.bind(null, https, securePort, secureOptions))
    .then(createServer.bind(null, http2, http2Port, secureOptions))
}

function stopServers () {
  let server
  while ((server = servers.pop())) {
    server.close()
  }
}

function makeRequest (protocol, host, port, path, options) {
  const https = protocol === 'https'
  const url = `${protocol}://${host}:${port}${path || ''}`
  let credentials, headers, method, outputFile, failOnOutputFileError,
    followRedirects, returnResponse, includeHeaders, data, httpVersion,
    timeout, requestDelay, requestCount
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
      if (options.contentType) {
        headers = { 'content-type': options.contentType }
      }
    } else if (options.httpVersion) {
      httpVersion = options.httpVersion
    } else if (options.timeout) {
      timeout = options.timeout
    } else {
      headers = options
    }
    followRedirects = options.followRedirects
    requestDelay = options.requestDelay
    requestCount = options.requestCount
  }
  const rejectUnauthorized = false
  return nettime(https || options
    ? {
        url,
        credentials,
        data,
        failOnOutputFileError,
        followRedirects,
        headers,
        httpVersion,
        includeHeaders,
        method,
        outputFile,
        rejectUnauthorized,
        returnResponse,
        timeout,
        requestDelay,
        requestCount
      }
    : url)
    .then(checkRequest.bind(null, {
      url,
      httpVersion,
      returnResponse,
      includeHeaders,
      followRedirects,
      requestCount
    }))
}

function checkRequest (options, result) {
  let resultCount = 4
  if (options.returnResponse) {
    ++resultCount
  }
  if (options.includeHeaders) {
    ++resultCount
  }
  if (options.followRedirects) {
    ++resultCount
    test.ok(Array.isArray(result))
    test.ok(result.length > 0)
    if (result[0].statusCode === 302) {
      test.equal(result.length, 2)
      checkSingleRequest(result[0])
      checkSingleRequest(result[1])
    } else {
      test.equal(result.length, 1)
      checkSingleRequest(result[0])
    }
  } else if (options.requestCount) {
    test.ok(Array.isArray(result))
    test.equal(result.length, options.requestCount)
    for (const singleResult of result) {
      checkSingleRequest(singleResult)
    }
  } else {
    test.equal(typeof result, 'object')
    checkSingleRequest(result)
  }
  return result

  function checkSingleRequest (result) {
    if (options.followRedirects) {
      test.ok(typeof result.url === 'string')
    }
    test.equal(Object.keys(result).length, resultCount)
    const httpVersion = options.httpVersion || '1.1'
    if (httpVersion === '1.0') {
      result.httpVersion = '1.0'
    }
    test.equal(result.httpVersion, httpVersion)
    test.equal(lastRequest.httpVersion, httpVersion)
    const { timings } = result
    test.equal(typeof timings, 'object')
    checkTiming(timings.socketOpen)
    const { tcpConnection, firstByte } = timings
    checkTiming(tcpConnection)
    checkTiming(firstByte)
    checkTiming(timings.contentTransfer)
    checkTiming(timings.socketClose)
    test.ok(getTestDuration(tcpConnection, firstByte) >= 1e6)
  }
}

function getTestDuration (start, end) {
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

test.test('test a full URL', test => {
  return makeRequest('http', 'user:pass@localhost', insecurePort, '?search#hash')
    .then(result => {
      test.equal(result.statusCode, 404)
      test.equal(result.statusMessage, 'Not Found')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test a full URL without password', test => {
  return makeRequest('http', 'user@localhost', insecurePort, '?search#hash')
    .then(result => {
      test.equal(result.statusCode, 404)
      test.equal(result.statusMessage, 'Not Found')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test two requests', test => {
  return makeRequest('http', ipAddress, insecurePort, '/', {
    outputFile: 'test.out',
    requestCount: 2
  })
    .then(results => {
      test.ok(Array.isArray(results))
      for (const result of results) {
        checkRequest({}, result)
        test.equal(result.statusCode, 204)
        test.equal(result.statusMessage, 'No Content')
      }
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test two requests with delay', test => {
  const start = new Date().getTime()
  return makeRequest('http', ipAddress, insecurePort, '/', {
    requestCount: 2,
    requestDelay: 10
  })
    .then(() => {
      const end = new Date().getTime()
      test.ok(start + 10 < end)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test with a hostname', test => {
  return makeRequest('http', 'localhost', insecurePort)
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
  return makeRequest('http', ipAddress, insecurePort, '/download')
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
  return makeRequest('http', ipAddress, insecurePort, '/missing')
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

test.test('test failed connection to a not responding host', test => {
  const start = new Date().getTime()
  return makeRequest('http', '192.0.2.1', 80, '/', {
    timeout: 10
  })
    .then(test.fail)
    .catch(error => {
      const end = new Date().getTime()
      test.ok(start + 9 < end)
      test.ok(error instanceof Error)
      test.equal(error.code, 'ETIMEDOUT')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test response timeout', test => {
  return makeRequest('http', ipAddress, insecurePort, '', {
    timeout: 1
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
    username: 'guest',
    password: 'secret'
  })
    .then(() => {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
    method: 'HEAD'
  })
    .then(() => {
      test.equal(lastRequest.method, 'HEAD')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test returning of received data', test => {
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
    outputFile: 'test.out'
  })
    .then(result => {
      const stat = statSync('test.out')
      test.ok(stat)
      test.equal(stat.size, 4)
      unlinkSync('test.out')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test writing an output file with headers', test => {
  return makeRequest('http', ipAddress, insecurePort, '/download', {
    outputFile: 'test.out',
    includeHeaders: true
  })
    .then(() => {
      const stat = statSync('test.out')
      test.ok(stat)
      test.ok(stat.size > 4)
      unlinkSync('test.out')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test failure when writing to an output file', test => {
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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
  return makeRequest('http', ipAddress, insecurePort, '/upload', {
    data: 'test=ok'
  })
    .then(() => {
      test.equal(lastRequest.method, 'POST')
      test.equal(lastRequest.data, 'test=ok')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test posting data with content type', test => {
  return makeRequest('http', ipAddress, insecurePort, '/upload', {
    data: 'test=ok',
    contentType: 'application/x-www-form-urlencoded'
  })
    .then(() => {
      test.equal(lastRequest.method, 'POST')
      test.equal(lastRequest.data, 'test=ok')
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test not followed redirect', test => {
  return makeRequest('http', ipAddress, insecurePort, '/redirect')
    .then(result => {
      test.equal(result.statusCode, 302)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test followed redirect', test => {
  return makeRequest('http', ipAddress, insecurePort, '/redirect', {
    followRedirects: true
  })
    .then(result => {
      test.ok(Array.isArray(result))
      test.equal(result.length, 2)
      test.equal(result[0].statusCode, 302)
      test.equal(result[1].statusCode, 200)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test no redirection with following redirect enabled', test => {
  return makeRequest('http', ipAddress, insecurePort, '/download', {
    followRedirects: true
  })
    .then(result => {
      test.ok(Array.isArray(result))
      test.equal(result.length, 1)
      test.equal(result[0].statusCode, 200)
    })
    .catch(test.threw)
    .then(test.end)
})

test.test('test HTTP 1.0', test => {
  return makeRequest('http', ipAddress, insecurePort, '/download', {
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

test.test('test carried exported methods', test => {
  test.equal(exported, nettime)
  test.equal(nettime.getDuration, getDuration)
  test.equal(nettime.getMilliseconds, getMilliseconds)
  test.equal(nettime.isRedirect, isRedirect)
  test.end()
})
