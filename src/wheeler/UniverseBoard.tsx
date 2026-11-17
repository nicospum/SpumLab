import { useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { registerSceneHelp } from '../education/sceneHelp'
import { REGIONS } from './universe'
import { layoutUniverseLabels } from './universeLayout'
import type { Tool } from './universe'

type Values = Partial<Record<Tool, boolean>>[]
interface Props { values: Values; region: number; active: boolean; serial: number; onObserve: (id: number) => void; resetView: number; paused: boolean; rule: string }
const POSITIONS = [[-1.3, 1.55], [1.3, 1.55], [-3.2, -.2], [3.2, -.2], [-1.25, -1.8], [1.25, -1.8]]
const COLORS = [0xffd294, 0x8ee9e8, 0xbca1ff, 0x6fbcff, 0xf3a8c4, 0x9be3ba]
const fraction = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }

/** Graphic coordinates, not a cosmological simulation. Only recorded properties
 * are displayed; unasked properties never leak from the fixed-world preset. */
export default function UniverseBoard(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const beam = useRef<SVGLineElement>(null)
  const labels = useRef<(HTMLButtonElement | null)[]>([])
  const leaders = useRef<(SVGLineElement | null)[]>([])
  const latest = useRef(props)
  const view = useRef({ yaw: 0, pitch: 0, zoom: 1 })
  const [unavailable, setUnavailable] = useState(false)
  useLayoutEffect(() => { latest.current = props })
  useLayoutEffect(() => { view.current = { yaw: 0, pitch: 0, zoom: 1 } }, [props.resetView])

  useLayoutEffect(() => {
    if (!props.active || !canvas.current || !host.current) return
    const element = canvas.current
    const container = host.current
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ canvas: element, antialias: true, alpha: false }) }
    catch { setUnavailable(true); return }
    setUnavailable(false)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6))
    renderer.setClearColor(0x030912)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(44, 1, .1, 100)
    const cosmos = new THREE.Group()
    scene.add(cosmos, new THREE.AmbientLight(0xa6cbff, 1.8))
    const key = new THREE.PointLight(0xffe7bd, 55, 35)
    key.position.set(-4, 5, 7); scene.add(key)
    const fill = new THREE.PointLight(0x629bff, 30, 30)
    fill.position.set(5, -3, 3); scene.add(fill)

    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 64
    const ctx = glowCanvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.13, '#ffffffc0'); gradient.addColorStop(.4, '#ffffff30'); gradient.addColorStop(1, '#ffffff00')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64)
    const glowTexture = new THREE.CanvasTexture(glowCanvas)
    const starsGeometry = new THREE.BufferGeometry()
    const stars = new Float32Array(700 * 3)
    for (let i = 0; i < 700; i++) {
      stars[i * 3] = (fraction(i * 3 + 1) - .5) * 26
      stars[i * 3 + 1] = (fraction(i * 3 + 2) - .5) * 15
      stars[i * 3 + 2] = -6 - fraction(i * 3 + 3) * 14
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    const starsMaterial = new THREE.PointsMaterial({ color: 0x9bb7d5, size: .055, transparent: true, opacity: 0, depthWrite: false })
    const sky = new THREE.Points(starsGeometry, starsMaterial); cosmos.add(sky)

    const objects = REGIONS.map((region, id) => {
      const group = new THREE.Group()
      group.position.set(POSITIONS[id][0], POSITIONS[id][1], 0)
      const material = new THREE.MeshStandardMaterial({ color: COLORS[id], roughness: .65, metalness: .15 })
      const body = new THREE.Mesh(new THREE.SphereGeometry(.39, 32, 24), material)
      const atmosphere = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: COLORS[id], transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }))
      atmosphere.scale.set(2.8, 2.8, 1)
      const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: COLORS[id], transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }))
      haze.scale.set(9, 5, 1); haze.position.z = -1
      const rings = new THREE.Mesh(new THREE.RingGeometry(.52, .84, 64), new THREE.MeshBasicMaterial({ color: COLORS[id], side: THREE.DoubleSide, transparent: true, opacity: .45, depthWrite: false }))
      rings.rotation.set(1.1, .2, id * .4)
      const wire = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 8), new THREE.MeshBasicMaterial({ color: COLORS[id], wireframe: true, transparent: true, opacity: .2 }))
      const moon = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0xdce2e6, roughness: .8 }))
      const trail = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 80 }, (_, i) => new THREE.Vector3(Math.cos(i / 80 * Math.PI * 2) * .9, Math.sin(i / 80 * Math.PI * 2) * .23, 0))), new THREE.LineBasicMaterial({ color: COLORS[id], transparent: true, opacity: .45 }))
      const dustGeometry = new THREE.BufferGeometry()
      const dust = new Float32Array(240 * 3)
      for (let i = 0; i < 240; i++) {
        const angle = i * 2.39996, radius = .35 + fraction(i + id * 500) * 1.15
        dust[i * 3] = Math.cos(angle) * radius
        dust[i * 3 + 1] = Math.sin(angle) * radius * .35
        dust[i * 3 + 2] = (fraction(i + 71) - .5) * .3
      }
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3))
      const particles = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: COLORS[id], size: .026, transparent: true, opacity: .8, depthWrite: false }))
      group.add(haze, body, atmosphere, rings, wire, moon, trail, particles)
      cosmos.add(group)
      return { region, group, body, material, atmosphere, haze, rings, wire, moon, trail, particles, amount: 0 }
    })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1, height = 1, labelWidth = 64, labelHeight = 58, frame = 0, previous = 0, phase = 0, pulseAge = 5, lastSerial = latest.current.serial, inView = true
    const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting })
    visibility.observe(container)
    const projected = objects.map(() => ({ x: 0, y: 0 }))
    const resize = new ResizeObserver(() => {
      width = container.clientWidth; height = container.clientHeight
      if (!width || !height) return
      const labelBounds = labels.current[0]?.getBoundingClientRect()
      if (labelBounds?.width && labelBounds.height) { labelWidth = labelBounds.width; labelHeight = labelBounds.height }
      renderer.setSize(width, height, false)
      camera.aspect = width / height; camera.updateProjectionMatrix()
    })
    resize.observe(container)
    const point = new THREE.Vector3()
    const render = (time: number) => {
      frame = requestAnimationFrame(render)
      if (time - previous < 1000 / 30) return
      const dt = Math.min(.05, (time - (previous || time)) / 1000); previous = time
      if (document.hidden || !inView || !width || !height) return
      const p = latest.current
      if (!p.paused && !reduced.matches) phase += dt
      if (p.serial !== lastSerial) { lastSerial = p.serial; pulseAge = 0 }
      pulseAge += dt
      camera.position.z = Math.max(12, 4.8 / (Math.tan(22 * Math.PI / 180) * camera.aspect)) / view.current.zoom
      camera.updateMatrixWorld()
      cosmos.rotation.set(view.current.pitch, view.current.yaw, 0)
      let revealed = 0
      objects.forEach((object, id) => {
        const value = p.values[id]
        const known = Object.keys(value).length > 0
        if (known) revealed++
        object.amount += ((known ? 1 : 0) - object.amount) * (reduced.matches ? 1 : Math.min(1, dt * 5))
        const distance = value.distance === undefined ? 0 : value.distance ? 2 : -3
        object.group.position.z += (distance - object.group.position.z) * (reduced.matches ? 1 : Math.min(1, dt * 4))
        object.body.visible = value.light !== undefined
        object.material.emissive.setHex(value.light ? COLORS[id] : 0)
        object.material.emissiveIntensity = value.light ? 2 : 0
        object.body.scale.setScalar(Math.max(.01, object.amount))
        object.atmosphere.visible = value.light === true
        object.haze.visible = value.light !== undefined
        object.rings.visible = value.light === false
        object.wire.visible = known && value.light === undefined
        object.particles.visible = value.light === true
        object.trail.visible = value.motion === true
        object.moon.visible = value.motion !== undefined
        const a = value.motion ? phase * .65 + id : id
        object.moon.position.set(Math.cos(a) * .9, Math.sin(a) * .23, .5)
        object.body.position.set(value.motion ? Math.cos(a) * .2 : 0, value.motion ? Math.sin(a) * .14 : 0, 0)
        object.rings.position.copy(object.body.position)
        object.atmosphere.position.copy(object.body.position)
      })
      starsMaterial.opacity = Math.min(.65, revealed * .11)
      scene.updateMatrixWorld(true)
      objects.forEach((object, id) => {
        object.group.getWorldPosition(point); point.project(camera)
        const x = (point.x * .5 + .5) * width, y = (-point.y * .5 + .5) * height
        projected[id] = { x, y }
      })
      const positions = layoutUniverseLabels(projected.map(({ x, y }) => ({ x, y, visible: x > 15 && x < width - 15 && y > 25 && y < height - 30 })), width, height, { width: labelWidth, height: labelHeight })
      objects.forEach((_, id) => {
        const { x, y } = projected[id]
        const { x: labelX, y: labelY, visible } = positions[id]
        const label = labels.current[id]
        if (label) {
          const left = `${labelX.toFixed(1)}px`, top = `${labelY.toFixed(1)}px`, display = visible ? 'visible' : 'hidden'
          if (label.style.left !== left) label.style.left = left
          if (label.style.top !== top) label.style.top = top
          if (label.style.visibility !== display) label.style.visibility = display
        }
        const leader = leaders.current[id]
        if (leader) {
          for (const [key, value] of Object.entries({ x1: x, y1: y, x2: labelX, y2: labelY })) {
            const rounded = value.toFixed(1)
            if (leader.getAttribute(key) !== rounded) leader.setAttribute(key, rounded)
          }
          const opacity = visible && Math.hypot(x - labelX, y - labelY) > 5 ? '0.4' : '0'
          if (leader.style.opacity !== opacity) leader.style.opacity = opacity
        }
      })
      if (beam.current) {
        for (const [key, value] of Object.entries({ x1: width / 2, y1: height - 28, x2: projected[p.region].x, y2: projected[p.region].y })) {
          const rounded = value.toFixed(1)
          if (beam.current.getAttribute(key) !== rounded) beam.current.setAttribute(key, rounded)
        }
        const opacity = String(reduced.matches ? 0 : Math.max(0, 1 - pulseAge * 1.8) * .7)
        if (beam.current.style.opacity !== opacity) beam.current.style.opacity = opacity
      }
      renderer.render(scene, camera)
    }
    frame = requestAnimationFrame(render)
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = false, startX = 0, startY = 0
    const pointerDown = (e: PointerEvent) => {
      if (document.documentElement.dataset.labHelp === 'true') return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; startX = e.clientX; startY = e.clientY
      if (pointers.size > 1) moved = true
      element.setPointerCapture(e.pointerId)
    }
    const pointerMove = (e: PointerEvent) => {
      const before = pointers.get(e.pointerId)
      if (!before) return
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true
      if (pointers.size === 2) {
        const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1]
        const oldDistance = Math.hypot(before.x - other.x, before.y - other.y)
        const newDistance = Math.hypot(e.clientX - other.x, e.clientY - other.y)
        if (oldDistance > 8) view.current.zoom = THREE.MathUtils.clamp(view.current.zoom * newDistance / oldDistance, .7, 1.6)
      } else {
        view.current.yaw = THREE.MathUtils.clamp(view.current.yaw + (e.clientX - before.x) * .006, -.75, .75)
        view.current.pitch = THREE.MathUtils.clamp(view.current.pitch + (e.clientY - before.y) * .004, -.4, .4)
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const pointerUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      if (!moved && pointers.size === 1 && e.type === 'pointerup') {
        const rect = element.getBoundingClientRect()
        const nearest = projected.map((p, id) => ({ id, d: Math.hypot(p.x - (e.clientX - rect.left), p.y - (e.clientY - rect.top)) })).sort((a, b) => a.d - b.d)[0]
        if (nearest.d < 48) latest.current.onObserve(nearest.id)
      }
      pointers.delete(e.pointerId)
    }
    element.addEventListener('pointerdown', pointerDown); element.addEventListener('pointermove', pointerMove)
    element.addEventListener('pointerup', pointerUp); element.addEventListener('pointercancel', pointerUp)
    const help = (id: number) => ({ id: `universe-${id}`, entry: { title: REGIONS[id].name, body: 'Una región del mapa simbólico. Luz registra si emite luz visible propia; Distancia despliega su profundidad; Movimiento muestra si cambia de posición respecto de este mapa. Lo no consultado sigue sin registrar.' } })
    const unregister = registerSceneHelp(element, {
      items: () => REGIONS.map((_, id) => help(id)),
      pick: ({ x, y }) => {
        const rect = element.getBoundingClientRect()
        const nearest = projected.map((p, id) => ({ id, d: Math.hypot(p.x - (x - rect.left), p.y - (y - rect.top)) })).sort((a, b) => a.d - b.d)[0]
        return nearest.d < 55 ? help(nearest.id) : { id: 'universe-unknown', entry: { title: 'Sin registrar', body: 'La oscuridad representa información que todavía no consultaste. No demuestra que esa región no exista. El ojo es un instrumento simbólico; los objetos y sus escalas son una representación artística.' } }
      },
    })
    const lost = (event: Event) => { event.preventDefault(); setUnavailable(true) }
    const restored = () => setUnavailable(false)
    element.addEventListener('webglcontextlost', lost); element.addEventListener('webglcontextrestored', restored)
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); visibility.disconnect(); unregister()
      element.removeEventListener('pointerdown', pointerDown); element.removeEventListener('pointermove', pointerMove)
      element.removeEventListener('pointerup', pointerUp); element.removeEventListener('pointercancel', pointerUp)
      element.removeEventListener('webglcontextlost', lost); element.removeEventListener('webglcontextrestored', restored)
      scene.traverse(object => {
        const renderable = object as THREE.Mesh
        renderable.geometry?.dispose()
        const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
        materials.forEach(material => material?.dispose())
      })
      glowTexture.dispose()
      // The canvas survives scene navigation. CanvasTexture uploads leave these
      // flags set; a new renderer's placeholder 3D textures require them cleared.
      const gl = renderer.getContext()
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      renderer.dispose()
    }
  }, [props.active])

  return <div ref={host} className={`wu-board spum-live-stage ${unavailable ? 'wu-fallback' : ''}`}>
    <canvas ref={canvas} aria-label="Mapa tridimensional del universo simbólico. Arrastrá el fondo para girar; tocá una región para observarla." />
    <svg className="wu-beam" aria-hidden="true"><line ref={beam} />{REGIONS.map((region, id) => <line className="wu-leader" key={region.id} ref={el => { leaders.current[id] = el }} />)}</svg>
    <div className="wu-map-caption"><span>{props.rule.toLocaleUpperCase('es')}</span><small>Oscuro = sin registrar</small></div>
    <div className="wu-camera" aria-label="Acercamiento de la vista"><button aria-label="Alejar vista" onClick={() => { view.current.zoom = Math.max(.7, view.current.zoom / 1.15) }} data-help-title="Alejar la vista" data-help-body="Cambia el tamaño de la representación. No cambia las distancias registradas ni las propiedades del mapa.">−</button><button aria-label="Acercar vista" onClick={() => { view.current.zoom = Math.min(1.6, view.current.zoom * 1.15) }} data-help-title="Acercar la vista" data-help-body="Explorá el detalle del mapa. En pantallas táctiles también podés pellizcar el fondo. Centrar vista recupera el encuadre inicial.">+</button></div>
    {REGIONS.map((region, id) => <button ref={el => { labels.current[id] = el }} key={id} className={`wu-target ${props.region === id ? 'wu-target-active' : ''} ${Object.keys(props.values[id]).length ? 'wu-target-known' : ''}`}
      style={{ left: `${25 + id % 2 * 50}%`, top: `${25 + Math.floor(id / 2) * 25}%` }}
      aria-label={`Observar ${region.name}`} onClick={() => props.onObserve(id)}
      data-help-title={`Región ${region.name}`} data-help-body="Tocarla aplica la herramienta elegida y guarda su respuesta. Un nombre es una referencia del mapa, no una medición. Arrastrá el fondo para cambiar el punto de vista.">
      <span aria-hidden="true">{Object.keys(props.values[id]).length ? '✦' : '+'}</span><b>{region.name}</b>
    </button>)}
    <div className="wu-eye" aria-hidden="true"><svg viewBox="0 0 100 42"><path d="M4 21Q50-17 96 21Q50 59 4 21Z"/><circle cx="50" cy="21" r="14"/><circle cx="50" cy="21" r="5"/></svg><span>OJO · INSTRUMENTO SIMBÓLICO</span></div>
    {unavailable && <p className="wu-fallback-note">Vista 3D no disponible. Podés explorar con las regiones y sus registros.</p>}
  </div>
}
