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

export const DEMO_TWIN_STATIONS: TwinStation[] = [
  {
    oper: 'DPC-OP-010',
    operDesc: '主板单元装配',
    stepNo: 10,
    ok: 0,
    ng: 0,
    total: 0,
    status: 'idle',
    yieldRate: 0,
  },
  {
    oper: 'DPC-OP-020',
    operDesc: '机箱单元装配',
    stepNo: 20,
    ok: 0,
    ng: 0,
    total: 0,
    status: 'idle',
    yieldRate: 0,
  },
  {
    oper: 'DPC-OP-030',
    operDesc: '整机总装',
    stepNo: 30,
    ok: 0,
    ng: 0,
    total: 0,
    status: 'idle',
    yieldRate: 0,
  },
  {
    oper: 'DPC-OP-040',
    operDesc: '整机老化测试',
    stepNo: 40,
    ok: 0,
    ng: 0,
    total: 0,
    status: 'idle',
    yieldRate: 0,
  },
  {
    oper: 'DPC-OP-050',
    operDesc: '包装入库',
    stepNo: 50,
    ok: 0,
    ng: 0,
    total: 0,
    status: 'idle',
    yieldRate: 0,
  },
]

const SPACING = 8
const MAX_STATIONS = 8

/** 每个工位记录的动画引用 */
interface StationRefs {
  status: TwinStation['status']
  towerRed: THREE.MeshStandardMaterial
  towerAmber: THREE.MeshStandardMaterial
  towerGreen: THREE.MeshStandardMaterial
}

/**
 * 产线数字孪生三维引擎（原生 Three.js）。
 * 每个工位渲染为多零件 CNC 加工中心，带三色信号灯、控制台、防护玻璃窗；
 * 传送带具备导轨、支腿、端辊；场景含厂房立柱、天花板工业灯、地面安全线。
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
  private stationRefs: StationRefs[] = []
  private conveyorTex: THREE.CanvasTexture | null = null
  private sceneDisposables: { dispose(): void }[] = []
  private stationDisposables: { dispose(): void }[] = []

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
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x0a1124, 45, 110)

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 300)
    this.camera.position.set(6, 18, 34)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.5
    this.controls.minDistance = 16
    this.controls.maxDistance = 65
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.target.set(0, 2, 0)

    this.buildLights()
    this.buildFloor()
    this.buildFactoryEnvironment()
    this.buildProductionDownlights()
    this.scene.add(this.stationGroup)

    this.animate()
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0xbcd4ff, 0x0a1124, 0.7)
    this.scene.add(hemi)

    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(14, 28, 18)
    dir.castShadow = true
    dir.shadow.mapSize.set(1024, 1024)
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 120
    dir.shadow.camera.left = -55
    dir.shadow.camera.right = 55
    dir.shadow.camera.top = 30
    dir.shadow.camera.bottom = -30
    this.scene.add(dir)

    const fill = new THREE.PointLight(0x3b82f6, 0.5, 140)
    fill.position.set(-20, 14, -12)
    this.scene.add(fill)

    const back = new THREE.PointLight(0x60a5fa, 0.3, 100)
    back.position.set(0, 10, -18)
    this.scene.add(back)
  }

  private buildFloor() {
    const floorGeo = new THREE.PlaneGeometry(180, 100)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1530,
      metalness: 0.55,
      roughness: 0.75,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.02
    floor.receiveShadow = true
    this.scene.add(floor)
    this.sceneDisposables.push(floorGeo, floorMat)

    const grid = new THREE.GridHelper(180, 90, 0x1e3a8a, 0x12224a)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.3
    this.scene.add(grid)
    this.sceneDisposables.push(grid.geometry, grid.material as THREE.Material)
  }

  private buildProductionDownlights() {
    const xs = [-32, -16, 0, 16, 32]
    const lineZ = -0.75
    const railGeo = new THREE.BoxGeometry(78, 0.16, 0.22)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x111a2f,
      metalness: 0.8,
      roughness: 0.35,
    })
    const rail = new THREE.Mesh(railGeo, railMat)
    rail.position.set(0, 9.72, lineZ)
    this.scene.add(rail)
    this.sceneDisposables.push(railGeo, railMat)

    const housingGeo = new THREE.BoxGeometry(6.4, 0.22, 1.15)
    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x25324c,
      metalness: 0.72,
      roughness: 0.32,
    })
    const diffuserGeo = new THREE.BoxGeometry(5.7, 0.045, 0.78)
    const diffuserMat = new THREE.MeshStandardMaterial({
      color: 0xf8fbff,
      emissive: 0xf8fbff,
      emissiveIntensity: 1.35,
      roughness: 0.18,
    })
    const poolGeo = new THREE.PlaneGeometry(11.5, 7.2)
    xs.forEach((x) => {
      const target = new THREE.Object3D()
      target.position.set(x, 1.2, -1.4)
      this.scene.add(target)

      const housing = new THREE.Mesh(housingGeo, housingMat)
      housing.position.set(x, 9.46, lineZ)
      this.scene.add(housing)

      const diffuser = new THREE.Mesh(diffuserGeo, diffuserMat)
      diffuser.position.set(x, 9.31, lineZ)
      this.scene.add(diffuser)

      const spot = new THREE.SpotLight(0xf8fbff, 2.35, 28, Math.PI / 3.4, 0.9, 1.25)
      spot.position.set(x, 9.18, lineZ)
      spot.target = target
      spot.castShadow = true
      spot.shadow.mapSize.set(1024, 1024)
      spot.shadow.bias = -0.0004
      this.scene.add(spot)

      const workFill = new THREE.PointLight(0xdbeafe, 0.72, 15, 1.65)
      workFill.position.set(x, 4.1, -1.35)
      this.scene.add(workFill)

      const poolMat = this.makeLightPoolMaterial()
      const pool = new THREE.Mesh(poolGeo, poolMat)
      pool.rotation.x = -Math.PI / 2
      pool.position.set(x, 0.01, lineZ)
      this.scene.add(pool)
      this.sceneDisposables.push(poolMat)
    })
    this.sceneDisposables.push(housingGeo, housingMat, diffuserGeo, diffuserMat, poolGeo)
  }

  /** 厂房环境：立柱 + 天花板梁 + 工业灯 + 地面安全线 */
  private buildFactoryEnvironment() {
    const env = new THREE.Group()

    // 厂房立柱（沿 X 方向排布，Z 方向前后各一排）
    const columnPositions = [-44, -22, 0, 22, 44]
    const columnGeo = new THREE.BoxGeometry(0.55, 10, 0.55)
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x1e2d50,
      metalness: 0.7,
      roughness: 0.4,
    })
    for (const cx of columnPositions) {
      for (const cz of [-10, 10]) {
        const col = new THREE.Mesh(columnGeo, columnMat)
        col.position.set(cx, 4.9, cz)
        col.castShadow = true
        env.add(col)
      }
    }
    this.sceneDisposables.push(columnGeo, columnMat)

    // 天花板主梁（沿 X 方向延伸）
    const beamGeo = new THREE.BoxGeometry(92, 0.5, 0.4)
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x162040,
      metalness: 0.6,
      roughness: 0.5,
    })
    for (const bz of [-10, 0, 10]) {
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.set(0, 9.7, bz)
      env.add(beam)
    }
    this.sceneDisposables.push(beamGeo, beamMat)

    // 天花板工业灯（每 11u 一组，沿传送带方向）
    const lampHousingGeo = new THREE.BoxGeometry(2.4, 0.22, 0.7)
    const lampHousingMat = new THREE.MeshStandardMaterial({
      color: 0x3a4a6a,
      metalness: 0.5,
      roughness: 0.4,
    })
    const lampPanelGeo = new THREE.BoxGeometry(2.1, 0.04, 0.55)
    const lampPanelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.65,
    })
    for (let lx = -44; lx <= 44; lx += 11) {
      const housing = new THREE.Mesh(lampHousingGeo, lampHousingMat)
      housing.position.set(lx, 9.55, 0)
      env.add(housing)
      const panel = new THREE.Mesh(lampPanelGeo, lampPanelMat)
      panel.position.set(lx, 9.46, 0)
      env.add(panel)
      // 工业灯点光源
      const lamp = new THREE.PointLight(0xe8f0ff, 0.3, 22)
      lamp.position.set(lx, 9.2, 0)
      env.add(lamp)
    }
    this.sceneDisposables.push(lampHousingGeo, lampHousingMat, lampPanelGeo, lampPanelMat)

    // 地面安全黄线（沿传送带两侧，Z=±3.5）
    const safeLineGeo = new THREE.BoxGeometry(92, 0.012, 0.12)
    const safeLineMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.7,
    })
    for (const sz of [-3.5, 3.5]) {
      const line = new THREE.Mesh(safeLineGeo, safeLineMat)
      line.position.set(0, 0, sz)
      env.add(line)
    }
    this.sceneDisposables.push(safeLineGeo, safeLineMat)

    const workZoneGeo = new THREE.PlaneGeometry(92, 7.0)
    const workZoneMat = this.makeWorkZoneWashMaterial()
    const workZone = new THREE.Mesh(workZoneGeo, workZoneMat)
    workZone.rotation.x = -Math.PI / 2
    workZone.position.set(0, 0.006, 0)
    env.add(workZone)
    this.sceneDisposables.push(workZoneGeo, workZoneMat)

    const workZoneVolumeGeo = new THREE.BoxGeometry(92, 9.1, 7.0)
    const workZoneVolumeMat = this.makeWorkZoneVolumeMaterial()
    const workZoneVolume = new THREE.Mesh(workZoneVolumeGeo, workZoneVolumeMat)
    workZoneVolume.position.set(0, 4.55, 0)
    env.add(workZoneVolume)
    this.sceneDisposables.push(workZoneVolumeGeo, workZoneVolumeMat)

    for (const lx of [-30, 0, 30]) {
      const volumeFill = new THREE.PointLight(0xf1f7ff, 0.86, 32, 1.25)
      volumeFill.position.set(lx, 5.2, 0)
      env.add(volumeFill)
    }

    // 传送带两端地面警示斜纹
    this.buildHazardStripes(env, -46, 48, -3.4, 3.4)

    this.scene.add(env)
  }

  private makeLightPoolMaterial(): THREE.MeshBasicMaterial {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 160
    const ctx = c.getContext('2d')!
    const grad = ctx.createRadialGradient(128, 80, 0, 128, 80, 126)
    grad.addColorStop(0, 'rgba(219,234,254,0.34)')
    grad.addColorStop(0.45, 'rgba(147,197,253,0.15)')
    grad.addColorStop(1, 'rgba(147,197,253,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 160)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.sceneDisposables.push(tex)
    return mat
  }

  private makeWorkZoneWashMaterial(): THREE.MeshBasicMaterial {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 128
    const ctx = c.getContext('2d')!
    const vertical = ctx.createLinearGradient(0, 0, 0, 128)
    vertical.addColorStop(0, 'rgba(125,164,230,0.10)')
    vertical.addColorStop(0.5, 'rgba(219,234,254,0.22)')
    vertical.addColorStop(1, 'rgba(125,164,230,0.10)')
    ctx.fillStyle = vertical
    ctx.fillRect(0, 0, 512, 128)
    const center = ctx.createRadialGradient(256, 64, 0, 256, 64, 260)
    center.addColorStop(0, 'rgba(240,249,255,0.24)')
    center.addColorStop(0.5, 'rgba(191,219,254,0.12)')
    center.addColorStop(1, 'rgba(15,23,42,0)')
    ctx.fillStyle = center
    ctx.fillRect(0, 0, 512, 128)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.sceneDisposables.push(tex)
    return mat
  }

  private makeWorkZoneVolumeMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  }

  private buildHazardStripes(parent: THREE.Group, x1: number, x2: number, z1: number, z2: number) {
    const stripeGeo = new THREE.BoxGeometry(1.5, 0.01, z2 - z1)
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24 })
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 })
    for (let i = 0; i < 3; i++) {
      const sx = x1 + i * 1.6
      const my = new THREE.Mesh(stripeGeo, i % 2 === 0 ? yellowMat : blackMat)
      my.position.set(sx, 0, (z1 + z2) / 2)
      parent.add(my)
      const sx2 = x2 - i * 1.6
      const my2 = new THREE.Mesh(stripeGeo, i % 2 === 0 ? yellowMat : blackMat)
      my2.position.set(sx2, 0, (z1 + z2) / 2)
      parent.add(my2)
    }
    this.sceneDisposables.push(stripeGeo, yellowMat, blackMat)
  }

  /** 用真实工位数据构建并重建场景内容 */
  setStations(stations: TwinStation[]) {
    this.clearStations()

    const source = stations.length ? stations : DEMO_TWIN_STATIONS
    const list = source.slice(0, MAX_STATIONS)
    const n = Math.max(list.length, 1)
    const hasLiveProcessData = list.some((st) => st.total > 0)
    const totalWidth = (n - 1) * SPACING
    this.startX = -totalWidth / 2 - SPACING * 1.3
    this.endX = totalWidth / 2 + SPACING * 1.3

    this.buildConveyor(this.startX, this.endX)

    list.forEach((st, i) => {
      const x = -totalWidth / 2 + i * SPACING
      this.buildStation(st, x)
    })

    // 物料流
    if (hasLiveProcessData) {
      const count = Math.max(5, n + 2)
      for (let i = 0; i < count; i++) {
        const t = i / count
        const x = THREE.MathUtils.lerp(this.startX, this.endX, t)
        this.buildProduct(x)
      }
    }

    // 相机自适应
    const dist = THREE.MathUtils.clamp(totalWidth * 0.95 + 26, 26, 62)
    this.camera.position.set(dist * 0.17, dist * 0.52, dist)
    this.controls.update()
  }

  private buildConveyor(startX: number, endX: number) {
    const len = endX - startX
    const tex = this.makeConveyorTexture()
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(Math.max(2, Math.round(len / 2)), 1)
    this.conveyorTex = tex

    // 传送带主体
    const beltGeo = new THREE.BoxGeometry(len, 0.42, 3)
    const topMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0x1b2a52,
      metalness: 0.4,
      roughness: 0.6,
    })
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x0f1c3d,
      metalness: 0.5,
      roughness: 0.5,
    })
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
    const belt = new THREE.Mesh(beltGeo, mats)
    const beltY = 0.21
    belt.position.set((startX + endX) / 2, beltY, 0)
    belt.receiveShadow = true
    this.stationGroup.add(belt)
    this.stationDisposables.push(beltGeo, topMat, sideMat, tex)

    // 铝合金导轨（左右各一）
    const railGeo = new THREE.BoxGeometry(len + 0.4, 0.32, 0.09)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x7a9ac0,
      metalness: 0.85,
      roughness: 0.2,
    })
    for (const rz of [-1.5, 1.5]) {
      const rail = new THREE.Mesh(railGeo, railMat)
      rail.position.set((startX + endX) / 2, beltY + 0.27, rz)
      this.stationGroup.add(rail)
    }
    this.stationDisposables.push(railGeo, railMat)

    // 支腿（每 3u 一组）
    const legGeo = new THREE.BoxGeometry(0.13, beltY + 0.1, 0.13)
    const crossGeo = new THREE.BoxGeometry(0.1, 0.1, 3.2)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x2a3f6a,
      metalness: 0.6,
      roughness: 0.5,
    })
    const count = Math.floor(len / 3)
    for (let i = 0; i <= count; i++) {
      const lx = startX + (i / count) * len
      for (const lz of [-1.35, 1.35]) {
        const leg = new THREE.Mesh(legGeo, legMat)
        leg.position.set(lx, (beltY + 0.1) / 2, lz)
        this.stationGroup.add(leg)
      }
      const cross = new THREE.Mesh(crossGeo, legMat)
      cross.position.set(lx, 0.08, 0)
      this.stationGroup.add(cross)
    }
    this.stationDisposables.push(legGeo, crossGeo, legMat)

    // 端辊（传送带两端的圆柱）
    const rollerGeo = new THREE.CylinderGeometry(0.23, 0.23, 3.2, 20)
    const rollerMat = new THREE.MeshStandardMaterial({
      color: 0x4a6090,
      metalness: 0.7,
      roughness: 0.3,
    })
    for (const rx of [startX, endX]) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat)
      roller.rotation.x = Math.PI / 2
      roller.position.set(rx, beltY, 0)
      this.stationGroup.add(roller)
    }
    this.stationDisposables.push(rollerGeo, rollerMat)
  }

  /** 构建单个工位：CNC 加工中心多零件模型 */
  private buildStation(st: TwinStation, x: number) {
    const group = new THREE.Group()
    group.position.set(x, 0, 0)

    const status = st.status

    // --- 底座平台 ---
    const baseGeo = new THREE.BoxGeometry(4.2, 0.28, 4.1)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111828,
      metalness: 0.7,
      roughness: 0.5,
    })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.set(0, 0.14, -2.7)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
    this.stationDisposables.push(baseGeo, baseMat)

    // --- 主机箱体 ---
    const bodyGeo = new THREE.BoxGeometry(3.7, 2.85, 4.0)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      metalness: 0.8,
      roughness: 0.3,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, 1.7, -2.7)
    body.castShadow = true
    group.add(body)
    this.stationDisposables.push(bodyGeo, bodyMat)

    // --- 机身顶盖 ---
    const topCapGeo = new THREE.BoxGeometry(3.7, 0.22, 4.0)
    const topCapMat = new THREE.MeshStandardMaterial({
      color: 0x152a45,
      metalness: 0.75,
      roughness: 0.35,
    })
    const topCap = new THREE.Mesh(topCapGeo, topCapMat)
    topCap.position.set(0, 3.24, -2.7)
    group.add(topCap)
    this.stationDisposables.push(topCapGeo, topCapMat)

    // --- 前防护窗（半透明）---
    const windowGeo = new THREE.BoxGeometry(2.8, 1.45, 0.07)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x7ec8e3,
      transparent: true,
      opacity: 0.28,
      metalness: 0.1,
      roughness: 0.05,
    })
    const frontWindow = new THREE.Mesh(windowGeo, windowMat)
    frontWindow.position.set(0, 1.55, -0.73)
    group.add(frontWindow)
    this.stationDisposables.push(windowGeo, windowMat)

    // 窗框
    const frameGeo = new THREE.BoxGeometry(3.0, 1.65, 0.09)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a6a,
      metalness: 0.8,
      roughness: 0.3,
    })
    const frame = new THREE.Mesh(frameGeo, frameMat)
    frame.position.set(0, 1.55, -0.78)
    group.add(frame)
    // 内开孔用内嵌窗代替（视觉遮挡关系已够用）
    this.stationDisposables.push(frameGeo, frameMat)

    // --- 控制台（右侧伸出）---
    const panelBodyGeo = new THREE.BoxGeometry(1.05, 1.65, 0.2)
    const panelBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0d1520,
      metalness: 0.6,
      roughness: 0.5,
    })
    const panelBody = new THREE.Mesh(panelBodyGeo, panelBodyMat)
    panelBody.position.set(2.38, 1.5, -1.6)
    group.add(panelBody)
    this.stationDisposables.push(panelBodyGeo, panelBodyMat)

    // HMI 触摸屏
    const screenGeo = new THREE.BoxGeometry(0.78, 0.52, 0.025)
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a5c,
      emissive: 0x00aaff,
      emissiveIntensity: 0.7,
    })
    const screen = new THREE.Mesh(screenGeo, screenMat)
    screen.position.set(2.38, 1.72, -1.5)
    group.add(screen)
    this.stationDisposables.push(screenGeo, screenMat)

    // 指示灯按钮（6个小球）
    const btnColors = [0x22c55e, 0xef4444, 0xf59e0b, 0x3b82f6, 0xf1f5f9, 0x6b7280]
    const btnGeo = new THREE.SphereGeometry(0.055, 8, 8)
    btnColors.forEach((c, idx) => {
      const btnMat = new THREE.MeshStandardMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: 0.6,
      })
      const btn = new THREE.Mesh(btnGeo, btnMat)
      btn.position.set(2.35 + (idx % 2) * 0.18 - 0.09, 1.2 - Math.floor(idx / 2) * 0.18, -1.5)
      group.add(btn)
      this.stationDisposables.push(btnMat)
    })
    this.stationDisposables.push(btnGeo)

    // --- 主轴箱（从机身顶部伸出） ---
    const spindleHousingGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.95, 16)
    const spindleHousingMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a50,
      metalness: 0.85,
      roughness: 0.25,
    })
    const spindleHousing = new THREE.Mesh(spindleHousingGeo, spindleHousingMat)
    spindleHousing.position.set(-0.5, 3.65, -2.2)
    group.add(spindleHousing)
    this.stationDisposables.push(spindleHousingGeo, spindleHousingMat)

    const collarGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.48, 14)
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x4a6a8a,
      metalness: 0.9,
      roughness: 0.15,
    })
    const collar = new THREE.Mesh(collarGeo, collarMat)
    collar.position.set(-0.5, 3.12, -2.2)
    group.add(collar)
    this.stationDisposables.push(collarGeo, collarMat)

    const toolGeo = new THREE.CylinderGeometry(0.052, 0.022, 0.38, 10)
    const toolMat = new THREE.MeshStandardMaterial({
      color: 0xb0c4de,
      metalness: 0.95,
      roughness: 0.1,
    })
    const tool = new THREE.Mesh(toolGeo, toolMat)
    tool.position.set(-0.5, 2.79, -2.2)
    group.add(tool)
    this.stationDisposables.push(toolGeo, toolMat)

    // --- 三色信号灯塔 ---
    const towerPoleMat = new THREE.MeshStandardMaterial({
      color: 0x8a9ab0,
      metalness: 0.75,
      roughness: 0.3,
    })
    const towerPoleGeo = new THREE.CylinderGeometry(0.047, 0.047, 1.85, 12)
    const towerPole = new THREE.Mesh(towerPoleGeo, towerPoleMat)
    towerPole.position.set(1.0, 4.1, -2.7)
    group.add(towerPole)
    this.stationDisposables.push(towerPoleGeo, towerPoleMat)

    // 红灯
    const redGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.37, 14)
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: status === 'alarm' ? 1.6 : 0.08,
    })
    const redLight = new THREE.Mesh(redGeo, redMat)
    redLight.position.set(1.0, 5.14, -2.7)
    group.add(redLight)
    this.stationDisposables.push(redGeo, redMat)

    // 黄灯
    const amberGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.37, 14)
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: status === 'idle' ? 0.9 : 0.08,
    })
    const amberLight = new THREE.Mesh(amberGeo, amberMat)
    amberLight.position.set(1.0, 4.72, -2.7)
    group.add(amberLight)
    this.stationDisposables.push(amberGeo, amberMat)

    // 绿灯
    const greenGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.37, 14)
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: status === 'running' ? 1.4 : 0.08,
    })
    const greenLight = new THREE.Mesh(greenGeo, greenMat)
    greenLight.position.set(1.0, 4.3, -2.7)
    group.add(greenLight)
    this.stationDisposables.push(greenGeo, greenMat)

    // 灯塔顶盖
    const towerCapGeo = new THREE.CylinderGeometry(0.16, 0.135, 0.08, 14)
    const towerCapMat = new THREE.MeshStandardMaterial({
      color: 0x667788,
      metalness: 0.7,
      roughness: 0.3,
    })
    const towerCap = new THREE.Mesh(towerCapGeo, towerCapMat)
    towerCap.position.set(1.0, 5.34, -2.7)
    group.add(towerCap)
    this.stationDisposables.push(towerCapGeo, towerCapMat)

    // --- 工位顶部标签（悬浮 Canvas Sprite）---
    const panelMat = this.makeStatusPanelMat(st)
    const labelSprite = new THREE.Sprite(panelMat)
    labelSprite.position.set(0, 6.6, -2.7)
    labelSprite.scale.set(4.8, 2.4, 1)
    group.add(labelSprite)
    this.stationDisposables.push(panelMat)

    this.stationRefs.push({
      status,
      towerRed: redMat,
      towerAmber: amberMat,
      towerGreen: greenMat,
    })

    this.stationGroup.add(group)
  }

  private buildProduct(x: number) {
    const geo = new THREE.BoxGeometry(0.88, 0.88, 1.38)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.55,
      metalness: 0.3,
      roughness: 0.4,
    })
    const cube = new THREE.Mesh(geo, mat)
    cube.position.set(x, 0.82, 0)
    cube.castShadow = true
    this.products.push(cube)
    this.stationGroup.add(cube)
    this.stationDisposables.push(geo, mat)
  }

  private makeStatusPanelMat(st: TwinStation): THREE.SpriteMaterial {
    const color = st.status === 'alarm' ? 0xef4444 : st.status === 'running' ? 0x22c55e : 0x94a3b8
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(8,16,36,0.85)'
    roundRect(ctx, 4, 4, 248, 120, 16)
    ctx.fill()
    const col = new THREE.Color(color)
    const r = Math.round(col.r * 255)
    const g = Math.round(col.g * 255)
    const b = Math.round(col.b * 255)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`
    ctx.lineWidth = 3
    roundRect(ctx, 4, 4, 248, 120, 16)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(truncate(st.operDesc || st.oper, 8), 128, 50)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.font = 'bold 26px "Microsoft YaHei", sans-serif'
    const metricText = st.total > 0 ? `良率 ${st.yieldRate.toFixed(1)}%` : '暂无'
    ctx.fillText(metricText, 128, 90)
    const tex = new THREE.CanvasTexture(c)
    this.stationDisposables.push(tex)
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
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

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate)
    const dt = this.clock.getDelta()
    const t = this.clock.elapsedTime

    // 传送带纹理滚动
    if (this.conveyorTex) this.conveyorTex.offset.x -= dt * 0.65

    // 物料流动
    const span = this.endX - this.startX
    for (const p of this.products) {
      p.position.x += dt * 4
      p.rotation.y += dt * 0.6
      if (p.position.x > this.endX) p.position.x = this.startX + ((p.position.x - this.endX) % span)
    }

    for (const ref of this.stationRefs) {
      if (ref.status === 'alarm') {
        // 红灯强烈闪烁
        const pulse = 1.2 + Math.sin(t * 6) * 0.8
        ref.towerRed.emissiveIntensity = pulse
        ref.towerAmber.emissiveIntensity = 0.06
        ref.towerGreen.emissiveIntensity = 0.06
      } else if (ref.status === 'running') {
        // 绿灯呼吸
        const pulse = 1.1 + Math.sin(t * 2) * 0.28
        ref.towerGreen.emissiveIntensity = pulse
        ref.towerRed.emissiveIntensity = 0.06
        ref.towerAmber.emissiveIntensity = 0.06
      } else {
        // Idle stations keep the amber tower light on.
        ref.towerAmber.emissiveIntensity = 0.75
        ref.towerRed.emissiveIntensity = 0.06
        ref.towerGreen.emissiveIntensity = 0.06
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
    for (const child of [...this.stationGroup.children]) {
      this.stationGroup.remove(child)
    }
    this.products = []
    this.stationRefs = []
    this.conveyorTex = null
    const old = this.stationDisposables.splice(0, this.stationDisposables.length)
    old.forEach((d) => {
      try {
        d.dispose()
      } catch {
        /* ignore */
      }
    })
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.clearStations()
    const sceneAssets = this.sceneDisposables.splice(0, this.sceneDisposables.length)
    sceneAssets.forEach((d) => {
      try {
        d.dispose()
      } catch {
        /* ignore */
      }
    })
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(s: string, n: number): string {
  return s && s.length > n ? s.slice(0, n) + '…' : s || '…'
}
