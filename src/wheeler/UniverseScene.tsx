import { useLayoutEffect, useReducer, useRef, useState } from 'react'
import UniverseBoard from './UniverseBoard'
import { createUniverse, currentUniverse, LESSONS, lessonEvidence, REGIONS, TOOLS, universeReducer } from './universe'
import type { UniverseMode } from './universe'
import './universe.css'

const MODE_NAMES = { forming: 'Al preguntar', fixed: 'Desde el inicio' }
const TOOL_ICONS = { light: '✦', distance: '↔', motion: '◌' }

export default function UniverseScene({ active }: { active: boolean }) {
  const [state, act] = useReducer(universeReducer, undefined, () => createUniverse(crypto.getRandomValues(new Uint32Array(1))[0]))
  const [viewReset, setViewReset] = useState(0)
  const [paused, setPaused] = useState(false)
  const [journal, setJournal] = useState(false)
  const workspace = useRef<HTMLDivElement>(null)
  const section = useRef<HTMLElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const guideResult = useRef<HTMLDivElement>(null)
  const node = currentUniverse(state)
  const tool = TOOLS.find(item => item.id === state.tool)!
  const known = node.values[state.region][state.tool]
  const lesson = state.lesson === null ? null : LESSONS[state.lesson]
  const progress = state.lesson === null ? null : state.progress[state.lesson]
  const reviewed = progress !== null && progress.feedback !== 'none'
  const evidence = state.lesson === null ? null : lessonEvidence(state, state.lesson)
  const serial = state.serial
  const last = state.last?.region === state.region && state.last.tool === state.tool ? state.last : null
  const lastTool = last ? TOOLS.find(item => item.id === last.tool)! : null
  const recordTitle = last && lastTool ? `${REGIONS[last.region].name} · ${lastTool.label}: ${last.answer ? lastTool.yes : lastTool.no}` : `${REGIONS[state.region].name} · ${tool.question}`

  useLayoutEffect(() => {
    if (!active || location.hash !== '#universo-que-responde') return
    const frame = requestAnimationFrame(() => {
      const target = state.lesson === null ? section.current : workspace.current
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [active, state.lesson])
  useLayoutEffect(() => {
    if (!active || !serial || !workspace.current) return
    result.current?.focus({ preventScroll: true })
    const bounds = workspace.current.getBoundingClientRect()
    const visualBottom = workspace.current.querySelector('.wu-visual')?.getBoundingClientRect().bottom ?? bounds.bottom
    if (bounds.top < -10 || visualBottom > innerHeight - 64) workspace.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, serial])
  useLayoutEffect(() => {
    if (!active || state.lesson === null || !workspace.current) return
    if (location.hash !== '#universo-que-responde' && !workspace.current.contains(document.activeElement)) return
    const target = guideResult.current ?? workspace.current.querySelector<HTMLSelectElement>('#wu-answer') ?? workspace.current.querySelector<HTMLSelectElement>('.wu-lesson-nav select')
    target?.focus({ preventScroll: true })
    workspace.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [active, state.lesson, progress?.answer, progress?.feedback])

  function observe(id = state.region) {
    act({ type: 'select-region', region: id })
    act({ type: 'observe' })
  }
  const guideFeedback = progress?.feedback === 'missing' ? 'Faltan observaciones del reto. Tocá «Volver a los pasos», completá las consultas pendientes y comprobá otra vez.'
    : progress?.feedback === 'incorrect' ? lesson!.hint
      : progress?.feedback === 'correct' ? lesson!.success : ''
  const comparing = state.lesson === 3
  const chooseExplanation = !comparing || evidence?.ready
  const rules = <div className="wu-rules"><span>¿Cuándo fija las respuestas el juego?</span><div>{(['forming', 'fixed'] as UniverseMode[]).map(mode => <button key={mode} aria-pressed={state.mode === mode} onClick={() => act({ type: 'mode', mode })} data-help-title={MODE_NAMES[mode]} data-help-body={mode === 'forming' ? 'El programa completa propiedades al consultarlas y conserva las respuestas de cada rama. Alba y Eco son el par didáctico con luz y distancias preparadas.' : 'El programa fija todas las respuestas al crear la partida. Sólo muestra lo que consultaste. Ambas reglas guardan recorridos independientes.'}>{MODE_NAMES[mode]}</button>)}</div></div>

  return <section ref={section} id="universo-que-responde" className="wd-game wu-lab" data-scene-workspace="" aria-labelledby="wu-title" tabIndex={-1}>
    <div className="wu-heading"><p className="wd-eyebrow">ESCENA 3 · METÁFORA JUGABLE DE IT FROM BIT</p><h2 id="wu-title">El universo que responde.</h2>
      <p>Elegí Luz, Distancia o Movimiento y tocá un nombre del mapa. Cada respuesta queda guardada: eso es un registro. <strong>Una exploración de la idea de Wheeler, no una simulación de creación física.</strong></p>
    </div>
    <div className="wu-start-row"><span>Arrastrá el fondo para girar · Tocá una región para observar</span>{state.lesson === null && <button onClick={() => act({ type: 'lesson', index: 0 })}>Empezar los cuatro retos →</button>}<small>{state.progress.filter(p => p.complete).length}/4 completados</small></div>

    <div ref={workspace} className={`wu-workspace ${lesson ? 'wu-guided' : ''} ${reviewed ? 'wu-reviewed' : ''}`} tabIndex={-1}>
      <div className="wu-visual">
        <UniverseBoard active={active} values={node.values} region={state.region} serial={state.serial} onObserve={observe} resetView={viewReset} paused={paused} rule={MODE_NAMES[state.mode]} />
        <div className="wu-tools" role="group" aria-label="Qué querés observar">
          {TOOLS.map(item => <button key={item.id} aria-pressed={state.tool === item.id} onClick={() => act({ type: 'tool', tool: item.id })}
            data-help-title={item.label} data-help-body={`${item.question} Elegí esta herramienta y tocá una región del mapa. Cambiar de herramienta por sí solo no registra una respuesta.`}><span aria-hidden="true">{TOOL_ICONS[item.id]}</span>{item.label}</button>)}
        </div>
        <div className="wu-observe-row"><select aria-label="Región para observar" value={state.region} onChange={event => act({ type: 'select-region', region: Number(event.target.value) })}>
          {REGIONS.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
        </select><button className="wu-observe" onClick={() => observe()} data-help-title="Consultar esta región" data-help-body="Guarda la respuesta a la pregunta de la herramienta elegida. Si esa propiedad ya está registrada en esta rama, recupera la misma respuesta.">{known === undefined ? 'Observar' : 'Volver a observar'} {REGIONS[state.region].name}</button></div>
        <div ref={result} className="wu-result" role="status" tabIndex={-1} aria-live="polite"><strong>{recordTitle}</strong><span>{state.notice || (last ? last.repeated ? 'Registro conservado. No se volvió a sortear.' : last.tool === 'distance' ? node.values[state.region].light === undefined ? 'La esfera de líneas ubica la región; Luz revela su aspecto. Medir no empuja al objeto.' : 'La medida despliega la profundidad del mapa; no empuja al objeto.' : last.tool === 'motion' ? 'Movimiento respecto de este mapa. Tiempos y recorridos ilustrativos.' : 'El mapa incorpora una respuesta. Cada herramienta consulta una propiedad distinta.' : 'Tocá una región del mapa o usá Observar.')}</span></div>
      </div>

      <aside className="wu-console" aria-label="Guía del universo que responde">
        <div className="wu-lesson-nav"><select aria-label="Reto del universo" value={state.lesson ?? 'free'} onChange={event => act({ type: 'lesson', index: event.target.value === 'free' ? null : Number(event.target.value) })}>
          <option value="free">Exploración libre</option>{LESSONS.map((item, i) => <option key={i} value={i}>{i + 1}/4 · {item.title}{state.progress[i].complete ? ' ✓' : ''}</option>)}
        </select>{lesson && <button onClick={() => act({ type: 'lesson', index: null })}>Libre</button>}</div>
        {lesson && progress && evidence ? <>
          {!reviewed && <>{!(comparing && evidence.ready) && <p className="wu-task">{lesson.task}</p>}
          {comparing && !evidence.ready && rules}
          <div className="wu-evidence" aria-label="Observaciones del reto">{evidence.items.map(item => <span key={item.label} className={item.done ? 'wu-done' : ''}>{item.done ? '✓' : '○'} {item.label}</span>)}</div>
          {chooseExplanation && <><label className="wu-prompt" htmlFor="wu-answer">{lesson.prompt}</label>
          <div className="wu-answer-row"><select id="wu-answer" value={progress.answer ?? ''} onChange={event => act({ type: 'answer', index: Number(event.target.value) })}>
            <option value="" disabled>Tu explicación…</option>{lesson.options.map((answer, i) => <option key={i} value={i}>{answer}</option>)}
          </select><button onClick={() => act({ type: 'check' })} disabled={progress.answer === null}>Comprobar</button></div></>}</>}
          {guideFeedback && <div ref={guideResult} tabIndex={-1} className={`wu-guide-feedback ${progress.feedback === 'correct' ? 'wu-success' : ''}`} role="status"><strong>{progress.feedback === 'correct' ? 'Reto completado · conclusión guardada' : progress.feedback === 'incorrect' ? 'Revisá tu explicación' : 'Primero, explorá'}</strong><p>{guideFeedback}</p><div className="wu-feedback-actions"><button onClick={() => act(progress.feedback === 'correct' ? { type: 'repeat-lesson' } : { type: 'answer', index: progress.answer! })}>{progress.feedback === 'correct' ? 'Repetir la prueba' : progress.feedback === 'missing' ? 'Volver a los pasos' : 'Revisar mi explicación'}</button>{progress.feedback === 'correct' && state.lesson! < 3 && <button onClick={() => act({ type: 'lesson', index: state.lesson! + 1 })}>Siguiente reto →</button>}</div></div>}
          {comparing && evidence.ready && !reviewed && <details className="wu-compare-again"><summary>Comparar otra vez</summary>{rules}</details>}
        </> : <div className="wu-free-note"><h3>De lo oscuro a lo registrado.</h3><p>Probá las tres herramientas sobre una misma región. La luz da forma al astro, la distancia despliega profundidad y el movimiento dibuja recorridos.</p><p>Lo registrado sigue ahí cuando mirás otra región. Podés deshacer una consulta y abrir otro camino.</p></div>}
        {state.lesson === null && rules}
      </aside>
    </div>

    <div className="wu-bottom-tools"><button onClick={() => setViewReset(value => value + 1)} data-help-title="Centrar el mapa" data-help-body="Recupera el punto de vista inicial. Los registros y retos se conservan.">Centrar vista</button><button aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Reanudar movimiento' : 'Pausar movimiento'}</button><button disabled={node.parent === null} onClick={() => act({ type: 'undo' })} data-help-title="Deshacer una consulta" data-help-body="Vuelve al estado anterior de esta rama. El recorrido queda guardado. Es una herramienta para comparar preguntas del juego; no cambia el pasado de un experimento.">↶ Una consulta atrás</button><button aria-expanded={journal} onClick={() => setJournal(value => !value)}>Registros y caminos</button></div>
    {journal && <div className="wu-journal"><h3>Registros · {MODE_NAMES[state.mode]}</h3><p>Cada punto conserva el recorrido que lleva hasta él. Elegí uno para probar otra pregunta.</p>
      <div className="wu-record-grid">{REGIONS.map(region => <div key={region.id}><strong>{region.name}</strong>{TOOLS.map(item => <span key={item.id}>{item.label}: {node.values[region.id][item.id] === undefined ? 'sin registrar' : node.values[region.id][item.id] ? item.yes : item.no}</span>)}</div>)}</div>
      <ol>{state.worlds[state.mode].nodes.map(step => <li key={step.id}><button aria-current={step.id === node.id ? 'step' : undefined} onClick={() => { act({ type: 'revisit', id: step.id }); setJournal(false); result.current?.focus({ preventScroll: true }); workspace.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }}>{step.parent === null ? 'Inicio · sin registros' : `#${step.id} desde #${step.parent} · ${REGIONS[step.region!].name} · ${TOOLS.find(item => item.id === step.tool)!.label} → ${step.answer ? 'Sí' : 'No'}`}</button></li>)}</ol>
    </div>}
    <details className="wu-about"><summary>Qué representa este universo y qué no</summary><p>El ojo simboliza un instrumento que hace preguntas y guarda respuestas. La oscuridad indica «sin registrar», no «no existe». El aspecto de los astros es artístico: un planeta puede reflejar luz aunque no emita luz visible propia.</p><p>Son seis regiones con tres propiedades binarias. Los tamaños, distancias y velocidades son escalas gráficas; no calculamos formación de estrellas, expansión cosmológica ni evolución cuántica. Medir distancia cambia la representación de la profundidad. Cerca y lejos se refieren al punto de vista inicial: girar la cámara no cambia la respuesta. El movimiento se refiere a este mapa; el fondo de estrellas y las nubes de color son decorativos.</p><p>«Al preguntar» completa las propiedades consultadas respetando los registros de la rama. «Desde el inicio» fija todas las respuestas al crear la partida. Alba y Eco son un par de ejemplo preparado en ambas reglas: emiten luz y están a distintas profundidades. Las demás respuestas proceden de reglas del programa.</p><p>Comparar estas reglas explora una pregunta de Wheeler; no decide cómo se origina la realidad. <a href="https://scienceplusplus.org/visions/assets/Wheeler1989.pdf" target="_blank" rel="noreferrer">Wheeler, 1989, §§19.2 y 19.4 ↗</a></p><p>Las tres escenas conservan sus recorridos durante esta visita. Recargar la página inicia partidas nuevas.</p></details>
    <div className="wd-connection"><h3>De una palabra a un mapa del mundo</h3><p>Las veinte preguntas muestran cómo un registro acota posibilidades. La elección retardada calcula un experimento cuántico. Acá jugás con una metáfora visual para pensar qué podemos afirmar a partir de lo registrado.</p><div className="wu-links"><a href="#juego">← Veinte preguntas</a><a href="#eleccion-retardada">Volver al interferómetro</a><a href="#wheeler-idea">La idea de Wheeler →</a></div></div>
  </section>
}
