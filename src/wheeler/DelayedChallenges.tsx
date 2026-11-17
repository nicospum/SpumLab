import { useLayoutEffect, useRef } from 'react'
import type { Dispatch, RefObject } from 'react'
import { LESSONS, comparisonChanged, lessonSteps, nextInstruction, prepareLabel, readyToCheck } from './challenges'
import type { GuidedAction, GuidedState } from './challenges'
import { idle } from './delayed'

export default function DelayedChallenges({ state, act, paused, resultRef }: {
  state: GuidedState
  act: Dispatch<GuidedAction>
  paused: boolean
  resultRef: RefObject<HTMLDivElement | null>
}) {
  const optionsRef = useRef<HTMLDivElement>(null)
  const index = state.active!
  const lesson = LESSONS[index]
  const progress = state.progress[index]
  const steps = lessonSteps(state)
  const ready = idle(state.sim)
  const predicting = progress.prediction === null
  const completed = progress.feedback === 'complete'
  const wrong = progress.feedback === 'wrong'
  const changed = comparisonChanged(state)
  const prepare = prepareLabel(state)
  const achievements = state.progress.filter(item => item.complete).length
  const instruction = paused && ['entering', 'leaving'].includes(state.sim.stage)
    ? 'Viaje pausado. Tocá «Seguir viaje» sobre el montaje.'
    : nextInstruction(state)

  useLayoutEffect(() => {
    const target = predicting ? optionsRef.current?.querySelector('button') : resultRef.current
    target?.focus({ preventScroll: true })
  }, [predicting, resultRef])

  return <aside className="dc-challenges" aria-label="Retos guiados de elección retardada">
    <div className="dc-challenge-nav">
      <select aria-label="Elegir reto guiado" value={index} disabled={!ready} onChange={event => {
        act({ type: 'lesson', index: Number(event.target.value) })
      }} data-help-title="Los cuatro retos" data-help-body="Elegí un reto. Cada uno conserva su predicción, sus observaciones y su logro durante esta visita. Cambiar de reto prepara el montaje necesario y conserva la tabla general de mediciones.">
        {LESSONS.map((item, i) => <option key={item.title} value={i}>{state.progress[i].complete ? '✓ ' : ''}{i + 1}/4 · {item.title}</option>)}
      </select>
      {!predicting && !completed && !wrong && <button disabled={!ready} onClick={() => act({ type: 'revise' })}
        aria-label="Revisar mi idea" data-help-title="Revisar mi predicción" data-help-body="Permite elegir otra explicación sin borrar las observaciones. El reto se completa al reunir las pruebas y comprobar una explicación compatible con ellas.">Idea</button>}
      <button disabled={!ready} onClick={() => act({ type: 'lesson', index: null })} data-help-title="Explorar libremente" data-help-body="Vuelve a la exploración libre sin borrar tus retos ni tus mediciones. Podés retomar el recorrido durante esta visita.">Libre</button>
    </div>

    {predicting ? <div className="dc-prediction">
      <p id="dc-prediction-question">{lesson.question}</p>
      <div ref={optionsRef} className="dc-prediction-options" role="group" aria-labelledby="dc-prediction-question">
        {lesson.options.map((option, choice) => <button key={option} disabled={!ready} aria-pressed={progress.prediction === choice}
          onClick={() => act({ type: 'predict', choice })}
          data-help-title="Tu predicción" data-help-body="Elegí lo que pensás que va a ocurrir. Después probalo sobre la escena. Podés revisar tu idea; acertar antes de experimentar no es necesario.">{option}</button>)}
      </div>
      <small>Elegí una idea y ponela a prueba.</small>
    </div> : <>
      {!completed && !wrong && <p className="dc-current-idea">Tu idea: <strong>{lesson.options[progress.prediction!]}</strong></p>}
      <div ref={resultRef} className={`dc-guide-feedback ${ready && !changed && wrong ? 'dc-guide-retry' : ''}`} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">
        {!ready ? <p>{instruction}</p>
          : changed ? <p>Cambiaste el montaje. Las tarjetas conservan la comparación anterior.</p>
          : completed ? <><strong>✓ Reto completado · {achievements}/4</strong><p>{lesson.explanation}</p></>
          : wrong ? <><strong>Revisá tu idea: {lesson.options[progress.prediction!]}.</strong><p>{lesson.hint}</p></>
            : <>{progress.feedback === 'missing' && <strong>Todavía falta observar.</strong>}<p>{instruction}</p></>}
      </div>
      <small className="dc-evidence-label">Guardado en este reto</small>
      <div className="dc-observations" aria-label="Observaciones guardadas de este reto" data-help-title="Lo que guardaste en este reto"
        data-help-body={index === 0 || index === 3 ? 'Cada tarjeta conserva el primer disparo válido de esa prueba. Repetir el disparo sigue sumando en los detectores, pero conserva esta observación de un fotón para compararla. La tabla general reúne todos los ensayos.' : 'Estas tarjetas cuentan los clics nuevos obtenidos en este reto, después de elegir una predicción y con la configuración indicada. La tabla general también conserva tus otros ensayos. Necesitás al menos cien clics en cada fase para completar esta comparación.'}>
        {steps.map(step => <div key={step.label} className={step.done ? 'dc-step-done' : ''}>
          <strong>{step.done ? '✓' : '○'} {step.label}</strong>
          <small>D0: {step.d0} · D1: {step.d1} clics</small>
        </div>)}
      </div>
      <div className="dc-challenge-actions">
        {!ready ? null : changed ? <button onClick={() => { resultRef.current?.focus({ preventScroll: true }); act({ type: 'lesson', index }) }} data-help-title="Volver al montaje observado" data-help-body="Recupera la configuración final de la comparación guardada. No emite fotones ni cambia tus observaciones o logros.">Restaurar montaje del reto</button>
          : completed ? <button data-help-title={index < LESSONS.length - 1 ? 'Continuar el recorrido' : 'Volver a la exploración libre'} data-help-body="Conserva tus observaciones y logros. El reto siguiente prepara su propia prueba; la exploración libre permite seguir jugando con el montaje y volver a los retos durante esta visita." onClick={() => {
          act({ type: 'lesson', index: index < LESSONS.length - 1 ? index + 1 : null })
        }}>{index < LESSONS.length - 1 ? 'Reto siguiente →' : 'Seguir explorando'}</button>
          : wrong ? <button disabled={!ready} onClick={() => act({ type: 'revise' })} data-help-title="Probar otra explicación" data-help-body="Volvé a elegir una predicción usando las observaciones que ya guardaste. No hace falta repetirlas. Después comprobá de nuevo tu explicación.">Revisar mi idea</button>
            : readyToCheck(state) ? <button onClick={() => act({ type: 'check' })} data-help-title="Contrastar mi idea con las pruebas" data-help-body="Comprueba si tu explicación coincide con las observaciones requeridas. Si no coincide, recibirás una pista y podrás revisarla sin borrar tus pruebas.">Comprobar mi idea</button>
              : ready && prepare ? <button onClick={() => { resultRef.current?.focus({ preventScroll: true }); act({ type: 'prepare' }) }} data-help-title="Preparar la prueba pendiente" data-help-body="Ajusta fase, divisor y momento de elección a la prueba que falta. Conserva tus resultados. Preparar el montaje no cuenta como haberlo observado: después emití o simulá las detecciones indicadas.">{prepare}</button>
                : ready && (index === 1 || index === 2) ? <button onClick={() => act({ type: 'sim', action: { type: 'batch', randoms: Array.from({ length: 100 }, () => Math.random()) } })}
                  data-help-title="Cien disparos en este montaje" data-help-body="Simula cien fotones independientes con la fase y la salida actuales. Guardamos sus clics como observación del reto. Un reparto esperado 50/50 puede dar conteos diferentes de 50 y 50.">Simular 100 detecciones</button> : null}
      </div>
    </>}
  </aside>
}
