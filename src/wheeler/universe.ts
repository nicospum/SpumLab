/** A finite, classical game about records. This is not a model of cosmic creation. */
export type Tool = 'light' | 'distance' | 'motion'
export type UniverseMode = 'forming' | 'fixed'
export type RegionRecord = Partial<Record<Tool, boolean>>
export const MAX_NODES = 161
export const REGIONS = [
  { id: 0, name: 'Alba' }, { id: 1, name: 'Eco' },
  { id: 2, name: 'Bruma' }, { id: 3, name: 'Órbita' },
  { id: 4, name: 'Semilla' }, { id: 5, name: 'Umbral' },
] as const
export const TOOLS: readonly { id: Tool; label: string; question: string; yes: string; no: string }[] = [
  { id: 'light', label: 'Luz', question: '¿Emite luz visible propia?', yes: 'Sí: fuente de luz visible', no: 'No: sin luz visible propia' },
  { id: 'distance', label: 'Distancia', question: '¿Está en la zona cercana?', yes: 'Sí: cerca', no: 'No: lejos' },
  { id: 'motion', label: 'Movimiento', question: '¿Cambia de posición en este mapa?', yes: 'Sí: se mueve', no: 'No: queda en su posición' },
]
export const LESSONS = [
  {
    title: 'Encendé un rincón', task: 'Con Luz, observá Alba.',
    prompt: 'Después de observar Alba, ¿qué podés afirmar?',
    options: ['Ahora tengo un registro', 'Demostré que antes no existía', 'Elegí la respuesta'], correct: 0,
    success: 'Un bit representa un sí/no (1 o 0). Con esas respuestas el mapa toma forma. Es una metáfora: no demuestra que mirar cree materia.',
    hint: 'Pensá en qué sabe el mapa antes de tu primera observación, no en qué existe en el universo real.',
  },
  {
    title: 'Separá las distancias', task: 'Con Distancia, observá Alba y Eco.',
    prompt: '¿Cerca en la imagen significa cerca en el espacio?',
    options: ['Siempre', 'No: falta conocer la profundidad', 'El más brillante está más cerca'], correct: 1,
    success: 'En la prueba registraste Alba cerca y Eco lejos. Una dirección parecida en la imagen puede ocultar una separación en profundidad.',
    hint: 'Compará los registros «cerca» y «lejos», además de dónde aparecen los puntos en la imagen.',
  },
  {
    title: 'El registro deja huella', task: 'Con Luz: observá Alba, después Eco y volvé a observar Alba.',
    prompt: 'Al volver a Alba, ¿qué conserva este juego?',
    options: ['Borra lo que no miro', 'Sortea todo otra vez', 'Las respuestas de este recorrido'], correct: 2,
    success: 'La respuesta de Alba se conservó al ir a Eco y volver. El juego mantiene lo registrado aunque explores otra región.',
    hint: 'Volver a observar recupera la misma respuesta guardada. Deshacer una consulta y abrir otro camino es una acción diferente.',
  },
  {
    title: '¿Descubrir o completar?', task: 'Observá Alba con Luz en «Al preguntar» y en «Desde el inicio».',
    prompt: 'Las dos reglas dieron Sí. ¿Qué permite concluir?',
    options: ['La realidad se crea al mirar', 'Esta respuesta no las distingue', 'Las reglas son idénticas'], correct: 1,
    success: 'Una misma respuesta encaja con dos reglas. Distinguirlas requiere una prueba que dé resultados diferentes. Esto no decide cómo se origina el universo real.',
    hint: 'Ambas reglas registraron que Alba emite luz. Ese dato por sí solo no revela cómo lo decidió el programa.',
  },
] as const

export interface UniverseNode {
  id: number
  parent: number | null
  region: number | null
  tool: Tool | null
  answer: boolean | null
  values: RegionRecord[]
  depth: number
}
export interface UniverseWorld {
  mode: UniverseMode
  seed: number
  nodes: UniverseNode[]
  active: number
  preset: Record<Tool, boolean>[] | null
}
interface ReturnVisit { mode: UniverseMode; left: boolean }
export interface UniverseProgress {
  evidence: string[]
  answer: number | null
  feedback: 'none' | 'missing' | 'incorrect' | 'correct'
  complete: boolean
  returnVisit: ReturnVisit | null
}
export interface UniverseObservation {
  mode: UniverseMode
  region: number
  tool: Tool
  answer: boolean
  repeated: boolean
  serial: number
}
export interface UniverseState {
  seed: number
  mode: UniverseMode
  region: number
  tool: Tool
  worlds: Record<UniverseMode, UniverseWorld>
  lesson: number | null
  progress: UniverseProgress[]
  last: UniverseObservation | null
  serial: number
  notice: string
}
export type UniverseAction =
  | { type: 'select-region'; region: number }
  | { type: 'tool'; tool: Tool }
  | { type: 'mode'; mode: UniverseMode }
  | { type: 'observe' }
  | { type: 'undo' }
  | { type: 'revisit'; id: number }
  | { type: 'lesson'; index: number | null }
  | { type: 'repeat-lesson' }
  | { type: 'answer'; index: number }
  | { type: 'check' }

function validRegion(region: number) { return Number.isInteger(region) && region >= 0 && region < REGIONS.length }
function validTool(tool: string): tool is Tool { return TOOLS.some(item => item.id === tool) }
function validMode(mode: string): mode is UniverseMode { return mode === 'forming' || mode === 'fixed' }
function bit(seed: number, key: string) {
  let hash = seed | 0
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619)
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  return (hash >>> 0) < 2147483648
}

/** Alba and Eco are a deliberately matched teaching pair, not physical random measurements. */
function answerFor(seed: number, region: number, tool: Tool, path: string) {
  if (region < 2 && tool === 'light') return true
  if (region < 2 && tool === 'distance') return region === 0
  return bit(seed, `${path}/${region}:${tool}`)
}
function createWorld(mode: UniverseMode, seed: number): UniverseWorld {
  return {
    mode, seed, active: 0,
    preset: mode === 'fixed' ? REGIONS.map(region => ({
      light: answerFor(seed, region.id, 'light', 'fixed'),
      distance: answerFor(seed, region.id, 'distance', 'fixed'),
      motion: answerFor(seed, region.id, 'motion', 'fixed'),
    })) : null,
    nodes: [{ id: 0, parent: null, region: null, tool: null, answer: null, values: REGIONS.map(() => ({})), depth: 0 }],
  }
}
export function createUniverse(seed: number): UniverseState {
  const safeSeed = Number.isFinite(seed) ? seed >>> 0 : 0
  return {
    seed: safeSeed, mode: 'forming', region: 0, tool: 'light',
    worlds: { forming: createWorld('forming', safeSeed), fixed: createWorld('fixed', safeSeed) },
    lesson: null,
    progress: LESSONS.map(() => ({ evidence: [], answer: null, feedback: 'none', complete: false, returnVisit: null })),
    last: null, serial: 0, notice: '',
  }
}
export function currentUniverse(state: UniverseState) { return state.worlds[state.mode].nodes[state.worlds[state.mode].active] }
export function universePath(world: UniverseWorld, id = world.active): UniverseNode[] {
  const path: UniverseNode[] = []
  let node: UniverseNode | undefined = Number.isInteger(id) ? world.nodes[id] : undefined
  while (node) {
    path.unshift(node)
    node = node.parent === null ? undefined : world.nodes[node.parent]
  }
  return path
}

export function lessonEvidence(state: UniverseState, index: number) {
  const evidence = state.progress[index]?.evidence ?? []
  const requirements = [
    [['light-alba', 'Luz de Alba registrada']],
    [['distance-alba', 'Alba: cerca'], ['distance-eco', 'Eco: lejos']],
    [['return-start', 'Observar Alba'], ['return-away', 'Observar Eco'], ['return-finish', 'Volver a Alba']],
    [['compare-forming', 'Al preguntar: Alba emite luz'], ['compare-fixed', 'Desde el inicio: Alba emite luz']],
  ][index] ?? []
  const items = requirements.map(([key, label]) => ({ label, done: evidence.includes(key) }))
  return { items, ready: items.length > 0 && items.every(item => item.done) }
}

function recordEvidence(state: UniverseState, observation: UniverseObservation): UniverseProgress[] {
  const index = state.lesson
  if (index === null) return state.progress
  const previous = state.progress[index]
  const evidence = new Set(previous.evidence)
  let returnVisit = previous.returnVisit
  const { mode, region, tool, repeated } = observation
  if (index === 0 && region === 0 && tool === 'light') evidence.add('light-alba')
  if (index === 1 && tool === 'distance') {
    if (region === 0) evidence.add('distance-alba')
    if (region === 1) evidence.add('distance-eco')
  }
  if (index === 2 && tool === 'light') {
    if (region === 0) {
      if (returnVisit?.mode === mode && returnVisit.left && repeated) evidence.add('return-finish')
      else if (!evidence.has('return-finish')) {
        evidence.delete('return-away')
        returnVisit = { mode, left: false }
      }
      evidence.add('return-start')
    } else if (region === 1 && returnVisit?.mode === mode) {
      returnVisit = { mode, left: true }
      evidence.add('return-away')
    }
  }
  if (index === 3 && region === 0 && tool === 'light') evidence.add(`compare-${mode}`)
  return state.progress.map((item, lesson) => lesson === index ? {
    ...item, evidence: [...evidence], returnVisit,
    // A prior achievement is historical. Only an explicit check can approve
    // the currently chosen explanation, including during a repeat attempt.
    feedback: 'none',
  } : item)
}

function observe(state: UniverseState): UniverseState {
  const world = state.worlds[state.mode]
  const node = currentUniverse(state)
  const { region, tool } = state
  const known = node.values[region][tool]
  let nextWorld = world
  let answer = known
  if (known === undefined) {
    const saved = world.nodes.find(child => child.parent === node.id && child.region === region && child.tool === tool)
    if (saved) {
      nextWorld = { ...world, active: saved.id }
      answer = saved.answer!
    } else {
      if (world.nodes.length >= MAX_NODES) return { ...state, notice: 'Este mapa llegó al límite de recorridos. Podés volver a una rama guardada y consultar sus registros.' }
      const path = universePath(world).slice(1).map(step => `${step.region}:${step.tool}:${Number(step.answer)}`).join('|')
      answer = world.preset?.[region][tool] ?? answerFor(world.seed, region, tool, path)
      const next: UniverseNode = {
        id: world.nodes.length, parent: node.id, region, tool, answer,
        values: node.values.map((item, id) => id === region ? { ...item, [tool]: answer } : item),
        depth: node.depth + 1,
      }
      nextWorld = { ...world, active: next.id, nodes: [...world.nodes, next] }
    }
  }
  const last: UniverseObservation = {
    mode: state.mode, region, tool, answer: answer!, repeated: known !== undefined,
    serial: state.serial + 1,
  }
  return {
    ...state, worlds: { ...state.worlds, [state.mode]: nextWorld }, last, serial: last.serial,
    progress: recordEvidence(state, last), notice: known !== undefined ? 'Registro conservado: esta respuesta ya estaba guardada en tu recorrido.' : '',
  }
}

export function universeReducer(state: UniverseState, action: UniverseAction): UniverseState {
  switch (action.type) {
    case 'select-region': return validRegion(action.region) ? { ...state, region: action.region, notice: '' } : state
    case 'tool': return validTool(action.tool) ? { ...state, tool: action.tool, notice: '' } : state
    case 'mode': return validMode(action.mode) ? { ...state, mode: action.mode, last: null, notice: action.mode === 'forming' ? 'El juego completa respuestas al consultar. Esta regla conserva su propio mapa.' : 'El juego ya preparó las respuestas; sólo ves las consultadas. Esta regla tiene su propio mapa.' } : state
    case 'observe': return observe(state)
    case 'undo': {
      const parent = currentUniverse(state).parent
      return parent === null ? state : universeReducer(state, { type: 'revisit', id: parent })
    }
    case 'revisit': {
      const world = state.worlds[state.mode]
      if (!Number.isInteger(action.id) || !world.nodes[action.id] || action.id === world.active) return state
      return {
        ...state, worlds: { ...state.worlds, [state.mode]: { ...world, active: action.id } }, last: null,
        notice: 'Volviste a este punto del juego. Los otros recorridos siguen guardados; ahora podés hacer otra pregunta.',
        // Rewinding the simulation is not evidence of leaving and revisiting a region.
        progress: state.progress.map((item, i) => i === 2 && item.feedback !== 'correct' ? {
          ...item, evidence: [], returnVisit: null, feedback: 'none',
        } : item),
      }
    }
    case 'lesson': {
      if (action.index !== null && (!Number.isInteger(action.index) || !LESSONS[action.index])) return state
      return {
        ...state, lesson: action.index, notice: '',
        ...(action.index === null ? {} : { region: 0, tool: action.index === 1 ? 'distance' as const : 'light' as const }),
      }
    }
    case 'repeat-lesson': {
      const index = state.lesson
      if (index === null) return state
      return {
        ...state, region: 0, tool: index === 1 ? 'distance' : 'light', last: null,
        notice: 'Nuevo intento: repetí las consultas. Tu logro anterior queda guardado.',
        progress: state.progress.map((item, i) => i === index ? {
          ...item, evidence: [], answer: null, feedback: 'none', returnVisit: null,
        } : item),
      }
    }
    case 'answer': {
      if (state.lesson === null || !Number.isInteger(action.index) || !LESSONS[state.lesson].options[action.index]) return state
      return {
        ...state, progress: state.progress.map((item, index) => index === state.lesson ? { ...item, answer: action.index, feedback: 'none' } : item),
      }
    }
    case 'check': {
      const index = state.lesson
      if (index === null) return state
      const progress = state.progress[index]
      const feedback = !lessonEvidence(state, index).ready || progress.answer === null ? 'missing'
        : progress.answer === LESSONS[index].correct ? 'correct' : 'incorrect'
      return {
        ...state, progress: state.progress.map((item, i) => i === index ? { ...item, feedback, complete: item.complete || feedback === 'correct' } : item),
      }
    }
  }
}
