import test from 'node:test'
import assert from 'node:assert/strict'
import { createUniverse, currentUniverse, lessonEvidence, LESSONS, MAX_NODES, REGIONS, TOOLS, universePath, universeReducer } from '../src/wheeler/universe.ts'

const act = (state, type, fields = {}) => universeReducer(state, { type, ...fields })
function observe(state, region, tool) {
  return act(act(act(state, 'select-region', { region }), 'tool', { tool }), 'observe')
}
function consistent(world) {
  for (const node of world.nodes) {
    const independentlyReconstructed = REGIONS.map(() => ({}))
    for (const step of universePath(world, node.id).slice(1)) {
      assert.equal(independentlyReconstructed[step.region][step.tool], undefined)
      independentlyReconstructed[step.region][step.tool] = step.answer
    }
    assert.deepEqual(node.values, independentlyReconstructed)
    assert.equal(node.depth, independentlyReconstructed.reduce((total, record) => total + Object.keys(record).length, 0))
    assert.ok(node.depth <= 18)
    if (world.preset) for (let region = 0; region < 6; region++) {
      for (const [tool, answer] of Object.entries(node.values[region])) assert.equal(answer, world.preset[region][tool])
    }
  }
}

test('forming starts without hidden properties; fixed keeps a complete preset but both maps start unobserved', () => {
  const state = createUniverse(123)
  assert.equal(state.worlds.forming.preset, null)
  assert.equal(state.worlds.fixed.preset.length, 6)
  for (const world of Object.values(state.worlds)) {
    assert.deepEqual(world.nodes[0].values, [{}, {}, {}, {}, {}, {}])
    assert.equal(world.active, 0)
  }
  assert.equal(state.last, null)
  assert.equal(state.lesson, null)
})

test('didactic pair produces shared light records and distinct near/far records in both rules', () => {
  for (let seed = 0; seed < 40; seed++) for (const mode of ['forming', 'fixed']) {
    let state = act(createUniverse(seed), 'mode', { mode })
    for (const region of [0, 1]) {
      state = observe(state, region, 'light')
      assert.equal(state.last.answer, true)
      state = observe(state, region, 'distance')
      assert.equal(state.last.answer, region === 0)
    }
  }
})

test('records are consistent with every ancestor across question orders and both rules', () => {
  const questions = REGIONS.flatMap(region => TOOLS.map(tool => [region.id, tool.id]))
  for (let seed = 0; seed < 45; seed++) for (const mode of ['forming', 'fixed']) {
    let state = act(createUniverse(seed), 'mode', { mode })
    for (let i = 0; i < questions.length; i++) {
      const [region, tool] = questions[(i * 5 + seed) % questions.length]
      state = observe(state, region, tool)
    }
    consistent(state.worlds[mode])
    assert.equal(currentUniverse(state).depth, 18)
    assert.equal(state.worlds[mode].nodes.length, 19)
  }
})

test('observing known properties keeps the same records and does not count as new information', () => {
  let state = observe(createUniverse(4), 4, 'motion')
  const first = currentUniverse(state)
  const nodes = state.worlds.forming.nodes
  for (let i = 0; i < 50; i++) state = observe(state, 4, 'motion')
  assert.equal(currentUniverse(state), first)
  assert.equal(state.worlds.forming.nodes, nodes)
  assert.equal(state.last.repeated, true)
  assert.equal(currentUniverse(state).depth, 1)
  assert.equal(state.serial, 51)
})

test('undo and alternate questions preserve branches and replay the saved child exactly', () => {
  let state = observe(createUniverse(42), 3, 'motion')
  const left = structuredClone(currentUniverse(state))
  state = act(state, 'undo')
  assert.deepEqual(currentUniverse(state).values, [{}, {}, {}, {}, {}, {}])
  state = observe(state, 3, 'distance')
  const right = structuredClone(currentUniverse(state))
  assert.equal(state.worlds.forming.nodes.length, 3)
  state = act(state, 'revisit', { id: 0 })
  state = observe(state, 3, 'motion')
  assert.deepEqual(currentUniverse(state), left)
  assert.deepEqual(state.worlds.forming.nodes[right.id], right)
  assert.equal(state.worlds.forming.nodes.length, 3)
  consistent(state.worlds.forming)
})

test('forming allows unrecorded properties to depend on the question path; fixed properties do not', () => {
  let changed = 0
  for (let seed = 0; seed < 80; seed++) for (const mode of ['forming', 'fixed']) {
    const start = act(createUniverse(seed), 'mode', { mode })
    const direct = observe(start, 4, 'motion')
    const afterOtherQuestion = observe(observe(start, 3, 'light'), 4, 'motion')
    if (mode === 'fixed') assert.equal(direct.last.answer, afterOtherQuestion.last.answer)
    else if (direct.last.answer !== afterOtherQuestion.last.answer) changed++
  }
  assert.ok(changed > 10, 'Alternate question orders should actually provide different possible continuations')
})

test('switching rules preserves independent maps and serials keep increasing', () => {
  let state = observe(createUniverse(5), 2, 'distance')
  const forming = state.worlds.forming
  const firstSerial = state.serial
  state = act(state, 'mode', { mode: 'fixed' })
  assert.equal(state.last, null)
  assert.equal(currentUniverse(state).depth, 0)
  state = observe(state, 5, 'light')
  assert.ok(state.last.serial > firstSerial)
  const fixed = state.worlds.fixed
  state = act(state, 'mode', { mode: 'forming' })
  assert.equal(state.worlds.forming, forming)
  assert.equal(state.worlds.fixed, fixed)
  assert.equal(currentUniverse(state).values[2].distance, forming.nodes[forming.active].values[2].distance)
})

test('node limit bounds branch storage while allowing saved branches and known observations', () => {
  let state = createUniverse(1)
  // Enumerate distinct prefixes, restoring root before each. No infinite or exponential traversal.
  const questions = REGIONS.flatMap(region => TOOLS.map(tool => [region.id, tool.id]))
  outer: for (const first of questions) for (const second of questions) {
    state = act(state, 'revisit', { id: 0 })
    state = observe(state, ...first)
    state = observe(state, ...second)
    if (state.worlds.forming.nodes.length === MAX_NODES) break outer
  }
  assert.equal(state.worlds.forming.nodes.length, MAX_NODES)
  const saved = state.worlds.forming.nodes[1]
  state = act(state, 'revisit', { id: saved.id })
  state = observe(state, saved.region, saved.tool)
  assert.equal(state.last.repeated, true)
  const beforeNodes = state.worlds.forming.nodes
  // A complete known branch can be replayed, but a new leaf must not be allocated.
  for (const question of questions) state = observe(state, ...question)
  assert.equal(state.worlds.forming.nodes, beforeNodes)
  assert.match(state.notice, /límite|conservado/)
  consistent(state.worlds.forming)
})

function completeEvidence(state, lesson) {
  if (lesson === 0) return observe(state, 0, 'light')
  if (lesson === 1) return observe(observe(state, 0, 'distance'), 1, 'distance')
  if (lesson === 2) return observe(observe(observe(state, 0, 'light'), 1, 'light'), 0, 'light')
  state = observe(act(state, 'mode', { mode: 'forming' }), 0, 'light')
  return observe(act(state, 'mode', { mode: 'fixed' }), 0, 'light')
}

test('each challenge requires fresh active evidence, a chosen explanation and explicit checking', () => {
  for (let lesson = 0; lesson < 4; lesson++) {
    let state = completeEvidence(createUniverse(100), lesson)
    state = act(state, 'lesson', { index: lesson })
    assert.equal(lessonEvidence(state, lesson).ready, false, 'Free exploration cannot silently complete a challenge')
    state = act(state, 'answer', { index: LESSONS[lesson].correct })
    state = act(state, 'check')
    assert.equal(state.progress[lesson].feedback, 'missing')
    assert.equal(state.progress[lesson].complete, false)
    state = completeEvidence(state, lesson)
    assert.equal(lessonEvidence(state, lesson).ready, true)
    assert.equal(state.progress[lesson].complete, false)
    state = act(state, 'answer', { index: (LESSONS[lesson].correct + 1) % 3 })
    state = act(state, 'check')
    assert.equal(state.progress[lesson].feedback, 'incorrect')
    assert.equal(state.progress[lesson].complete, false)
    const evidence = state.progress[lesson].evidence
    state = act(state, 'answer', { index: LESSONS[lesson].correct })
    assert.equal(state.progress[lesson].evidence, evidence)
    state = act(state, 'check')
    assert.equal(state.progress[lesson].feedback, 'correct')
    assert.equal(state.progress[lesson].complete, true)
  }
})

test('starting challenges and selecting regions or tools never counts as an observation', () => {
  for (let lesson = 0; lesson < 4; lesson++) {
    let state = act(createUniverse(2), 'lesson', { index: lesson })
    for (const region of REGIONS) state = act(state, 'select-region', { region: region.id })
    for (const tool of TOOLS) state = act(state, 'tool', { tool: tool.id })
    for (const mode of ['fixed', 'forming']) state = act(state, 'mode', { mode })
    assert.equal(lessonEvidence(state, lesson).ready, false)
    assert.deepEqual(state.progress[lesson].evidence, [])
    assert.equal(state.serial, 0)
    assert.equal(currentUniverse(state).depth, 0)
  }
})

test('return challenge requires another region in the same rule and cannot use rewinding as evidence', () => {
  let state = act(createUniverse(20), 'lesson', { index: 2 })
  state = observe(state, 0, 'light')
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, false)
  state = act(state, 'mode', { mode: 'fixed' })
  state = observe(state, 1, 'light')
  state = act(state, 'mode', { mode: 'forming' })
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, false)
  state = observe(state, 1, 'light')
  state = act(state, 'undo')
  assert.deepEqual(state.progress[2].evidence, [])
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, false)
  state = observe(state, 1, 'light')
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, true)
})

test('comparison challenge needs observing the same property in both rules', () => {
  let state = act(createUniverse(3), 'lesson', { index: 3 })
  state = observe(state, 0, 'light')
  state = act(state, 'mode', { mode: 'fixed' })
  state = observe(state, 0, 'distance')
  state = observe(state, 1, 'light')
  assert.equal(lessonEvidence(state, 3).ready, false)
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 3).ready, true)
  assert.equal(state.worlds.forming.nodes[state.worlds.forming.active].values[0].light, state.worlds.fixed.nodes[state.worlds.fixed.active].values[0].light)
})

test('switching lessons and exploration keeps progress but unrelated observations cannot satisfy another challenge', () => {
  let state = act(createUniverse(7), 'lesson', { index: 0 })
  state = completeEvidence(state, 0)
  const progress = state.progress[0]
  state = act(state, 'lesson', { index: null })
  state = observe(state, 0, 'distance')
  state = observe(state, 1, 'distance')
  assert.deepEqual(state.progress[1].evidence, [])
  state = act(state, 'lesson', { index: 1 })
  state = observe(state, 0, 'distance')
  assert.equal(lessonEvidence(state, 1).ready, false)
  state = act(state, 'lesson', { index: 0 })
  assert.equal(state.progress[0], progress)
})

test('repeating each completed challenge clears the attempt but preserves the achievement and maps', () => {
  for (let lesson = 0; lesson < 4; lesson++) {
    let state = act(createUniverse(77), 'lesson', { index: lesson })
    state = completeEvidence(state, lesson)
    state = act(act(state, 'answer', { index: LESSONS[lesson].correct }), 'check')
    assert.equal(state.progress[lesson].complete, true)
    state = act(state, 'lesson', { index: null })
    state = act(state, 'revisit', { id: 0 })
    state = act(state, 'lesson', { index: lesson })
    const mapsBefore = state.worlds
    state = act(state, 'repeat-lesson')
    assert.equal(state.worlds, mapsBefore, 'Starting a repeat must not alter either map or its branches')
    assert.equal(state.progress[lesson].complete, true, 'The previous achievement remains earned')
    assert.deepEqual(state.progress[lesson].evidence, [])
    assert.equal(state.progress[lesson].answer, null)
    assert.equal(state.progress[lesson].feedback, 'none')
    assert.equal(state.progress[lesson].returnVisit, null)
    assert.equal(lessonEvidence(state, lesson).ready, false)
    assert.equal(state.region, 0)
    assert.equal(state.tool, lesson === 1 ? 'distance' : 'light')
    state = act(act(state, 'answer', { index: LESSONS[lesson].correct }), 'check')
    assert.equal(state.progress[lesson].feedback, 'missing')
    state = completeEvidence(state, lesson)
    assert.equal(state.progress[lesson].feedback, 'none', 'Observing cannot approve an explanation automatically')
    state = act(state, 'check')
    assert.equal(state.progress[lesson].feedback, 'correct')
  }
})

test('a past achievement never auto-approves a newly incorrect answer when observing again', () => {
  for (let lesson = 0; lesson < 4; lesson++) {
    let state = act(createUniverse(8), 'lesson', { index: lesson })
    state = completeEvidence(state, lesson)
    state = act(act(state, 'answer', { index: LESSONS[lesson].correct }), 'check')
    state = act(state, 'answer', { index: (LESSONS[lesson].correct + 1) % 3 })
    state = completeEvidence(state, lesson)
    assert.equal(state.progress[lesson].complete, true)
    assert.equal(state.progress[lesson].feedback, 'none')
    state = act(state, 'check')
    assert.equal(state.progress[lesson].feedback, 'incorrect')
  }
})

test('repeating the return challenge still invalidates its fresh sequence on rewind', () => {
  let state = act(createUniverse(9), 'lesson', { index: 2 })
  state = completeEvidence(state, 2)
  state = act(act(state, 'answer', { index: LESSONS[2].correct }), 'check')
  state = act(state, 'repeat-lesson')
  state = observe(state, 0, 'light')
  state = observe(state, 1, 'light')
  state = act(state, 'undo')
  assert.equal(state.progress[2].complete, true)
  assert.deepEqual(state.progress[2].evidence, [])
  state = observe(state, 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, false)
  state = observe(observe(state, 1, 'light'), 0, 'light')
  assert.equal(lessonEvidence(state, 2).ready, true)
  assert.equal(state.progress[2].feedback, 'none')
})

test('invalid actions and boundary inputs do not corrupt a world or a challenge', () => {
  const state = createUniverse(Infinity)
  for (const region of [-1, 6, NaN, .5]) assert.equal(act(state, 'select-region', { region }), state)
  for (const id of [-1, 999, NaN, .5]) assert.equal(act(state, 'revisit', { id }), state)
  assert.equal(act(state, 'tool', { tool: 'anything' }), state)
  assert.equal(act(state, 'mode', { mode: 'anything' }), state)
  for (const index of [-1, 4, NaN, .5]) assert.equal(act(state, 'lesson', { index }), state)
  assert.equal(act(state, 'answer', { index: 0 }), state)
  assert.equal(act(state, 'check'), state)
  assert.equal(act(state, 'repeat-lesson'), state)
  const guided = act(state, 'lesson', { index: 0 })
  for (const index of [-1, 3, NaN, .5]) assert.equal(act(guided, 'answer', { index }), guided)
  assert.equal(lessonEvidence(state, -1).ready, false)
  assert.deepEqual(universePath(state.worlds.forming, -1), [])
})
