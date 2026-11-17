import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHOICE_POINT,
  createDelayedState,
  currentMeasurement,
  delayedReducer,
  detect,
  effectiveSetup,
  probabilities,
} from '../src/wheeler/delayed.ts'

const uniformLot = Array.from({ length: 100 }, (_, index) => (index + 0.5) / 100)

function prepare(phase = 0, closed = true, timing = 'after') {
  let state = createDelayedState()
  state = delayedReducer(state, { type: 'phase', value: phase })
  state = delayedReducer(state, { type: 'closed', value: closed })
  return delayedReducer(state, { type: 'timing', value: timing })
}

function advanceUntil(state, stage, random = 0.37) {
  for (let step = 0; step < 100 && state.stage !== stage; step++) {
    state = delayedReducer(state, { type: 'tick', seconds: 0.1, random })
  }
  assert.equal(state.stage, stage, `The flight must reach ${stage}`)
  return state
}

test('closed interferometer agrees with independently composed complex amplitudes', () => {
  for (let phase = 0; phase <= 360; phase += 15) {
    // H diag(1, exp(i phi)) H |0>, using the declared total-phase convention.
    const angle = phase * Math.PI / 180
    const amplitudes = [
      { re: (1 + Math.cos(angle)) / 2, im: Math.sin(angle) / 2 },
      { re: (1 - Math.cos(angle)) / 2, im: -Math.sin(angle) / 2 },
    ]
    const expected = amplitudes.map(({ re, im }) => re * re + im * im)
    const actual = probabilities(phase, true)
    assert.ok(Math.abs(actual[0] - expected[0]) < 1e-12)
    assert.ok(Math.abs(actual[1] - expected[1]) < 1e-12)
    assert.ok(Math.abs(actual[0] + actual[1] - 1) < 1e-12)
    assert.ok(actual.every(value => value >= 0 && value <= 1))
    assert.deepEqual(probabilities(phase, false), [0.5, 0.5])
  }
  assert.deepEqual(probabilities(0, true), [1, 0])
  assert.deepEqual(probabilities(180, true), [0, 1])
  assert.deepEqual(probabilities(360, true), [1, 0])
  for (const phase of [Number.MAX_VALUE, -Number.MAX_VALUE, 1e308, -1e308]) {
    const distribution = probabilities(phase, true)
    assert.ok(distribution.every(value => Number.isFinite(value) && value >= 0 && value <= 1))
    assert.equal(distribution[0] + distribution[1], 1)
  }
})

test('detector sampling yields one event, with exact dark-port exclusion', () => {
  for (const random of [0, 0.25, 0.5, 0.999999999999]) {
    assert.equal(detect({ phase: 0, closed: true, timing: 'before' }, random), 0)
    assert.equal(detect({ phase: 180, closed: true, timing: 'after' }, random), 1)
  }
  const open = { phase: 45, closed: false, timing: 'before' }
  assert.equal(detect(open, 0.49999), 0)
  assert.equal(detect(open, 0.5), 1)
  for (const random of [-0.1, 1, NaN, Infinity]) {
    assert.throws(() => detect(open, random), RangeError)
  }
  assert.throws(() => probabilities(NaN, true), RangeError)
  assert.throws(() => probabilities(Infinity, false), RangeError)
})

test('late choice pauses after entry and keeps the state until the user continues', () => {
  const initial = prepare(60, true, 'after')
  let state = delayedReducer(initial, { type: 'emit' })
  state = advanceUntil(state, 'choosing')
  assert.equal(state.flight.progress, CHOICE_POINT)
  assert.equal(state.measurements.length, 0)
  const waiting = state
  for (const seconds of [0.1, 1, 100000]) {
    assert.equal(delayedReducer(waiting, { type: 'tick', seconds, random: 0.3 }), waiting)
  }
  state = delayedReducer(state, { type: 'closed', value: false })
  assert.equal(effectiveSetup(state).closed, false)
  assert.equal(state.flight.closed, true)
  state = delayedReducer(state, { type: 'continue' })
  assert.equal(state.flight.closed, false)
  state = advanceUntil(state, 'detected', 0.8)
  assert.equal(state.detector, 1)
  assert.deepEqual(state.measurements[0], {
    phase: 60, closed: false, timing: 'after', d0: 0, d1: 1, recent: [1],
  })
  assert.deepEqual(initial, prepare(60, true, 'after'))
})

test('equal final settings give equal outcomes for early and late choices', () => {
  for (const phase of [0, 75, 90, 180, 270, 360]) {
    for (const closed of [false, true]) {
      for (const random of [0.01, 0.3, 0.6, 0.99]) {
        let early = delayedReducer(prepare(phase, closed, 'before'), { type: 'emit' })
        early = advanceUntil(early, 'detected', random)
        let late = delayedReducer(prepare(phase, !closed, 'after'), { type: 'emit' })
        late = advanceUntil(late, 'choosing')
        late = delayedReducer(late, { type: 'closed', value: closed })
        late = delayedReducer(late, { type: 'continue' })
        late = advanceUntil(late, 'detected', random)
        assert.equal(early.detector, late.detector)
        assert.deepEqual(probabilities(early.flight.phase, early.flight.closed), probabilities(late.flight.phase, late.flight.closed))
        assert.equal(early.measurements[0].timing, 'before')
        assert.equal(late.measurements[0].timing, 'after')
      }
    }
  }
})

test('flight controls lock at the appropriate stage and each emission is counted once', () => {
  let state = delayedReducer(prepare(180, true, 'before'), { type: 'emit' })
  const locked = [
    { type: 'phase', value: 0 },
    { type: 'closed', value: false },
    { type: 'timing', value: 'after' },
    { type: 'emit' },
    { type: 'continue' },
    { type: 'clear' },
    { type: 'batch', randoms: uniformLot },
  ]
  for (const action of locked) assert.equal(delayedReducer(state, action), state)
  state = advanceUntil(state, 'detected')
  const first = structuredClone(state.measurements)
  assert.equal(delayedReducer(state, { type: 'tick', seconds: 100, random: 0 }), state)
  assert.equal(delayedReducer(state, { type: 'continue' }), state)
  state = delayedReducer(state, { type: 'phase', value: 0 })
  assert.deepEqual(state.measurements, first)
  state = delayedReducer(state, { type: 'emit' })
  state = advanceUntil(state, 'detected')
  assert.equal(state.measurements.reduce((sum, item) => sum + item.d0 + item.d1, 0), 2)
  assert.deepEqual(first[0], { phase: 180, closed: true, timing: 'before', d0: 0, d1: 1, recent: [1] })
})

test('late-choice configuration freezes when continuing, including before the output splitter', () => {
  let state = delayedReducer(prepare(90, true, 'after'), { type: 'emit' })
  state = advanceUntil(state, 'choosing')
  assert.equal(delayedReducer(state, { type: 'phase', value: 180 }), state)
  assert.equal(delayedReducer(state, { type: 'timing', value: 'before' }), state)
  state = delayedReducer(state, { type: 'closed', value: false })
  state = delayedReducer(state, { type: 'continue' })
  assert.equal(delayedReducer(state, { type: 'closed', value: true }), state)
  assert.equal(delayedReducer(state, { type: 'continue' }), state)
  state = advanceUntil(state, 'detected', 0.7)
  assert.equal(state.measurements[0].closed, false)
})

test('invalid or suspended-frame time cannot skip the choice or generate an event', () => {
  const state = delayedReducer(createDelayedState(), { type: 'emit' })
  for (const seconds of [0, -1, NaN, Infinity]) {
    assert.equal(delayedReducer(state, { type: 'tick', seconds, random: 0.5 }), state)
  }
  const resumed = delayedReducer(state, { type: 'tick', seconds: 9999, random: 0.5 })
  assert.ok(resumed.flight.progress > 0 && resumed.flight.progress < CHOICE_POINT)
  assert.equal(resumed.measurements.length, 0)
  assert.equal(resumed.stage, 'entering')
})

test('batches preserve independent settings and retain only the most recent 24 events', () => {
  let state = prepare(120, true, 'before')
  state = delayedReducer(state, { type: 'batch', randoms: uniformLot })
  assert.deepEqual([currentMeasurement(state).d0, currentMeasurement(state).d1], [25, 75])
  assert.equal(currentMeasurement(state).recent.length, 24)
  const closedRecord = structuredClone(currentMeasurement(state))
  state = delayedReducer(state, { type: 'closed', value: false })
  assert.equal(currentMeasurement(state), undefined)
  state = delayedReducer(state, { type: 'batch', randoms: uniformLot })
  assert.deepEqual([currentMeasurement(state).d0, currentMeasurement(state).d1], [50, 50])
  state = delayedReducer(state, { type: 'timing', value: 'after' })
  state = delayedReducer(state, { type: 'batch', randoms: uniformLot })
  assert.equal(state.measurements.length, 3)
  assert.deepEqual(state.measurements[0], closedRecord)
  state = delayedReducer(state, { type: 'closed', value: true })
  state = delayedReducer(state, { type: 'timing', value: 'before' })
  state = delayedReducer(state, { type: 'batch', randoms: Array(100).fill(0) })
  assert.deepEqual([currentMeasurement(state).d0, currentMeasurement(state).d1], [125, 75])
  assert.deepEqual(currentMeasurement(state).recent, Array(24).fill(0))
  assert.equal(state.measurements.length, 3)
})

test('supported phase settings bound the measurement catalog and clear preserves the setup', () => {
  let state = createDelayedState()
  for (const phase of Array.from({ length: 25 }, (_, index) => index * 15)) {
    for (const closed of [false, true]) {
      for (const timing of ['before', 'after']) {
        state = delayedReducer(state, { type: 'phase', value: phase })
        state = delayedReducer(state, { type: 'closed', value: closed })
        state = delayedReducer(state, { type: 'timing', value: timing })
        state = delayedReducer(state, { type: 'batch', randoms: uniformLot })
      }
    }
  }
  assert.equal(state.measurements.length, 100)
  assert.ok(state.measurements.every(item => item.d0 + item.d1 === 100 && item.recent.length === 24))
  const setup = structuredClone(state.setup)
  const cleared = delayedReducer(state, { type: 'clear' })
  assert.equal(cleared.stage, 'ready')
  assert.deepEqual(cleared.setup, setup)
  assert.deepEqual(cleared.measurements, [])
  assert.equal(cleared.flight, null)
  assert.equal(cleared.detector, null)
})

test('phase inputs are quantized and invalid batches leave existing results intact', () => {
  let state = createDelayedState()
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(delayedReducer(state, { type: 'phase', value }), state)
  }
  state = delayedReducer(state, { type: 'phase', value: 100 })
  assert.equal(state.setup.phase, 105)
  state = delayedReducer(state, { type: 'phase', value: -100 })
  assert.equal(state.setup.phase, 0)
  state = delayedReducer(state, { type: 'phase', value: 1000 })
  assert.equal(state.setup.phase, 360)
  for (const randoms of [[], [0.5], Array(99).fill(0.5), Array(101).fill(0.5)]) {
    assert.equal(delayedReducer(state, { type: 'batch', randoms }), state)
  }
  const snapshot = structuredClone(state)
  assert.throws(() => delayedReducer(state, { type: 'batch', randoms: [...Array(99).fill(0.5), NaN] }), RangeError)
  assert.deepEqual(state, snapshot)
})
