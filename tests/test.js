'use strict'

const assert = require('assert')
const fs = require('fs')
const http = require('http')
const https = require('https')
const nettime = require('..')
const path = require('path')

const key = readCertificate('key')
const certificate = readCertificate('cert')
const ipAddress = '127.0.0.1'
const unsecurePort = 8899
const securePort = 9988
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

function readCertificate (name) {
  return fs.readFileSync(path.join(__dirname, name + '.pem'))
}

function serve (request, response) {
  setTimeout(() => {
    response.writeHead(request.url === '/' ? 204 : 404)
    response.end()
  }, 100)
}

function startServers () {
  return createServer(http, unsecurePort)
    .then(createServer.bind(null, https, securePort, {
      key: key,
      cert: certificate
    }))
}

function stopServers () {
  var server
  while ((server = servers.pop())) {
    server.close()
  }
}

function makeRequest (protocol, host, port, path) {
  return nettime({
    url: protocol + '://' + host + ':' + port + (path || ''),
    agentOptions: protocol === 'https' ? {
      key: key,
      cert: certificate
    } : undefined
  })
  .then(checkRequest)
}

function checkRequest (result) {
  const timings = result.timings
  const tcpConnection = timings.tcpConnection
  const firstByte = timings.firstByte
  assert.equal(typeof result, 'object')
  assert.equal(Object.keys(result).length, 2)
  assert.equal(typeof result.timings, 'object')
  checkTiming(timings.socketOpen)
  checkTiming(tcpConnection)
  checkTiming(firstByte)
  checkTiming(timings.contentTransfer)
  checkTiming(timings.socketClose)
  assert.ok(getDuration(tcpConnection, firstByte) >= 100 * 1e6)
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
  return makeRequest('http', 'localhost', unsecurePort)
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 204)
      assert.equal(Object.keys(timings).length, 6)
      checkTiming(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
    })
}

function testIPAddress () {
  return makeRequest('http', ipAddress, unsecurePort)
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 204)
      assert.equal(Object.keys(timings).length, 5)
      checkNull(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
    })
}

function testSecurity () {
  return makeRequest('https', ipAddress, securePort)
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 204)
      assert.equal(Object.keys(timings).length, 6)
      checkNull(timings.dnsLookup)
      checkTiming(timings.tlsHandshake)
    })
}

function testMissingPage () {
  return makeRequest('http', ipAddress, unsecurePort, '/missing')
    .then(result => {
      const timings = result.timings
      assert.equal(result.statusCode, 404)
      assert.equal(Object.keys(timings).length, 5)
      checkNull(timings.dnsLookup)
      checkNull(timings.tlsHandshake)
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
      assert.ok(error.message.indexOf('dummy:') > 0)
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
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
startServers().then(testHostname)
              .then(testIPAddress)
              .then(testSecurity)
              .then(testMissingPage)
              .then(testUnreachableHost)
              .then(testInvalidURL)
              .then(testDuration)
              .then(testMilliseconds)
              .catch(console.error)
              .then(stopServers)
