import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import DelayedBoard from './DelayedBoard'
import { canChoose, createDelayedState, currentMeasurement, delayedReducer, effectiveSetup, idle, probabilities } from './delayed'
import './delayed.css'

export default function DelayedChoice({ active }: { active: boolean }) {
  const [state, dispatch] = useReducer(delayedReducer, undefined, createDelayedState)
  const [paused, setPaused] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const status = useRef<HTMLDivElement>(null)
  const splitter = useRef<HTMLButtonElement>(null)
  const pause = useRef<HTMLButtonElement>(null)
  const initialStage = useRef(state.stage)
  const setup = effectiveSetup(state)
  const expected = probabilities(setup.phase, setup.closed)
  const measurement = currentMeasurement(state)
  const total = (measurement?.d0 ?? 0) + (measurement?.d1 ?? 0)
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
  }, [active, moving, paused])

  useLayoutEffect(() => {
    if (!active || initialStage.current === state.stage) return
    initialStage.current = state.stage
    if (state.stage === 'choosing') splitter.current?.focus({ preventScroll: true })
    if (state.stage === 'detected') status.current?.focus({ preventScroll: true })
    if (state.stage === 'entering' || state.stage === 'leaving') pause.current?.focus({ preventScroll: true })
    if (viewport.current && (viewport.current.getBoundingClientRect().top < -20 || viewport.current.getBoundingClientRect().bottom > window.innerHeight - 72))
      viewport.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, state.stage])

  let headline = 'Tocá la fuente para enviar un fotón.'
  let explanation = 'Probá el divisor de salida y la fase sobre el montaje.'
  if (state.stage === 'entering') {
    headline = paused ? 'Viaje pausado.' : 'El fotón está entrando.'
    explanation = state.setup.timing === 'after' ? 'La elección se habilita después del primer divisor.' : 'La configuración se eligió antes de emitir.'
  } else if (choosing) {
    headline = 'Ya entró. Ahora elegí cómo medir.'
    explanation = 'Pausa didáctica. Tocá el divisor de salida y después Continuar.'
  } else if (state.stage === 'leaving') {
    headline = paused ? 'Viaje pausado.' : 'La elección está fijada para este fotón.'
    explanation = setup.closed ? 'Las amplitudes se reúnen en el divisor de salida.' : 'D0 identifica el brazo A y D1 el brazo B.'
  } else if (state.stage === 'detected') {
    headline = state.batch ? 'Se sumaron 100 detecciones simuladas.' : `Un fotón, un clic en D${state.detector}.`
    explanation = setup.closed ? 'Cambiá la fase y compará cómo se reparte la probabilidad.' : 'Con la salida abierta, variar la fase mantiene el reparto esperado 50/50.'
  }

  return <section id="eleccion-retardada" className="wd-game dc-lab" data-scene-workspace="" aria-labelledby="dc-title">
    <div className="dc-heading"><p className="wd-eyebrow">ELECCIÓN RETARDADA DE WHEELER</p><h2 id="dc-title">Elegir cuando ya entró.</h2>
      <p>Ahora explorás un montaje cuántico ideal. Elegí si los dos caminos se reúnen antes de llegar a los detectores.</p></div>
    <div className="dc-timing" aria-label="Momento de la elección">
      <button disabled={!ready} aria-pressed={state.setup.timing === 'before'} onClick={() => dispatch({ type: 'timing', value: 'before' })} data-help-title="Elegir antes de emitir" data-help-body="El divisor de salida se fija al emitir y permanece igual durante ese disparo.">Elegir antes</button>
      <button disabled={!ready} aria-pressed={state.setup.timing === 'after'} onClick={() => dispatch({ type: 'timing', value: 'after' })} data-help-title="Elegir después de entrar" data-help-body="El viaje se pausa después del primer divisor. Podés insertar o retirar el divisor de salida antes de continuar hacia los detectores.">Elegir después</button>
    </div>

    <div className="dc-workspace" ref={viewport}>
      <div className="dc-board spum-live-stage" aria-label="Interferómetro de dos caminos">
        <DelayedBoard state={state} active={active} />
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
          <span aria-hidden="true">{setup.closed ? '◇' : '⋮'}</span><strong>{setup.closed ? 'Reunir caminos' : 'Salida abierta'}</strong>
          <small>{canChoose(state) ? 'Tocá para cambiar' : 'Fijado este disparo'}</small>
        </button>
        <label className="dc-phase" data-help-title="Diferencia de fase" data-help-body="Ajusta el desfase total entre las amplitudes de los brazos. Al recombinarlas cambia la interferencia. La fase se fija al emitir cada fotón.">
          <span>Fase <strong>{state.setup.phase}°</strong></span>
          <input aria-label="Diferencia de fase en grados" type="range" min="0" max="360" step="15" value={state.setup.phase} disabled={!ready}
            onChange={event => dispatch({ type: 'phase', value: Number(event.target.value) })} />
          <small>{ready ? 'Deslizá la placa' : 'Fijada al emitir'}</small>
        </label>
        <button className="dc-source" disabled={!ready} onClick={() => { setPaused(false); dispatch({ type: 'emit' }) }}
          data-help-title="Fuente de fotones individuales" data-help-body="Envía un fotón por disparo. El primer divisor prepara amplitudes en ambos brazos y al final se registra un solo clic.">
          <span aria-hidden="true">✦</span>{ready ? 'Emitir 1 fotón' : 'Fotón en viaje'}
        </button>
        {choosing && <button className="dc-continue" onClick={() => { setPaused(false); dispatch({ type: 'continue' }) }}>Continuar →</button>}
        {moving && <button ref={pause} className="dc-pause" onClick={() => setPaused(value => !value)}>{paused ? 'Seguir viaje ▶' : 'Pausar viaje Ⅱ'}</button>}
      </div>
      <p className="dc-legend">Amplitudes de un solo fotón · Viaje ralentizado</p>
      <div className="dc-status" ref={status} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true"><strong>{headline}</strong><p>{explanation}</p></div>
      <div className="dc-counts">
        <span><strong>{total}</strong> {total === 1 ? 'detección' : 'detecciones'} con este montaje</span>
        <div className="dc-clicks" aria-label={measurement?.recent.length === 1 ? 'Última detección de este montaje' : `Últimas ${measurement?.recent.length ?? 0} detecciones de este montaje`}>
          {measurement?.recent.map((detector, index) => <i key={index} className={`dc-click-${detector}`} aria-label={`D${detector}`} />)}
        </div>
      </div>
      <div className="dc-actions">
        <button disabled={!ready} onClick={() => dispatch({ type: 'batch', randoms: Array.from({ length: 100 }, () => Math.random()) })}
          data-help-title="Cien repeticiones del montaje" data-help-body="Calcula cien disparos independientes con la fase, salida y momento de elección actuales. Cada resultado se sortea con las probabilidades del modelo. Los puntos muestran las últimas 24 detecciones.">Simular 100 detecciones</button>
        <button disabled={!ready || !state.measurements.length} onClick={() => dispatch({ type: 'clear' })}>Vaciar conteos</button>
      </div>
    </div>

    <div className="dc-notes">
      <details><summary>Comparar mediciones ({state.measurements.length})</summary>
        <p>Cada fila conserva su fase, salida y momento de elección. Compará los porcentajes observados con la probabilidad calculada. Un lote pequeño puede fluctuar.</p>
        {state.measurements.length ? <div className="dc-table-wrap"><table><caption>Resultados agrupados por condición</caption><thead><tr><th>Montaje</th><th>Clics</th><th>D0 observado</th><th>D0 esperado</th></tr></thead>
          <tbody>{state.measurements.map(item => {
            const count = item.d0 + item.d1
            return <tr key={`${item.phase}-${item.closed}-${item.timing}`}><th scope="row">{item.phase}° · {item.closed ? 'reunidos' : 'abierta'}<small>Elección {item.timing === 'after' ? 'después' : 'antes'}</small></th>
              <td>{count}</td><td>{Math.round(item.d0 / count * 100)}%</td><td>{Math.round(probabilities(item.phase, item.closed)[0] * 100)}%</td></tr>
          })}</tbody></table></div> : <p>Emití un fotón o simulá un lote para registrar la primera condición.</p>}
      </details>
      <details><summary>Tres cosas para descubrir jugando</summary>
        <ol><li>Con la salida reunida, compará 0° y 180°. Observá qué detector concentra los clics.</li>
          <li>Retirá el divisor y repetí esas fases. Compará el reparto esperado y los conteos.</li>
          <li>Elegí después, emití un fotón y cambiá la salida durante la pausa. Compará con la misma fase y salida elegidas antes.</li></ol>
      </details>
      <details><summary>Qué cambia cuando medís</summary>
        <p>Los detectores registran fotones en ambas configuraciones. Con la salida abierta, cada detector está asociado a un brazo. Al insertar el segundo divisor, cada salida combina amplitudes de los dos brazos. La fase determina si se refuerzan o se cancelan.</p>
        <p>La elección puede hacerse después de que el fotón haya entrado, mientras todavía queda por interactuar con el divisor de salida. El modelo calcula la detección usando esa configuración. Los clics anteriores permanecen registrados en sus propias condiciones.</p>
        <p>Wheeler propuso este experimento y Jacques y colaboradores realizaron una versión con fotones individuales en 2007. Usaron conmutación electroóptica aleatoria y una separación espaciotemporal cuidadosamente controlada.</p>
        <p>Acá la pausa permite decidir a mano. Los trazos representan amplitudes y los clics representan observaciones. Se calculan probabilidades de un interferómetro ideal con divisores 50/50, fase estable y detección perfecta.</p>
        <p className="dc-equation">Salida reunida · P(D0) = (1 + cos φ) / 2<br />Salida abierta · P(D0) = P(D1) = ½</p>
        <p>φ es la diferencia de fase total. P(D1) = 1 − P(D0). Las fases de reflexión se incorporan a la elección del origen de φ y a las etiquetas de los puertos.</p>
        <div className="wd-sources"><a href="https://arxiv.org/abs/quant-ph/0610241" target="_blank" rel="noreferrer">Jacques y colaboradores · Experimento de 2007 ↗</a><a href="https://arxiv.org/abs/1407.2930" target="_blank" rel="noreferrer">Ma, Kofler y Zeilinger · Revisión de elección retardada ↗</a></div>
      </details>
    </div>
  </section>
}
