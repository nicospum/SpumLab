export interface MapPoint { x: number; y: number; visible: boolean }
export interface LabelSize { width: number; height: number }

/** Keep projected controls clear of the caption/camera above and the eye below.
 * A compact 3 × 2 fallback fits six 54 × 51 controls in a 261 × 200 mobile map. */
export function layoutUniverseLabels(points: readonly MapPoint[], width: number, height: number, size: LabelSize): MapPoint[] {
  const gap = 4, side = 6, top = 54, bottom = 40
  const minX = side + size.width / 2, maxX = width - minX
  const minY = top + size.height / 2, maxY = height - bottom - size.height / 2
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
  const valid = Number.isFinite(width + height + size.width + size.height) && size.width > 0 && size.height > 0 && maxX >= minX && maxY >= minY
  const result = points.map(point => ({
    x: valid ? clamp(point.x, minX, maxX) : 0,
    y: valid ? clamp(point.y, minY, maxY) : 0,
    visible: valid && point.visible && Number.isFinite(point.x + point.y),
  }))
  if (!valid) return result
  const visible = result.flatMap((point, id) => point.visible ? [id] : [])
  const placed: MapPoint[] = []
  const overlaps = (a: MapPoint, b: MapPoint) => Math.abs(a.x - b.x) < size.width + gap && Math.abs(a.y - b.y) < size.height + gap
  let crowded = false
  for (const id of visible) {
    const desired = result[id]
    const candidates: MapPoint[] = []
    for (const dx of [0, -1, 1, -2, 2]) for (const dy of [0, -1, 1, -2, 2]) candidates.push({
      x: clamp(desired.x + dx * (size.width + gap), minX, maxX),
      y: clamp(desired.y + dy * (size.height + gap), minY, maxY), visible: true,
    })
    candidates.sort((a, b) => Math.hypot(a.x - desired.x, a.y - desired.y) - Math.hypot(b.x - desired.x, b.y - desired.y))
    const free = candidates.find(candidate => !placed.some(previous => overlaps(candidate, previous)))
    if (!free) { crowded = true; break }
    result[id] = free
    placed.push(free)
  }
  if (!crowded) return result

  // Repack every visible label, not just the last one. Reusing an occupied
  // projected position would make the underlying region impossible to tap.
  const columns = Math.min(3, visible.length, Math.floor((width - 2 * side + gap) / (size.width + gap)))
  const rows = Math.min(Math.ceil(visible.length / columns), Math.floor((height - top - bottom + gap) / (size.height + gap)))
  const slots: MapPoint[] = []
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) slots.push({
    x: columns === 1 ? width / 2 : minX + column * (maxX - minX) / (columns - 1),
    y: rows === 1 ? (minY + maxY) / 2 : minY + row * (maxY - minY) / (rows - 1), visible: true,
  })
  for (const id of visible) {
    const point = points[id]
    slots.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))
    result[id] = slots.shift() ?? { ...result[id], visible: false }
  }
  return result
}
