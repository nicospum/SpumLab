export type Mode = 'surprise' | 'fixed'
export const LIMIT = 20

export const WORLDS = [
  { id: 'cloud', name: 'Nube', glyph: '☁', description: 'Nube de gotas de agua en el cielo.', features: ['sky', 'water'] },
  { id: 'star', name: 'Estrella', glyph: '✦', description: 'Estrella como el Sol, que produce luz propia.', features: ['sky', 'space', 'light'] },
  { id: 'moon', name: 'Luna', glyph: '☾', description: 'La Luna terrestre, rocosa y visible por luz reflejada.', features: ['sky', 'space', 'rock'] },
  { id: 'comet', name: 'Cometa', glyph: '☄', description: 'Cometa del sistema solar con cola de polvo que refleja la luz del Sol.', features: ['sky', 'space'] },
  { id: 'rainbow', name: 'Arcoíris', glyph: '🌈', description: 'Arco de colores formado por luz solar y gotas de agua en el cielo.', features: ['sky', 'water'] },
  { id: 'mountain', name: 'Montaña', glyph: '⛰', description: 'Montaña rocosa.', features: ['rock'] },
  { id: 'volcano', name: 'Volcán', glyph: '🌋', description: 'Volcán en erupción, con lava incandescente.', features: ['rock', 'light'] },
  { id: 'ocean', name: 'Océano', glyph: '≋', description: 'Gran masa de agua salada.', features: ['water'] },
  { id: 'tree', name: 'Árbol', glyph: '🌳', description: 'Árbol vivo con raíces, tronco y hojas.', features: ['life', 'plant'] },
  { id: 'flower', name: 'Planta con flor', glyph: '✿', description: 'Planta viva con raíces y una flor.', features: ['life', 'plant'] },
  { id: 'butterfly', name: 'Mariposa', glyph: '🦋', description: 'Mariposa adulta con alas.', features: ['life', 'animal', 'wings'] },
  { id: 'fish', name: 'Pez', glyph: '🐟', description: 'Pez vivo en el agua.', features: ['life', 'animal', 'water'] },
  { id: 'lighthouse', name: 'Faro', glyph: '♜', description: 'Faro costero construido por personas, con su lámpara encendida.', features: ['made', 'light'] },
  { id: 'candle', name: 'Vela', glyph: '🕯', description: 'Vela fabricada por personas, con la llama encendida.', features: ['made', 'light'] },
  { id: 'telescope', name: 'Telescopio', glyph: '🔭', description: 'Telescopio construido para observar objetos distantes.', features: ['made', 'instrument'] },
  { id: 'clock', name: 'Reloj', glyph: '◷', description: 'Reloj mecánico construido para medir el tiempo.', features: ['made', 'instrument'] },
] as const
export type WorldId = (typeof WORLDS)[number]['id']

export const QUESTIONS = [
  { id: 'life', text: '¿Es un ser vivo?', detail: 'Plantas y animales de este conjunto.' },
  { id: 'made', text: '¿Lo construyeron personas?', detail: 'Faro, vela, telescopio o reloj.' },
  { id: 'sky', text: '¿Aparece en el cielo?', detail: 'Nube, estrella, Luna, cometa o arcoíris.' },
  { id: 'light', text: '¿Brilla por una fuente propia?', detail: 'Estrella, lava del volcán, lámpara del faro o llama de la vela. La pregunta usa estas cuatro fuentes del juego.' },
  { id: 'water', text: '¿El agua es parte de su descripción?', detail: 'Nube de gotas, arcoíris, océano o pez en el agua.' },
  { id: 'space', text: '¿Es un astro del espacio?', detail: 'Estrella, Luna o cometa.' },
  { id: 'rock', text: '¿Es Luna, montaña o volcán?', detail: 'Este grupo reúne los tres cuerpos rocosos elegidos en el juego.' },
  { id: 'plant', text: '¿Es una planta?', detail: 'Árbol o planta con flor.' },
  { id: 'animal', text: '¿Es un animal?', detail: 'Mariposa o pez.' },
  { id: 'wings', text: '¿Tiene alas?', detail: 'La mariposa adulta de este conjunto.' },
  { id: 'instrument', text: '¿Es un instrumento de observación o medida?', detail: 'Telescopio o reloj mecánico.' },
] as const

export function questionText(question: string) {
  const world = WORLDS.find(item => `is:${item.id}` === question)
  return world ? `¿Es ${world.name.toLocaleLowerCase('es')}?` : QUESTIONS.find(item => item.id === question)?.text
}

export function matches(world: WorldId, question: string) {
  if (question.startsWith('is:')) return question === `is:${world}`
  const item = WORLDS.find(candidate => candidate.id === world)!
  return (item.features as readonly string[]).includes(question)
}

export interface Step {
  id: number
  parent: number | null
  question: string | null
  answer: boolean | null
  candidates: WorldId[]
  depth: number
}
export interface Game {
  mode: Mode
  seed: number
  target: WorldId | null
  nodes: Step[]
  active: number
}

/** Reproducible game coin. It chooses an answer, never a hidden word in surprise mode. */
function randomUnit(seed: number, text: string) {
  let hash = seed | 0
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  return (hash >>> 0) / 4294967296
}

export function createGame(mode: Mode, seed: number): Game {
  return {
    mode,
    seed,
    target: mode === 'fixed' ? WORLDS[Math.floor(randomUnit(seed, 'word') * WORLDS.length)].id : null,
    nodes: [{ id: 0, parent: null, question: null, answer: null, candidates: WORLDS.map(item => item.id), depth: 0 }],
    active: 0,
  }
}
export function current(game: Game) { return game.nodes[game.active] }
export function pathTo(game: Game, id = game.active): Step[] {
  const path: Step[] = []
  let node: Step | undefined = game.nodes[id]
  while (node) {
    path.unshift(node)
    node = node.parent === null ? undefined : game.nodes[node.parent]
  }
  return path
}
export function ask(game: Game, question: string): Game {
  const node = current(game)
  if (!questionText(question) || node.depth >= LIMIT || node.candidates.length === 1) return game
  const existing = game.nodes.find(child => child.parent === node.id && child.question === question)
  if (existing) return { ...game, active: existing.id }
  if (pathTo(game).some(step => step.question === question)) return game
  const yes = node.candidates.filter(world => matches(world, question))
  const no = node.candidates.filter(world => !matches(world, question))
  let answer: boolean
  if (game.target) answer = matches(game.target, question)
  else if (!yes.length) answer = false
  else if (!no.length) answer = true
  else {
    const history = pathTo(game).map(step => `${step.question}=${step.answer}`).join('|')
    answer = randomUnit(game.seed, `${history}|${question}`) < .5
  }
  const child: Step = {
    id: game.nodes.length, parent: node.id, question, answer,
    candidates: answer ? yes : no, depth: node.depth + 1,
  }
  return { ...game, nodes: [...game.nodes, child], active: child.id }
}
export function revisit(game: Game, id: number): Game {
  return Number.isInteger(id) && game.nodes[id] ? { ...game, active: id } : game
}
