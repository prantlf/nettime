'use strict'

const fs = require('fs')
const http = require('http')
const https = require('https')
const nettime = require('..')
const path = require('path')
const test = require('tap')

const ipAddress = '127.0.0.1'
const unsecurePort = 8899
const securePort = 9988
const servers = []
let lastHeaders, lastMethod

function createServer (protocol, port, options) {
  return new Promise((resolve, reject) => {
    const server = options ? protocol.createServer(options, serve)
                           : protocol.createServer(serve)
    server.on('error', reject)
          .listen(port, ipAddress, () => {
            servers.push(server)
            resolve()
          })
  })
}

function readCertificate (name) {
  return fs.readFileSync(path.join(__dirname, name + '.pem'))
}

function serve (request, response) {
  setTimeout(() => {
    const url = request.url
    const statusCode = url === '/' ? 204 : url === '/data' ? 200 : 404

    lastHeaders = request.headers
    lastMethod = request.method
    response.writeHead(statusCode)
    if (statusCode === 200) {
      response.write('data')
    }
    response.end()
  }, 100)
}

function startServers () {
  return createServer(http, unsecurePort)
    .then(createServer.bind(null, https, securePort, {
      key: readCertificate('key'),
      cert: readCertificate('cert')
    }))
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
  let credentials, headers, method
  if (options) {
    if (options.username) {
      credentials = options
    } else if (options.method) {
      method = options.method
    } else {
      headers = options
    }
  }
  return nettime(https || options ? {
    url: url,
    credentials: credentials,
    headers: headers,
    method: method,
    rejectUnauthorized: false
  } : url)
  .then(checkRequest)
}

function checkRequest (result) {
  const timings = result.timings
  const tcpConnection = timings.tcpConnection
  const firstByte = timings.firstByte
  test.equal(typeof result, 'object')
  test.equal(Object.keys(result).length, 3)
  test.equal(typeof result.timings, 'object')
  checkTiming(timings.socketOpen)
  checkTiming(tcpConnection)
  checkTiming(firstByte)
  checkTiming(timings.contentTransfer)
  checkTiming(timings.socketClose)
  test.ok(getDuration(tcpConnection, firstByte) >= 100 * 1e6)
  return result
}

function getDuration (start, end) {
  return getTime(end) - getTime(start)
}

function getTime (timing) {
  return timing[0] * 1e9 + timing[1]
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

test.test('start testing servers', function (test) {
  startServers()
    .then(test.end)
    .catch(test.threw)
})

test.test('test with a hostname', function (test) {
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

test.test('test with an IP address', function (test) {
  return makeRequest('http', ipAddress, unsecurePort, '/data')
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

test.test('test with the HTTPS protocol', function (test) {
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

test.test('test with a missing web page', function (test) {
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

test.test('test with an unreachable host', function (test) {
  return makeRequest('http', '127.0.0.2', 80)
  .then(test.fail)
  .catch(error => {
    test.ok(error instanceof Error)
    test.equal(error.code, 'ECONNREFUSED')
  })
  .then(test.end)
})

test.test('test with an invalid URL', function (test) {
  return makeRequest('dummy', ipAddress, 1)
  .then(test.fail)
  .catch(error => {
    test.ok(error instanceof Error)
    test.ok(error.message.indexOf('dummy:') > 0)
  })
  .then(test.end)
})

test.test('test with custom headers', function (test) {
  return makeRequest('http', ipAddress, unsecurePort, '/data', {
    TestHeader: 'Test value'
  })
  .then(result => {
    test.ok(lastHeaders)
    test.equal(Object.keys(lastHeaders).length, 3)
    test.equal(lastHeaders.connection, 'close')
    test.equal(lastHeaders.host, '127.0.0.1:8899')
    test.equal(lastHeaders.testheader, 'Test value')
  })
  .catch(test.threw)
  .then(test.end)
})

test.test('test with credentials', function (test) {
  return makeRequest('http', ipAddress, unsecurePort, '/data', {
    username: 'guest',
    password: 'secret'
  })
  .then(result => {
    test.ok(lastHeaders)
    test.equal(Object.keys(lastHeaders).length, 3)
    test.equal(lastHeaders.connection, 'close')
    test.equal(lastHeaders.host, '127.0.0.1:8899')
    test.equal(lastHeaders.authorization, 'Basic Z3Vlc3Q6c2VjcmV0')
  })
  .catch(test.threw)
  .then(test.end)
})

test.test('test with the HEAD verb', function (test) {
  return makeRequest('http', ipAddress, unsecurePort, '/data', {
    method: 'HEAD'
  })
  .then(result => {
    test.equal(lastMethod, 'HEAD')
  })
  .catch(test.threw)
  .then(test.end)
})

test.test('stop testing servers', function (test) {
  stopServers()
  test.end()
})

test.test('test getting duration', function (test) {
  test.deepEqual(nettime.getDuration([0, 100], [0, 200]), [0, 100])
  test.deepEqual(nettime.getDuration([0, 100], [1, 200]), [1, 100])
  test.deepEqual(nettime.getDuration([0, 200], [1, 100]), [0, 999999900])
  test.end()
})

test.test('test getting milliseconds', function (test) {
  test.deepEqual(nettime.getMilliseconds([0, 1e6]), 1)
  test.deepEqual(nettime.getMilliseconds([1, 1000]), 1000.001)
  test.end()
})
