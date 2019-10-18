const test = require('tap')
const { getDuration, getMilliseconds } = require('../lib/timings')

test.test('test getting duration', test => {
  test.deepEqual(getDuration([0, 100], [0, 200]), [0, 100])
  test.deepEqual(getDuration([0, 100], [1, 200]), [1, 100])
  test.deepEqual(getDuration([0, 200], [1, 100]), [0, 999999900])
  test.end()
})

test.test('test getting milliseconds', test => {
  test.deepEqual(getMilliseconds([0, 1e6]), 1)
  test.deepEqual(getMilliseconds([1, 1000]), 1000.001)
  test.end()
})
