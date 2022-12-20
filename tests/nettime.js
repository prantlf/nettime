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
const test = require('tehanu')(__filename)
const { equal, fail, ok, strictEqual } = require('assert')
const exported = require('nettime')
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
        .listen(port, '::', () => {
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
    ok(Array.isArray(result))
    ok(result.length > 0)
    if (result[0].statusCode === 302) {
      strictEqual(result.length, 2)
      checkSingleRequest(result[0])
      checkSingleRequest(result[1])
    } else {
      strictEqual(result.length, 1)
      checkSingleRequest(result[0])
    }
  } else if (options.requestCount) {
    ok(Array.isArray(result))
    strictEqual(result.length, options.requestCount)
    for (const singleResult of result) {
      checkSingleRequest(singleResult)
    }
  } else {
    strictEqual(typeof result, 'object')
    checkSingleRequest(result)
  }
  return result

  function checkSingleRequest (result) {
    if (options.followRedirects) {
      ok(typeof result.url === 'string')
    }
    strictEqual(Object.keys(result).length, resultCount)
    const httpVersion = options.httpVersion || '1.1'
    if (httpVersion === '1.0') {
      result.httpVersion = '1.0'
    }
    strictEqual(result.httpVersion, httpVersion)
    strictEqual(lastRequest.httpVersion, httpVersion)
    const { timings } = result
    strictEqual(typeof timings, 'object')
    checkTiming(timings.socketOpen)
    const { tcpConnection, firstByte } = timings
    checkTiming(tcpConnection)
    checkTiming(firstByte)
    checkTiming(timings.contentTransfer)
    checkTiming(timings.socketClose)
    ok(getTestDuration(tcpConnection, firstByte) >= 1e6)
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
  ok(Array.isArray(timing))
  strictEqual(timing.length, 2)
  strictEqual(typeof timing[0], 'number')
  strictEqual(typeof timing[1], 'number')
}

function checkNull (timing) {
  equal(timing, null)
}

strictEqual(typeof nettime, 'function')

test('start testing servers', async () => {
  await startServers()
})

test('test a full URL', async () => {
  const result = await makeRequest('http', 'user:pass@localhost', insecurePort, '?search#hash')
  strictEqual(result.statusCode, 404)
  strictEqual(result.statusMessage, 'Not Found')
})

test('test a full URL without password', async () => {
  const result = await makeRequest('http', 'user@localhost', insecurePort, '?search#hash')
  strictEqual(result.statusCode, 404)
  strictEqual(result.statusMessage, 'Not Found')
})

test('test two requests', async () => {
  const results = await makeRequest('http', ipAddress, insecurePort, '/', {
    outputFile: 'test.out',
    requestCount: 2
  })
  ok(Array.isArray(results))
  for (const result of results) {
    checkRequest({}, result)
    strictEqual(result.statusCode, 204)
    strictEqual(result.statusMessage, 'No Content')
  }
})

test('test two requests with delay', async () => {
  const start = new Date().getTime()
  await makeRequest('http', ipAddress, insecurePort, '/', {
    requestCount: 2,
    requestDelay: 10
  })
  const end = new Date().getTime()
  ok(start + 10 < end)
})

test('test with a hostname', async () => {
  const result = await makeRequest('http', 'localhost', insecurePort)
  const timings = result.timings
  strictEqual(result.statusCode, 204)
  strictEqual(result.statusMessage, 'No Content')
  strictEqual(Object.keys(timings).length, 6)
  checkTiming(timings.dnsLookup)
  checkNull(timings.tlsHandshake)
})

test('test with an IP address', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/download')
  const timings = result.timings
  strictEqual(result.statusCode, 200)
  strictEqual(result.statusMessage, 'OK')
  strictEqual(Object.keys(timings).length, 5)
  checkNull(timings.dnsLookup)
  checkNull(timings.tlsHandshake)
})

test('test with the HTTPS protocol', async () => {
  const result = await makeRequest('https', ipAddress, securePort)
  const timings = result.timings
  strictEqual(result.statusCode, 204)
  strictEqual(Object.keys(timings).length, 6)
  checkNull(timings.dnsLookup)
  checkTiming(timings.tlsHandshake)
})

test('test with a missing web page', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/missing')
  const timings = result.timings
  strictEqual(result.statusCode, 404)
  strictEqual(result.statusMessage, 'Not Found')
  strictEqual(Object.keys(timings).length, 5)
  checkNull(timings.dnsLookup)
  checkNull(timings.tlsHandshake)
})

test('test failed connection to a not responding host', async () => {
  const start = new Date().getTime()
  try {
    await makeRequest('http', '192.0.2.1', 80, '/', {
      timeout: 10
    })
    fail('not responding host')
  } catch (error) {
    const end = new Date().getTime()
    ok(start + 9 < end)
    ok(error instanceof Error)
    strictEqual(error.code, 'ETIMEDOUT')
  }
})

test('test response timeout', async () => {
  try {
    await makeRequest('http', ipAddress, insecurePort, '', {
      timeout: 1
    })
    fail('response timeout')
  } catch (error) {
    ok(error instanceof Error)
    strictEqual(error.code, 'ETIMEDOUT')
  }
})

test('test with an invalid URL', async () => {
  try {
    await makeRequest('dummy', ipAddress, 1)
    fail('invalid URL')
  } catch (error) {
    ok(error instanceof Error)
    ok(error.message.indexOf('dummy:') > 0)
  }
})

test('test with custom headers', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    TestHeader: 'Test value'
  })
  const headers = lastRequest.headers
  ok(headers)
  strictEqual(Object.keys(headers).length, 3)
  strictEqual(headers.connection, 'close')
  strictEqual(headers.host, '127.0.0.1:8899')
  strictEqual(headers.testheader, 'Test value')
})

test('test with credentials', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    username: 'guest',
    password: 'secret'
  })
  const headers = lastRequest.headers
  ok(headers)
  strictEqual(Object.keys(headers).length, 3)
  strictEqual(headers.connection, 'close')
  strictEqual(headers.host, '127.0.0.1:8899')
  strictEqual(headers.authorization, 'Basic Z3Vlc3Q6c2VjcmV0')
})

test('test with the HEAD verb', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    method: 'HEAD'
  })
  strictEqual(lastRequest.method, 'HEAD')
})

test('test returning of received data', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/download', {
    returnResponse: true
  })
  const response = result.response
  ok(!result.headers)
  ok(response)
  strictEqual(response.length, 4)
})

test('test returning of received data with headers', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/download', {
    returnResponse: true,
    includeHeaders: true
  })
  const response = result.response
  const headers = result.headers
  ok(headers)
  strictEqual(headers.test, 'ok')
  ok(response)
  strictEqual(response.length, 4)
})

test('test returning of received headers alone', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/download', {
    includeHeaders: true
  })
  const headers = result.headers
  ok(headers)
  strictEqual(headers.test, 'ok')
  ok(!result.response)
})

test('test writing an output file', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    outputFile: 'test.out'
  })
  const stat = statSync('test.out')
  ok(stat)
  strictEqual(stat.size, 4)
  unlinkSync('test.out')
})

test('test writing an output file with headers', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    outputFile: 'test.out',
    includeHeaders: true
  })
  const stat = statSync('test.out')
  ok(stat)
  ok(stat.size > 4)
  unlinkSync('test.out')
})

test('test failure when writing to an output file', async () => {
  try {
    await makeRequest('http', ipAddress, insecurePort, '/download', {
      outputFile: '/'
    })
    fail('writing an output file')
  } catch (error) {
    ok(error instanceof Error)
    strictEqual(error.code, 'EISDIR')
  }
})

test('test an ignored failure when writing to an output file', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    outputFile: '/',
    failOnOutputFileError: false
  })
  strictEqual(process.exitCode, 2)
  process.exitCode = 0
})

test('test posting data', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/upload', {
    data: 'test=ok'
  })
  strictEqual(lastRequest.method, 'POST')
  strictEqual(lastRequest.data, 'test=ok')
})

test('test posting data with content type', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/upload', {
    data: 'test=ok',
    contentType: 'application/x-www-form-urlencoded'
  })
  strictEqual(lastRequest.method, 'POST')
  strictEqual(lastRequest.data, 'test=ok')
})

test('test not followed redirect', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/redirect')
  strictEqual(result.statusCode, 302)
})

test('test followed redirect', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/redirect', {
    followRedirects: true
  })
  ok(Array.isArray(result))
  strictEqual(result.length, 2)
  strictEqual(result[0].statusCode, 302)
  strictEqual(result[1].statusCode, 200)
})

test('test no redirection with following redirect enabled', async () => {
  const result = await makeRequest('http', ipAddress, insecurePort, '/download', {
    followRedirects: true
  })
  ok(Array.isArray(result))
  strictEqual(result.length, 1)
  strictEqual(result[0].statusCode, 200)
})

test('test HTTP 1.0', async () => {
  await makeRequest('http', ipAddress, insecurePort, '/download', {
    httpVersion: '1.0'
  })
})

if (http2) {
  test('test HTTP 2.0 with the http scheme', async () => {
    try {
      await makeRequest('http', ipAddress, http2Port, '/download', {
        httpVersion: '2.0'
      })
      fail('HTTP 2.0 with the http scheme')
    } catch (error) {
      ok(error instanceof Error)
      strictEqual(error.code, 'ERR_INSECURE_SCHEME')
    }
  })

  test('test HTTP 2.0 with the https scheme', async () => {
    await makeRequest('https', ipAddress, http2Port, '/download', {
      httpVersion: '2.0'
    })
  })
}

test('stop testing servers', () => {
  stopServers()
})

test('test carried exported methods', () => {
  strictEqual(exported, nettime)
  strictEqual(nettime.getDuration, getDuration)
  strictEqual(nettime.getMilliseconds, getMilliseconds)
  strictEqual(nettime.isRedirect, isRedirect)
})
