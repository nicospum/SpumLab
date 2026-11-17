export type Timing = 'before' | 'after'
export type Detector = 0 | 1
export type Stage = 'ready' | 'entering' | 'choosing' | 'leaving' | 'detected'
export interface Setup { phase: number; closed: boolean; timing: Timing }
export interface Flight extends Setup { progress: number }
export interface Measurement extends Setup { d0: number; d1: number; recent: Detector[] }
export interface DelayedState {
  setup: Setup
  stage: Stage
  flight: Flight | null
  detector: Detector | null
  measurements: Measurement[]
  batch: boolean
}
export const CHOICE_POINT = 0.48
export const OUTPUT_POINT = 0.8
export const TRAVEL_SECONDS = 3.2
export const INITIAL_SETUP: Setup = { phase: 0, closed: true, timing: 'after' }

export function createDelayedState(): DelayedState {
  return { setup: { ...INITIAL_SETUP }, stage: 'ready', flight: null, detector: null, measurements: [], batch: false }
}

/** Ideal single-photon MZI. phi is the TOTAL relative phase, in degrees. */
export function probabilities(phase: number, closed: boolean): [number, number] {
  if (!Number.isFinite(phase)) throw new RangeError('La fase debe ser finita.')
  const p0 = closed ? Math.max(0, Math.min(1, (1 + Math.cos((phase % 360) * Math.PI / 180)) / 2)) : 0.5
  return [p0, 1 - p0]
}

export function detect(setup: Setup, random: number): Detector {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new RangeError('El sorteo debe estar entre 0 y 1.')
  return random < probabilities(setup.phase, setup.closed)[0] ? 0 : 1
}

export function sameSetup(a: Setup, b: Setup) {
  return a.phase === b.phase && a.closed === b.closed && a.timing === b.timing
}
export function idle(state: DelayedState) {
  return state.stage === 'ready' || state.stage === 'detected'
}
export function canChoose(state: DelayedState) {
  return idle(state) || state.stage === 'choosing'
}
export function effectiveSetup(state: DelayedState): Setup {
  return state.flight && !idle(state) ? { ...state.flight, closed: state.stage === 'choosing' ? state.setup.closed : state.flight.closed } : state.setup
}
export function currentMeasurement(state: DelayedState) {
  const setup = effectiveSetup(state)
  return state.measurements.find(item => sameSetup(item, setup))
}

function record(measurements: Measurement[], setup: Setup, outcomes: Detector[]): Measurement[] {
  const previous = measurements.find(item => sameSetup(item, setup))
  const d0 = outcomes.filter(outcome => outcome === 0).length
  const next: Measurement = {
    phase: setup.phase, closed: setup.closed, timing: setup.timing,
    d0: (previous?.d0 ?? 0) + d0,
    d1: (previous?.d1 ?? 0) + outcomes.length - d0,
    recent: [...(previous?.recent ?? []), ...outcomes].slice(-24),
  }
  return [...measurements.filter(item => !sameSetup(item, setup)), next]
}

export type DelayedAction =
  | { type: 'phase'; value: number }
  | { type: 'closed'; value: boolean }
  | { type: 'timing'; value: Timing }
  | { type: 'emit' }
  | { type: 'continue' }
  | { type: 'tick'; seconds: number; random: number }
  | { type: 'batch'; randoms: readonly number[] }
  | { type: 'clear' }

export function delayedReducer(state: DelayedState, action: DelayedAction): DelayedState {
  switch (action.type) {
    case 'phase': {
      if (!idle(state) || !Number.isFinite(action.value)) return state
      const phase = Math.round(Math.max(0, Math.min(360, action.value)) / 15) * 15
      if (phase === state.setup.phase) return state
      return { ...state, setup: { ...state.setup, phase }, stage: 'ready', flight: null, detector: null, batch: false }
    }
    case 'closed':
      if (!canChoose(state) || action.value === state.setup.closed) return state
      return { ...state, setup: { ...state.setup, closed: action.value }, detector: null, batch: false,
        stage: idle(state) ? 'ready' : state.stage, flight: idle(state) ? null : state.flight }
    case 'timing':
      if (!idle(state) || !['before', 'after'].includes(action.value) || action.value === state.setup.timing) return state
      return { ...state, setup: { ...state.setup, timing: action.value }, stage: 'ready', flight: null, detector: null, batch: false }
    case 'emit':
      if (!idle(state)) return state
      return { ...state, stage: 'entering', flight: { ...state.setup, progress: 0 }, detector: null, batch: false }
    case 'continue':
      if (state.stage !== 'choosing' || !state.flight) return state
      return { ...state, stage: 'leaving', flight: { ...state.flight, closed: state.setup.closed } }
    case 'tick': {
      if (!state.flight || !['entering', 'leaving'].includes(state.stage) || !Number.isFinite(action.seconds) || action.seconds <= 0) return state
      const progress = Math.min(1, state.flight.progress + Math.min(0.1, action.seconds) / TRAVEL_SECONDS)
      if (state.stage === 'entering' && progress >= CHOICE_POINT && state.flight.timing === 'after')
        return { ...state, stage: 'choosing', flight: { ...state.flight, progress: CHOICE_POINT } }
      if (progress < 1)
        return { ...state, stage: progress >= CHOICE_POINT ? 'leaving' : 'entering', flight: { ...state.flight, progress } }
      const detector = detect(state.flight, action.random)
      return { ...state, stage: 'detected', flight: { ...state.flight, progress: 1 }, detector,
        measurements: record(state.measurements, state.flight, [detector]) }
    }
    case 'batch': {
      if (!idle(state) || action.randoms.length !== 100) return state
      const outcomes = action.randoms.map(random => detect(state.setup, random))
      return { ...state, stage: 'detected', flight: null, detector: null, batch: true,
        measurements: record(state.measurements, state.setup, outcomes) }
    }
    case 'clear':
      if (!idle(state)) return state
      return { ...createDelayedState(), setup: state.setup }
  }
}
