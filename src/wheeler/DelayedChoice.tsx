import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import DelayedBoard from './DelayedBoard'
import DelayedChallenges from './DelayedChallenges'
import { createGuidedState, guidedReducer } from './challenges'
import { canChoose, currentMeasurement, effectiveSetup, idle, probabilities } from './delayed'
import type { DelayedAction } from './delayed'
import './delayed.css'

export default function DelayedChoice({ active }: { active: boolean }) {
  const [learning, act] = useReducer(guidedReducer, undefined, createGuidedState)
  const state = learning.sim
  const dispatch = useCallback((action: DelayedAction) => act({ type: 'sim', action }), [])
  const guided = learning.active !== null
  const wasGuided = useRef(guided)
  const progress = guided ? learning.progress[learning.active!] : null
  const needsPrediction = guided && progress?.prediction === null
  const [paused, setPaused] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const status = useRef<HTMLDivElement>(null)
  const guideResult = useRef<HTMLDivElement>(null)
  const splitter = useRef<HTMLButtonElement>(null)
  const pause = useRef<HTMLButtonElement>(null)
  const initialStage = useRef(state.stage)
  const setup = effectiveSetup(state)
  const expected = probabilities(setup.phase, setup.closed)
  const measurement = currentMeasurement(state)
  const total = (measurement?.d0 ?? 0) + (measurement?.d1 ?? 0)
  const otherClicks = state.measurements.reduce((sum, item) => sum + item.d0 + item.d1, 0) - total
  const moving = state.stage === 'entering' || state.stage === 'leaving'
  const ready = idle(state)
  const choosing = state.stage === 'choosing'

  useEffect(() => {
    if (!active || !moving || paused) return
    let frame = 0
    let previous: number | null = null
    function resetClock() { previous = null }
    function animate(time: number) {
      if (document.hidden) previous = null
      else if (previous === null) previous = time
      else if (time - previous >= 1000 / 30) {
        dispatch({ type: 'tick', seconds: (time - previous) / 1000, random: Math.random() })
        previous = time
      }
      frame = requestAnimationFrame(animate)
    }
    document.addEventListener('visibilitychange', resetClock)
    frame = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [active, moving, paused, dispatch])

  useLayoutEffect(() => {
    if (!active || initialStage.current === state.stage) return
    initialStage.current = state.stage
    if (state.stage === 'choosing') splitter.current?.focus({ preventScroll: true })
    if (state.stage === 'detected') (guided ? guideResult.current : status.current)?.focus({ preventScroll: true })
    if (state.stage === 'entering' || state.stage === 'leaving') pause.current?.focus({ preventScroll: true })
    if (viewport.current && (viewport.current.getBoundingClientRect().top < -20 || viewport.current.getBoundingClientRect().bottom > window.innerHeight - 72))
      viewport.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, state.stage, guided])

  useLayoutEffect(() => {
    if (!active || !guided || !viewport.current) return
    const target = guideResult.current ?? viewport.current.querySelector<HTMLButtonElement>('.dc-prediction-options button')
    target?.focus({ preventScroll: true })
    const bounds = viewport.current.getBoundingClientRect()
    if (bounds.top < 0 || bounds.bottom > window.innerHeight - 64)
      viewport.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, guided, learning.active, progress?.prediction, progress?.feedback])

  useLayoutEffect(() => {
    const leaving = wasGuided.current && !guided
    wasGuided.current = guided
    if (!active || !leaving) return
    status.current?.focus({ preventScroll: true })
    viewport.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, guided])

  let headline = 'Tocá la fuente para enviar un fotón.'
  const reading = setup.closed
    ? 'Con caminos reunidos, variá la fase y compará muchos clics: el reparto cambia por interferencia.'
    : 'Cada clic identifica un brazo: D0 → A, D1 → B. Cambiar la fase no altera el reparto esperado 50/50.'
  let explanation = reading
  if (state.stage === 'entering') {
    headline = paused ? 'Viaje pausado.' : 'El fotón está entrando.'
    explanation = state.setup.timing === 'after' ? 'La elección se habilita después del primer divisor.' : 'La configuración se eligió antes de emitir.'
  } else if (choosing) {
    headline = 'Ya entró. Ahora elegí cómo medir.'
    explanation = 'Pausa didáctica: ya pasó la entrada y aún no llegó a la salida. Elegí el divisor y continuá.'
  } else if (state.stage === 'leaving') {
    headline = paused ? 'Viaje pausado.' : 'La elección está fijada para este fotón.'
    explanation = setup.closed ? 'Las amplitudes se reúnen en el divisor de salida.' : 'D0 identifica el brazo A y D1 el brazo B.'
  } else if (state.stage === 'detected') {
    headline = state.batch ? 'Se sumaron 100 detecciones simuladas.' : `Un fotón, un clic en D${state.detector}.`
    explanation = reading
  }

  return <section id="eleccion-retardada" className="wd-game dc-lab" data-scene-workspace="" aria-labelledby="dc-title">
    <div className="dc-heading"><p className="wd-eyebrow">ELECCIÓN RETARDADA DE WHEELER</p><h2 id="dc-title">Elegir cuando ya entró.</h2>
      <p>Enviá un fotón, una unidad de luz. Elegí si sus caminos posibles se reúnen y observá dónde se registra el clic.</p></div>
    {!guided && <div className="dc-explore-tools">
      <button disabled={!ready} onClick={() => act({ type: 'lesson', index: 0 })} data-help-title="Cuatro retos guiados" data-help-body="Hacé una predicción, probala sobre el montaje y comprobá tu explicación. Cada reto guarda sus propias observaciones durante esta visita; podés volver a la exploración libre.">Empezar los cuatro retos →</button>
      <span>{learning.progress.filter(item => item.complete).length}/4 comprendidos</span>
    </div>}
    {!guided && <div className="dc-timing" aria-label="Momento de la elección">
      <button disabled={!ready} aria-pressed={state.setup.timing === 'before'} onClick={() => dispatch({ type: 'timing', value: 'before' })} data-help-title="Elegir antes de emitir" data-help-body="El divisor de salida se fija al emitir y permanece igual durante ese disparo.">Elegir antes</button>
      <button disabled={!ready} aria-pressed={state.setup.timing === 'after'} onClick={() => dispatch({ type: 'timing', value: 'after' })} data-help-title="Elegir después de entrar" data-help-body="El viaje se pausa después del primer divisor. Podés insertar o retirar el divisor de salida antes de continuar hacia los detectores.">Elegir después</button>
    </div>}

    <div className={`dc-workspace ${guided ? 'dc-guided' : ''}`} ref={viewport}>
      <div className="dc-apparatus">
      <div className="dc-board spum-live-stage" aria-label="Interferómetro de dos caminos">
        <DelayedBoard state={state} active={active} />
        <div className="dc-reading" data-help-title={setup.closed ? 'Medir interferencia' : 'Identificar el brazo'}
          data-help-body={setup.closed ? 'Los dos brazos se reúnen. Sus amplitudes, que sirven para calcular probabilidades, pueden reforzarse o cancelarse. Al cambiar la fase y acumular muchos clics podés ver ese efecto. Un clic solo no alcanza para demostrar interferencia.' : 'Con el divisor retirado, cada brazo llega a un detector distinto. Un clic en D0 identifica el brazo A y un clic en D1 identifica el B. Los detectores siguen activos, igual que cuando reunís los caminos.'}>
          <span>Qué medís</span><strong>{setup.closed ? 'Interferencia' : 'Camino'}</strong>
          <small>{setup.closed ? 'Fase → reparto' : 'D0 ← A · D1 ← B'}</small>
        </div>
        {[0, 1].map(detector => {
          const clicks = (detector === 0 ? measurement?.d0 : measurement?.d1) ?? 0
          return <div key={detector} className={`dc-detector dc-detector-${detector} ${state.detector === detector ? 'dc-detected' : ''}`}
          data-help-title={`Detector D${detector}`} data-help-body="Registra clics de fotones individuales. El porcentaje es la probabilidad calculada. El contador reúne detecciones simuladas con esta fase, salida y momento de elección.">
          <strong>D{detector} <span>{Math.round(expected[detector] * 100)}%</span></strong>
          <small>probabilidad</small><b>{clicks} {clicks === 1 ? 'clic' : 'clics'}</b>
        </div>})}
        <button ref={splitter} className={`dc-splitter ${setup.closed ? 'dc-closed' : ''} ${choosing ? 'dc-choose-now' : ''}`}
          disabled={!canChoose(state)} aria-pressed={setup.closed}
          aria-label={setup.closed ? 'Retirar divisor de salida' : 'Insertar divisor de salida'}
          onClick={() => dispatch({ type: 'closed', value: !state.setup.closed })}
          data-help-title="Divisor de salida" data-help-body="Insertado, combina las amplitudes de ambos brazos y permite interferencia. Retirado, cada detector identifica un brazo. Los dos detectores están activos en ambos casos.">
          <span aria-hidden="true">{setup.closed ? '◇' : '⋮'}</span><strong>{setup.closed ? 'Salida reunida' : 'Salida abierta'}</strong>
          <small>{canChoose(state) ? setup.closed ? 'Tocá para retirar' : 'Tocá para insertar' : 'Fijado este disparo'}</small>
        </button>
        <label className="dc-phase" data-help-title="Fase: alinear las oscilaciones" data-help-body="La fase indica cómo se alinean las oscilaciones de ambos brazos. Al reunirlos, pueden reforzarse o cancelarse. En este montaje ideal, 0° concentra los clics en D0 y 180° en D1. Con la salida abierta la fase no cambia el reparto. Se fija al emitir cada fotón.">
          <span>Fase <strong>{state.setup.phase}°</strong></span>
          <input aria-label="Diferencia de fase en grados" type="range" min="0" max="360" step="15" value={state.setup.phase} disabled={!ready}
            onChange={event => dispatch({ type: 'phase', value: Number(event.target.value) })} />
          <small>{ready ? 'Cómo coinciden las ondas' : 'Fijada al emitir'}</small>
        </label>
        <button className="dc-source" disabled={!ready || needsPrediction} onClick={() => { setPaused(false); dispatch({ type: 'emit' }) }}
          data-help-title="Fuente de fotones individuales" data-help-body="Envía un fotón por disparo. El primer divisor prepara amplitudes en ambos brazos y al final se registra un solo clic.">
          <span aria-hidden="true">✦</span>{ready ? needsPrediction ? 'Elegí tu idea' : 'Emitir 1 fotón' : 'Fotón en viaje'}
        </button>
        {choosing && <button className="dc-continue" onClick={() => { setPaused(false); dispatch({ type: 'continue' }) }} data-help-title="Continuar con tu elección" data-help-body="Fija el divisor de salida para este fotón y continúa hasta una detección. Después podés cambiar el montaje y emitir otro.">Continuar →</button>}
        {moving && <button ref={pause} className="dc-pause" onClick={() => setPaused(value => !value)} data-help-title="Pausar o continuar el dibujo" data-help-body="Detiene o reanuda la animación para observarla. Es una ayuda didáctica: no detiene luz real ni cambia el montaje o sus probabilidades.">{paused ? 'Seguir viaje ▶' : 'Pausar viaje Ⅱ'}</button>}
      </div>
      <p className="dc-legend" data-help-title="Dos trazos, un fotón" data-help-body="Los trazos representan amplitudes, cantidades con las que calculamos probabilidades. No muestran dos partículas ni trayectorias observadas. Cada fotón termina en un solo clic. El viaje se ralentiza para poder explorar el montaje.">{guided ? 'Un fotón · Un clic · Viaje ralentizado' : 'Dos amplitudes de un fotón · Un solo clic · Viaje ralentizado'}</p>
      </div>
      {guided ? <DelayedChallenges state={learning} act={act} paused={paused} resultRef={guideResult} /> : <div className="dc-free-results">
      <div className="dc-status" ref={status} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true"><strong>{headline}</strong><p>{explanation}</p></div>
      <div className="dc-counts">
        <span><strong>{total}</strong> {total === 1 ? 'detección' : 'detecciones'} con este montaje
          {otherClicks > 0 && <small>{otherClicks} {otherClicks === 1 ? 'clic guardado' : 'clics guardados'} en otras configuraciones.</small>}
        </span>
        <div className="dc-clicks" aria-label={measurement?.recent.length === 1 ? 'Última detección de este montaje' : `Últimas ${measurement?.recent.length ?? 0} detecciones de este montaje`}>
          {measurement?.recent.map((detector, index) => <i key={index} className={`dc-click-${detector}`} aria-label={`D${detector}`} />)}
        </div>
      </div>
      <div className="dc-actions">
        <button disabled={!ready} onClick={() => dispatch({ type: 'batch', randoms: Array.from({ length: 100 }, () => Math.random()) })}
          data-help-title="Cien repeticiones del montaje" data-help-body="Calcula cien disparos independientes con la fase, salida y momento de elección actuales. Cada resultado se sortea con las probabilidades del modelo. Los puntos muestran las últimas 24 detecciones.">Simular 100 detecciones</button>
        <button disabled={!ready || !state.measurements.length} onClick={() => dispatch({ type: 'clear' })} data-help-title="Vaciar todos los conteos" data-help-body="Borra las detecciones y la tabla de todas las configuraciones de esta escena. Conserva la fase, el divisor y el momento de elección actuales. No modifica tu partida de veinte preguntas.">Vaciar conteos</button>
      </div>
      </div>}
    </div>

    <div className="dc-notes">
      <details><summary data-help-title="Comparar tus configuraciones" data-help-body="Cada fila reúne los clics de una misma fase, salida y momento de elección. Al cambiar el montaje, los clics anteriores se conservan acá. Compará el porcentaje observado en D0 con la probabilidad calculada.">Comparar mediciones ({state.measurements.length})</summary>
        <p>Cada fila conserva su fase, salida y momento de elección. Compará los porcentajes observados con la probabilidad calculada. Un lote pequeño puede fluctuar.</p>
        {state.measurements.length ? <div className="dc-table-wrap"><table><caption>Resultados agrupados por condición</caption><thead><tr><th>Montaje</th><th>Clics</th><th>D0 observado</th><th>D0 esperado</th></tr></thead>
          <tbody>{state.measurements.map(item => {
            const count = item.d0 + item.d1
            return <tr key={`${item.phase}-${item.closed}-${item.timing}`}><th scope="row">{item.phase}° · {item.closed ? 'reunidos' : 'abierta'}<small>Elección {item.timing === 'after' ? 'después' : 'antes'}</small></th>
              <td>{count}</td><td>{Math.round(item.d0 / count * 100)}%</td><td>{Math.round(probabilities(item.phase, item.closed)[0] * 100)}%</td></tr>
          })}</tbody></table></div> : <p>Emití un fotón o simulá un lote para registrar la primera condición.</p>}
      </details>
      <details><summary>Qué cambia cuando medís</summary>
        <p>Los detectores registran fotones en ambas configuraciones. Con la salida abierta, cada detector está asociado a un brazo. Al insertar el segundo divisor, cada salida combina amplitudes de los dos brazos. La fase determina si se refuerzan o se cancelan.</p>
        <p>La elección puede hacerse después de que el fotón haya entrado, mientras todavía queda por interactuar con el divisor de salida. El modelo calcula la detección usando esa configuración. Los clics anteriores permanecen registrados en sus propias condiciones.</p>
        <p>Elegir tarde cambia la forma de medir que encontrará el fotón al salir. Este resultado no demuestra que podamos cambiar el pasado. La interferencia se reconoce comparando muchos clics al variar la fase; un solo clic no decide esa comparación.</p>
        <p>Wheeler propuso este experimento y Jacques y colaboradores realizaron una versión con fotones individuales en 2007. Usaron conmutación electroóptica aleatoria y una separación espaciotemporal cuidadosamente controlada.</p>
        <p>Acá la pausa permite decidir a mano. Los trazos representan amplitudes y los clics representan observaciones. Se calculan probabilidades de un interferómetro ideal con divisores 50/50, fase estable y detección perfecta.</p>
        <p className="dc-equation">Salida reunida · P(D0) = (1 + cos φ) / 2<br />Salida abierta · P(D0) = P(D1) = ½</p>
        <p>φ es la diferencia de fase total. P(D1) = 1 − P(D0). Las fases de reflexión se incorporan a la elección del origen de φ y a las etiquetas de los puertos.</p>
        <div className="wd-sources"><a href="https://arxiv.org/abs/quant-ph/0610241" target="_blank" rel="noreferrer">Jacques y colaboradores · Experimento de 2007 ↗</a><a href="https://arxiv.org/abs/1407.2930" target="_blank" rel="noreferrer">Ma, Kofler y Zeilinger · Revisión de elección retardada ↗</a></div>
      </details>
    </div>
  </section>
}
