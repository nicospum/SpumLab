import { createDelayedState, currentMeasurement, delayedReducer, idle, sameSetup } from './delayed.ts'
import type { DelayedAction, DelayedState, Setup } from './delayed.ts'

export const LESSONS = [
  {
    title: 'Un fotón, un clic',
    question: 'Si ves dos trazos, ¿cuántos clics dará un fotón?',
    options: ['Uno en cada detector', 'Uno en total', 'Ningún clic'],
    correct: 1,
    explanation: 'Los dos trazos son amplitudes de un fotón. Cada disparo termina en un solo clic.',
    hint: 'Contá los clics añadidos por ese disparo, no los trazos.',
  },
  {
    title: 'Cambiar el destino',
    question: 'Con salida reunida, ¿qué cambia de 0° a 180°?',
    options: ['Cambia el detector', 'El reparto queda igual', 'Dos clics por fotón'],
    correct: 0,
    explanation: 'Al reunir caminos, 0° da D0 y 180° da D1: la fase cambia la interferencia.',
    hint: 'Compará qué detector recibió los clics en cada fase.',
  },
  {
    title: 'Identificar el camino',
    question: 'Con salida abierta, ¿qué reparto esperás a 0° y 180°?',
    options: ['Todo D0 y luego D1', 'Ningún clic', '50/50 en ambas fases'],
    correct: 2,
    explanation: 'Cada detector identifica un brazo. Esperás 50/50 en ambas fases; los conteos pueden variar.',
    hint: '50/50 es la probabilidad: no exige exactamente 50 clics en cada detector.',
  },
  {
    title: 'Elegir cuando ya entró',
    question: 'A 0° y con salida reunida al final, ¿importa cuándo la elegís?',
    options: ['50/50 por elegir tarde', 'D0 en ambos casos', 'D1 por elegir tarde'],
    correct: 1,
    explanation: 'Mismo montaje final, mismas probabilidades. Elegir tarde no demuestra cambiar el pasado.',
    hint: 'La salida final quedó reunida a 0°, igual que al elegir antes.',
  },
] as const

export interface Observation { d0: number; d1: number }
export interface LessonProgress {
  prediction: number | null
  observations: Observation[]
  feedback: null | 'wrong' | 'missing' | 'complete'
  complete: boolean
}
interface FlightEvidence {
  lesson: number
  step: number
  inserted: boolean
  continued: boolean
}
export interface GuidedState {
  sim: DelayedState
  active: number | null
  progress: LessonProgress[]
  tracking: FlightEvidence | null
}
interface LessonStep {
  setup: Setup
  label: string
  required: number
}
const STEPS: readonly (readonly LessonStep[])[] = [
  [{ setup: { phase: 90, closed: true, timing: 'before' }, label: '90° · un fotón', required: 1 }],
  [
    { setup: { phase: 0, closed: true, timing: 'before' }, label: '0° · 100 clics', required: 100 },
    { setup: { phase: 180, closed: true, timing: 'before' }, label: '180° · 100 clics', required: 100 },
  ],
  [
    { setup: { phase: 0, closed: false, timing: 'before' }, label: '0° · 100 clics', required: 100 },
    { setup: { phase: 180, closed: false, timing: 'before' }, label: '180° · 100 clics', required: 100 },
  ],
  [
    { setup: { phase: 0, closed: true, timing: 'before' }, label: 'Antes · un fotón', required: 1 },
    { setup: { phase: 0, closed: false, timing: 'after' }, label: 'Después · un fotón', required: 1 },
  ],
]

export function createGuidedState(): GuidedState {
  return {
    sim: createDelayedState(), active: null, tracking: null,
    progress: STEPS.map(steps => ({
      prediction: null, observations: steps.map(() => ({ d0: 0, d1: 0 })), feedback: null, complete: false,
    })),
  }
}

export function lessonSteps(state: GuidedState) {
  if (state.active === null) return []
  return STEPS[state.active].map((step, index) => {
    const observation = state.progress[state.active!].observations[index]
    return { label: step.label, done: observation.d0 + observation.d1 >= step.required, ...observation }
  })
}

export function readyToCheck(state: GuidedState) {
  return state.active !== null && idle(state.sim) && state.progress[state.active].prediction !== null && lessonSteps(state).every(step => step.done)
}

export function prepareLabel(state: GuidedState): string | null {
  if (state.active === null || !idle(state.sim)) return null
  const pending = lessonSteps(state).findIndex(step => !step.done)
  if (pending < 0 || sameSetup(state.sim.setup, STEPS[state.active][pending].setup)) return null
  return state.active === 3
    ? `Preparar elección ${pending === 0 ? 'antes' : 'después'}`
    : `Preparar ${STEPS[state.active][pending].setup.phase}°`
}

function prepare(state: GuidedState, restoreObserved = false): GuidedState {
  if (state.active === null || !idle(state.sim)) return state
  const index = lessonSteps(state).findIndex(step => !step.done)
  if (index === -1 && !restoreObserved) return state
  const steps = STEPS[state.active]
  // Reopening a measured lesson shows its final setup, not another lesson's.
  // The late-choice trial finishes closed even though it must begin open.
  const setup = index >= 0 ? steps[index].setup : {
    ...steps[steps.length - 1].setup,
    closed: state.active === 3 || steps[steps.length - 1].setup.closed,
  }
  let sim = delayedReducer(state.sim, { type: 'phase', value: setup.phase })
  sim = delayedReducer(sim, { type: 'closed', value: setup.closed })
  sim = delayedReducer(sim, { type: 'timing', value: setup.timing })
  return sim === state.sim ? state : { ...state, sim, tracking: null }
}

function updateProgress(state: GuidedState, index: number, progress: LessonProgress): GuidedState {
  return { ...state, progress: state.progress.map((item, i) => i === index ? progress : item) }
}

function observe(state: GuidedState, lesson: number, step: number, added: Observation): GuidedState {
  const progress = state.progress[lesson]
  const old = progress.observations[step]
  // A card labelled "one photon" keeps one trial; the simulation still counts all trials.
  if (STEPS[lesson][step].required === 1 && old.d0 + old.d1 >= 1) return state
  return updateProgress(state, lesson, {
    ...progress,
    feedback: progress.complete ? progress.feedback : null,
    observations: progress.observations.map((item, i) => i === step ? { d0: old.d0 + added.d0, d1: old.d1 + added.d1 } : item),
  })
}

export type GuidedAction =
  | { type: 'sim'; action: DelayedAction }
  | { type: 'lesson'; index: number | null }
  | { type: 'predict'; choice: number }
  | { type: 'revise' }
  | { type: 'check' }
  | { type: 'prepare' }

export function guidedReducer(state: GuidedState, action: GuidedAction): GuidedState {
  if (action.type === 'lesson') {
    if (!idle(state.sim) || (action.index !== null && (!Number.isInteger(action.index) || !LESSONS[action.index]))) return state
    return prepare({ ...state, active: action.index, tracking: null }, true)
  }
  if (action.type === 'prepare') return prepare(state)
  if (action.type === 'revise') {
    if (state.active === null || !idle(state.sim)) return state
    const progress = state.progress[state.active]
    return updateProgress(state, state.active, { ...progress, prediction: null, feedback: null })
  }
  if (action.type === 'predict') {
    if (state.active === null || !idle(state.sim) || !Number.isInteger(action.choice) || !LESSONS[state.active].options[action.choice]) return state
    const progress = state.progress[state.active]
    return updateProgress(state, state.active, { ...progress, prediction: action.choice, feedback: null })
  }
  if (action.type === 'check') {
    if (state.active === null || !idle(state.sim)) return state
    const progress = state.progress[state.active]
    const feedback = !readyToCheck(state) ? 'missing' : progress.prediction === LESSONS[state.active].correct ? 'complete' : 'wrong'
    return updateProgress(state, state.active, { ...progress, feedback, complete: progress.complete || feedback === 'complete' })
  }

  const simAction = action.action
  const lesson = state.active
  // A prediction gates new trials, never the controls that configure or finish one.
  if (lesson !== null && state.progress[lesson].prediction === null && (simAction.type === 'emit' || simAction.type === 'batch')) return state
  const sim = delayedReducer(state.sim, simAction)
  if (sim === state.sim) return state
  let next = { ...state, sim }

  if (simAction.type === 'emit') {
    const step = lesson === null ? -1 : STEPS[lesson].findIndex(item => sameSetup(item.setup, state.sim.setup))
    next.tracking = lesson !== null && step >= 0 ? { lesson, step, inserted: false, continued: false } : null
  } else if (simAction.type === 'closed' && state.sim.stage === 'choosing' && next.tracking) {
    next.tracking = { ...next.tracking, inserted: simAction.value }
  } else if (simAction.type === 'continue' && next.tracking) {
    next.tracking = { ...next.tracking, continued: true }
  } else if (simAction.type === 'tick' && sim.stage === 'detected' && state.sim.stage !== 'detected') {
    const evidence = state.tracking
    if (evidence && lesson === evidence.lesson && sim.detector !== null && sim.flight) {
      const lateInsertion = lesson === 3 && evidence.step === 1
      const expected = STEPS[evidence.lesson][evidence.step].setup
      const valid = sameSetup(sim.flight, lateInsertion ? { ...expected, closed: true } : expected) &&
        (!lateInsertion || (evidence.inserted && evidence.continued))
      if (valid) next = observe(next, evidence.lesson, evidence.step, { d0: sim.detector === 0 ? 1 : 0, d1: sim.detector === 1 ? 1 : 0 })
    }
    next.tracking = null
  } else if (simAction.type === 'batch') {
    // The first and fourth lessons require a visible single-photon trial.
    if (lesson === 1 || lesson === 2) {
      const step = STEPS[lesson].findIndex(item => sameSetup(item.setup, state.sim.setup))
      if (step >= 0) {
        const before = currentMeasurement(state.sim)
        const after = currentMeasurement(sim)!
        next = observe(next, lesson, step, { d0: after.d0 - (before?.d0 ?? 0), d1: after.d1 - (before?.d1 ?? 0) })
      }
    }
    next.tracking = null
  } else if (simAction.type === 'clear') next.tracking = null
  return next
}

export function nextInstruction(state: GuidedState): string {
  if (state.active === null) return 'Explorá el montaje libremente o elegí un reto.'
  const lesson = state.active
  const progress = state.progress[lesson]
  if (progress.prediction === null) return 'Elegí qué pensás que va a pasar antes de emitir.'
  if (state.sim.stage === 'choosing') {
    if (lesson === 3 && state.tracking?.step === 1)
      return state.sim.setup.closed ? 'Ya insertaste la salida después de entrar. Tocá Continuar para registrar el clic.' : 'El fotón ya entró. Insertá el divisor de salida y después tocá Continuar.'
    return 'Elegí la salida y tocá Continuar para terminar este disparo. Después podés preparar el paso del reto.'
  }
  if (!idle(state.sim)) return 'Seguí este fotón hasta el detector. El reto registra el clic al terminar el viaje.'
  const steps = lessonSteps(state)
  const pending = steps.findIndex(step => !step.done)
  if (pending < 0) {
    if (progress.feedback === 'wrong') return `Probá otra explicación. ${LESSONS[lesson].hint}`
    return progress.complete ? 'Reto logrado. Podés seguir con el siguiente.' : 'Ya tenés las pruebas. Comprobá tu idea.'
  }
  const needed = STEPS[lesson][pending]
  if (!sameSetup(state.sim.setup, needed.setup)) return `Prepará ${needed.setup.phase}°, salida ${needed.setup.closed ? 'reunida' : 'abierta'}, elección ${needed.setup.timing === 'before' ? 'antes' : 'después'}.`
  if (lesson === 0) return 'Emití un fotón y contá cuántos clics añade ese disparo.'
  if (lesson === 3) return pending === 0 ? 'Emití un fotón con la salida ya reunida y esperá su clic.' : 'Emití con la salida abierta. En la pausa, insertá el divisor y continuá.'
  const count = steps[pending].d0 + steps[pending].d1
  return `Probá 100 clics a ${needed.setup.phase}° con salida ${needed.setup.closed ? 'reunida' : 'abierta'}. Llevás ${count}.`
}
