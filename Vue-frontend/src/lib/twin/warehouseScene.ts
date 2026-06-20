import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { TwinLocation, TwinWarehouse } from '@/types/domain'

/**
 * 数字孪生库房三维引擎（浅色精细风格）。
 * 按 sp_warehouse_location 的 组/排/层/列 坐标排布库位货架网格，
 * 按真实库存占用着色（空 / 低 / 中 / 满），支持悬停高亮回传库位信息。
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

  // 共享几何 + 材质调色板（按占用桶复用，控制材质数量）
  private cellGeo = new THREE.BoxGeometry(1, 1, 1)
  private palette: Record<string, THREE.MeshStandardMaterial> = {}

  init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.container = container
    const w = container.clientWidth || 800
    const h = container.clientHeight || 520

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xeef2f8)
    this.scene.fog = new THREE.Fog(0xeef2f8, 60, 140)

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 400)
    this.camera.position.set(26, 24, 32)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.4
    this.controls.minDistance = 10
    this.controls.maxDistance = 110
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.target.set(0, 3, 0)

    this.buildLights()
    this.buildFloor()
    this.buildPalette()
    this.scene.add(this.rackGroup)

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.animate()
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xb9c4d6, 1.05)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(20, 30, 18)
    this.scene.add(dir)
    const fill = new THREE.DirectionalLight(0xdce6ff, 0.4)
    fill.position.set(-18, 14, -14)
    this.scene.add(fill)
  }

  private buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(220, 160)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf6f8fc,
      metalness: 0.05,
      roughness: 0.95,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    this.scene.add(floor)
    this.disposables.push(floorGeo, floorMat)

    const grid = new THREE.GridHelper(220, 88, 0xc2cee0, 0xdde5f0)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.6
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)
  }

  private buildPalette() {
    const make = (color: number, opacity = 1, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: emissive ? 0.25 : 0,
        metalness: 0.15,
        roughness: 0.55,
        transparent: opacity < 1,
        opacity,
      })
    this.palette = {
      empty: make(0xd5dded, 0.32),
      low: make(0x93c5fd, 0.92),
      mid: make(0x3b82f6, 0.96, 0x1d4ed8),
      high: make(0x1d4ed8, 1, 0x1e40af),
      disabled: make(0x9aa6b8, 0.5),
    }
    Object.values(this.palette).forEach((m) => this.disposables.push(m))
  }

  private bucket(loc: TwinLocation, maxQty: number): string {
    if (loc.disabled) return 'disabled'
    if (!loc.occupied || loc.qty <= 0) return 'empty'
    const r = maxQty > 0 ? loc.qty / maxQty : 0
    if (r >= 0.66) return 'high'
    if (r >= 0.33) return 'mid'
    return 'low'
  }

  /** 用单个库房数据重建货架网格 */
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
    const gap = 0.35
    const stepX = cell + gap
    const stepY = cell + gap
    const stepZ = cell + gap
    const groupGap = stepZ * 1.6

    // 整体范围用于居中
    const rowsPerGroup = maxRow
    const totalZ = maxGroup * (rowsPerGroup * stepZ) + (maxGroup - 1) * groupGap
    const totalX = maxColumn * stepX
    const offsetX = -totalX / 2 + stepX / 2
    const offsetZ = -totalZ / 2 + stepZ / 2

    for (const loc of locs) {
      const g = Math.max(1, loc.group)
      const r = Math.max(1, loc.row)
      const layer = Math.max(1, loc.layer)
      const col = Math.max(1, loc.column)

      const x = offsetX + (col - 1) * stepX
      const y = (layer - 1) * stepY + cell / 2 + 0.05
      const z = offsetZ + (g - 1) * (rowsPerGroup * stepZ + groupGap) + (r - 1) * stepZ

      const mat = this.palette[this.bucket(loc, maxQty)]
      const mesh = new THREE.Mesh(this.cellGeo, mat)
      mesh.position.set(x, y, z)
      mesh.userData.loc = loc
      this.rackGroup.add(mesh)

      // 占用库位描边，增强精致感
      if (loc.occupied && !loc.disabled) {
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(this.cellGeo),
          new THREE.LineBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.25 }),
        )
        edges.position.copy(mesh.position)
        this.rackGroup.add(edges)
        this.disposables.push(edges.geometry, edges.material as THREE.Material)
      }
    }

    // 相机自适应
    const span = Math.max(totalX, totalZ, maxLayer * stepY) + 14
    this.camera.position.set(span * 0.6, span * 0.55 + 6, span * 0.8)
    this.controls.target.set(0, (maxLayer * stepY) / 2, 0)
    this.controls.update()
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
    // 还原旧的
    if (this.hovered) this.hovered.scale.setScalar(1)
    this.hovered = mesh ?? null
    if (this.hovered) this.hovered.scale.setScalar(1.18)
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
    for (const child of [...this.rackGroup.children]) {
      this.rackGroup.remove(child)
    }
    // 释放本批新建的描边资源（保留共享几何/调色板）
    const keep = new Set<object>([this.cellGeo, ...Object.values(this.palette)])
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
    this.cellGeo.dispose()
    Object.values(this.palette).forEach((m) => m.dispose())
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
