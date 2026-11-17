import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MoreLabs } from '../components/ui/LabJourney'
import { ask, createGame, current, LIMIT, matches, pathTo, QUESTIONS, questionText, revisit, WORLDS } from './game'
import type { Game, Mode, WorldId } from './game'
import DelayedChoice from './DelayedChoice'

const fresh = (mode: Mode) => createGame(mode, crypto.getRandomValues(new Uint32Array(1))[0])
const UniverseScene = lazy(() => import('./UniverseScene'))

export default function App() {
  const [scene, setScene] = useState<'questions' | 'delayed' | 'universe'>(() => location.hash === '#universo-que-responde' ? 'universe' : location.hash === '#eleccion-retardada' ? 'delayed' : 'questions')
  const [universeVisited, setUniverseVisited] = useState(scene === 'universe')
  const [anchor, setAnchor] = useState(() => location.hash)
  const framedAnchor = useRef<string | null>(null)
  const [games, setGames] = useState<Record<Mode, Game>>(() => ({ surprise: fresh('surprise'), fixed: fresh('fixed') }))
  const [mode, setMode] = useState<Mode>('surprise')
  const [inspected, setInspected] = useState<WorldId | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [otherQuestions, setOtherQuestions] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [resetPending, setResetPending] = useState(false)
  const [message, setMessage] = useState('')
  const playfield = useRef<HTMLDivElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const inspectedButton = useRef<HTMLButtonElement | null>(null)
  const game = games[mode]
  const previousGame = useRef(game)
  const node = current(game)
  const path = pathTo(game)
  const used = new Set(path.map(step => step.question))
  const remaining = QUESTIONS.filter(question => !used.has(question.id))
  const useful = remaining.filter(question => {
    const count = node.candidates.filter(world => matches(world, question.id)).length
    return count > 0 && count < node.candidates.length
  })
  const suggestions = (useful.length ? useful : node.candidates.map(id => ({
    id: `is:${id}`,
    text: questionText(`is:${id}`)!,
    detail: WORLDS.find(world => world.id === id)!.description,
  }))).slice(0, 3)
  const finished = node.candidates.length === 1
  const limit = node.depth >= LIMIT
  const selectedWorld = WORLDS.find(world => world.id === inspected)
  const selectedIsPossible = selectedWorld ? node.candidates.includes(selectedWorld.id) : false
  const excludedBy = selectedWorld && path.find(step => step.question && matches(selectedWorld.id, step.question) !== step.answer)
  const lastQuestion = node.question ? questionText(node.question) : null
  const parent = node.parent === null ? null : game.nodes[node.parent]
  const eliminated = parent ? parent.candidates.length - node.candidates.length : 0
  const winner = finished ? WORLDS.find(world => world.id === node.candidates[0])! : null

  useEffect(() => {
    function followHash() {
      setAnchor(location.hash)
      if (location.hash === '#eleccion-retardada') setScene('delayed')
      else if (location.hash === '#universo-que-responde') { setScene('universe'); setUniverseVisited(true) }
      else if (['', '#juego'].includes(location.hash)) setScene('questions')
    }
    window.addEventListener('hashchange', followHash)
    return () => window.removeEventListener('hashchange', followHash)
  }, [])

  useLayoutEffect(() => {
    if (framedAnchor.current === anchor) return
    // Finish native anchor navigation after revealing the destination. Resume a
    // played scene at its controls, without overwriting the guided scene's focus.
    const frame = requestAnimationFrame(() => {
      framedAnchor.current = anchor
      if (!['#eleccion-retardada', '#universo-que-responde', '#juego', '#wheeler-idea', '#wheeler-escenas'].includes(anchor)) return
      const section = document.getElementById(anchor.slice(1))
      const guided = anchor === '#eleccion-retardada' ? section?.querySelector<HTMLElement>('.dc-guided') : null
      const universe = anchor === '#universo-que-responde' ? section?.querySelector<HTMLElement>('.wu-guided') : null
      const resumeQuestions = anchor === '#juego' && game.nodes.length > 1
      const target = universe ?? guided ?? (resumeQuestions ? playfield.current : section)
      const focusTarget = guided
        ? guided.querySelector<HTMLElement>('.dc-choose-now, .dc-pause') ?? guided.querySelector<HTMLElement>('[role="status"], .dc-prediction-options button')
        : universe ?? (resumeQuestions ? feedback.current : section)
      focusTarget?.focus({ preventScroll: true })
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [scene, anchor, game.nodes.length])

  useLayoutEffect(() => {
    const gameChanged = previousGame.current !== game
    previousGame.current = game
    if (gameChanged) feedback.current?.focus({ preventScroll: true })
    if ((!gameChanged && !otherQuestions && !inspected) || !actions.current || !playfield.current) return
    const bottom = actions.current.getBoundingClientRect().bottom
    if (bottom > window.innerHeight - 88 || playfield.current.getBoundingClientRect().top < -20)
      playfield.current.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [game, otherQuestions, inspected])

  function update(next: Game) {
    setGames(previous => ({ ...previous, [mode]: next }))
    setInspected(null)
    setOtherQuestions(false)
    setSelectedQuestion('')
    setResetPending(false)
  }
  function pose(question: string) {
    const next = ask(game, question)
    if (next === game) return
    update(next)
    setMessage('')
  }
  function goBack(id: number) {
    update(revisit(game, id))
    setHistoryOpen(false)
    setMessage('Elegí otra pregunta para abrir un camino. Los anteriores siguen en «Mis caminos».')
  }
  function switchMode(next: Mode) {
    setMode(next)
    setInspected(null)
    setHistoryOpen(false)
    setOtherQuestions(false)
    setSelectedQuestion('')
    setResetPending(false)
    setMessage('Cada regla conserva su propia partida. Podés volver a la otra.')
  }
  function submitOther(event: FormEvent) {
    event.preventDefault()
    if (selectedQuestion) pose(selectedQuestion)
  }
  function closeInspection() {
    setInspected(null)
    inspectedButton.current?.focus({ preventScroll: true })
  }
  return (
    <div className="wd-shell">
      <header className="wd-header">
        <a href="/" className="wd-brand">∿ SPUM</a>
        <nav aria-label="Wheeler"><a href="#wheeler-escenas">Escenas</a><a href="#wheeler-idea">La idea de Wheeler</a></nav>
      </header>
      <main>
        <section className="wd-hero" aria-labelledby="wd-title">
          <div className="wd-hero-copy">
            <p className="wd-eyebrow">JOHN ARCHIBALD WHEELER</p>
            <h1 id="wd-title">It from <em>bit.</em></h1>
            <p className="wd-hero-question">¿El mundo ya estaba decidido?</p>
            <p>Jugá con preguntas, fotones y un universo por explorar. Descubrí qué cambia cuando elegís cómo observar.</p>
            <a className="wd-start" href="#wheeler-escenas">Explorar las tres escenas <span aria-hidden="true">↗</span></a>
            <span className="wd-hypothesis">Universo participativo · Una hipótesis de Wheeler</span>
          </div>
          <figure>
            <img src="/wheeler/universo-participativo.webp" width="1254" height="1254" alt="El universo dibuja una U de galaxias y forma un ojo que mira hacia su propio origen." fetchPriority="high" />
            <figcaption>El universo forma un ojo y vuelve la mirada hacia su historia.</figcaption>
          </figure>
        </section>

        <nav id="wheeler-escenas" className="wd-scene-nav" tabIndex={-1} aria-label="Escenas del laboratorio de Wheeler">
          <a href="#juego" aria-current={scene === 'questions' ? 'page' : undefined}><span>1 · Analogía clásica</span><strong>El mundo sin elegir</strong><small>Preguntas → respuestas sí/no</small></a>
          <a href="#eleccion-retardada" aria-current={scene === 'delayed' ? 'page' : undefined}><span>2 · Modelo cuántico</span><strong>Elección retardada</strong><small>Montaje → clics en detectores</small></a>
          <a href="#universo-que-responde" aria-current={scene === 'universe' ? 'page' : undefined}><span>3 · Metáfora explorable</span><strong>El universo que responde</strong><small>Registros → un mapa del mundo</small></a>
        </nav>
        <div hidden={scene !== 'questions'}>
        <section className="wd-game" id="juego" tabIndex={-1} data-scene-workspace="" aria-labelledby="wd-game-title">
          <div className="wd-game-top">
            <div><p className="wd-eyebrow">EL JUEGO DE LAS VEINTE PREGUNTAS</p><h2 id="wd-game-title">El mundo sin elegir.</h2></div>
            <div className="wd-mode" aria-label="Regla de la partida">
              <button aria-pressed={mode === 'surprise'} onClick={() => switchMode('surprise')} data-help-title="Regla sorpresa" data-help-body="El juego empieza sin elegir una palabra. Decide cada sí o no manteniendo alguna posibilidad compatible con todas las respuestas de esta rama.">Sorpresa</button>
              <button aria-pressed={mode === 'fixed'} onClick={() => switchMode('fixed')} data-help-title="Palabra elegida" data-help-body="El juego elige una palabra al empezar esta partida y responde según sus propiedades. Al volver atrás, esa palabra permanece fija.">Palabra elegida</button>
            </div>
          </div>
          <p className="wd-rule">{mode === 'surprise'
            ? 'Empezás sin una palabra elegida. Cada sí o no conserva posibilidades que encajan con las respuestas anteriores.'
            : 'Hay una palabra fijada desde el comienzo. Tocá una pregunta para encontrarla.'}</p>
          <div className="wd-workspace" ref={playfield}>
            <div className="wd-stage spum-live-stage" aria-label="Posibilidades compatibles" data-help-title="Posibilidades del juego" data-help-body="Las figuras representan 16 objetos de un catálogo acotado. Cada respuesta descarta los incompatibles. Tocá una figura para leer su descripción y preguntar por su nombre.">
              <div className="wd-stage-caption"><span><strong className="wd-current-rule">{mode === 'surprise' ? 'Sorpresa' : 'Palabra elegida'}</strong>{node.candidates.length} {finished ? 'palabra posible' : 'posibilidades'}</span><span>{node.depth} / {LIMIT} preguntas</span></div>
              <div className={`wd-worlds ${finished ? 'wd-worlds-resolved' : ''}`}>
                {WORLDS.map((world, index) => {
                  const possible = node.candidates.includes(world.id)
                  return <button key={world.id} className={`wd-world ${possible ? '' : 'wd-world-out'} ${inspected === world.id ? 'wd-world-selected' : ''}`}
                    style={{ '--world-tone': `${175 + index * 8}deg` } as React.CSSProperties}
                    aria-label={`${world.name}${possible ? ', posible' : ', descartado'}`} aria-pressed={inspected === world.id}
                    hidden={finished && !possible} onClick={event => {
                      inspectedButton.current = event.currentTarget
                      setInspected(world.id)
                      setMessage('')
                    }}
                    data-help-title={world.name} data-help-body={world.description}>
                    <span className="wd-glyph" aria-hidden="true">{world.glyph}</span><span>{world.name}</span>
                  </button>
                })}
              </div>
              {winner && <p className="wd-word-found">Tu recorrido llegó a <strong>{winner.name.toLocaleLowerCase('es')}.</strong></p>}
            </div>

            <div className="wd-console">
              <div className="wd-feedback" ref={feedback} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true">
                {lastQuestion ? <><span>{lastQuestion}</span><strong className={node.answer ? 'wd-yes' : 'wd-no'}>{node.answer ? 'Sí' : 'No'}</strong>
                  <p>{eliminated ? `${finished ? 'Queda' : 'Quedan'} ${node.candidates.length} de las ${parent!.candidates.length} posibilidades anteriores.` : 'La respuesta ya se deducía del registro. Siguen las mismas posibilidades.'}</p></>
                  : <><strong>Elegí tu primera pregunta.</strong><p>Tenés hasta veinte. También podés tocar una figura y preguntar por su nombre.</p></>}
                {message && <p className="wd-notice">{message}</p>}
              </div>
              {selectedWorld ? <div className="wd-inspector">
                <div><strong>{selectedWorld.name}</strong><button aria-label="Cerrar descripción" onClick={closeInspection}>×</button></div>
                <p>{selectedWorld.description}</p>
                {selectedIsPossible && !finished && !limit && <button className="wd-primary" onClick={() => pose(`is:${selectedWorld.id}`)} data-help-title="Preguntar por esta figura" data-help-body="Hace una pregunta por el nombre de esta figura. Un sí deja solo esa posibilidad; un no la descarta. Cuenta como una de las veinte preguntas y respeta las respuestas anteriores.">Preguntar si es {selectedWorld.name.toLocaleLowerCase('es')}</button>}
                {finished && <p>Esta palabra coincide con todas las respuestas de tu recorrido.</p>}
                {selectedIsPossible && !finished && limit && <p>Usaste las veinte preguntas de esta rama. Volvé a un punto anterior para seguir preguntando por las figuras posibles.</p>}
                {excludedBy && <>
                  <p>Se descartó con «{questionText(excludedBy.question!)}» → {excludedBy.answer ? 'Sí' : 'No'}.</p>
                  <button className="wd-primary" onClick={() => goBack(excludedBy.parent!)} data-help-title="Volver al punto del descarte" data-help-body="Recupera el momento en que esta figura todavía era posible. Tus caminos anteriores quedan guardados y podés hacer otra pregunta.">Volver antes de esa respuesta</button>
                </>}
              </div> : finished ? <div className="wd-discovery">
                <p>{mode === 'surprise'
                  ? 'Al empezar, el juego tenía una lista de posibilidades. Las preguntas y respuestas fueron definiendo esta palabra.'
                  : 'Esta era la palabra elegida al iniciar la partida. El registro fue dejando una sola posibilidad.'}</p>
                <button className="wd-primary" onClick={() => goBack(0)} data-help-title="Abrir otro camino desde el inicio" data-help-body="Recupera las dieciséis posibilidades de esta partida para que pruebes otra pregunta. Conserva el recorrido anterior en Mis caminos. La regla y la partida siguen siendo las mismas; repetir una pregunta del mismo punto recupera su respuesta guardada.">Volver al inicio y preguntar otra cosa</button>
                <button onClick={() => switchMode(mode === 'surprise' ? 'fixed' : 'surprise')}>Probar la regla {mode === 'surprise' ? 'con palabra elegida' : 'sorpresa'}</button>
              </div> : limit ? <div className="wd-discovery"><p>Usaste las veinte preguntas de esta rama. Quedan {node.candidates.length} posibilidades. Elegí un punto anterior y probá una pregunta que las distinga.</p><button onClick={() => setHistoryOpen(true)}>Abrir mis caminos</button></div>
                : <div className="wd-questions">
                  {!otherQuestions && <>
                    {!useful.length && <p className="wd-name-hint">Comparten las propiedades que quedan. Preguntá por el nombre de una figura.</p>}
                    {suggestions.map(question => <button key={question.id} onClick={() => pose(question.id)} data-help-title={question.text} data-help-body={question.detail}>{question.text}<span aria-hidden="true">↗</span></button>)}
                  </>}
                  {remaining.length > 0 && <button className="wd-other" aria-expanded={otherQuestions} data-help-title="Explorar otras preguntas" data-help-body="Abre la lista de preguntas que todavía no hiciste en esta rama, o vuelve a las sugeridas. Elegir una en la lista no la envía: tocá Preguntar para obtener la respuesta. Algunas no descartan figuras; también pueden ayudarte a entender qué ya sabés." onClick={() => {
                    setOtherQuestions(value => !value)
                    setMessage('')
                  }}>{otherQuestions ? 'Volver a las sugeridas −' : 'Otras preguntas +'}</button>}
                  {otherQuestions && <form onSubmit={submitOther} className="wd-question-form">
                    <label htmlFor="wd-question">Elegí otra pregunta</label>
                    <select id="wd-question" value={selectedQuestion} onChange={event => setSelectedQuestion(event.target.value)}>
                      <option value="">Elegir…</option>
                      {remaining.map(question => <option key={question.id} value={question.id}>{question.text}</option>)}
                    </select>
                    <button type="submit" disabled={!selectedQuestion}>Preguntar</button>
                  </form>}
                </div>}
            </div>
          </div>
          <div className="wd-history-toolbar" ref={actions}>
            <button disabled={node.parent === null} onClick={() => node.parent !== null && goBack(node.parent)} data-help-title="Volver una pregunta" data-help-body="Volvés al estado anterior de esta partida. El camino que dejaste sigue guardado y podés recorrerlo otra vez desde Mis caminos.">↶ Una pregunta atrás</button>
            <button aria-expanded={historyOpen} onClick={() => setHistoryOpen(open => !open)} data-help-title="Explorar tus caminos guardados" data-help-body="Abre o cierra el registro de esta partida. Tocá una respuesta para volver a ese punto y hacer otra pregunta. Las ramas anteriores se conservan durante esta visita; repetir una pregunta desde el mismo punto recupera su respuesta.">Mis caminos</button>
            <button aria-expanded={resetPending} onClick={() => setResetPending(value => !value)}>Nueva partida</button>
          </div>
          {resetPending && <div className="wd-reset"><p>La nueva partida reemplaza los caminos de esta regla.</p><button onClick={() => { update(fresh(mode)); setMessage('Nueva partida lista.'); }}>Empezar de nuevo</button><button onClick={() => setResetPending(false)}>Seguir explorando</button></div>}
          {historyOpen && <div className="wd-history">
            <h3>Volvé a cualquier respuesta.</h3><p>Al preguntar otra cosa desde ese punto abrís una rama. Las anteriores siguen guardadas durante esta visita.</p>
            <ol>{game.nodes.map(step => {
              const previousStep = step.parent === null ? null : game.nodes[step.parent]
              return <li key={step.id} style={{ paddingInlineStart: `${Math.min(step.depth, 4) * 10}px` }}>
                <button aria-current={step.id === node.id ? 'step' : undefined} onClick={() => goBack(step.id)}>
                  <span>{step.parent === null ? 'Inicio · 16 posibilidades' : `Paso ${step.depth} · ${questionText(step.question!)} ${step.answer ? 'Sí' : 'No'}`}</span>
                  {previousStep && <small>
                    {previousStep.question ? <>Después de «{questionText(previousStep.question)}» → {previousStep.answer ? 'Sí' : 'No'}</> : 'Desde el inicio'}
                    {' · '}{step.candidates.length} {step.candidates.length === 1 ? 'posible' : 'posibles'}
                  </small>}
                </button>
              </li>
            })}</ol>
          </div>}
          <p className="wd-game-footnote">Cada respuesta se guarda automáticamente y debe respetar las anteriores. Los caminos se conservan durante esta visita. Recargar empieza partidas nuevas.</p>
          <div className="wd-connection">
            <h3>De las preguntas a las mediciones</h3>
            <p>En el juego elegís preguntas y guardás respuestas sí/no. Ahora elegís cómo medir un fotón y guardás clics. La conexión es <strong>pregunta → registro</strong>: primero una analogía; después, un modelo cuántico.</p>
            <p><em>It from bit</em> sigue siendo una hipótesis de Wheeler. Podés ir y volver: las tres escenas conservan lo que hiciste durante esta visita.</p>
            <a className="wd-next-scene" href="#eleccion-retardada">Seguir con la elección retardada →</a>
          </div>
        </section>
        </div>
        <div hidden={scene !== 'delayed'}><DelayedChoice active={scene === 'delayed'} />
          <div className="wd-connection wd-return">
            <h3>Una pregunta se convierte en un montaje</h3>
            <p>En las veinte preguntas registrás sí/no. Acá elegís el aparato y registrás clics. Cambiar la medición permite estudiar el camino o la interferencia; no demuestra que puedas cambiar el pasado.</p>
            <a className="wd-next-scene" href="#juego">← Volver a las veinte preguntas</a>
            <a className="wd-next-scene" href="#universo-que-responde">Seguir con el universo que responde →</a>
          </div>
        </div>
        <div hidden={scene !== 'universe'}>{universeVisited && <Suspense fallback={<p role="status">Preparando el universo…</p>}><UniverseScene active={scene === 'universe'} /></Suspense>}</div>

        <section id="wheeler-idea" className="wd-reading" tabIndex={-1} aria-labelledby="wd-idea-title">
          <div><p className="wd-eyebrow">EL HILO ENTRE LAS TRES ESCENAS</p><h2 id="wd-idea-title">De las preguntas<br />a un mundo registrado.</h2></div>
          <div>
            <p>En las dos primeras escenas elegís una pregunta y obtenés un registro. En el juego, la pregunta es una frase; en el experimento, se concreta en un aparato. La analogía invita a pensar en esa relación; el modelo cuántico permite calcular probabilidades de detección.</p>
            <p>En «El universo que responde» llevás esa pregunta a un mapa explorable: cada consulta añade una propiedad a su representación. Es una metáfora visual para comparar reglas del juego, no una demostración de que observar cree materia.</p>
            <p>Wheeler contó una partida de veinte preguntas en la que terminó adivinando «nube». Sus amigos entonces revelaron la sorpresa. Habían decidido responder sin ponerse de acuerdo previamente en una palabra. Cada respuesta tenía que ser compatible con alguna palabra y con todas las respuestas anteriores.</p>
            <p>En esta adaptación podés ver y tocar las posibilidades. En Sorpresa, el programa sortea entre sí y no cuando ambas respuestas son compatibles. Si solo una lo es, la respuesta queda obligada. En Palabra elegida, el objeto se fija al empezar.</p>
            <p>Un mismo registro puede encajar con las dos reglas. Volver atrás te permite comparar recorridos alternativos. Tus elecciones y las respuestas del juego participan en el resultado.</p>
            <details><summary>¿Qué quiso decir Wheeler con «it from bit»?</summary>
              <p>Wheeler propuso como hipótesis de trabajo que la información obtenida mediante preguntas físicas y registros podría ser fundamental para lo que llamamos realidad. En un experimento, una pregunta se concreta en un aparato y su respuesta en un registro.</p>
              <p>«El mundo sin elegir» es una analogía clásica con objetos y atributos definidos. La escena de elección retardada calcula las predicciones de un interferómetro cuántico ideal. El universo participativo sigue siendo una propuesta interpretativa, cuyo alcance va más allá de lo que prueban estas actividades.</p>
              <p>Observar significa realizar una medición con un aparato. Estos resultados no demuestran que la conciencia cree el universo.</p>
              <p>Un sí o no se puede guardar en un bit. La información nueva que aporta depende de lo que ya sabías. Si todas las posibilidades compartían una propiedad, preguntar por ella deja la lista igual.</p>
              <p>La portada es una reinterpretación artística del universo participativo de Wheeler, realizada con generación de imágenes.</p>
            </details>
            <div className="wd-sources">
              <a href="https://heyredhat.github.io/refs/wheeler_law_without_law.pdf" target="_blank" rel="noreferrer">Wheeler · Law Without Law (1983), pp. 201–203 ↗</a>
              <a href="https://scienceplusplus.org/visions/assets/Wheeler1989.pdf" target="_blank" rel="noreferrer">Wheeler · Information, Physics, Quantum (1989), §§19.2 y 19.4 ↗</a>
            </div>
          </div>
        </section>
        <MoreLabs current="wheeler" />
      </main>
      <footer className="wd-footer"><a href="/">∿ Volver a SPUM</a><span>Una buena pregunta cambia el recorrido.</span></footer>
    </div>
  )
}
