import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildDhakaCorridor, CorridorBuildResult } from './corridor';
import { LANDMARKS, LandmarkPreset } from './landmarks';
import { createSceneMaterials, SceneMaterials } from './materials';
import { createProceduralTextures, ProceduralTextures } from './textures';

export type CameraMode = 'orbit' | 'fly';

export interface EngineCallbacks {
  onLandmarkSelect: (landmarkId: string) => void;
  onCameraTelemetry: (altitude: number, coords: [number, number]) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _flyForward = new THREE.Vector3();
const _flyRight = new THREE.Vector3();
const _flyMove = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

function detectSoftwareWebGL(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function createSunsetSkyDome(): THREE.Mesh {
  const skyGeo = new THREE.SphereGeometry(4600, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1f2d4e) },
      midColor: { value: new THREE.Color(0xb85d4c) },
      horizonColor: { value: new THREE.Color(0xf6a96b) },
      sunDir: { value: new THREE.Vector3(-0.75, 0.16, -0.58).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunDir;
      varying vec3 vWorldPos;
      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
        col = mix(col, topColor, smoothstep(0.18, 0.72, h));
        float sunGlow = pow(max(dot(dir, sunDir), 0.0), 18.0);
        float sunDisc = smoothstep(0.9965, 0.9992, dot(dir, sunDir));
        col += vec3(1.0, 0.72, 0.38) * sunGlow * 0.55;
        col += vec3(1.0, 0.92, 0.78) * sunDisc * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(skyGeo, skyMat);
}

export class DhakaSceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private sunLight: THREE.DirectionalLight;
  private textures: ProceduralTextures;
  private mats: SceneMaterials;
  private corridor: CorridorBuildResult;
  private skyDome: THREE.Mesh;
  private isSoftwareGl: boolean;
  private callbacks: EngineCallbacks;

  private clock = new THREE.Clock();
  private frameId = 0;
  private destroyed = false;

  private mode: CameraMode = 'orbit';
  private transitioning = false;
  private keys: Record<string, boolean> = {};
  private flyLookDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownPos = { x: 0, y: 0 };
  private telemetryTimer = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd98a5b);
    this.scene.fog = new THREE.FogExp2(0xc77d58, 0.00052);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.8, 5600);

    const initial = LANDMARKS[0];
    this.camera.position.set(...initial.cameraPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 850;
    this.controls.target.set(...initial.targetPos);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.transitioning = false;
    });

    // Golden-hour sunset sky & three-point outdoor lighting
    this.skyDome = createSunsetSkyDome();
    this.scene.add(this.skyDome);

    const hemi = new THREE.HemisphereLight(0x88a9d8, 0x3b2c26, 0.92);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xffb46a, 2.55);
    this.sunLight.position.set(-140, 68, 210);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 480;
    const d = 120;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x7c97cc, 0.55);
    rimLight.position.set(160, 80, -140);
    this.scene.add(rimLight);

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAnisotropy);
    this.mats = createSceneMaterials(this.textures, this.isSoftwareGl);
    this.corridor = buildDhakaCorridor(this.mats, this.textures);
    this.scene.add(this.corridor.root);

    if (!this.isSoftwareGl) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch (err) {
        console.warn('WebGL pre-compile skipped:', err);
      }
    }

    this.bindEvents();
    this.tick();
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (
      this.mode === 'fly' &&
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(
        e.code,
      )
    ) {
      this.transitioning = false;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    if (this.mode === 'fly') {
      this.flyLookDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.transitioning = false;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.mode === 'fly' && this.flyLookDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      _euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      _euler.y -= dx * 0.0032;
      _euler.x = THREE.MathUtils.clamp(_euler.x - dy * 0.0032, -Math.PI * 0.44, Math.PI * 0.44);
      this.camera.quaternion.setFromEuler(_euler);
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    this.flyLookDragging = false;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist < 5) {
      this.pickLandmark(e);
    }
  };

  private pickLandmark(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.layers.set(1);
    _raycaster.setFromCamera(_pointerNdc, this.camera);
    const hits = _raycaster.intersectObjects(this.corridor.hitboxes, false);
    if (hits.length > 0) {
      const id = hits[0].object.userData.landmarkId as string | undefined;
      if (id) {
        this.callbacks.onLandmarkSelect(id);
        const lm = LANDMARKS.find((l) => l.id === id);
        if (lm) this.flyToLandmark(lm);
      }
    }
  }

  public setCameraMode(next: CameraMode) {
    this.mode = next;
    if (next === 'orbit') {
      // Place orbit target 36 units ahead of camera
      this.camera.getWorldDirection(_flyForward);
      this.controls.target.copy(this.camera.position).addScaledVector(_flyForward, 36);
      this.controls.target.y = Math.max(2, this.controls.target.y);
      this.controls.enabled = true;
      this.controls.update();
    } else {
      this.controls.enabled = false;
    }
  }

  public flyToLandmark(lm: LandmarkPreset) {
    _camTargetPos.set(...lm.cameraPos);
    _camTargetLook.set(...lm.targetPos);
    this.transitioning = true;
  }

  private updateCamera(dt: number) {
    if (this.transitioning) {
      const lambda = 4.2;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, lambda, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, lambda, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, lambda, dt);

      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, _camTargetLook.x, lambda, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, _camTargetLook.y, lambda, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, _camTargetLook.z, lambda, dt);

      if (this.mode === 'fly') {
        this.camera.lookAt(this.controls.target);
      }
      if (this.camera.position.distanceTo(_camTargetPos) < 0.35) {
        this.transitioning = false;
      }
    }

    if (this.mode === 'orbit') {
      this.controls.update();
    } else {
      const boost = this.keys.ShiftLeft || this.keys.ShiftRight ? 2.4 : 1.0;
      const moveSpeed = 68 * boost * dt;

      this.camera.getWorldDirection(_flyForward);
      _flyRight.crossVectors(_flyForward, this.camera.up).normalize();
      _flyMove.set(0, 0, 0);

      if (this.keys.KeyW || this.keys.ArrowUp) _flyMove.add(_flyForward);
      if (this.keys.KeyS || this.keys.ArrowDown) _flyMove.sub(_flyForward);
      if (this.keys.KeyD || this.keys.ArrowRight) _flyMove.add(_flyRight);
      if (this.keys.KeyA || this.keys.ArrowLeft) _flyMove.sub(_flyRight);
      if (this.keys.KeyE) _flyMove.y += 1;
      if (this.keys.KeyQ) _flyMove.y -= 1;

      if (_flyMove.lengthSq() > 0) {
        _flyMove.normalize().multiplyScalar(moveSpeed);
        this.camera.position.add(_flyMove);
        this.camera.position.y = Math.max(1.8, Math.min(340, this.camera.position.y));
      }
    }

    // Keep shadow frustum anchored around current view target so shadows stay crisp across 2,400 units
    const tx = Math.round(this.controls.target.x / 16) * 16;
    const tz = Math.round(this.controls.target.z / 16) * 16;
    this.sunLight.target.position.set(tx, 0, tz);
    this.sunLight.position.set(tx - 150, 74, tz - 110);
    this.skyDome.position.set(this.camera.position.x, 0, this.camera.position.z);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.destroyed) return;
    const dt = Math.min(this.clock.getDelta(), 0.08);

    this.updateCamera(dt);

    // Subtle canal water ripple drift
    this.textures.waterNormal.offset.x += dt * 0.035;
    this.textures.waterNormal.offset.y += dt * 0.018;

    this.telemetryTimer += dt;
    if (this.telemetryTimer > 0.18) {
      this.telemetryTimer = 0;
      this.callbacks.onCameraTelemetry(Math.round(this.camera.position.y), [
        Math.round(this.camera.position.x),
        Math.round(this.camera.position.z),
      ]);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);

    this.controls.dispose();
    this.corridor.dispose();
    this.mats.dispose();
    this.textures.dispose();
    this.skyDome.geometry.dispose();
    (this.skyDome.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
