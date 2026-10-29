import * as THREE from 'three';
import { buildMap, raycastWorld, lineOfSight, rayAABB } from './map';
import { buildSoldier } from './soldier';
import type { SoldierMesh } from './soldier';
import { Effects } from './effects';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameAudio } from './audio';
import type { Collider, HudState, KillEvent, PlayerRow, SoldierState, SpawnPoint, Team } from './types';

export interface MatchResult {
  win: boolean;
  draw: boolean;
  scoreAlpha: number;
  scoreBravo: number;
  rows: PlayerRow[];
}

export interface GameCallbacks {
  onHud: (h: HudState) => void;
  onKillFeed: (k: KillEvent) => void;
  onMatchEnd: (r: MatchResult) => void;
  onPause: (paused: boolean) => void;
  onScoreboard: (rows: PlayerRow[]) => void;
}

const GRAVITY = 24;
const EYE = 1.62;
const KILL_TARGET = 40;
const MATCH_TIME = 8 * 60;

const BOT_NAMES_ALPHA = ['Viper', 'Ghost', 'Reaper'];
const BOT_NAMES_BRAVO = ['Havoc', 'Raptor', 'Talon', 'Onyx'];

interface Bot {
  s: SoldierState;
  mesh: SoldierMesh;
  target: number; // enemy soldier index or -1
  roamPoint: THREE.Vector3;
  reaction: number;
  burstLeft: number;
  burstCd: number;
  fireCd: number;
  strafeDir: number;
  strafeT: number;
  repickT: number;
}

interface Keys { [code: string]: boolean }

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private colliders: Collider[];
  private spawns: SpawnPoint[];
  private bounds: number;
  private effects = new Effects();
  private audio = new GameAudio();
  private cb: GameCallbacks;

  private soldiers: SoldierState[] = [];
  private botMeshes: (SoldierMesh | null)[] = [];
  private bots: Bot[] = [];

  private keys: Keys = {};
  private touchMove = new THREE.Vector2();
  private firing = false;
  private aiming = false;
  private running = false;
  private ended = false;
  private paused = false;
  private disposed = false;

  // player weapon
  private ammo = 30;
  private reserve = 120;
  private reloading = false;
  private reloadT = 0;
  private fireCd = 0;
  private recoil = 0;
  private viewmodel: THREE.Group;
  private vmMuzzle!: THREE.Object3D;
  private vmFlash!: THREE.Mesh;
  private bobT = 0;
  private adsT = 0;
  private lastDamageT = -10;
  private stepT = 0;
  private baseFov = 75;

  private scoreAlpha = 0;
  private scoreBravo = 0;
  private timeLeft = MATCH_TIME;
  private clock = new THREE.Clock();
  private raf = 0;
  private hudT = 0;
  private hitMarker = 0;
  private killMarker = 0;
  private damageFlash = 0;
  private damageDir = 0;
  private killId = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.cb = callbacks;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.08, 400);

    // Sky & atmosphere
    this.scene.background = new THREE.Color(0x9fb8cf);
    this.scene.fog = new THREE.Fog(0x9fb8cf, 55, 220);
    const skyGeo = new THREE.SphereGeometry(300, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x6b97c9) }, bottom: { value: new THREE.Color(0xd8e4ee) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y*0.5+0.5; gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0,0.5,h)), 1.0); }',
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Lights
    const hemi = new THREE.HemisphereLight(0xcfe4ff, 0x6b6152, 0.75);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
    sun.position.set(60, 90, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    const map = buildMap();
    this.scene.add(map.group);
    this.colliders = map.colliders;
    this.spawns = map.spawns;
    this.bounds = map.bounds;
    this.scene.add(this.effects.group);

    this.viewmodel = this.buildViewmodel();
    this.camera.add(this.viewmodel);
    this.scene.add(this.camera);

    window.addEventListener('resize', this.onResize);
  }

  // ---------- viewmodel ----------
  private buildViewmodel(): THREE.Group {
    const g = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.4, metalness: 0.75 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b3428, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.55), gunMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.4);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.09), gunMat);
    mag.position.set(0, -0.12, 0.05);
    mag.rotation.x = 0.15;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.18), gripMat);
    stock.position.set(0, -0.01, 0.33);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.08), gunMat);
    sight.position.set(0, 0.085, -0.05);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), gripMat);
    grip.position.set(0, -0.1, 0.2);
    grip.rotation.x = 0.3;
    // hands
    const handMat = new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 0.9 });
    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.12), handMat);
    hand1.position.set(0, -0.06, -0.12);
    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.08), handMat);
    hand2.position.set(0, -0.11, 0.2);
    g.add(body, barrel, mag, stock, sight, grip, hand1, hand2);
    this.vmMuzzle = new THREE.Object3D();
    this.vmMuzzle.position.set(0, 0.02, -0.56);
    g.add(this.vmMuzzle);
    // muzzle flash disc
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.vmFlash = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), flashMat);
    this.vmFlash.position.copy(this.vmMuzzle.position);
    g.add(this.vmFlash);
    g.position.set(0.22, -0.2, -0.45);
    g.traverse((o) => { o.frustumCulled = false; });
    return g;
  }

  // ---------- lifecycle ----------
  start() {
    this.audio.ensure();
    this.setupTeams();
    this.running = true;
    this.clock.start();
    this.syncCamera();
    this.loop();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.clock.getDelta();
  }

  private setupTeams() {
    // player
    this.soldiers.push(this.newSoldier(0, 'YOU', 'alpha', true));
    this.botMeshes.push(null);
    BOT_NAMES_ALPHA.forEach((n, i) => this.addBot(i + 1, n, 'alpha'));
    BOT_NAMES_BRAVO.forEach((n, i) => this.addBot(i + 1 + BOT_NAMES_ALPHA.length, n, 'bravo'));
    for (const s of this.soldiers) this.respawn(s, true);
  }

  private addBot(id: number, name: string, team: Team) {
    const s = this.newSoldier(id, name, team, false);
    this.soldiers.push(s);
    const mesh = buildSoldier(team);
    this.scene.add(mesh.group);
    this.botMeshes.push(mesh);
    this.bots.push({
      s, mesh, target: -1, roamPoint: new THREE.Vector3(), reaction: 0,
      burstLeft: 0, burstCd: 0, fireCd: 0, strafeDir: 1, strafeT: 0, repickT: 0,
    });
  }

  private newSoldier(id: number, name: string, team: Team, isPlayer: boolean): SoldierState {
    return {
      id, name, team, isPlayer,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      yaw: 0, pitch: 0, hp: 100, alive: true, onGround: false,
      kills: 0, deaths: 0, respawnTimer: 0, radius: 0.38, height: 1.75,
    };
  }

  private respawn(s: SoldierState, first = false) {
    const options = this.spawns.filter((p) => p.team === s.team);
    // pick spawn farthest from nearest enemy
    let best = options[0];
    let bestD = -1;
    for (const sp of options) {
      let dMin = Infinity;
      for (const e of this.soldiers) {
        if (e.team !== s.team && e.alive) dMin = Math.min(dMin, sp.pos.distanceTo(e.pos));
      }
      const jitter = Math.random() * 15;
      if (dMin + jitter > bestD) { bestD = dMin + jitter; best = sp; }
    }
    s.pos.copy(best.pos);
    s.pos.x += (Math.random() - 0.5) * 7;
    s.pos.z += (Math.random() - 0.5) * 7;
    s.vel.set(0, 0, 0);
    s.hp = 100;
    s.alive = true;
    s.yaw = Math.atan2(-s.pos.x, -s.pos.z) + (first ? 0 : (Math.random() - 0.5));
    s.pitch = 0;
    if (s.isPlayer) {
      this.ammo = 30;
      this.reserve = 120;
      this.reloading = false;
      this.syncCamera();
    }
    const mesh = this.botMeshes[s.id];
    if (mesh) {
      mesh.setDead(false);
      mesh.group.visible = true;
      mesh.group.position.copy(s.pos);
    }
  }

  // ---------- input API ----------
  setKey(code: string, down: boolean) {
    this.keys[code] = down;
    if (down && code === 'KeyR') this.startReload();
  }
  onMouseMove(dx: number, dy: number) {
    const p = this.soldiers[0];
    if (!p?.alive || this.paused) return;
    const sens = 0.0022 * (this.adsT > 0.5 ? 0.6 : 1);
    p.yaw -= dx * sens;
    p.pitch -= dy * sens;
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));
    this.syncCamera();
  }
  addLook(dx: number, dy: number) {
    const p = this.soldiers[0];
    if (!p?.alive || this.paused) return;
    const sens = 0.0042;
    p.yaw -= dx * sens;
    p.pitch -= dy * sens;
    p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));
    this.syncCamera();
  }
  setFire(d: boolean) { this.firing = d; }
  setAim(d: boolean) { this.aiming = d; }
  setTouchMove(x: number, y: number) { this.touchMove.set(x, y); }
  triggerJump() { this.keys['Space'] = true; setTimeout(() => (this.keys['Space'] = false), 80); }

  startReload() {
    const p = this.soldiers[0];
    if (!p?.alive || this.reloading || this.ammo >= 30 || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = 2.1;
    this.audio.reload();
  }

  // ---------- main loop ----------
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.running && !this.paused && !this.ended) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) this.endMatch();
      this.updatePlayer(dt);
      for (const b of this.bots) this.updateBot(b, dt);
      this.effects.update(dt);
      this.hudT += dt;
      if (this.hudT > 0.08) {
        this.hudT = 0;
        this.pushHud();
      }
    }
    this.render();
  };

  syncCamera() {
    const p = this.soldiers[0];
    if (!p) return;
    this.camera.position.set(p.pos.x, p.pos.y + EYE, p.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(p.pitch + this.recoil * 0.5, p.yaw, this.recoil * 0.15);
    this.camera.updateMatrixWorld(true);
  }

  private render() {
    this.syncCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ---------- physics ----------
  private moveEntity(s: SoldierState, dt: number) {
    s.vel.y -= GRAVITY * dt;
    // integrate + resolve per axis
    const axes: ('x' | 'y' | 'z')[] = ['x', 'z', 'y'];
    s.onGround = false;
    for (const ax of axes) {
      s.pos[ax] += s.vel[ax] * dt;
      const min = new THREE.Vector3(s.pos.x - s.radius, s.pos.y, s.pos.z - s.radius);
      const max = new THREE.Vector3(s.pos.x + s.radius, s.pos.y + s.height, s.pos.z + s.radius);
      for (const c of this.colliders) {
        if (min.x < c.max.x && max.x > c.min.x && min.y < c.max.y && max.y > c.min.y && min.z < c.max.z && max.z > c.min.z) {
          if (ax === 'y') {
            if (s.vel.y <= 0 && s.pos.y < c.max.y && s.pos.y > c.max.y - 1.2) {
              s.pos.y = c.max.y;
              s.vel.y = 0;
              s.onGround = true;
            } else if (s.vel.y > 0) {
              s.pos.y = c.min.y - s.height;
              s.vel.y = 0;
            }
          } else {
            const center = (c.min[ax] + c.max[ax]) / 2;
            if (s.pos[ax] < center) s.pos[ax] = c.min[ax] - s.radius;
            else s.pos[ax] = c.max[ax] + s.radius;
            s.vel[ax] = 0;
          }
          min.set(s.pos.x - s.radius, s.pos.y, s.pos.z - s.radius);
          max.set(s.pos.x + s.radius, s.pos.y + s.height, s.pos.z + s.radius);
        }
      }
    }
    const B = this.bounds + 2;
    s.pos.x = Math.max(-B, Math.min(B, s.pos.x));
    s.pos.z = Math.max(-B, Math.min(B, s.pos.z));
    if (s.pos.y < -5) { s.pos.y = 0; s.vel.y = 0; s.onGround = true; }
  }

  // ---------- player ----------
  private updatePlayer(dt: number) {
    const p = this.soldiers[0];
    if (!p) return;

    if (!p.alive) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0 && !this.ended) this.respawn(p);
      return;
    }

    // hp regen (CoD style)
    if (this.timeLeft - this.lastDamageT > 4 && p.hp < 100) {
      p.hp = Math.min(100, p.hp + 30 * dt);
    }

    const sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const ads = this.aiming && !sprint;
    this.adsT += ((ads ? 1 : 0) - this.adsT) * Math.min(1, dt * 10);
    const speed = (sprint ? 7.4 : 4.6) * (ads ? 0.55 : 1);

    const f = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const wish = new THREE.Vector3();
    if (this.keys['KeyW']) wish.add(f);
    if (this.keys['KeyS']) wish.sub(f);
    if (this.keys['KeyD']) wish.add(r);
    if (this.keys['KeyA']) wish.sub(r);
    if (this.touchMove.lengthSq() > 0.001) {
      wish.addScaledVector(f, -this.touchMove.y);
      wish.addScaledVector(r, this.touchMove.x);
    }
    if (wish.lengthSq() > 0) wish.normalize();

    const accel = p.onGround ? 40 : 8;
    p.vel.x += (wish.x * speed - p.vel.x) * Math.min(1, accel * dt / speed * 5);
    p.vel.z += (wish.z * speed - p.vel.z) * Math.min(1, accel * dt / speed * 5);
    if (p.onGround && wish.lengthSq() === 0) {
      p.vel.x *= Math.max(0, 1 - 12 * dt);
      p.vel.z *= Math.max(0, 1 - 12 * dt);
    }
    if (this.keys['Space'] && p.onGround) {
      p.vel.y = 8.2;
      p.onGround = false;
    }
    this.moveEntity(p, dt);

    // footsteps
    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    if (p.onGround && hSpeed > 1) {
      this.stepT -= dt * hSpeed;
      if (this.stepT <= 0) {
        this.stepT = 3.4;
        this.audio.footstep();
      }
    }

    // viewmodel bob & ADS
    this.bobT += dt * hSpeed * 1.6;
    const bobY = Math.abs(Math.sin(this.bobT)) * 0.012 * Math.min(hSpeed / 5, 1);
    const bobX = Math.sin(this.bobT * 0.5) * 0.008 * Math.min(hSpeed / 5, 1);
    const adsPos = new THREE.Vector3(0, -0.148, -0.32);
    const hipPos = new THREE.Vector3(0.22, -0.2, -0.45);
    this.viewmodel.position.lerpVectors(hipPos, adsPos, this.adsT);
    this.viewmodel.position.x += bobX * (1 - this.adsT);
    this.viewmodel.position.y += bobY * (1 - this.adsT);
    // recoil recovery
    this.recoil *= Math.max(0, 1 - 9 * dt);
    this.viewmodel.position.z += this.recoil * 0.06;
    this.viewmodel.rotation.x = this.recoil * 0.35;
    const targetFov = this.baseFov - this.adsT * 18;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();
    }

    // reload
    if (this.reloading) {
      this.reloadT -= dt;
      this.viewmodel.rotation.x = -0.6 * Math.sin(Math.min(1, (2.1 - this.reloadT) / 2.1) * Math.PI);
      if (this.reloadT <= 0) {
        const need = 30 - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
      }
    }

    // firing
    this.fireCd -= dt;
    if (this.firing && this.fireCd <= 0 && !this.reloading && !this.ended) {
      if (this.ammo <= 0) {
        this.fireCd = 0.3;
        this.audio.dryFire();
        this.startReload();
      } else {
        this.fireCd = 60 / 720; // 720 rpm
        this.ammo--;
        const spread = THREE.MathUtils.lerp(0.028, 0.004, this.adsT) + (sprint ? 0.02 : 0) + (p.onGround ? 0 : 0.02);
        this.syncCamera();
        this.shoot(p, spread, true);
        this.recoil = Math.min(this.recoil + 0.05, 0.22);
        p.pitch += 0.006 + Math.random() * 0.004;
        p.yaw += (Math.random() - 0.5) * 0.004;
        this.syncCamera();
        (this.vmFlash.material as THREE.MeshBasicMaterial).opacity = 0.9;
        setTimeout(() => ((this.vmFlash.material as THREE.MeshBasicMaterial).opacity = 0), 40);
        const mw = new THREE.Vector3();
        this.vmMuzzle.getWorldPosition(mw);
        this.effects.muzzleFlash(mw);
        this.audio.gunshot(0.9, 0);
      }
    }
  }

  // ---------- combat ----------
  private shoot(shooter: SoldierState, spread: number, isPlayer: boolean) {
    const origin = new THREE.Vector3(shooter.pos.x, shooter.pos.y + (isPlayer ? EYE : 1.45), shooter.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(shooter.yaw) * Math.cos(shooter.pitch),
      Math.sin(shooter.pitch),
      -Math.cos(shooter.yaw) * Math.cos(shooter.pitch)
    );
    dir.x += (Math.random() - 0.5) * spread * 2;
    dir.y += (Math.random() - 0.5) * spread * 2;
    dir.z += (Math.random() - 0.5) * spread * 2;
    dir.normalize();

    const MAXD = 120;
    let bestT = MAXD;
    let victim: SoldierState | null = null;
    let isHead = false;

    const wall = raycastWorld(origin, dir, this.colliders, MAXD);
    if (wall) bestT = wall.t;

    for (const s of this.soldiers) {
      if (s.team === shooter.team || !s.alive || s.id === shooter.id) continue;
      // body AABB
      const bodyBox: Collider = {
        min: new THREE.Vector3(s.pos.x - 0.36, s.pos.y + 0.1, s.pos.z - 0.36),
        max: new THREE.Vector3(s.pos.x + 0.36, s.pos.y + 1.42, s.pos.z + 0.36),
      };
      const tb = rayAABB(origin, dir, bodyBox, bestT);
      // head sphere approx as AABB
      const headBox: Collider = {
        min: new THREE.Vector3(s.pos.x - 0.2, s.pos.y + 1.42, s.pos.z - 0.2),
        max: new THREE.Vector3(s.pos.x + 0.2, s.pos.y + 1.8, s.pos.z + 0.2),
      };
      const th = rayAABB(origin, dir, headBox, bestT);
      if (th !== null) {
        bestT = th;
        victim = s;
        isHead = true;
      } else if (tb !== null) {
        bestT = tb;
        victim = s;
        isHead = false;
      }
    }

    const hitPoint = origin.clone().addScaledVector(dir, bestT);

    // tracer from muzzle
    if (isPlayer) {
      const mw = new THREE.Vector3();
      this.vmMuzzle.getWorldPosition(mw);
      const tracerStart = bestT < 1.2 ? origin.clone().addScaledVector(dir, 0.2) : mw;
      this.effects.tracer(tracerStart, hitPoint);
    } else {
      const mesh = this.botMeshes[shooter.id];
      if (mesh) {
        const tip = new THREE.Vector3();
        mesh.gunTip.getWorldPosition(tip);
        const tracerStart = bestT < 1.2 ? origin.clone().addScaledVector(dir, 0.2) : tip;
        this.effects.tracer(tracerStart, hitPoint);
        this.effects.muzzleFlash(tip);
      }
    }

    if (victim) {
      // damage falloff
      const falloff = bestT < 22 ? 1 : Math.max(0.5, 1 - (bestT - 22) / 70);
      let dmg = 30 * falloff;
      if (isHead) dmg *= 2.1;
      if (!isPlayer) dmg *= 0.62; // bots are merciful
      this.damage(victim, dmg, shooter, isHead);
      this.effects.bloodPuff(hitPoint);
      if (isPlayer) {
        this.hitMarker++;
        this.audio.hitMarker();
        this.pushHud();
      }
    } else if (bestT < MAXD) {
      this.effects.impactSparks(hitPoint);
    }
  }

  private damage(victim: SoldierState, dmg: number, attacker: SoldierState, headshot: boolean) {
    if (!victim.alive || this.ended) return;
    victim.hp -= dmg;
    if (victim.isPlayer) {
      this.lastDamageT = this.timeLeft;
      this.damageFlash++;
      const ang = Math.atan2(attacker.pos.x - victim.pos.x, attacker.pos.z - victim.pos.z);
      this.damageDir = ang - victim.yaw + Math.PI;
      this.audio.hurt();
      this.pushHud();
    }
    if (victim.hp <= 0) {
      victim.alive = false;
      victim.deaths++;
      victim.respawnTimer = 3;
      attacker.kills++;
      if (attacker.team === 'alpha') this.scoreAlpha++;
      else this.scoreBravo++;
      this.effects.deathBurst(new THREE.Vector3(victim.pos.x, victim.pos.y + 1, victim.pos.z));
      const mesh = this.botMeshes[victim.id];
      if (mesh) mesh.setDead(true);
      if (attacker.isPlayer) {
        this.killMarker++;
        this.audio.killConfirm();
      }
      this.cb.onKillFeed({
        id: ++this.killId,
        killer: attacker.name,
        killerTeam: attacker.team,
        victim: victim.name,
        victimTeam: victim.team,
        headshot,
      });
      if (this.scoreAlpha >= KILL_TARGET || this.scoreBravo >= KILL_TARGET) this.endMatch();
      this.pushHud();
    }
  }

  // ---------- bots ----------
  private updateBot(b: Bot, dt: number) {
    const s = b.s;
    if (!s.alive) {
      s.respawnTimer -= dt;
      if (s.respawnTimer <= 0 && !this.ended) this.respawn(s);
      return;
    }
    if (s.hp < 100) s.hp = Math.min(100, s.hp + 8 * dt);

    // acquire target
    b.repickT -= dt;
    if (b.repickT <= 0 || b.target < 0 || !this.soldiers[b.target]?.alive) {
      b.repickT = 0.4;
      b.target = -1;
      let bestD = 58;
      const eye = new THREE.Vector3(s.pos.x, s.pos.y + 1.45, s.pos.z);
      for (const e of this.soldiers) {
        if (e.team === s.team || !e.alive) continue;
        const d = s.pos.distanceTo(e.pos);
        if (d < bestD) {
          const eEye = new THREE.Vector3(e.pos.x, e.pos.y + 1.2, e.pos.z);
          if (lineOfSight(eye, eEye, this.colliders)) {
            bestD = d;
            b.target = e.id;
          }
        }
      }
      if (b.target >= 0 && b.reaction <= 0) b.reaction = 0.3 + Math.random() * 0.35;
    }

    const target = b.target >= 0 ? this.soldiers[b.target] : null;
    const wish = new THREE.Vector3();

    if (target && target.alive) {
      const to = target.pos.clone().sub(s.pos);
      const dist = to.length();
      const desiredYaw = Math.atan2(-to.x, -to.z);
      const dy = desiredYaw - s.yaw;
      const wrapped = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += THREE.MathUtils.clamp(wrapped, -4.5 * dt, 4.5 * dt);
      const targetPitch = Math.atan2((target.pos.y + 1.2) - (s.pos.y + 1.45), dist);
      s.pitch += THREE.MathUtils.clamp(targetPitch - s.pitch, -3 * dt, 3 * dt);

      b.reaction -= dt;
      b.strafeT -= dt;
      if (b.strafeT <= 0) {
        b.strafeT = 0.7 + Math.random() * 1.1;
        b.strafeDir = Math.random() > 0.5 ? 1 : -1;
      }
      const f = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      if (dist > 26) wish.add(f);
      else if (dist < 9) wish.sub(f);
      wish.addScaledVector(r, b.strafeDir * 0.8);

      // shoot when roughly aimed
      if (b.reaction <= 0 && Math.abs(wrapped) < 0.12) {
        b.fireCd -= dt;
        b.burstCd -= dt;
        if (b.burstLeft <= 0 && b.burstCd <= 0) {
          b.burstLeft = 3 + Math.floor(Math.random() * 4);
          b.burstCd = 0.5 + Math.random() * 0.9;
        }
        if (b.burstLeft > 0 && b.fireCd <= 0) {
          b.fireCd = 60 / 600;
          b.burstLeft--;
          const acc = 0.02 + dist * 0.0009 + (target.vel.lengthSq() > 4 ? 0.014 : 0);
          this.shoot(s, acc, false);
          // positional audio relative to player
          const p = this.soldiers[0];
          const toBot = s.pos.clone().sub(p.pos);
          const d = toBot.length();
          if (d < 70) {
            const right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
            const pan = THREE.MathUtils.clamp(toBot.normalize().dot(right), -1, 1);
            this.audio.gunshot(THREE.MathUtils.clamp(1 - d / 70, 0.08, 0.7), pan, d > 30);
          }
        }
      }
    } else {
      // roam
      if (s.pos.distanceTo(b.roamPoint) < 3 || Math.random() < 0.002) {
        b.roamPoint.set((Math.random() - 0.5) * this.bounds * 1.6, 0, (Math.random() - 0.5) * this.bounds * 1.6);
      }
      const to = b.roamPoint.clone().sub(s.pos);
      to.y = 0;
      const desiredYaw = Math.atan2(-to.x, -to.z);
      const dy = desiredYaw - s.yaw;
      s.yaw += THREE.MathUtils.clamp(Math.atan2(Math.sin(dy), Math.cos(dy)), -2.6 * dt, 2.6 * dt);
      s.pitch *= 0.95;
      wish.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      // obstacle avoidance
      const eye = new THREE.Vector3(s.pos.x, s.pos.y + 1, s.pos.z);
      const f = wish.clone();
      const ahead = raycastWorld(eye, f, this.colliders, 2.6);
      if (ahead) {
        const left = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.8);
        const right = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.8);
        const lFree = !raycastWorld(eye, left, this.colliders, 2.6);
        const rFree = !raycastWorld(eye, right, this.colliders, 2.6);
        wish.copy(lFree && (!rFree || Math.random() > 0.5) ? left : right);
        s.yaw = Math.atan2(-wish.x, -wish.z);
      }
    }

    if (wish.lengthSq() > 0) wish.normalize();
    const speed = target ? 4.2 : 3.6;
    s.vel.x += (wish.x * speed - s.vel.x) * Math.min(1, 8 * dt);
    s.vel.z += (wish.z * speed - s.vel.z) * Math.min(1, 8 * dt);
    this.moveEntity(s, dt);

    // update mesh
    const m = b.mesh;
    m.group.position.copy(s.pos);
    m.group.rotation.y = s.yaw;
    m.setAimPitch(s.pitch);
    m.animateWalk(performance.now() / 1000, Math.hypot(s.vel.x, s.vel.z));
  }

  // ---------- HUD / match ----------
  private pushHud() {
    const p = this.soldiers[0];
    if (!p) return;
    this.cb.onHud({
      hp: Math.max(0, Math.round(p.hp)),
      ammo: this.ammo,
      reserve: this.reserve,
      reloading: this.reloading,
      scoreAlpha: this.scoreAlpha,
      scoreBravo: this.scoreBravo,
      timeLeft: Math.max(0, this.timeLeft),
      killTarget: KILL_TARGET,
      alive: p.alive,
      respawnIn: Math.max(0, p.respawnTimer),
      hitMarker: this.hitMarker,
      killMarker: this.killMarker,
      damageFlash: this.damageFlash,
      damageDir: this.damageDir,
      ads: this.adsT > 0.5,
    });
  }

  getRows(): PlayerRow[] {
    return this.soldiers
      .map((s) => ({ name: s.name, team: s.team, kills: s.kills, deaths: s.deaths, isPlayer: s.isPlayer }))
      .sort((a, b) => b.kills - a.kills);
  }

  pushScoreboard() {
    this.cb.onScoreboard(this.getRows());
  }

  private endMatch() {
    if (this.ended) return;
    this.ended = true;
    const draw = this.scoreAlpha === this.scoreBravo;
    this.cb.onMatchEnd({
      win: this.scoreAlpha > this.scoreBravo,
      draw,
      scoreAlpha: this.scoreAlpha,
      scoreBravo: this.scoreBravo,
      rows: this.getRows(),
    });
  }

  restart() {
    this.ended = false;
    this.scoreAlpha = 0;
    this.scoreBravo = 0;
    this.timeLeft = MATCH_TIME;
    this.killId = 0;
    for (const s of this.soldiers) {
      s.kills = 0;
      s.deaths = 0;
      this.respawn(s, true);
    }
    this.pushHud();
  }
}
