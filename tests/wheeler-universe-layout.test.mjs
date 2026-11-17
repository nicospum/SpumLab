import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { layoutUniverseLabels } from '../src/wheeler/universeLayout.ts'

function safeLayout(points, width, height, size, allowHidden = false) {
  const labels = layoutUniverseLabels(points, width, height, size)
  if (!allowHidden) assert.equal(labels.filter(p => p.visible).length, points.filter(p => p.visible).length)
  labels.forEach((label, id) => {
    if (!label.visible) return
    assert.ok(label.x - size.width / 2 >= 6 - 1e-8, `Label ${id} outside left edge`)
    assert.ok(label.x + size.width / 2 <= width - 6 + 1e-8, `Label ${id} outside right edge`)
    assert.ok(label.y - size.height / 2 >= 54 - 1e-8, `Label ${id} covers caption or camera controls`)
    assert.ok(label.y + size.height / 2 <= height - 40 + 1e-8, `Label ${id} covers the eye`)
    labels.slice(id + 1).filter(p => p.visible).forEach(other => {
      assert.ok(Math.abs(label.x - other.x) >= size.width + 3.9 || Math.abs(label.y - other.y) >= size.height + 3.9,
        `Overlapping controls: ${JSON.stringify(label)} / ${JSON.stringify(other)}`)
    })
  })
  return labels
}

test('six crowded mobile targets remain separately tappable at the 200px reviewed height', () => {
  // Regression: the former Y-only search placed Eco and Umbral almost together.
  const points = [
    { x: 107.98, y: 93.15, visible: true }, { x: 153.02, y: 93.15, visible: true },
    { x: 75.06, y: 123.47, visible: true }, { x: 185.94, y: 123.47, visible: true },
    { x: 108.84, y: 151.19, visible: true }, { x: 152.16, y: 151.19, visible: true },
  ]
  for (const height of [200, 210, 220, 240, 260]) safeLayout(points, 261, height, { width: 54, height: 51 })
})

test('projected regions stay separated through legal camera, depth and viewport combinations', () => {
  const positions = [[-1.3, 1.55], [1.3, 1.55], [-3.2, -.2], [3.2, -.2], [-1.25, -1.8], [1.25, -1.8]]
  const viewports = [[261, 200, 54, 51], [261, 220, 54, 51], [261, 240, 54, 51], [331, 300, 54, 51], [700, 490, 64, 58]]
  for (const [width, height, labelWidth, labelHeight] of viewports) {
    for (const yaw of [-.75, 0, .75]) for (const pitch of [-.4, 0, .4]) for (const zoom of [.7, 1, 1.6]) {
      // null is the initial unmeasured plane; the masks preserve Alba near/Eco far.
      for (const mask of [null, 1, 5, 9, 17, 33, 61]) {
        const camera = new THREE.PerspectiveCamera(44, width / height, .1, 100)
        camera.position.z = Math.max(12, 4.8 / (Math.tan(22 * Math.PI / 180) * camera.aspect)) / zoom
        camera.updateMatrixWorld()
        const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, yaw, 0))
        const points = positions.map(([x, y], id) => {
          const z = mask === null ? 0 : mask & 1 << id ? 2 : -3
          const projected = new THREE.Vector3(x, y, z).applyMatrix4(rotation).project(camera)
          const px = (projected.x * .5 + .5) * width, py = (-projected.y * .5 + .5) * height
          return { x: px, y: py, visible: px > 15 && px < width - 15 && py > 25 && py < height - 30 }
        })
        safeLayout(points, width, height, { width: labelWidth, height: labelHeight })
      }
    }
  }
})

test('placement is deterministic, leaves input unchanged, and keeps offscreen controls hidden', () => {
  const points = [{ x: 100, y: 100, visible: true }, { x: 101, y: 102, visible: true }, { x: -200, y: 20, visible: false }]
  const before = structuredClone(points)
  const first = safeLayout(points, 261, 220, { width: 54, height: 51 })
  assert.deepEqual(layoutUniverseLabels(points, 261, 220, { width: 54, height: 51 }), first)
  assert.deepEqual(points, before)
  assert.equal(first[2].visible, false)
})

test('undersized or invalid maps hide excess controls instead of overlapping them', () => {
  const points = Array.from({ length: 6 }, () => ({ x: 50, y: 100, visible: true }))
  const compact = safeLayout(points, 100, 160, { width: 54, height: 51 }, true)
  assert.equal(compact.filter(point => point.visible).length, 1)
  for (const [width, height] of [[0, 0], [NaN, 200], [261, Infinity], [50, 90]]) {
    assert.ok(layoutUniverseLabels(points, width, height, { width: 54, height: 51 }).every(point => !point.visible))
  }
})
