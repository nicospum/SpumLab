import { useLayoutEffect, useRef, useState } from 'react'
import { effectiveSetup, OUTPUT_POINT, probabilities } from './delayed'
import type { DelayedState } from './delayed'

type Point = [number, number]
const CYAN = '#8fe9eb'
const GOLD = '#ffc784'

function pointOn(path: Point[], fraction: number): Point {
  const lengths = path.slice(1).map((point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1]))
  let remaining = Math.max(0, Math.min(1, fraction)) * lengths.reduce((sum, length) => sum + length, 0)
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = remaining / lengths[i]
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]
    }
    remaining -= lengths[i]
  }
  return path[path.length - 1]
}

function drawBoard(context: CanvasRenderingContext2D, width: number, height: number, state: DelayedState) {
  const ctx = context
  const source: Point = [width * .2, height * .94]
  const input: Point = [width * .5, height * .72]
  const left: Point = [width * .2, height * .49]
  const right: Point = [width * .8, height * .49]
  const output: Point = [width * .5, height * .26]
  const d0: Point = [width * .2, height * .04]
  const d1: Point = [width * .8, height * .04]
  const upper = [input, right, output]
  const lower = [input, left, output]
  const setup = effectiveSetup(state)
  const [p0, p1] = probabilities(setup.phase, setup.closed)
  ctx.clearRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * .5, height * .46, 0, width * .5, height * .46, width * .7)
  glow.addColorStop(0, '#173a49')
  glow.addColorStop(.6, '#0b1c2d')
  glow.addColorStop(1, '#07111f')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#59808d33'
  for (let x = 12; x < width; x += 24) for (let y = 12; y < height; y += 24) {
    ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI * 2); ctx.fill()
  }

  function line(points: Point[], color: string, strength = 1) {
    ctx.beginPath()
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5 + strength * 2
    ctx.globalAlpha = .24 + strength * .25
    ctx.shadowColor = color
    ctx.shadowBlur = 16
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
  }
  line([source, input], '#edf7eb', .6)
  line(upper, CYAN, .7)
  line(lower, GOLD, .7)
  line([output, d0], CYAN, p0)
  line([output, d1], GOLD, p1)

  function mirror(point: Point, angle: number) {
    ctx.save()
    ctx.translate(...point)
    ctx.rotate(angle)
    const metal = ctx.createLinearGradient(0, -7, 0, 7)
    metal.addColorStop(0, '#e4f9f3'); metal.addColorStop(.45, '#7ca9b5'); metal.addColorStop(1, '#1d414e')
    ctx.fillStyle = metal
    ctx.shadowColor = '#8ce1e6'; ctx.shadowBlur = 16
    ctx.fillRect(-18, -4, 36, 8)
    ctx.strokeStyle = '#f1fff4'; ctx.lineWidth = 1; ctx.strokeRect(-18, -4, 36, 8)
    ctx.restore()
  }
  mirror(left, Math.PI / 2)
  mirror(right, Math.PI / 2)
  ctx.save()
  ctx.translate(...input); ctx.rotate(Math.PI / 4)
  ctx.fillStyle = '#92dae435'; ctx.strokeStyle = '#a4e8ed'; ctx.lineWidth = 1.5
  ctx.fillRect(-13, -13, 26, 26); ctx.strokeRect(-13, -13, 26, 26)
  ctx.restore()
  ctx.font = '11px "Segoe UI", sans-serif'
  ctx.fillStyle = '#c1d7db'; ctx.textAlign = 'center'
  ctx.fillText('Entrada 50/50', input[0], input[1] + 31)
  ctx.fillStyle = CYAN; ctx.fillText('Brazo A', width * .79, height * .63)
  ctx.fillStyle = GOLD; ctx.fillText('Brazo B', width * .21, height * .37)
  // The phase plate sits before the pedagogical choice point along arm B.
  const plate = pointOn(lower, .27)
  mirror(plate, -.65)

  function packet(path: Point[], progress: number, color: string, amplitude: number, phase = 0) {
    if (amplitude < .0001) return
    ctx.beginPath()
    for (let i = 0; i <= 64; i++) {
      const offset = (i / 64 - .5) * .25
      const position = progress + offset
      if (position < 0 || position > 1) continue
      const point = pointOn(path, position)
      const next = pointOn(path, Math.min(1, position + .003))
      const angle = Math.atan2(next[1] - point[1], next[0] - point[0])
      const envelope = Math.exp(-Math.pow(offset / .055, 2))
      const wave = Math.sin(offset * 150 + phase) * envelope * 9 * amplitude
      const x = point[0] - Math.sin(angle) * wave
      const y = point[1] + Math.cos(angle) * wave
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.shadowColor = color; ctx.shadowBlur = 17
    ctx.stroke(); ctx.shadowBlur = 0
  }
  if (state.flight && state.stage !== 'detected') {
    const progress = state.flight.progress
    if (progress < .18) packet([source, input], progress / .18, '#f9f3d6', 1)
    else if (progress < OUTPUT_POINT) {
      const armProgress = (progress - .18) / (OUTPUT_POINT - .18)
      packet(upper, armProgress, CYAN, Math.SQRT1_2)
      packet(lower, armProgress, GOLD, Math.SQRT1_2, armProgress >= .27 ? setup.phase * Math.PI / 180 : 0)
    } else {
      const exitProgress = (progress - OUTPUT_POINT) / (1 - OUTPUT_POINT)
      packet([output, d0], exitProgress, CYAN, Math.sqrt(p0))
      packet([output, d1], exitProgress, GOLD, Math.sqrt(p1))
    }
  }
}

export default function DelayedBoard({ state, active }: { state: DelayedState; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 1, height: 1 })
  useLayoutEffect(() => {
    const element = canvas.current!
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (!active || !size.width || !size.height) return
    const element = canvas.current!
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    if (element.width !== Math.round(size.width * ratio) || element.height !== Math.round(size.height * ratio)) {
      element.width = Math.round(size.width * ratio)
      element.height = Math.round(size.height * ratio)
    }
    const context = element.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    drawBoard(context, size.width, size.height, state)
  }, [state, size, active])
  return <canvas ref={canvas} aria-hidden="true" />
}
