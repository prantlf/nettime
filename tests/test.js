'use strict'

const assert = require('assert')
const http = require('http')
const nettime = require('..')

const ipAddress = '127.0.0.1'
const port = 8899
const servers = []

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

function serve (request, response) {
  setTimeout(() => {
    response.writeHead(request.url === '/' ? 204 : 404)
    response.end()
  }, 100)
}

function startServers () {
  return createServer(http, port)
}

function stopServers () {
  var server
  while ((server = servers.pop())) {
    server.close()
  }
}

function makeRequest (protocol, host, port, path) {
  return nettime({
    url: protocol + '://' + host + ':' + port + (path || '')
  })
  .then(checkRequest)
}

function checkRequest (result) {
  const timings = result.timings
  const tcpConnection = timings.tcpConnection
  const responseBegin = timings.responseBegin
  assert.equal(typeof result, 'object')
  assert.equal(Object.keys(result).length, 2)
  assert.equal(typeof result.timings, 'object')
  checkTiming(timings.socketOpen)
  checkTiming(tcpConnection)
  checkTiming(responseBegin)
  checkTiming(timings.responseEnd)
  checkNull(timings.socketClose)
  assert.ok(getDuration(tcpConnection, responseBegin) >= 100 * 1e6)
  return result
}

function getDuration (start, end) {
  return getTime(end) - getTime(start)
}

function getTime (timing) {
  return timing[0] * 1e9 + timing[1]
}

function checkTiming (timing) {
  assert.ok(Array.isArray(timing))
  assert.equal(timing.length, 2)
  assert.equal(typeof timing[0], 'number')
  assert.equal(typeof timing[1], 'number')
}

function checkNull (timing) {
  assert.equal(timing, null)
}

function testHostname () {
  return makeRequest('http', 'localhost', port)
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 204)
      assert.equal(Object.keys(timings).length, 5)
      checkTiming(timings.dnsLookup)
    })
}

function testIPAddress () {
  return makeRequest('http', ipAddress, port)
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 204)
      assert.equal(Object.keys(timings).length, 5)
      checkTiming(timings.dnsLookup)
    })
}

function testMissingPage () {
  return makeRequest('http', ipAddress, port, '/missing')
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 404)
      assert.equal(Object.keys(timings).length, 5)
      checkTiming(timings.dnsLookup)
    })
}

function testUnreachableHost () {
  return makeRequest('http', '127.0.0.2', 80)
    .then(assert.fail)
    .catch(error => {
      assert.ok(error instanceof Error)
      assert.equal(error.code, 'ECONNREFUSED')
    })
}

function testInvalidURL () {
  return makeRequest('dummy', ipAddress, 1)
    .then(assert.fail)
    .catch(error => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'Invalid protocol: dummy:')
    })
}

function testDuration () {
  assert.deepEqual(nettime.getDuration([0, 100], [0, 200]), [0, 100])
  assert.deepEqual(nettime.getDuration([0, 100], [1, 200]), [1, 100])
  assert.deepEqual(nettime.getDuration([0, 200], [1, 100]), [0, 999999900])
}

function testMilliseconds () {
  assert.deepEqual(nettime.getMilliseconds([0, 1e6]), 1)
  assert.deepEqual(nettime.getMilliseconds([1, 1000]), 1000.001)
}

assert.equal(typeof nettime, 'function')
startServers().then(testHostname)
              .then(testIPAddress)
              .then(testMissingPage)
              .then(testUnreachableHost)
              .then(testInvalidURL)
              .then(testDuration)
              .then(testMilliseconds)
              .catch(console.error)
              .then(stopServers)
