import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/** 产线工位（由真实工序流数据派生） */
export interface TwinStation {
  oper: string
  operDesc: string
  stepNo: number
  ok: number
  ng: number
  total: number
  status: 'running' | 'idle' | 'alarm'
  yieldRate: number
}

const STATUS_COLOR: Record<TwinStation['status'], number> = {
  running: 0x22c55e,
  idle: 0x94a3b8,
  alarm: 0xef4444,
}

const SPACING = 7
const MAX_STATIONS = 8

/**
 * 智能产线数字孪生三维引擎（原生 three.js）。
 * 沿传送带排布若干工位节点，按真实工序状态着色，并有物料流动与告警脉冲动画。
 */
export class ProductionTwinScene {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls
  private clock = new THREE.Clock()
  private raf = 0
  private container!: HTMLElement

  private stationGroup = new THREE.Group()
  private products: THREE.Mesh[] = []
  private beacons: { mesh: THREE.Mesh; halo: THREE.Sprite; status: TwinStation['status'] }[] = []
  private conveyorTex: THREE.CanvasTexture | null = null
  private disposables: { dispose(): void }[] = []

  private startX = -20
  private endX = 20

  init(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.container = container
    const w = container.clientWidth || 800
    const h = container.clientHeight || 500

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x0a1124, 38, 90)

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 300)
    this.camera.position.set(6, 16, 30)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.5
    this.controls.minDistance = 14
    this.controls.maxDistance = 60
    this.controls.maxPolarAngle = Math.PI / 2.15
    this.controls.target.set(0, 1.5, 0)

    this.buildLights()
    this.buildFloor()
    this.scene.add(this.stationGroup)

    this.animate()
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x0a1124, 0.9)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 1.1)
    dir.position.set(12, 24, 16)
    this.scene.add(dir)
    const fill = new THREE.PointLight(0x3b82f6, 0.6, 120)
    fill.position.set(-18, 12, -10)
    this.scene.add(fill)
  }

  private buildFloor() {
    // 深色地面
    const floorGeo = new THREE.PlaneGeometry(160, 90)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1530,
      metalness: 0.6,
      roughness: 0.7,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    this.scene.add(floor)
    this.disposables.push(floorGeo, floorMat)

    // 科技感网格
    const grid = new THREE.GridHelper(160, 80, 0x1e3a8a, 0x12224a)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.35
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)
  }

  /** 用真实工位数据构建/重建场景内容 */
  setStations(stations: TwinStation[]) {
    this.clearStations()

    const list = stations.slice(0, MAX_STATIONS)
    const n = Math.max(list.length, 1)
    const totalWidth = (n - 1) * SPACING
    this.startX = -totalWidth / 2 - SPACING * 1.2
    this.endX = totalWidth / 2 + SPACING * 1.2

    // 传送带
    this.buildConveyor(this.startX, this.endX)

    // 工位
    list.forEach((st, i) => {
      const x = -totalWidth / 2 + i * SPACING
      this.buildStation(st, x)
    })

    // 物料流（沿带流动的发光块）
    const count = Math.max(4, n + 2)
    for (let i = 0; i < count; i++) {
      const t = i / count
      const x = THREE.MathUtils.lerp(this.startX, this.endX, t)
      this.buildProduct(x)
    }

    // 相机距离随产线宽度自适应
    const dist = THREE.MathUtils.clamp(totalWidth * 0.9 + 22, 22, 58)
    this.camera.position.set(dist * 0.18, dist * 0.55, dist)
    this.controls.update()
  }

  private buildConveyor(startX: number, endX: number) {
    const len = endX - startX
    const tex = this.makeConveyorTexture()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(Math.max(2, Math.round(len / 2)), 1)
    this.conveyorTex = tex

    const geo = new THREE.BoxGeometry(len, 0.4, 3)
    const topMat = new THREE.MeshStandardMaterial({ map: tex, color: 0x1b2a52, metalness: 0.4, roughness: 0.6 })
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0f1c3d, metalness: 0.5, roughness: 0.5 })
    // 顶面用带纹理材质，其余用侧面材质
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
    const belt = new THREE.Mesh(geo, mats)
    belt.position.set((startX + endX) / 2, 0.2, 0)
    this.stationGroup.add(belt)
    this.disposables.push(geo, topMat, sideMat, tex)
  }

  private buildStation(st: TwinStation, x: number) {
    const group = new THREE.Group()
    group.position.set(x, 0, 0)

    // 机身
    const bodyGeo = new THREE.BoxGeometry(3, 2.2, 3)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x223763, metalness: 0.75, roughness: 0.35 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, 1.3, -2.4)
    group.add(body)

    // 顶部面板（良率发光条）
    const color = STATUS_COLOR[st.status]
    const panelGeo = new THREE.BoxGeometry(2.6, 0.18, 0.5)
    const panelMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 })
    const panel = new THREE.Mesh(panelGeo, panelMat)
    panel.position.set(0, 2.5, -1.05)
    group.add(panel)

    // 状态信标（顶灯）
    const beaconGeo = new THREE.SphereGeometry(0.42, 24, 24)
    const beaconMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 })
    const beacon = new THREE.Mesh(beaconGeo, beaconMat)
    beacon.position.set(0, 3.1, -2.4)
    group.add(beacon)

    // 信标光晕
    const halo = this.makeGlowSprite(color)
    halo.position.copy(beacon.position)
    halo.scale.set(2.6, 2.6, 1)
    group.add(halo)

    this.beacons.push({ mesh: beacon, halo, status: st.status })

    // 标签
    const label = this.makeLabel(st, color)
    label.position.set(0, 4.6, -2.4)
    group.add(label)

    this.stationGroup.add(group)
    this.disposables.push(bodyGeo, bodyMat, panelGeo, panelMat, beaconGeo, beaconMat)
  }

  private buildProduct(x: number) {
    const geo = new THREE.BoxGeometry(0.9, 0.9, 1.4)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.4,
    })
    const cube = new THREE.Mesh(geo, mat)
    cube.position.set(x, 0.85, 0)
    this.products.push(cube)
    this.stationGroup.add(cube)
    this.disposables.push(geo, mat)
  }

  private makeConveyorTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#16244a'
    ctx.fillRect(0, 0, 128, 64)
    ctx.fillStyle = '#2a4a8c'
    for (let i = -64; i < 128; i += 24) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + 12, 0)
      ctx.lineTo(i + 12 + 32, 64)
      ctx.lineTo(i + 32, 64)
      ctx.closePath()
      ctx.fill()
    }
    return new THREE.CanvasTexture(c)
  }

  private makeGlowSprite(color: number): THREE.Sprite {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    const ctx = c.getContext('2d')!
    const col = new THREE.Color(color)
    const r = Math.round(col.r * 255)
    const g = Math.round(col.g * 255)
    const b = Math.round(col.b * 255)
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`)
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    this.disposables.push(tex, mat)
    return new THREE.Sprite(mat)
  }

  private makeLabel(st: TwinStation, color: number): THREE.Sprite {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const ctx = c.getContext('2d')!
    // 卡片背景
    ctx.fillStyle = 'rgba(8,16,36,0.82)'
    roundRect(ctx, 4, 4, 248, 120, 16)
    ctx.fill()
    const col = new THREE.Color(color)
    ctx.strokeStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},0.9)`
    ctx.lineWidth = 3
    roundRect(ctx, 4, 4, 248, 120, 16)
    ctx.stroke()
    // 工序名
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 30px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(truncate(st.operDesc || st.oper, 8), 128, 50)
    // 良率
    ctx.fillStyle = `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif'
    ctx.fillText(`良率 ${st.yieldRate.toFixed(1)}%`, 128, 92)

    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
    this.disposables.push(tex, mat)
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(4.6, 2.3, 1)
    return sprite
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate)
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime

    // 传送带纹理滚动
    if (this.conveyorTex) this.conveyorTex.offset.x -= dt * 0.6

    // 物料流动
    const span = this.endX - this.startX
    for (const p of this.products) {
      p.position.x += dt * 4
      p.rotation.y += dt * 0.6
      if (p.position.x > this.endX) p.position.x = this.startX + ((p.position.x - this.endX) % span)
    }

    // 信标脉冲（告警更强）
    for (const b of this.beacons) {
      const mat = b.mesh.material as THREE.MeshStandardMaterial
      if (b.status === 'alarm') {
        const pulse = 1.2 + Math.sin(t * 6) * 0.8
        mat.emissiveIntensity = pulse
        b.halo.scale.setScalar(2.6 + Math.sin(t * 6) * 0.7)
      } else if (b.status === 'running') {
        mat.emissiveIntensity = 1.2 + Math.sin(t * 2 + b.mesh.position.x) * 0.25
      }
    }

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

  private clearStations() {
    // 移除工位组下所有对象并释放
    for (const child of [...this.stationGroup.children]) {
      this.stationGroup.remove(child)
    }
    this.products = []
    this.beacons = []
    this.conveyorTex = null
    // 释放上一批资源
    const old = this.disposables.splice(0, this.disposables.length)
    old.forEach((d) => {
      try {
        d.dispose()
      } catch {
        // ignore
      }
    })
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.clearStations()
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(s: string, n: number): string {
  return s && s.length > n ? s.slice(0, n) + '…' : s || '—'
}
