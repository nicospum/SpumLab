import test from 'node:test'
import assert from 'node:assert/strict'
import { ask, createGame, current, pathTo, QUESTIONS, revisit, WORLDS } from '../src/wheeler/game.ts'

function consistent(game) {
  const node = current(game)
  const history = pathTo(game)
  const candidates = WORLDS.filter(world => history.slice(1).every(step => {
    const has = step.question.startsWith('is:')
      ? world.id === step.question.slice(3)
      : world.features.includes(step.question)
    return has === step.answer
  })).map(world => world.id)
  assert.deepEqual(node.candidates, candidates)
  assert.ok(candidates.length > 0)
  if (game.mode === 'fixed') assert.ok(candidates.includes(game.target))
  else assert.equal(game.target, null)
}

test('both rules produce consistent records for many question orders', () => {
  for (const mode of ['surprise', 'fixed']) {
    for (let seed = 0; seed < 80; seed++) {
      let game = createGame(mode, seed)
      const queries = [...QUESTIONS.map(item => item.id), ...WORLDS.map(item => 'is:' + item.id)]
      for (let i = 0; i < queries.length; i++) {
        game = ask(game, queries[(i + seed) % queries.length])
        consistent(game)
        assert.ok(current(game).depth <= 20)
      }
    }
  }
})

test('returning to a previous answer preserves both branches and repeated answers', () => {
  const start = createGame('surprise', 29)
  const left = ask(start, 'life')
  const leftStep = structuredClone(current(left))
  const right = ask(revisit(left, 0), 'sky')
  assert.equal(right.nodes.length, 3)
  assert.deepEqual(right.nodes[leftStep.id], leftStep)
  const replay = ask(revisit(right, 0), 'life')
  assert.equal(replay.active, leftStep.id)
  assert.equal(replay.nodes, right.nodes)
  assert.deepEqual(current(replay), leftStep)
  assert.equal(revisit(right, -1), right)
  assert.equal(revisit(right, 999), right)
  assert.equal(revisit(right, .5), right)
})

test('uninformative answers are counted without losing possible objects', () => {
  let game = createGame('fixed', 10)
  const query = QUESTIONS.find(item => WORLDS.find(world => world.id === game.target).features.includes(item.id))
  game = ask(game, query.id)
  const eliminated = WORLDS.find(world => !current(game).candidates.includes(world.id))
  if (eliminated && current(game).candidates.length > 1) {
    const before = current(game)
    game = ask(game, 'is:' + eliminated.id)
    assert.equal(current(game).answer, false)
    assert.deepEqual(current(game).candidates, before.candidates)
    assert.equal(current(game).depth, before.depth + 1)
  } else assert.fail('Fixture must leave both possible and discarded objects')
})

test('20 questions per branch, invalid input and resolved words cannot alter records', () => {
  let game = createGame('fixed', 2)
  const candidates = [...QUESTIONS.map(item => item.id), ...WORLDS.map(item => 'is:' + item.id)]
  // Choose valid questions that keep the largest surviving set in the fixed-word game.
  while (current(game).depth < 20) {
    const asked = new Set(pathTo(game).map(step => step.question))
    const alternatives = candidates.filter(question => !asked.has(question))
      .map(question => ask(game, question))
      .filter(next => next !== game)
      .sort((a, b) => current(b).candidates.length - current(a).candidates.length)
    assert.ok(alternatives.length)
    game = alternatives[0]
  }
  const leaf = game
  for (const question of candidates) assert.equal(ask(game, question), leaf)
  const root = revisit(game, 0)
  assert.equal(current(root).depth, 0)
  assert.ok(ask(root, 'sky').active !== 0)
  assert.equal(ask(root, 'unknown'), root)
  assert.equal(ask(root, 'is:unknown'), root)
  const done = ask(createGame('fixed', 5), 'is:' + createGame('fixed', 5).target)
  assert.equal(current(done).candidates.length, 1)
  assert.equal(ask(done, 'life'), done)
})
