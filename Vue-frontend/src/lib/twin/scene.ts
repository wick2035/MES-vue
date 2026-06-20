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

const SPACING = 8
const MAX_STATIONS = 8

/** 每个工位记录的动画引用 */
interface StationRefs {
  beacon: THREE.Mesh
  halo: THREE.Sprite
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
    this.disposables.push(floorGeo, floorMat)

    const grid = new THREE.GridHelper(180, 90, 0x1e3a8a, 0x12224a)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.3
    this.scene.add(grid)
    this.disposables.push(grid.geometry, grid.material as THREE.Material)
  }

  /** 厂房环境：立柱 + 天花板梁 + 工业灯 + 地面安全线 */
  private buildFactoryEnvironment() {
    const env = new THREE.Group()

    // 厂房立柱（沿 X 方向排布，Z 方向前后各一排）
    const columnPositions = [-44, -22, 0, 22, 44]
    const columnGeo = new THREE.BoxGeometry(0.55, 10, 0.55)
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x1e2d50, metalness: 0.7, roughness: 0.4 })
    for (const cx of columnPositions) {
      for (const cz of [-10, 10]) {
        const col = new THREE.Mesh(columnGeo, columnMat)
        col.position.set(cx, 4.9, cz)
        col.castShadow = true
        env.add(col)
      }
    }
    this.disposables.push(columnGeo, columnMat)

    // 天花板主梁（沿 X 方向延伸）
    const beamGeo = new THREE.BoxGeometry(92, 0.5, 0.4)
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x162040, metalness: 0.6, roughness: 0.5 })
    for (const bz of [-10, 0, 10]) {
      const beam = new THREE.Mesh(beamGeo, beamMat)
      beam.position.set(0, 9.7, bz)
      env.add(beam)
    }
    this.disposables.push(beamGeo, beamMat)

    // 天花板工业灯（每 11u 一组，沿传送带方向）
    const lampHousingGeo = new THREE.BoxGeometry(2.4, 0.22, 0.7)
    const lampHousingMat = new THREE.MeshStandardMaterial({ color: 0x3a4a6a, metalness: 0.5, roughness: 0.4 })
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
    this.disposables.push(lampHousingGeo, lampHousingMat, lampPanelGeo, lampPanelMat)

    // 地面安全黄线（沿传送带两侧，Z=±3.5）
    const safeLineGeo = new THREE.BoxGeometry(92, 0.012, 0.12)
    const safeLineMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.25 })
    for (const sz of [-3.5, 3.5]) {
      const line = new THREE.Mesh(safeLineGeo, safeLineMat)
      line.position.set(0, 0, sz)
      env.add(line)
    }
    this.disposables.push(safeLineGeo, safeLineMat)

    // 传送带两端地面警示斜纹
    this.buildHazardStripes(env, -46, 48, -3.4, 3.4)

    this.scene.add(env)
  }

  private buildHazardStripes(parent: THREE.Group, x1: number, x2: number, z1: number, z2: number) {
    const stripeGeo = new THREE.BoxGeometry(1.5, 0.01, (z2 - z1))
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
    this.disposables.push(stripeGeo, yellowMat, blackMat)
  }

  /** 用真实工位数据构建/重建场景内容 */
  setStations(stations: TwinStation[]) {
    this.clearStations()

    const list = stations.slice(0, MAX_STATIONS)
    const n = Math.max(list.length, 1)
    const totalWidth = (n - 1) * SPACING
    this.startX = -totalWidth / 2 - SPACING * 1.3
    this.endX = totalWidth / 2 + SPACING * 1.3

    this.buildConveyor(this.startX, this.endX)

    list.forEach((st, i) => {
      const x = -totalWidth / 2 + i * SPACING
      this.buildStation(st, x)
    })

    // 物料流
    const count = Math.max(5, n + 2)
    for (let i = 0; i < count; i++) {
      const t = i / count
      const x = THREE.MathUtils.lerp(this.startX, this.endX, t)
      this.buildProduct(x)
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
    const topMat = new THREE.MeshStandardMaterial({ map: tex, color: 0x1b2a52, metalness: 0.4, roughness: 0.6 })
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x0f1c3d, metalness: 0.5, roughness: 0.5 })
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
    const belt = new THREE.Mesh(beltGeo, mats)
    const beltY = 0.21
    belt.position.set((startX + endX) / 2, beltY, 0)
    belt.receiveShadow = true
    this.stationGroup.add(belt)
    this.disposables.push(beltGeo, topMat, sideMat, tex)

    // 铝合金导轨（左右各一）
    const railGeo = new THREE.BoxGeometry(len + 0.4, 0.32, 0.09)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x7a9ac0, metalness: 0.85, roughness: 0.2 })
    for (const rz of [-1.5, 1.5]) {
      const rail = new THREE.Mesh(railGeo, railMat)
      rail.position.set((startX + endX) / 2, beltY + 0.27, rz)
      this.stationGroup.add(rail)
    }
    this.disposables.push(railGeo, railMat)

    // 支腿（每 3u 一组）
    const legGeo = new THREE.BoxGeometry(0.13, beltY + 0.1, 0.13)
    const crossGeo = new THREE.BoxGeometry(0.1, 0.1, 3.2)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a3f6a, metalness: 0.6, roughness: 0.5 })
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
    this.disposables.push(legGeo, crossGeo, legMat)

    // 端辊（传送带两端的圆柱）
    const rollerGeo = new THREE.CylinderGeometry(0.23, 0.23, 3.2, 20)
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x4a6090, metalness: 0.7, roughness: 0.3 })
    for (const rx of [startX, endX]) {
      const roller = new THREE.Mesh(rollerGeo, rollerMat)
      roller.rotation.x = Math.PI / 2
      roller.position.set(rx, beltY, 0)
      this.stationGroup.add(roller)
    }
    this.disposables.push(rollerGeo, rollerMat)
  }

  /** 构建单个工位：CNC 加工中心多零件模型 */
  private buildStation(st: TwinStation, x: number) {
    const group = new THREE.Group()
    group.position.set(x, 0, 0)

    const status = st.status

    // --- 底座平台 ---
    const baseGeo = new THREE.BoxGeometry(4.2, 0.28, 4.1)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x111828, metalness: 0.7, roughness: 0.5 })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.set(0, 0.14, -2.7)
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)
    this.disposables.push(baseGeo, baseMat)

    // --- 主机箱体 ---
    const bodyGeo = new THREE.BoxGeometry(3.7, 2.85, 4.0)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, metalness: 0.8, roughness: 0.3 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.set(0, 1.7, -2.7)
    body.castShadow = true
    group.add(body)
    this.disposables.push(bodyGeo, bodyMat)

    // --- 机身顶盖 ---
    const topCapGeo = new THREE.BoxGeometry(3.7, 0.22, 4.0)
    const topCapMat = new THREE.MeshStandardMaterial({ color: 0x152a45, metalness: 0.75, roughness: 0.35 })
    const topCap = new THREE.Mesh(topCapGeo, topCapMat)
    topCap.position.set(0, 3.24, -2.7)
    group.add(topCap)
    this.disposables.push(topCapGeo, topCapMat)

    // --- 前防护窗（半透明） ---
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
    this.disposables.push(windowGeo, windowMat)

    // 窗框
    const frameGeo = new THREE.BoxGeometry(3.0, 1.65, 0.09)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a4a6a, metalness: 0.8, roughness: 0.3 })
    const frame = new THREE.Mesh(frameGeo, frameMat)
    frame.position.set(0, 1.55, -0.78)
    group.add(frame)
    // 内开孔用内嵌窗代替（视觉遮挡关系已够用）
    this.disposables.push(frameGeo, frameMat)

    // --- 控制台（右侧伸出） ---
    const panelBodyGeo = new THREE.BoxGeometry(1.05, 1.65, 0.2)
    const panelBodyMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.6, roughness: 0.5 })
    const panelBody = new THREE.Mesh(panelBodyGeo, panelBodyMat)
    panelBody.position.set(2.38, 1.5, -1.6)
    group.add(panelBody)
    this.disposables.push(panelBodyGeo, panelBodyMat)

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
    this.disposables.push(screenGeo, screenMat)

    // 指示灯按钮（6个小球）
    const btnColors = [0x22c55e, 0xef4444, 0xf59e0b, 0x3b82f6, 0xf1f5f9, 0x6b7280]
    const btnGeo = new THREE.SphereGeometry(0.055, 8, 8)
    btnColors.forEach((c, idx) => {
      const btnMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 })
      const btn = new THREE.Mesh(btnGeo, btnMat)
      btn.position.set(2.35 + (idx % 2) * 0.18 - 0.09, 1.2 - Math.floor(idx / 2) * 0.18, -1.5)
      group.add(btn)
      this.disposables.push(btnMat)
    })
    this.disposables.push(btnGeo)

    // --- 主轴箱（从机身顶部伸出） ---
    const spindleHousingGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.95, 16)
    const spindleHousingMat = new THREE.MeshStandardMaterial({ color: 0x2a3a50, metalness: 0.85, roughness: 0.25 })
    const spindleHousing = new THREE.Mesh(spindleHousingGeo, spindleHousingMat)
    spindleHousing.position.set(-0.5, 3.65, -2.2)
    group.add(spindleHousing)
    this.disposables.push(spindleHousingGeo, spindleHousingMat)

    const collarGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.48, 14)
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x4a6a8a, metalness: 0.9, roughness: 0.15 })
    const collar = new THREE.Mesh(collarGeo, collarMat)
    collar.position.set(-0.5, 3.12, -2.2)
    group.add(collar)
    this.disposables.push(collarGeo, collarMat)

    const toolGeo = new THREE.CylinderGeometry(0.052, 0.022, 0.38, 10)
    const toolMat = new THREE.MeshStandardMaterial({ color: 0xb0c4de, metalness: 0.95, roughness: 0.1 })
    const tool = new THREE.Mesh(toolGeo, toolMat)
    tool.position.set(-0.5, 2.79, -2.2)
    group.add(tool)
    this.disposables.push(toolGeo, toolMat)

    // --- 三色信号灯塔 ---
    const towerPoleMat = new THREE.MeshStandardMaterial({ color: 0x8a9ab0, metalness: 0.75, roughness: 0.3 })
    const towerPoleGeo = new THREE.CylinderGeometry(0.047, 0.047, 1.85, 12)
    const towerPole = new THREE.Mesh(towerPoleGeo, towerPoleMat)
    towerPole.position.set(1.0, 4.1, -2.7)
    group.add(towerPole)
    this.disposables.push(towerPoleGeo, towerPoleMat)

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
    this.disposables.push(redGeo, redMat)

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
    this.disposables.push(amberGeo, amberMat)

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
    this.disposables.push(greenGeo, greenMat)

    // 灯塔顶盖
    const towerCapGeo = new THREE.CylinderGeometry(0.16, 0.135, 0.08, 14)
    const towerCapMat = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.7, roughness: 0.3 })
    const towerCap = new THREE.Mesh(towerCapGeo, towerCapMat)
    towerCap.position.set(1.0, 5.34, -2.7)
    group.add(towerCap)
    this.disposables.push(towerCapGeo, towerCapMat)

    // --- 工位顶部标签（悬浮 Canvas Sprite） ---
    const panelMat = this.makeStatusPanelMat(st)
    const labelSprite = new THREE.Sprite(panelMat)
    labelSprite.position.set(0, 5.6, -2.7)
    labelSprite.scale.set(4.8, 2.4, 1)
    group.add(labelSprite)
    this.disposables.push(panelMat)

    // --- 顶部信标球（保留光晕动画） ---
    const beaconColor = status === 'alarm' ? 0xef4444 : status === 'running' ? 0x22c55e : 0x94a3b8
    const beaconGeo = new THREE.SphereGeometry(0.38, 20, 20)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: beaconColor,
      emissive: beaconColor,
      emissiveIntensity: 1.2,
    })
    const beacon = new THREE.Mesh(beaconGeo, beaconMat)
    beacon.position.set(0, 5.05, -2.7)
    group.add(beacon)
    this.disposables.push(beaconGeo, beaconMat)

    const halo = this.makeGlowSprite(beaconColor)
    halo.position.copy(beacon.position)
    halo.scale.set(2.4, 2.4, 1)
    group.add(halo)

    this.stationRefs.push({
      beacon,
      halo,
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
    this.disposables.push(geo, mat)
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
    ctx.fillText(`良率 ${st.yieldRate.toFixed(1)}%`, 128, 90)
    const tex = new THREE.CanvasTexture(c)
    this.disposables.push(tex)
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
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    this.disposables.push(tex, mat)
    return new THREE.Sprite(mat)
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

    // 工位动画：信标脉冲 + 三色灯
    for (const ref of this.stationRefs) {
      const beaconMat = ref.beacon.material as THREE.MeshStandardMaterial
      if (ref.status === 'alarm') {
        // 红灯强烈闪烁
        const pulse = 1.2 + Math.sin(t * 6) * 0.8
        beaconMat.emissiveIntensity = pulse
        ref.halo.scale.setScalar(2.4 + Math.sin(t * 6) * 0.7)
        ref.towerRed.emissiveIntensity = pulse
        ref.towerAmber.emissiveIntensity = 0.06
        ref.towerGreen.emissiveIntensity = 0.06
      } else if (ref.status === 'running') {
        // 绿灯呼吸
        const pulse = 1.1 + Math.sin(t * 2 + ref.beacon.position.x) * 0.28
        beaconMat.emissiveIntensity = pulse
        ref.halo.scale.setScalar(2.2 + Math.sin(t * 2) * 0.25)
        ref.towerGreen.emissiveIntensity = pulse
        ref.towerRed.emissiveIntensity = 0.06
        ref.towerAmber.emissiveIntensity = 0.06
      } else {
        // 黄灯常亮低强度（待机）
        beaconMat.emissiveIntensity = 0.6
        ref.halo.scale.setScalar(1.8)
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
    const old = this.disposables.splice(0, this.disposables.length)
    old.forEach((d) => { try { d.dispose() } catch { /* ignore */ } })
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
