function getDuration (start, end) {
  let seconds = end[0] - start[0]
  let nanoseconds = end[1] - start[1]
  if (nanoseconds < 0) {
    --seconds
    nanoseconds += 1e9
  }
  return [seconds, nanoseconds]
}

function getMilliseconds ([seconds, nanoseconds]) {
  return seconds * 1000 + Math.round(nanoseconds / 1000) / 1000
}

module.exports = { getDuration, getMilliseconds }
