import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { TwinLocation, TwinWarehouse } from '@/types/domain'

type WarehouseViewMode = 'overview' | 'dock' | 'aisle' | 'focus'

interface WarehouseLayout {
  maxRow: number
  stepX: number
  stepY: number
  stepZ: number
  groupGap: number
  offsetX: number
  offsetZ: number
  totalX: number
  totalZ: number
  rackHeight: number
}

/**
 * 数字孪生库房三维引擎（浅色精细风格）。
 * 按 sp_warehouse_location 的 组/排/层/列 坐标排布真实货架：
 * 每组货架含立柱、层间横梁、对角斜撑；占用库位放置木托盘 + 货箱（按占用着色）。
 * 场景含厂房立柱、顶部照明灯排、地面黄色通道线与装卸区标识。
 * 支持悬停高亮（射线检测命中库位透明盒）回传库位信息。
 */
export class WarehouseTwinScene {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls
  private raf = 0
  private container!: HTMLElement

  private rackGroup = new THREE.Group()
  private disposables: { dispose(): void }[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private hovered: THREE.Mesh | null = null
  private hoverCb: ((loc: TwinLocation | null) => void) | null = null
  private layout: WarehouseLayout | null = null

  // 共享几何：库位拾取盒（透明，仅用于射线命中）+ 货箱/托盘
  private pickGeo = new THREE.BoxGeometry(1, 1, 1)
  private hoverGeo = new THREE.BoxGeometry(1.08, 1.08, 1.08)
  private hoverMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    wireframe: true,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  })
  private hoverFrame = new THREE.Mesh(this.hoverGeo, this.hoverMat)
  // 共享结构件材质
  private steelMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.5 }) // 橙色货架
  private beamMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.4, roughness: 0.5 }) // 蓝色横梁
  private palletMat = new THREE.MeshStandardMaterial({ color: 0xb07a45, metalness: 0.05, roughness: 0.9 }) // 木托盘
  private pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }) // 拾取盒
  private goodsPalette: Record<string, THREE.MeshStandardMaterial> = {}

  init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.container = container
    const w = container.clientWidth || 800
    const h = container.clientHeight || 520

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xeef2f8)
    this.scene.fog = new THREE.Fog(0xeef2f8, 70, 160)

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400)
    this.camera.position.set(28, 26, 34)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.4
    this.controls.minDistance = 10
    this.controls.maxDistance = 120
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.target.set(0, 3, 0)

    this.buildLights()
    this.buildFloor()
    this.buildGoodsPalette()
    this.hoverFrame.visible = false
    this.hoverFrame.renderOrder = 10
    this.scene.add(this.rackGroup)
    this.scene.add(this.hoverFrame)

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.animate()
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb9c4d6, 0.95)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.95)
    dir.position.set(22, 34, 20)
    dir.castShadow = true
    dir.shadow.mapSize.set(1024, 1024)
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 140
    dir.shadow.camera.left = -60
    dir.shadow.camera.right = 60
    dir.shadow.camera.top = 40
    dir.shadow.camera.bottom = -40
    this.scene.add(dir)
    const fill = new THREE.DirectionalLight(0xdce6ff, 0.35)
    fill.position.set(-20, 16, -16)
    this.scene.add(fill)
  }

  private buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(240, 180)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf6f8fc,
      metalness: 0.05,
      roughness: 0.95,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    floor.receiveShadow = true
    this.scene.add(floor)
    this.disposables.push(floorGeo, floorMat)

    const grid = new THREE.GridHelper(240, 96, 0xc2cee0, 0xdde5f0)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.5
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)
  }

  private buildGoodsPalette() {
    const make = (color: number, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: emissive ? 0.18 : 0,
        metalness: 0.1,
        roughness: 0.7,
      })
    this.goodsPalette = {
      low: make(0xbfdbfe),
      mid: make(0x3b82f6, 0x1d4ed8),
      high: make(0x1d4ed8, 0x1e40af),
    }
    Object.values(this.goodsPalette).forEach((m) => this.disposables.push(m))
  }

  private bucket(loc: TwinLocation, maxQty: number): 'empty' | 'low' | 'mid' | 'high' | 'disabled' {
    if (loc.disabled) return 'disabled'
    if (!loc.occupied || loc.qty <= 0) return 'empty'
    const r = maxQty > 0 ? loc.qty / maxQty : 0
    if (r >= 0.66) return 'high'
    if (r >= 0.33) return 'mid'
    return 'low'
  }

  /** 用单个库房数据重建货架 */
  setWarehouse(wh: TwinWarehouse | null) {
    this.clearRacks()
    if (!wh || !wh.locations?.length) {
      this.hoverCb?.(null)
      return
    }
    const locs = wh.locations
    const maxQty = locs.reduce((m, l) => Math.max(m, l.qty || 0), 0)

    const maxGroup = Math.max(wh.dims?.group || 1, ...locs.map((l) => l.group))
    const maxRow = Math.max(wh.dims?.row || 1, ...locs.map((l) => l.row))
    const maxLayer = Math.max(wh.dims?.layer || 1, ...locs.map((l) => l.layer))
    const maxColumn = Math.max(wh.dims?.column || 1, ...locs.map((l) => l.column))

    const cell = 1.0
    const gap = 0.4
    const stepX = cell + gap
    const stepY = cell + 0.5 // 层高（含横梁余量）
    const stepZ = cell + gap
    const groupGap = stepZ * 2.0 // 组间通道更宽，可走 AGV

    const rowsPerGroup = maxRow
    const totalZ = maxGroup * (rowsPerGroup * stepZ) + (maxGroup - 1) * groupGap
    const totalX = maxColumn * stepX
    const offsetX = -totalX / 2 + stepX / 2
    const offsetZ = -totalZ / 2 + stepZ / 2
    const baseY = 0.05
    const rackHeight = maxLayer * stepY

    this.layout = {
      maxRow: rowsPerGroup,
      stepX,
      stepY,
      stepZ,
      groupGap,
      offsetX,
      offsetZ,
      totalX,
      totalZ,
      rackHeight,
    }

    // 1) 逐个库位放置：拾取盒（透明，命中用）+ 占用则放托盘货箱
    for (const loc of locs) {
      const g = Math.max(1, loc.group)
      const r = Math.max(1, loc.row)
      const layer = Math.max(1, loc.layer)
      const col = Math.max(1, loc.column)

      const x = offsetX + (col - 1) * stepX
      const y = (layer - 1) * stepY + cell / 2 + baseY
      const z = offsetZ + (g - 1) * (rowsPerGroup * stepZ + groupGap) + (r - 1) * stepZ

      // 透明拾取盒（保留悬停命中能力）
      const pick = new THREE.Mesh(this.pickGeo, this.pickMat)
      pick.position.set(x, y, z)
      pick.userData.loc = loc
      this.rackGroup.add(pick)

      const b = this.bucket(loc, maxQty)
      if (b === 'disabled') {
        // 禁用库位：放一个灰色禁用标记盒
        this.buildDisabledMark(x, y, z, cell)
      } else if (b !== 'empty') {
        this.buildCellGoods(x, y, z, cell, b)
      }
    }

    // 2) 货架结构：每个 (group,row) 一组立体货架
    for (let g = 1; g <= maxGroup; g++) {
      for (let r = 1; r <= rowsPerGroup; r++) {
        const cz = offsetZ + (g - 1) * (rowsPerGroup * stepZ + groupGap) + (r - 1) * stepZ
        this.buildShelfRack(offsetX, cz, stepX, stepY, maxColumn, maxLayer, cell, baseY)
      }
    }

    // 3) 通道黄线 + 装卸区 + 环境
    this.buildAisleMarkings(maxGroup, rowsPerGroup, stepZ, groupGap, offsetZ, totalX)
    this.buildWarehouseEnvironment(totalX, totalZ, rackHeight)
    this.buildRackLabels(maxGroup, rowsPerGroup, maxLayer, maxColumn, offsetX, offsetZ, stepX, stepZ, groupGap, totalX)
    this.buildWarehouseVehicles(totalX, totalZ)

    // 相机自适应
    this.setView('overview')
  }

  setView(mode: WarehouseViewMode) {
    if (!this.layout) return
    const span = Math.max(this.layout.totalX, this.layout.totalZ, this.layout.rackHeight) + 16
    this.controls.autoRotate = mode === 'overview'
    if (mode === 'dock') {
      this.camera.position.set(-this.layout.totalX / 2 - 10, 9, -this.layout.totalZ / 2 - 12)
      this.controls.target.set(-this.layout.totalX / 2 - 5, 1.2, -this.layout.totalZ / 2 - 2)
    } else if (mode === 'aisle') {
      this.camera.position.set(0, Math.max(5, this.layout.rackHeight * 0.65), -this.layout.totalZ / 2 - 9)
      this.controls.target.set(0, Math.max(2, this.layout.rackHeight * 0.35), 0)
    } else {
      this.camera.position.set(span * 0.6, span * 0.55 + 6, span * 0.85)
      this.controls.target.set(0, this.layout.rackHeight / 2, 0)
    }
    this.controls.update()
  }

  focusLocation(loc: TwinLocation | null) {
    if (!loc || !this.layout) return
    const pos = this.positionOf(loc)
    this.controls.autoRotate = false
    this.camera.position.set(pos.x + 5.2, Math.max(pos.y + 2.6, this.layout.rackHeight * 0.35), pos.z + 5.8)
    this.controls.target.copy(pos)
    this.controls.update()
  }

  private positionOf(loc: TwinLocation) {
    const layout = this.layout!
    const g = Math.max(1, loc.group)
    const r = Math.max(1, loc.row)
    const layer = Math.max(1, loc.layer)
    const col = Math.max(1, loc.column)
    return new THREE.Vector3(
      layout.offsetX + (col - 1) * layout.stepX,
      (layer - 1) * layout.stepY + 0.5 + 0.05,
      layout.offsetZ + (g - 1) * (layout.maxRow * layout.stepZ + layout.groupGap) + (r - 1) * layout.stepZ,
    )
  }

  /** 一组立体货架：4 立柱 + 每层前后横梁 + 后背对角斜撑 + 底部踢脚 */
  private buildShelfRack(
    offsetX: number,
    cz: number,
    stepX: number,
    stepY: number,
    maxColumn: number,
    maxLayer: number,
    cell: number,
    baseY: number,
  ) {
    const totalH = maxLayer * stepY
    const xStart = offsetX - stepX / 2
    const xEnd = offsetX + (maxColumn - 1) * stepX + stepX / 2
    const colSpan = xEnd - xStart
    const zFront = cz - cell / 2
    const zBack = cz + cell / 2

    // 立柱（4 根：前后 × 左右）
    const uprightGeo = new THREE.BoxGeometry(0.08, totalH + 0.35, 0.08)
    for (const ux of [xStart, xEnd]) {
      for (const uz of [zFront, zBack]) {
        const up = new THREE.Mesh(uprightGeo, this.steelMat)
        up.position.set(ux, (totalH + 0.35) / 2 + baseY - 0.05, uz)
        up.castShadow = true
        this.rackGroup.add(up)
      }
    }
    this.disposables.push(uprightGeo)

    // 每层前后横梁
    const beamGeo = new THREE.BoxGeometry(colSpan, 0.06, 0.06)
    for (let layer = 0; layer <= maxLayer; layer++) {
      const by = layer * stepY + baseY
      for (const bz of [zFront, zBack]) {
        const beam = new THREE.Mesh(beamGeo, this.beamMat)
        beam.position.set((xStart + xEnd) / 2, by, bz)
        this.rackGroup.add(beam)
      }
    }
    this.disposables.push(beamGeo)

    // 后背对角斜撑（X 形）
    const diagLen = Math.sqrt(totalH * totalH + colSpan * colSpan)
    const diagGeo = new THREE.BoxGeometry(0.04, diagLen, 0.04)
    const diagMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, metalness: 0.4, roughness: 0.6 })
    const angle = Math.atan2(totalH, colSpan)
    for (const sign of [1, -1]) {
      const diag = new THREE.Mesh(diagGeo, diagMat)
      diag.position.set((xStart + xEnd) / 2, totalH / 2 + baseY, zBack)
      diag.rotation.z = sign * (Math.PI / 2 - angle)
      this.rackGroup.add(diag)
    }
    this.disposables.push(diagGeo, diagMat)

    // 底部踢脚板（前后）
    const kickGeo = new THREE.BoxGeometry(colSpan, 0.1, 0.05)
    for (const bz of [zFront, zBack]) {
      const kick = new THREE.Mesh(kickGeo, this.steelMat)
      kick.position.set((xStart + xEnd) / 2, baseY + 0.05, bz)
      this.rackGroup.add(kick)
    }
    this.disposables.push(kickGeo)
  }

  /** 占用库位货物：木托盘 + 货箱（按占用等级着色，high 双层堆叠） */
  private buildCellGoods(x: number, y: number, z: number, cell: number, level: 'low' | 'mid' | 'high') {
    // 木托盘
    const palletGeo = new THREE.BoxGeometry(cell * 0.9, 0.12, cell * 0.9)
    const pallet = new THREE.Mesh(palletGeo, this.palletMat)
    pallet.position.set(x, y - cell / 2 + 0.06, z)
    pallet.castShadow = true
    pallet.receiveShadow = true
    this.rackGroup.add(pallet)
    this.disposables.push(palletGeo)

    const goodsMat = this.goodsPalette[level]
    const heightMap = { low: 0.42, mid: 0.6, high: 0.72 }
    const gh = heightMap[level]

    // 主货箱
    const stableVariation = seeded(`${x.toFixed(2)}:${y.toFixed(2)}:${z.toFixed(2)}`)
    const w1 = cell * (0.72 + stableVariation * 0.12)
    const d1 = cell * 0.8
    const box1Geo = new THREE.BoxGeometry(w1, gh, d1)
    const box1 = new THREE.Mesh(box1Geo, goodsMat)
    box1.position.set(x, y - cell / 2 + 0.12 + gh / 2, z)
    box1.castShadow = true
    this.rackGroup.add(box1)
    this.disposables.push(box1Geo)

    // 边线描边
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(box1Geo),
      new THREE.LineBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.3 }),
    )
    edges.position.copy(box1.position)
    this.rackGroup.add(edges)
    this.disposables.push(edges.geometry, edges.material as THREE.Material)

    // high 等级再堆一个小箱
    if (level === 'high') {
      const w2 = cell * 0.5
      const box2Geo = new THREE.BoxGeometry(w2, 0.32, cell * 0.5)
      const box2 = new THREE.Mesh(box2Geo, goodsMat)
      box2.position.set(x + cell * 0.12, y - cell / 2 + 0.12 + gh + 0.16, z)
      box2.castShadow = true
      this.rackGroup.add(box2)
      this.disposables.push(box2Geo)
    }
  }

  private buildDisabledMark(x: number, y: number, z: number, cell: number) {
    const geo = new THREE.BoxGeometry(cell * 0.6, cell * 0.1, cell * 0.6)
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa6b8, transparent: true, opacity: 0.6 })
    const mark = new THREE.Mesh(geo, mat)
    mark.position.set(x, y - cell / 2 + 0.05, z)
    this.rackGroup.add(mark)
    this.disposables.push(geo, mat)
  }

  /** 通道黄线（组间）+ 装卸区标识 */
  private buildAisleMarkings(
    maxGroup: number,
    rowsPerGroup: number,
    stepZ: number,
    groupGap: number,
    offsetZ: number,
    totalX: number,
  ) {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.2 })
    const lineGeo = new THREE.BoxGeometry(totalX + 4, 0.01, 0.12)

    // 每个组间通道中心画两条黄线
    for (let g = 1; g < maxGroup; g++) {
      const aisleCenterZ =
        offsetZ + (g - 1) * (rowsPerGroup * stepZ + groupGap) + (rowsPerGroup - 1) * stepZ + groupGap / 2 + stepZ / 2
      for (const dz of [-groupGap * 0.28, groupGap * 0.28]) {
        const line = new THREE.Mesh(lineGeo, lineMat)
        line.position.set(0, 0.012, aisleCenterZ + dz)
        this.rackGroup.add(line)
      }
    }
    this.disposables.push(lineGeo, lineMat)

    // 装卸区（场景前方）
    const zoneZ = offsetZ - rowsPerGroup * stepZ - 2
    const zoneMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, transparent: true, opacity: 0.12 })
    const zoneGeo = new THREE.PlaneGeometry(6, 4)
    const zone = new THREE.Mesh(zoneGeo, zoneMat)
    zone.rotation.x = -Math.PI / 2
    zone.position.set(-totalX / 2 - 5, 0.013, zoneZ)
    this.rackGroup.add(zone)
    this.disposables.push(zoneGeo, zoneMat)

    // 装卸区边框
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x16a34a })
    const hGeo = new THREE.BoxGeometry(6, 0.015, 0.08)
    const vGeo = new THREE.BoxGeometry(0.08, 0.015, 4)
    const positions: [THREE.BoxGeometry, number, number][] = [
      [hGeo, 0, -2],
      [hGeo, 0, 2],
      [vGeo, -3, 0],
      [vGeo, 3, 0],
    ]
    for (const [geo, dx, dz] of positions) {
      const border = new THREE.Mesh(geo, borderMat)
      border.position.set(-totalX / 2 - 5 + dx, 0.014, zoneZ + dz)
      this.rackGroup.add(border)
    }
    this.disposables.push(hGeo, vGeo, borderMat)

    // 装卸区标签
    const label = this.makeTextSprite('装卸区')
    label.position.set(-totalX / 2 - 5, 2.2, zoneZ)
    label.scale.set(3.2, 1.6, 1)
    this.rackGroup.add(label)
  }

  private buildRackLabels(
    maxGroup: number,
    rowsPerGroup: number,
    maxLayer: number,
    maxColumn: number,
    offsetX: number,
    offsetZ: number,
    stepX: number,
    stepZ: number,
    groupGap: number,
    totalX: number,
  ) {
    for (let g = 1; g <= maxGroup; g++) {
      const groupStart = offsetZ + (g - 1) * (rowsPerGroup * stepZ + groupGap)
      const groupMid = groupStart + ((rowsPerGroup - 1) * stepZ) / 2
      const label = this.makeTextSprite(`G${g}`)
      label.position.set(-totalX / 2 - 2.2, 1.2, groupMid)
      label.scale.set(1.8, 0.9, 1)
      this.rackGroup.add(label)
    }

    for (let c = 1; c <= maxColumn; c += Math.max(1, Math.ceil(maxColumn / 6))) {
      const label = this.makeTextSprite(`C${c}`)
      label.position.set(offsetX + (c - 1) * stepX, 0.55, offsetZ - 2.1)
      label.scale.set(1.35, 0.75, 1)
      this.rackGroup.add(label)
    }

    for (let layer = 1; layer <= maxLayer; layer++) {
      const label = this.makeTextSprite(`L${layer}`)
      label.position.set(totalX / 2 + 2, (layer - 0.5) * this.layout!.stepY, offsetZ)
      label.scale.set(1.35, 0.75, 1)
      this.rackGroup.add(label)
    }
  }

  private buildWarehouseVehicles(totalX: number, totalZ: number) {
    this.buildForklift(-totalX / 2 - 1.8, -totalZ / 2 - 4)
    this.buildAgv(totalX / 2 + 1.8, -totalZ / 2 + 2.2)
  }

  private buildForklift(x: number, z: number) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = -0.25
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.22, roughness: 0.48 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 })
    const forkMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.72, roughness: 0.34 })
    const bodyGeo = new THREE.BoxGeometry(1.55, 0.72, 1.12)
    const cabGeo = new THREE.BoxGeometry(0.82, 1.05, 0.9)
    const mastGeo = new THREE.BoxGeometry(0.11, 1.95, 0.11)
    const forkGeo = new THREE.BoxGeometry(1.55, 0.06, 0.1)
    const wheelGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.18, 16)

    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.46
    const cab = new THREE.Mesh(cabGeo, bodyMat)
    cab.position.set(-0.25, 1.14, 0)
    group.add(body, cab)
    for (const wx of [-0.55, 0.55]) {
      for (const wz of [-0.42, 0.42]) {
        const wheel = new THREE.Mesh(wheelGeo, darkMat)
        wheel.rotation.x = Math.PI / 2
        wheel.position.set(wx, 0.22, wz)
        group.add(wheel)
      }
    }
    for (const mx of [0.78, 1.02]) {
      const mast = new THREE.Mesh(mastGeo, forkMat)
      mast.position.set(mx, 1.05, 0)
      group.add(mast)
    }
    for (const fz of [-0.26, 0.26]) {
      const fork = new THREE.Mesh(forkGeo, forkMat)
      fork.position.set(1.48, 0.32, fz)
      group.add(fork)
    }
    this.rackGroup.add(group)
    this.disposables.push(bodyMat, darkMat, forkMat, bodyGeo, cabGeo, mastGeo, forkGeo, wheelGeo)
  }

  private buildAgv(x: number, z: number) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = Math.PI / 2
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.35, roughness: 0.45 })
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.75 })
    const bodyGeo = new THREE.BoxGeometry(1.7, 0.32, 1.0)
    const lampGeo = new THREE.BoxGeometry(0.18, 0.08, 0.72)
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.18
    const lamp = new THREE.Mesh(lampGeo, glowMat)
    lamp.position.set(0.82, 0.39, 0)
    group.add(body, lamp)
    this.rackGroup.add(group)
    this.disposables.push(bodyMat, glowMat, bodyGeo, lampGeo)
  }

  /** 环境：外墙立柱 + 顶部钢构 + 照明灯排 */
  private buildWarehouseEnvironment(totalX: number, totalZ: number, rackHeight: number) {
    const roofY = Math.max(rackHeight + 4, 9)
    const spanX = totalX + 12
    const spanZ = totalZ + 12

    // 外墙立柱
    const colGeo = new THREE.BoxGeometry(0.55, roofY, 0.55)
    const colMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.3, roughness: 0.6 })
    const halfX = spanX / 2
    const halfZ = spanZ / 2
    const colPositions: [number, number][] = [
      [-halfX, -halfZ],
      [halfX, -halfZ],
      [-halfX, halfZ],
      [halfX, halfZ],
      [0, -halfZ],
      [0, halfZ],
    ]
    for (const [cx, cz] of colPositions) {
      const col = new THREE.Mesh(colGeo, colMat)
      col.position.set(cx, roofY / 2, cz)
      this.rackGroup.add(col)
    }
    this.disposables.push(colGeo, colMat)

    // 顶部钢构梁
    const trussGeo = new THREE.BoxGeometry(spanX, 0.4, 0.25)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.5 })
    for (const tz of [-halfZ, 0, halfZ]) {
      const truss = new THREE.Mesh(trussGeo, trussMat)
      truss.position.set(0, roofY, tz)
      this.rackGroup.add(truss)
    }
    this.disposables.push(trussGeo, trussMat)

    // 顶部照明灯排
    const lampHousingGeo = new THREE.BoxGeometry(1.8, 0.2, 0.6)
    const lampHousingMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.3, roughness: 0.5 })
    const lampPanelGeo = new THREE.BoxGeometry(1.6, 0.04, 0.5)
    const lampPanelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 })
    const step = 6
    for (let lx = -halfX + 3; lx <= halfX - 3; lx += step) {
      for (let lz = -halfZ + 3; lz <= halfZ - 3; lz += step * 1.4) {
        const housing = new THREE.Mesh(lampHousingGeo, lampHousingMat)
        housing.position.set(lx, roofY - 0.25, lz)
        this.rackGroup.add(housing)
        const panel = new THREE.Mesh(lampPanelGeo, lampPanelMat)
        panel.position.set(lx, roofY - 0.34, lz)
        this.rackGroup.add(panel)
      }
    }
    this.disposables.push(lampHousingGeo, lampHousingMat, lampPanelGeo, lampPanelMat)

    // 半透明墙面与月台卷帘门，让场景更接近真实库房空间
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xdbe3ee,
      roughness: 0.75,
      transparent: true,
      opacity: 0.42,
    })
    const backWallGeo = new THREE.BoxGeometry(spanX, roofY, 0.18)
    const backWall = new THREE.Mesh(backWallGeo, wallMat)
    backWall.position.set(0, roofY / 2, halfZ)
    this.rackGroup.add(backWall)
    const sideWallGeo = new THREE.BoxGeometry(0.18, roofY, spanZ)
    for (const sx of [-halfX, halfX]) {
      const sideWall = new THREE.Mesh(sideWallGeo, wallMat)
      sideWall.position.set(sx, roofY / 2, 0)
      this.rackGroup.add(sideWall)
    }
    this.disposables.push(wallMat, backWallGeo, sideWallGeo)

    const doorGeo = new THREE.BoxGeometry(3.4, 3.1, 0.16)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.42, roughness: 0.36 })
    const dockZ = -halfZ - 0.08
    for (let i = 0; i < 3; i++) {
      const door = new THREE.Mesh(doorGeo, doorMat)
      door.position.set(-halfX + 3.2 + i * 3.8, 1.55, dockZ)
      this.rackGroup.add(door)
      const label = this.makeTextSprite(`月台 ${i + 1}`)
      label.position.set(door.position.x, 3.35, dockZ - 0.05)
      label.scale.set(2.1, 0.9, 1)
      this.rackGroup.add(label)
    }
    this.disposables.push(doorGeo, doorMat)

    // 红色消防管线与喷淋头
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.3, roughness: 0.48 })
    const pipeGeo = new THREE.CylinderGeometry(0.055, 0.055, spanX - 5, 12)
    for (const pz of [-halfZ + 3, 0, halfZ - 3]) {
      const pipe = new THREE.Mesh(pipeGeo, pipeMat)
      pipe.rotation.z = Math.PI / 2
      pipe.position.set(0, roofY - 1.1, pz)
      this.rackGroup.add(pipe)
    }
    const headGeo = new THREE.CylinderGeometry(0.04, 0.11, 0.16, 10)
    for (let hx = -halfX + 5; hx <= halfX - 5; hx += 8) {
      const head = new THREE.Mesh(headGeo, pipeMat)
      head.position.set(hx, roofY - 1.35, 0)
      this.rackGroup.add(head)
    }
    this.disposables.push(pipeMat, pipeGeo, headGeo)

    // 角落监控摄像头
    const camGeo = new THREE.BoxGeometry(0.42, 0.22, 0.28)
    const lensGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12)
    const camMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.42 })
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.4, roughness: 0.32 })
    for (const [cx, cz] of [
      [-halfX + 0.9, -halfZ + 0.9],
      [halfX - 0.9, -halfZ + 0.9],
      [-halfX + 0.9, halfZ - 0.9],
      [halfX - 0.9, halfZ - 0.9],
    ] as [number, number][]) {
      const cam = new THREE.Group()
      const body = new THREE.Mesh(camGeo, camMat)
      const lens = new THREE.Mesh(lensGeo, lensMat)
      lens.rotation.x = Math.PI / 2
      lens.position.z = -0.22
      cam.add(body, lens)
      cam.position.set(cx, roofY - 1.45, cz)
      cam.lookAt(0, 1.6, 0)
      this.rackGroup.add(cam)
    }
    this.disposables.push(camGeo, lensGeo, camMat, lensMat)
  }

  private makeTextSprite(text: string): THREE.Sprite {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(22,163,74,0.9)'
    roundRect(ctx, 8, 8, 240, 112, 14)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 64)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    this.disposables.push(tex, mat)
    return new THREE.Sprite(mat)
  }

  onHover(cb: (loc: TwinLocation | null) => void) {
    this.hoverCb = cb
  }

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private updateHover() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.rackGroup.children, false)
    const mesh = hits.find((h) => (h.object as THREE.Mesh).userData?.loc)?.object as
      | THREE.Mesh
      | undefined
    if (mesh === this.hovered) return
    this.hovered = mesh ?? null
    if (this.hovered) {
      this.hoverFrame.visible = true
      this.hoverFrame.position.copy(this.hovered.position)
    } else {
      this.hoverFrame.visible = false
    }
    this.hoverCb?.((this.hovered?.userData.loc as TwinLocation) ?? null)
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate)
    this.updateHover()
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  resize() {
    if (!this.container) return
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w === 0 || h === 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  private clearRacks() {
    this.hovered = null
    this.hoverFrame.visible = false
    for (const child of [...this.rackGroup.children]) {
      this.rackGroup.remove(child)
    }
    // 释放本批新建资源（保留共享几何与材质）
    const keep = new Set<object>([
      this.pickGeo,
      this.hoverGeo,
      this.hoverMat,
      this.steelMat,
      this.beamMat,
      this.palletMat,
      this.pickMat,
      ...Object.values(this.goodsPalette),
    ])
    const remain: { dispose(): void }[] = []
    for (const d of this.disposables) {
      if (keep.has(d as object)) {
        remain.push(d)
      } else {
        try {
          d.dispose()
        } catch {
          // ignore
        }
      }
    }
    this.disposables = remain
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.renderer?.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.clearRacks()
    this.pickGeo.dispose()
    this.hoverGeo.dispose()
    this.hoverMat.dispose()
    this.steelMat.dispose()
    this.beamMat.dispose()
    this.palletMat.dispose()
    this.pickMat.dispose()
    Object.values(this.goodsPalette).forEach((m) => m.dispose())
    this.scene?.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose?.()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
      else mat?.dispose?.()
    })
    this.controls?.dispose()
    this.renderer?.dispose()
  }
}

function seeded(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return ((h >>> 0) % 1000) / 1000
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
