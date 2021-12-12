const events = {
  socketOpen: 'Socket Open',
  dnsLookup: 'DNS Lookup',
  tcpConnection: 'TCP Connection',
  tlsHandshake: 'TLS Handshake',
  firstByte: 'First Byte',
  contentTransfer: 'Content Transfer',
  socketClose: 'Socket Close'
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

function getMilliseconds ([seconds, nanoseconds]) {
  return seconds * 1000 + Math.round(nanoseconds / 1000) / 1000
}

function computeAverageDurations (timings) {
  const timingCount = timings.length
  const durations = createEventDurations()
  computeEventDurations()
  checkSkippedEvents()
  computeEventDurationAverages()
  return durations

  function createEventDurations () {
    const durations = {}
    for (const event in events) {
      durations[event] = []
    }
    return durations
  }

  function computeEventDurations () {
    for (const timing of timings) {
      let lastTime = [0, 0]
      for (const event in events) {
        const time = timing[event]
        if (time) {
          const duration = getDuration(lastTime, time)
          durations[event].push(duration)
          lastTime = time
        } else {
          durations[event].push(undefined)
        }
      }
    }
  }

  function checkSkippedEvents () {
    for (const event in events) {
      const durationValues = durations[event]
      if (durationValues[0] === undefined) {
        for (let i = 0; i < timingCount; ++i) {
          if (durationValues[i] !== undefined) {
            throw new Error(`Unexpected event ${event} timing of the request ${i}.`)
          }
        }
      } else {
        for (let i = 0; i < timingCount; ++i) {
          if (durationValues[i] === undefined) {
            throw new Error(`Expected event ${event} timing of the request ${i}.`)
          }
        }
      }
    }
  }

  function computeEventDurationAverages () {
    for (const event in events) {
      durations[event] = durations[event].reduce((result, duration) =>
        duration ? [result[0] + duration[0], result[1] + duration[1]] : undefined,
      [0, 0])
    }
    for (const event in events) {
      const duration = durations[event]
      if (duration) {
        const [seconds, nanoseconds] = duration
        durations[event] = [seconds / timingCount, nanoseconds / timingCount]
      }
    }
  }
}

function createTimingsFromDurations (durations, startTime) {
  const timings = {}
  let lastTiming = startTime || [0, 0]
  for (const event in events) {
    const duration = durations[event]
    if (duration) {
      const seconds = lastTiming[0] + duration[0]
      const nanoseconds = lastTiming[1] + duration[1]
      lastTiming = timings[event] = [seconds, nanoseconds]
    }
  }
  return timings
}

module.exports = {
  events,
  getDuration,
  getMilliseconds,
  computeAverageDurations,
  createTimingsFromDurations
}
