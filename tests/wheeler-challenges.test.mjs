import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LESSONS,
  comparisonChanged,
  createGuidedState,
  guidedReducer,
  lessonSteps,
  nextInstruction,
  prepareLabel,
  readyToCheck,
} from '../src/wheeler/challenges.ts'

const sim = (state, action) => guidedReducer(state, { type: 'sim', action })
const lesson = (state, index) => guidedReducer(state, { type: 'lesson', index })
const predict = (state, choice) => guidedReducer(state, { type: 'predict', choice })
const prepare = state => guidedReducer(state, { type: 'prepare' })
const check = state => guidedReducer(state, { type: 'check' })
const batch = (state, random = 0.25) => sim(state, { type: 'batch', randoms: Array(100).fill(random) })
const clicks = state => state.sim.measurements.reduce((sum, record) => sum + record.d0 + record.d1, 0)
const observed = (state, index = state.active) => state.progress[index].observations.map(item => [item.d0, item.d1])

function advance(state, stage, random = 0.75) {
  for (let i = 0; i < 150 && state.sim.stage !== stage; i++) {
    state = sim(state, { type: 'tick', seconds: 0.1, random })
  }
  assert.equal(state.sim.stage, stage)
  return state
}

function manualBefore(state, random = 0.75) {
  assert.equal(state.sim.setup.timing, 'before')
  return advance(sim(state, { type: 'emit' }), 'detected', random)
}

function finishAfter(state, insert, random = 0.75) {
  state = advance(sim(state, { type: 'emit' }), 'choosing', random)
  if (insert !== null) state = sim(state, { type: 'closed', value: insert })
  return advance(sim(state, { type: 'continue' }), 'detected', random)
}

test('four lessons expose independent questions and do not preload achievements', () => {
  assert.equal(LESSONS.length, 4)
  assert.deepEqual(LESSONS.map(item => item.correct), [1, 0, 2, 1])
  assert.ok(LESSONS.every(item => item.options.length === 3 && item.title && item.question && item.explanation && item.hint))
  const state = createGuidedState()
  assert.equal(state.active, null)
  assert.equal(state.tracking, null)
  assert.deepEqual(lessonSteps(state), [])
  assert.equal(readyToCheck(state), false)
  assert.equal(prepareLabel(state), null)
  assert.ok(state.progress.every(item => !item.complete && item.prediction === null && item.feedback === null))
  assert.deepEqual(state.progress.map(item => item.observations.length), [1, 2, 2, 2])
})

test('prediction gates emission, but never configures the apparatus or reveals correctness', () => {
  let state = lesson(createGuidedState(), 0)
  assert.deepEqual(state.sim.setup, { phase: 90, closed: true, timing: 'before' })
  assert.equal(sim(state, { type: 'emit' }), state)
  assert.equal(batch(state), state)
  assert.match(nextInstruction(state), /Elegí qué pensás/)
  state = sim(state, { type: 'phase', value: 180 })
  assert.equal(state.sim.setup.phase, 180)
  assert.equal(state.progress[0].feedback, null)
  state = predict(state, 0)
  assert.equal(state.progress[0].feedback, null)
  state = sim(state, { type: 'emit' })
  assert.equal(state.sim.stage, 'entering', 'an incorrect prediction must allow the experiment')
  assert.equal(predict(state, 1), state, 'the prediction cannot change in flight')
  assert.equal(lesson(state, null), state)
  assert.equal(prepare(state), state)
  assert.equal(check(state), state)
  assert.equal(prepareLabel(state), null)
})

test('lesson one counts a new manual photon, not old detections or batches', () => {
  let state = createGuidedState()
  state = sim(state, { type: 'phase', value: 90 })
  state = sim(state, { type: 'timing', value: 'before' })
  state = batch(state)
  assert.equal(clicks(state), 100)
  state = predict(lesson(state, 0), 1)
  assert.deepEqual(observed(state), [[0, 0]])
  state = batch(state)
  assert.equal(clicks(state), 200)
  assert.deepEqual(observed(state), [[0, 0]])
  assert.equal(check(state).progress[0].feedback, 'missing')
  state = manualBefore(state, 0.75)
  assert.deepEqual(observed(state), [[0, 1]])
  assert.equal(clicks(state), 201)
  assert.equal(readyToCheck(state), true)
  assert.equal(state.progress[0].complete, false, 'observing does not auto-complete a lesson')
  const snapshot = structuredClone(state)
  assert.equal(sim(state, { type: 'tick', seconds: 0.1, random: 0 }), state)
  const completed = check(state)
  assert.equal(completed.progress[0].complete, true)
  assert.equal(completed.progress[0].feedback, 'complete')
  assert.deepEqual(state, snapshot, 'checking must not mutate the prior state')
})

test('lesson one rejects the wrong phase, output and timing without blocking exploration', () => {
  let state = predict(lesson(createGuidedState(), 0), 1)
  state = sim(state, { type: 'phase', value: 0 })
  state = manualBefore(state)
  assert.deepEqual(observed(state), [[0, 0]])
  state = prepare(state)
  state = sim(state, { type: 'closed', value: false })
  state = manualBefore(state)
  assert.deepEqual(observed(state), [[0, 0]])
  state = prepare(state)
  state = sim(state, { type: 'timing', value: 'after' })
  state = finishAfter(state, null)
  assert.deepEqual(observed(state), [[0, 0]])
  assert.equal(clicks(state), 3)
  assert.equal(prepareLabel(state), 'Preparar 90°')
  state = manualBefore(prepare(state), 0.1)
  assert.deepEqual(observed(state), [[1, 0]])
})

test('lesson two requires both measured phases and allows correcting a failed explanation', () => {
  let state = predict(lesson(createGuidedState(), 1), 2)
  state = batch(state)
  assert.deepEqual(observed(state), [[100, 0], [0, 0]])
  assert.equal(readyToCheck(state), false)
  assert.equal(check(state).progress[1].feedback, 'missing')
  assert.equal(prepareLabel(state), 'Preparar 180°')
  state = prepare(state)
  assert.deepEqual(state.sim.setup, { phase: 180, closed: true, timing: 'before' })
  state = batch(state)
  assert.deepEqual(observed(state), [[100, 0], [0, 100]])
  assert.ok(lessonSteps(state).every(step => step.done))
  assert.equal(state.progress[1].complete, false)
  state = check(state)
  assert.equal(state.progress[1].feedback, 'wrong')
  assert.equal(state.progress[1].complete, false)
  const records = structuredClone(state.progress[1].observations)
  state = predict(state, 0)
  assert.equal(state.progress[1].feedback, null)
  assert.deepEqual(state.progress[1].observations, records)
  state = check(state)
  assert.equal(state.progress[1].complete, true)
  assert.equal(prepareLabel(state), null)
  state = check(predict(state, 1))
  assert.equal(state.progress[1].feedback, 'wrong')
  assert.equal(state.progress[1].complete, true, 'a later prediction cannot erase an earned achievement')
})

test('lesson two ignores open output, intermediate phase, late protocol, and unrelated existing records', () => {
  let state = createGuidedState()
  state = sim(state, { type: 'timing', value: 'before' })
  state = batch(state)
  state = sim(state, { type: 'phase', value: 180 })
  state = batch(state)
  state = predict(lesson(state, 1), 0)
  assert.deepEqual(observed(state), [[0, 0], [0, 0]])
  state = sim(state, { type: 'closed', value: false })
  state = batch(state)
  state = sim(state, { type: 'closed', value: true })
  state = sim(state, { type: 'phase', value: 90 })
  state = batch(state)
  state = sim(state, { type: 'phase', value: 0 })
  state = sim(state, { type: 'timing', value: 'after' })
  state = batch(state)
  assert.deepEqual(observed(state), [[0, 0], [0, 0]])
  assert.equal(clicks(state), 500)
  assert.equal(check(state).progress[1].feedback, 'missing')
})

test('100 manual photons can satisfy a statistical step, but 99 cannot', () => {
  let state = predict(lesson(createGuidedState(), 1), 0)
  for (let i = 0; i < 99; i++) state = manualBefore(state)
  assert.deepEqual(observed(state), [[99, 0], [0, 0]])
  assert.equal(lessonSteps(state)[0].done, false)
  assert.equal(prepareLabel(state), null)
  state = manualBefore(state)
  assert.equal(lessonSteps(state)[0].done, true)
  assert.equal(prepareLabel(state), 'Preparar 180°')
})

test('lesson three accepts sampling fluctuations rather than requiring exactly fifty per detector', () => {
  let state = predict(lesson(createGuidedState(), 2), 2)
  assert.deepEqual(state.sim.setup, { phase: 0, closed: false, timing: 'before' })
  // Deliberately extreme, valid random samples: completion checks the experiment,
  // not agreement with an exact 50/50 finite-sample result.
  state = batch(state, 0.01)
  state = batch(prepare(state), 0.99)
  assert.deepEqual(observed(state), [[100, 0], [0, 100]])
  assert.equal(readyToCheck(state), true)
  assert.equal(check(state).progress[2].complete, true)
})

test('lesson four requires a manual early choice and a manual open-to-closed late choice', () => {
  let state = predict(lesson(createGuidedState(), 3), 1)
  state = batch(state)
  assert.deepEqual(observed(state), [[0, 0], [0, 0]])
  state = manualBefore(state)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  assert.equal(prepareLabel(state), 'Preparar elección después')
  state = prepare(state)
  assert.deepEqual(state.sim.setup, { phase: 0, closed: false, timing: 'after' })
  state = advance(sim(state, { type: 'emit' }), 'choosing')
  assert.match(nextInstruction(state), /«Salida abierta»/)
  assert.match(nextInstruction(state), /reunir los caminos/)
  assert.equal(lesson(state, 0), state)
  assert.equal(prepare(state), state)
  const duringChoice = state
  state = sim(state, { type: 'closed', value: true })
  assert.match(nextInstruction(state), /«Continuar»/)
  assert.match(nextInstruction(state), /salida quedó reunida/)
  assert.equal(readyToCheck(state), false)
  state = advance(sim(state, { type: 'continue' }), 'detected')
  assert.deepEqual(observed(state), [[1, 0], [1, 0]])
  assert.deepEqual(observed(duringChoice), [[1, 0], [0, 0]])
  assert.equal(state.progress[3].complete, false)
  assert.equal(check(state).progress[3].complete, true)
})

test('late-choice evidence cannot come from batches, an unchanged output, or a closed start', () => {
  let state = predict(lesson(createGuidedState(), 3), 1)
  state = manualBefore(state)
  state = prepare(state)
  state = batch(state)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  state = finishAfter(state, null)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  state = sim(state, { type: 'closed', value: true })
  state = advance(sim(state, { type: 'emit' }), 'choosing')
  state = sim(state, { type: 'closed', value: false })
  state = sim(state, { type: 'closed', value: true })
  state = advance(sim(state, { type: 'continue' }), 'detected')
  assert.deepEqual(observed(state), [[1, 0], [0, 0]], 'starting closed is not a late insertion')
  state = prepare(state)
  state = sim(state, { type: 'emit' })
  assert.equal(sim(state, { type: 'closed', value: true }), state, 'inserting before the pause is locked')
  state = advance(state, 'choosing')
  state = sim(state, { type: 'closed', value: true })
  state = sim(state, { type: 'closed', value: false })
  state = advance(sim(state, { type: 'continue' }), 'detected')
  assert.deepEqual(observed(state), [[1, 0], [0, 0]], 'removing the output again cannot count as a closed final setup')
  assert.equal(check(state).progress[3].feedback, 'missing')
  state = finishAfter(prepare(state), true)
  assert.deepEqual(observed(state), [[1, 0], [1, 0]])
})

test('lessons preserve each other, free exploration gives no credit, and clearing counts keeps observations', () => {
  let state = predict(lesson(createGuidedState(), 0), 1)
  state = check(manualBefore(state))
  const first = structuredClone(state.progress[0])
  state = predict(lesson(state, 1), 0)
  state = batch(state)
  assert.deepEqual(state.progress[0], first)
  const measured = structuredClone(state.progress)
  state = lesson(state, null)
  state = sim(state, { type: 'phase', value: 180 })
  state = batch(state)
  assert.deepEqual(state.progress, measured)
  assert.equal(clicks(state), 201)
  state = lesson(state, 1)
  assert.deepEqual(observed(state), [[100, 0], [0, 0]])
  assert.deepEqual(state.sim.setup, { phase: 180, closed: true, timing: 'before' })
  assert.equal(clicks(state), 201, 'preparing a lesson preserves the complete measurement table')
  state = sim(state, { type: 'clear' })
  assert.equal(clicks(state), 0)
  assert.deepEqual(state.progress, measured)
  state = batch(state)
  assert.deepEqual(observed(state), [[100, 0], [0, 100]])
  assert.equal(check(state).progress[1].complete, true)
})

test('invalid selections and no-op simulation actions cannot alter guided observations', () => {
  let state = createGuidedState()
  for (const index of [-1, 4, 1.5, NaN, Infinity]) assert.equal(lesson(state, index), state)
  assert.equal(check(state), state)
  assert.equal(predict(state, 0), state)
  state = lesson(state, 0)
  for (const choice of [-1, 3, 0.5, NaN, Infinity]) assert.equal(predict(state, choice), state)
  state = predict(state, 1)
  for (const action of [
    { type: 'tick', seconds: 100, random: 0.5 },
    { type: 'continue' },
    { type: 'batch', randoms: [] },
  ]) assert.equal(sim(state, action), state)
  const snapshot = structuredClone(state)
  assert.throws(() => batch(state, NaN), RangeError)
  assert.deepEqual(state, snapshot)
  assert.equal(state.progress[0].feedback, null)
})

test('compact step labels keep the full required setup in the preparation instruction', () => {
  for (const [index, prediction, phase, output] of [
    [0, 1, /90°/, /reunida/],
    [1, 0, /0°/, /reunida/],
    [2, 2, /0°/, /abierta/],
  ]) {
    let state = predict(lesson(createGuidedState(), index), prediction)
    assert.ok(lessonSteps(state).every(step => step.label.length <= 20))
    state = sim(state, { type: 'phase', value: 45 })
    const instruction = nextInstruction(state)
    assert.match(instruction, phase)
    assert.match(instruction, output)
    assert.match(instruction, /antes/)
  }
  const state = manualBefore(predict(lesson(createGuidedState(), 3), 1))
  const instruction = nextInstruction(state)
  assert.match(instruction, /0°/)
  assert.match(instruction, /abierta/)
  assert.match(instruction, /después/)
  assert.equal(prepareLabel(state), 'Preparar elección después')
})

test('one-photon cards retain their first valid trial while repeated opposite clicks enter the general counts', () => {
  let state = predict(lesson(createGuidedState(), 0), 1)
  state = manualBefore(state, 0.1)
  assert.deepEqual(observed(state), [[1, 0]])
  state = manualBefore(state, 0.9)
  assert.equal(state.sim.detector, 1)
  assert.deepEqual(observed(state), [[1, 0]])
  assert.equal(clicks(state), 2)
  state = predict(lesson(state, 3), 1)
  state = manualBefore(manualBefore(state))
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  state = finishAfter(prepare(state), true)
  state = sim(state, { type: 'closed', value: false })
  state = finishAfter(state, true)
  assert.deepEqual(observed(state), [[1, 0], [1, 0]])
  assert.equal(clicks(state), 6)
  state = sim(state, { type: 'closed', value: false })
  state = finishAfter(state, null, 0.9)
  assert.equal(state.sim.detector, 1)
  assert.deepEqual(observed(state), [[1, 0], [1, 0]])
  assert.equal(clicks(state), 7)
})

test('revising uses prediction as the single gate and preserves the observations and earned achievement', () => {
  const free = createGuidedState()
  assert.equal(guidedReducer(free, { type: 'revise' }), free)
  let state = predict(lesson(free, 0), 0)
  state = sim(state, { type: 'emit' })
  assert.equal(guidedReducer(state, { type: 'revise' }), state)
  state = check(advance(state, 'detected'))
  assert.equal(state.progress[0].feedback, 'wrong')
  const observations = structuredClone(state.progress[0].observations)
  state = guidedReducer(state, { type: 'revise' })
  assert.equal(state.progress[0].prediction, null)
  assert.equal(state.progress[0].feedback, null)
  assert.deepEqual(state.progress[0].observations, observations)
  assert.equal(sim(state, { type: 'emit' }), state)
  assert.equal(batch(state), state)
  assert.equal(readyToCheck(state), false)
  assert.match(nextInstruction(state), /Elegí qué pensás/)
  state = check(predict(state, 1))
  assert.equal(state.progress[0].complete, true)
  state = guidedReducer(state, { type: 'revise' })
  assert.equal(state.progress[0].complete, true)
  assert.deepEqual(state.progress[0].observations, observations)
  assert.equal(batch(state), state)
  state = predict(state, 2)
  assert.equal(sim(state, { type: 'emit' }).sim.stage, 'entering')
})

test('every incorrect answer in each of the four lessons fails after real observations, and correction completes it', () => {
  for (const { index, correct, wrong } of [
    { index: 0, correct: 1, wrong: [0, 2] },
    { index: 1, correct: 0, wrong: [1, 2] },
    { index: 2, correct: 2, wrong: [0, 1] },
    { index: 3, correct: 1, wrong: [0, 2] },
  ]) {
    let evidence = predict(lesson(createGuidedState(), index), wrong[0])
    if (index === 0) evidence = manualBefore(evidence)
    else if (index === 1 || index === 2) evidence = batch(prepare(batch(evidence)))
    else evidence = finishAfter(prepare(manualBefore(evidence)), true)
    assert.equal(readyToCheck(evidence), true, `lesson ${index + 1}: the physical trials must be complete`)
    assert.equal(evidence.progress[index].complete, false)
    const observations = structuredClone(evidence.progress[index].observations)
    for (const choice of wrong) {
      const failed = check(predict(evidence, choice))
      assert.equal(failed.progress[index].feedback, 'wrong', `lesson ${index + 1}, option ${choice}: incorrect explanation`)
      assert.equal(failed.progress[index].complete, false, `lesson ${index + 1}, option ${choice}: no achievement`)
      assert.deepEqual(failed.progress[index].observations, observations)
      const corrected = check(predict(failed, correct))
      assert.equal(corrected.progress[index].feedback, 'complete', `lesson ${index + 1}: correction must succeed`)
      assert.equal(corrected.progress[index].complete, true)
      assert.deepEqual(corrected.progress[index].observations, observations)
    }
  }
})

test('reopening an observed lesson restores its final setup without changing evidence or achievements', () => {
  for (let index = 0; index < LESSONS.length; index++) {
    let state = predict(lesson(createGuidedState(), index), LESSONS[index].correct)
    if (index === 0) state = manualBefore(state)
    else if (index === 1 || index === 2) state = batch(prepare(batch(state)))
    else state = finishAfter(prepare(manualBefore(state)), true)
    const expected = structuredClone(state.sim.setup)
    for (const confirmed of [false, true]) {
      if (confirmed) state = check(state)
      const progress = structuredClone(state.progress)
      const measurements = structuredClone(state.sim.measurements)
      state = lesson(state, null)
      state = sim(state, { type: 'phase', value: 45 })
      state = sim(state, { type: 'closed', value: !expected.closed })
      state = lesson(state, index)
      assert.deepEqual(state.sim.setup, expected, `lesson ${index + 1}: restore the observed final setup`)
      assert.deepEqual(state.progress, progress)
      assert.deepEqual(state.sim.measurements, measurements)
      assert.equal(state.tracking, null)
      assert.equal(state.sim.detector, null, 'restoring a setup cannot simulate a detection')
    }
  }
})

test('changed comparisons distinguish current apparatus from saved evidence without erasing achievements', () => {
  assert.equal(comparisonChanged(createGuidedState()), false)
  for (let index = 0; index < LESSONS.length; index++) {
    let state = predict(lesson(createGuidedState(), index), LESSONS[index].correct)
    const beforeEvidence = sim(state, { type: 'phase', value: 45 })
    assert.equal(comparisonChanged(beforeEvidence), false, 'an unfinished comparison is guided by its pending step')
    if (index === 0) state = manualBefore(state)
    else if (index === 1 || index === 2) state = batch(prepare(batch(state)))
    else state = finishAfter(prepare(manualBefore(state)), true)
    assert.equal(comparisonChanged(state), false)
    state = check(state)
    const progress = structuredClone(state.progress)
    const measurements = structuredClone(state.sim.measurements)
    state = sim(state, { type: 'phase', value: 45 })
    assert.equal(comparisonChanged(state), true, `lesson ${index + 1}: a different phase must be identified`)
    assert.deepEqual(state.progress, progress)
    assert.deepEqual(state.sim.measurements, measurements)
    assert.equal(state.progress[index].complete, true)
    const free = lesson(state, null)
    assert.equal(comparisonChanged(free), false)
    state = lesson(state, index)
    assert.equal(comparisonChanged(state), false, 'restoring the lesson restores an observed configuration')
    assert.deepEqual(state.progress, progress)
    assert.deepEqual(state.sim.measurements, measurements)
  }
})

test('any observed comparison setting is accepted, including both closed timing variants in lesson four', () => {
  for (const index of [1, 2]) {
    let state = predict(lesson(createGuidedState(), index), LESSONS[index].correct)
    state = batch(prepare(batch(state)))
    assert.equal(state.progress[index].complete, false)
    for (const phase of [0, 180]) {
      state = sim(state, { type: 'phase', value: phase })
      assert.equal(comparisonChanged(state), false)
    }
    state = sim(state, { type: 'closed', value: index === 2 })
    assert.equal(comparisonChanged(state), true, 'the other output configuration was not this comparison')
  }
  let state = predict(lesson(createGuidedState(), 3), 1)
  state = finishAfter(prepare(manualBefore(state)), true)
  for (const timing of ['before', 'after']) {
    state = sim(state, { type: 'timing', value: timing })
    assert.equal(comparisonChanged(state), false)
  }
  state = sim(state, { type: 'closed', value: false })
  assert.equal(comparisonChanged(state), true, 'the observed late trial finished closed, not open')
})

test('an unsuccessful late-choice trial explains the missing insertion without granting evidence', () => {
  let state = predict(lesson(createGuidedState(), 3), 1)
  state = prepare(manualBefore(state))
  state = finishAfter(state, null)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  assert.match(nextInstruction(state), /clic.*salida abierta/)
  assert.match(nextInstruction(state), /Repetí.*insertá.*pausa/)
  state = sim(state, { type: 'closed', value: true })
  state = finishAfter(state, null)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  assert.match(nextInstruction(state), /clic es válido/)
  assert.match(nextInstruction(state), /empezó.*reunida/)
  assert.match(nextInstruction(state), /Prepará.*después.*repetí/)
  state = prepare(state)
  state = finishAfter(state, true)
  assert.equal(readyToCheck(state), true)
  assert.doesNotMatch(nextInstruction(state), /salida abierta|empezó|Repetí/)
})

test('late-trial feedback does not mislabel batches or a photon emitted open at the wrong phase', () => {
  let state = predict(lesson(createGuidedState(), 3), 1)
  state = prepare(manualBefore(state))
  state = batch(state)
  assert.equal(state.sim.flight, null)
  assert.doesNotMatch(nextInstruction(state), /Este clic|empezó/)
  state = sim(state, { type: 'phase', value: 90 })
  state = finishAfter(state, true)
  assert.deepEqual(observed(state), [[1, 0], [0, 0]])
  assert.doesNotMatch(nextInstruction(state), /empezó.*reunida/)
  assert.match(nextInstruction(state), /Prepará 0°/)
})
