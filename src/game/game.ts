import * as THREE from 'three';
import { buildMap, raycastWorld, lineOfSight, rayAABB } from './map';
import { buildSoldier } from './soldier';
import type { SoldierMesh, OperatorClass, BootStyle } from './soldier';
import { Effects } from './effects';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameAudio } from './audio';
import type { Collider, HudState, KillEvent, PlayerRow, SoldierState, SpawnPoint, Team, MapId } from './types';
import { WEAPONS, buildWeaponViewmodel } from './weapons';
import type { WeaponId, WeaponDef, ViewmodelComponents } from './weapons';

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

export type BotRole = 'rusher' | 'tactician' | 'marksman';

export interface SoundEvent {
  pos: THREE.Vector3;
  radius: number;
  team: Team;
  time: number;
  isGunfire: boolean;
}

export interface SquadCallout {
  pos: THREE.Vector3;
  targetId: number;
  team: Team;
  expires: number;
  type: 'spot' | 'mandown';
}

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
  weaponId: WeaponId;
  stuckTimer: number;
  jumpCd: number;

  // === TIER 1: Tactical Behavior & Cover Awareness ===
  role: BotRole;
  lkp: THREE.Vector3 | null;
  lkpTimer: number;
  inCover: boolean;
  coverPoint: THREE.Vector3 | null;
  coverTimer: number;
  crouched: boolean;

  // === TIER 2: Human-Like Aiming & Peeking ===
  aimYawVel: number;
  aimPitchVel: number;
  overshootYaw: number;
  overshootPitch: number;
  recoilOffset: number;
  tremorPhase: number;
  jiggleTimer: number;
  jiggleDir: number;
  counterStrafeTimer: number;

  // === TIER 3: Squad Teamwork & Pacing ===
  tradeTarget: number;
  tradeTimer: number;
  calloutTimer: number;
  slideTimer: number;
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
  private soundEvents: SoundEvent[] = [];
  private squadCallouts: SquadCallout[] = [];

  private keys: Keys = {};
  private touchMove = new THREE.Vector2();
  private firing = false;
  private aiming = false;
  private running = false;
  private ended = false;
  private paused = false;
  private disposed = false;

  // player weapon & loadout
  private currentWeaponId: WeaponId = 'assault';
  private nextWeaponId: WeaponId = 'assault';
  private ammo = 30;
  private reserve = 120;
  private reloading = false;
  private reloadT = 0;
  private fireCd = 0;
  private cycleT = 0;
  private recoil = 0;
  private viewmodel!: THREE.Group;
  private vmMuzzle!: THREE.Object3D;
  private vmFlash!: THREE.Mesh;
  private vmComponents: ViewmodelComponents | null = null;
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

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks, initialWeapon: WeaponId = 'assault', mapId: MapId = 'sandstorm') {
    this.cb = callbacks;
    this.currentWeaponId = initialWeapon;
    this.nextWeaponId = initialWeapon;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.camera = new THREE.PerspectiveCamera(this.baseFov, window.innerWidth / window.innerHeight, 0.08, 400);

    // Sky & atmosphere
    if (mapId === 'nuketown') {
      this.scene.background = new THREE.Color(0x87CEEB);
      this.scene.fog = new THREE.Fog(0xd8c8a8, 65, 230);
    } else if (mapId === 'oasis') {
      this.scene.background = new THREE.Color(0xe3c394);
      this.scene.fog = new THREE.Fog(0xeccb9b, 50, 210);
    } else if (mapId === 'dust_yard') {
      this.scene.background = new THREE.Color(0xd9c49a);
      this.scene.fog = new THREE.Fog(0xe3cfa0, 45, 180);
    } else if (mapId === 'railyard') {
      this.scene.background = new THREE.Color(0xddd0b0);
      this.scene.fog = new THREE.Fog(0xe4d9bd, 45, 190);
    } else {
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
    }

    // Lights
    let hemiSky = 0xcfe4ff;
    let hemiGround = 0x6b6152;
    let hemiInt = 0.75;
    let sunColor = 0xfff2dd;
    let sunInt = 2.4;
    const sunPos = new THREE.Vector3(60, 85, 30);

    if (mapId === 'nuketown') {
      hemiSky = 0xffeedd;
      hemiGround = 0x886644;
      hemiInt = 0.8;
      sunColor = 0xfff4d6;
      sunInt = 2.2;
      sunPos.set(45, 85, 30);
    } else if (mapId === 'oasis') {
      hemiSky = 0xffd7b0;
      hemiGround = 0xb98c5a;
      hemiInt = 0.75;
      sunColor = 0xffc98a;
      sunInt = 2.4;
      sunPos.set(70, 34, -45).normalize().multiplyScalar(100);
    } else if (mapId === 'dust_yard') {
      hemiSky = 0xbfd9ff;
      hemiGround = 0xc9a56a;
      hemiInt = 0.8;
      sunColor = 0xfff0d0;
      sunInt = 2.1;
      sunPos.set(-50, 70, 35).normalize().multiplyScalar(90);
    } else if (mapId === 'railyard') {
      hemiSky = 0xcfe3ff;
      hemiGround = 0xb8a88a;
      hemiInt = 0.85;
      sunColor = 0xfff6e0;
      sunInt = 2.3;
      sunPos.set(25, 85, 35).normalize().multiplyScalar(95);
    }

    const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiInt);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(sunColor, sunInt);
    sun.position.copy(sunPos);
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

    const map = buildMap(mapId);
    this.scene.add(map.group);
    this.colliders = map.colliders;
    this.spawns = map.spawns;
    this.bounds = map.bounds;
    this.scene.add(this.effects.group);

    this.equipWeapon(this.currentWeaponId);
    this.scene.add(this.camera);

    window.addEventListener('resize', this.onResize);
    (window as any).__game = this;
  }

  // ---------- weapon management ----------
  equipWeapon(id: WeaponId) {
    if (this.viewmodel) {
      this.camera.remove(this.viewmodel);
    }
    this.currentWeaponId = id;
    const def = WEAPONS[id];
    this.vmComponents = buildWeaponViewmodel(id);
    this.viewmodel = this.vmComponents.group;
    this.vmMuzzle = this.vmComponents.muzzle;
    this.vmFlash = this.vmComponents.flash;
    this.camera.add(this.viewmodel);

    this.ammo = def.magSize;
    this.reserve = def.reserve;
    this.reloading = false;
    this.reloadT = 0;
    this.fireCd = 0;
    this.cycleT = 0;
    this.adsT = 0;
    this.pushHud();
  }

  setNextWeapon(id: WeaponId, instant = false) {
    this.nextWeaponId = id;
    const p = this.soldiers[0];
    if (instant || !p?.alive || !this.running) {
      this.equipWeapon(id);
    }
    this.pushHud();
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
    const alphaWeapons: WeaponId[] = ['smg', 'sniper', 'shotgun'];
    const bravoWeapons: WeaponId[] = ['lmg', 'assault', 'smg', 'sniper'];
    BOT_NAMES_ALPHA.forEach((n, i) => this.addBot(i + 1, n, 'alpha', alphaWeapons[i % alphaWeapons.length]));
    BOT_NAMES_BRAVO.forEach((n, i) => this.addBot(i + 1 + BOT_NAMES_ALPHA.length, n, 'bravo', bravoWeapons[i % bravoWeapons.length]));
    for (const s of this.soldiers) this.respawn(s, true);
  }

  private addBot(id: number, name: string, team: Team, weaponId: WeaponId = 'assault') {
    const s = this.newSoldier(id, name, team, false);
    this.soldiers.push(s);
    const bootPool: BootStyle[] = ['stomper', 'tactical', 'patrol', 'stealth'];
    const randomBoot = bootPool[Math.floor(Math.random() * bootPool.length)];
    const mesh = buildSoldier(team, weaponId, weaponId as OperatorClass, randomBoot);
    this.scene.add(mesh.group);
    this.botMeshes.push(mesh);
    const role: BotRole = (weaponId === 'shotgun' || weaponId === 'smg')
      ? 'rusher'
      : (weaponId === 'sniper' ? 'marksman' : 'tactician');
    this.bots.push({
      s,
      mesh,
      target: -1,
      roamPoint: new THREE.Vector3(),
      reaction: 0,
      burstLeft: 0,
      burstCd: 0,
      fireCd: 0,
      strafeDir: 1,
      strafeT: 0,
      repickT: 0,
      weaponId,
      stuckTimer: 0,
      jumpCd: 0,

      role,
      lkp: null,
      lkpTimer: 0,
      inCover: false,
      coverPoint: null,
      coverTimer: 0,
      crouched: false,

      aimYawVel: 0,
      aimPitchVel: 0,
      overshootYaw: 0,
      overshootPitch: 0,
      recoilOffset: 0,
      tremorPhase: Math.random() * 10,
      jiggleTimer: 0.4 + Math.random() * 0.4,
      jiggleDir: Math.random() > 0.5 ? 1 : -1,
      counterStrafeTimer: 0,

      tradeTarget: -1,
      tradeTimer: 0,
      calloutTimer: 0,
      slideTimer: 0,
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
    s.yaw = Math.atan2(-s.pos.x, -s.pos.z) + Math.PI + (first ? 0 : (Math.random() - 0.5));
    s.pitch = 0;
    if (s.isPlayer) {
      this.equipWeapon(this.nextWeaponId);
      this.syncCamera();
    }
    const mesh = this.botMeshes[s.id];
    if (mesh) {
      mesh.setDead(false);
      mesh.group.visible = true;
      mesh.group.position.copy(s.pos);
      if (!first) {
        const bot = this.bots.find((b) => b.s.id === s.id);
        if (bot) {
          const weaponPool: WeaponId[] = ['assault', 'smg', 'sniper', 'shotgun', 'lmg'];
          const choices = weaponPool.filter((w) => w !== bot.weaponId);
          bot.weaponId = choices[Math.floor(Math.random() * choices.length)];
          const bootPool: BootStyle[] = ['stomper', 'tactical', 'patrol', 'stealth'];
          const randomBoot = bootPool[Math.floor(Math.random() * bootPool.length)];
          mesh.setOperator(bot.weaponId as OperatorClass, randomBoot);
          mesh.setWeapon(bot.weaponId);
        }
      }
    }
  }

  // ---------- input API ----------
  setKey(code: string, down: boolean) {
    this.keys[code] = down;
    if (down) {
      if (code === 'KeyR') this.startReload();
      // Loadout switching allowed ONLY when dead (for next respawn)
      if (!this.soldiers[0]?.alive) {
        if (code === 'Digit1') this.setNextWeapon('assault');
        if (code === 'Digit2') this.setNextWeapon('smg');
        if (code === 'Digit3') this.setNextWeapon('sniper');
        if (code === 'Digit4') this.setNextWeapon('shotgun');
        if (code === 'Digit5') this.setNextWeapon('lmg');
      }
    }
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
    const def = WEAPONS[this.currentWeaponId];
    if (!p?.alive || this.reloading || this.ammo >= def.magSize || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = def.reloadTime;
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
            const stepUp = c.max.y - s.pos.y;
            if (stepUp > 0 && stepUp <= 0.45 && s.onGround) {
              s.pos.y = c.max.y;
              s.onGround = true;
            } else {
              const center = (c.min[ax] + c.max[ax]) / 2;
              if (s.pos[ax] < center) s.pos[ax] = c.min[ax] - s.radius;
              else s.pos[ax] = c.max[ax] + s.radius;
              s.vel[ax] = 0;
            }
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
      this.emitSound(p.pos, 22, p.team, false);
    }
    this.moveEntity(p, dt);

    // footsteps
    const hSpeed = Math.hypot(p.vel.x, p.vel.z);
    if (p.onGround && hSpeed > 1) {
      this.stepT -= dt * hSpeed;
      if (this.stepT <= 0) {
        this.stepT = 3.4;
        this.audio.footstep();
        if (sprint) {
          this.emitSound(p.pos, 18, p.team, false);
        }
      }
    }

    // viewmodel bob & ADS
    const def = WEAPONS[this.currentWeaponId];
    this.bobT += dt * hSpeed * 1.6;
    const bobY = Math.abs(Math.sin(this.bobT)) * 0.012 * Math.min(hSpeed / 5, 1);
    const bobX = Math.sin(this.bobT * 0.5) * 0.008 * Math.min(hSpeed / 5, 1);
    this.viewmodel.position.lerpVectors(def.hipPos, def.adsPos, this.adsT);
    this.viewmodel.position.x += bobX * (1 - this.adsT);
    this.viewmodel.position.y += bobY * (1 - this.adsT);
    // recoil recovery
    this.recoil *= Math.max(0, 1 - 9 * dt);
    this.viewmodel.position.z += this.recoil * 0.06;

    let rotX = this.recoil * 0.35;
    let rotY = 0;
    let rotZ = 0;

    // Sniper scope viewmodel hide
    if (def.hasSniperScope) {
      this.viewmodel.visible = this.adsT < 0.65;
    } else {
      this.viewmodel.visible = true;
    }

    const targetFov = this.baseFov - this.adsT * def.zoomFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 14);
      this.camera.updateProjectionMatrix();
    }

    // cycle animation (pump or bolt)
    if (this.cycleT > 0) {
      this.cycleT -= dt;
      const cycleTotal = def.pumpDuration || def.boltDuration || 0.5;
      const prog = Math.min(1, Math.max(0, 1 - this.cycleT / cycleTotal));
      if (def.isPumpAction && this.vmComponents?.pumpMesh) {
        const slide = Math.sin(prog * Math.PI);
        this.vmComponents.pumpMesh.position.z = -0.38 + slide * 0.08;
        rotX += slide * 0.04;
      }
      if (def.isBoltAction && this.vmComponents?.boltMesh) {
        const boltSlide = Math.sin(prog * Math.PI);
        this.vmComponents.boltMesh.position.z = boltSlide * 0.08;
        this.vmComponents.boltMesh.rotation.z = (Math.PI / 2) - boltSlide * 0.5;
        // slight bolt pull cant (absolute, NOT accumulating)
        rotZ = boltSlide * 0.025;
      }
      if (this.cycleT <= 0) {
        if (this.vmComponents?.boltMesh) {
          this.vmComponents.boltMesh.position.z = 0;
          this.vmComponents.boltMesh.rotation.z = Math.PI / 2;
        }
        if (this.vmComponents?.pumpMesh) {
          this.vmComponents.pumpMesh.position.z = -0.38;
        }
      }
    }

    // reload animation
    if (this.reloading) {
      this.reloadT -= dt;
      const prog = Math.min(1, Math.max(0, 1 - this.reloadT / def.reloadTime));

      if (def.id === 'sniper') {
        rotX = -0.45 * Math.sin(prog * Math.PI);
        rotZ = -0.2 * Math.sin(prog * Math.PI);
        if (this.vmComponents?.magMesh) {
          const drop = prog > 0.2 && prog < 0.7 ? Math.sin(((prog - 0.2) / 0.5) * Math.PI) : 0;
          this.vmComponents.magMesh.position.y = -0.13 - drop * 0.2;
        }
      } else if (def.id === 'shotgun') {
        rotX = 0.38 * Math.sin(prog * Math.PI);
        rotZ = -0.15 * Math.sin(prog * Math.PI);
        if (this.vmComponents?.pumpMesh && prog > 0.75) {
          const pSlide = Math.sin(((prog - 0.75) / 0.25) * Math.PI);
          this.vmComponents.pumpMesh.position.z = -0.38 + pSlide * 0.06;
        }
      } else if (def.id === 'lmg') {
        rotX = -0.48 * Math.sin(prog * Math.PI);
        rotZ = 0.25 * Math.sin(prog * Math.PI);
        if (this.vmComponents?.magMesh) {
          const drumDip = prog > 0.25 && prog < 0.75 ? Math.sin(((prog - 0.25) / 0.5) * Math.PI) : 0;
          this.vmComponents.magMesh.position.y = -drumDip * 0.22;
        }
      } else if (def.id === 'smg') {
        rotX = -0.42 * Math.sin(prog * Math.PI);
        rotZ = 0.3 * Math.sin(prog * Math.PI);
        if (this.vmComponents?.magMesh) {
          const mDrop = prog > 0.2 && prog < 0.7 ? Math.sin(((prog - 0.2) / 0.5) * Math.PI) : 0;
          this.vmComponents.magMesh.position.y = -0.14 - mDrop * 0.16;
        }
      } else {
        // MK-7 Assault Rifle - clean tactical reload (no crooked twist)
        const tilt = Math.sin(prog * Math.PI);
        rotX = 0.12 * tilt; // slight upward angle so player sees magwell
        rotZ = -0.14 * tilt; // slight tactical left cant
        rotY = 0.05 * tilt;

        if (this.vmComponents?.magMesh) {
          if (prog < 0.18) {
            this.vmComponents.magMesh.position.set(0, -0.13, 0.04);
          } else if (prog < 0.48) {
            const dropProg = (prog - 0.18) / 0.3;
            this.vmComponents.magMesh.position.y = -0.13 - dropProg * 0.32;
            this.vmComponents.magMesh.position.z = 0.04 - dropProg * 0.04;
          } else if (prog < 0.78) {
            const insertProg = (prog - 0.48) / 0.3;
            this.vmComponents.magMesh.position.y = -0.45 + insertProg * 0.32;
            this.vmComponents.magMesh.position.z = 0.00 + insertProg * 0.04;
          } else {
            this.vmComponents.magMesh.position.set(0, -0.13, 0.04);
            const slap = Math.sin(((prog - 0.78) / 0.22) * Math.PI);
            rotX += slap * 0.035;
          }
        }
      }

      if (this.reloadT <= 0) {
        const need = def.magSize - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
        rotX = 0;
        rotY = 0;
        rotZ = 0;
        if (this.vmComponents?.magMesh) {
          if (def.id === 'lmg') this.vmComponents.magMesh.position.y = 0;
          else if (def.id === 'smg') this.vmComponents.magMesh.position.y = -0.14;
          else if (def.id === 'sniper') this.vmComponents.magMesh.position.y = -0.13;
          else if (def.id === 'assault') this.vmComponents.magMesh.position.set(0, -0.13, 0.04);
        }
      }
    }

    this.viewmodel.rotation.set(rotX, rotY, rotZ);

    // firing
    this.fireCd -= dt;
    if (this.firing && this.fireCd <= 0 && this.cycleT <= 0 && !this.reloading && !this.ended) {
      if (this.ammo <= 0) {
        this.fireCd = 0.3;
        this.audio.dryFire();
        this.startReload();
      } else {
        this.fireCd = 60 / def.rpm;
        this.ammo--;
        if (def.isPumpAction) {
          this.cycleT = def.pumpDuration || 0.5;
          setTimeout(() => this.audio.pumpRack(), 120);
        }
        if (def.isBoltAction) {
          this.cycleT = def.boltDuration || 0.8;
          setTimeout(() => this.audio.boltCycle(), 180);
        }
        const spread = THREE.MathUtils.lerp(def.spreadHip, def.spreadAds, this.adsT) + (sprint ? 0.02 : 0) + (p.onGround ? 0 : 0.02);
        this.syncCamera();
        this.shoot(p, spread, true, def);
        this.recoil = Math.min(this.recoil + def.recoil, 0.35);
        p.pitch += def.recoil * 0.12 + Math.random() * 0.003;
        p.yaw += (Math.random() - 0.5) * def.recoil * 0.08;
        this.syncCamera();
        (this.vmFlash.material as THREE.MeshBasicMaterial).opacity = 0.95;
        setTimeout(() => ((this.vmFlash.material as THREE.MeshBasicMaterial).opacity = 0), 45);
        const mw = new THREE.Vector3();
        this.vmMuzzle.getWorldPosition(mw);
        this.effects.muzzleFlash(mw);
        this.audio.gunshot(0.95, 0, false, def.id);
      }
    }
  }

  // ---------- combat ----------
  private shoot(shooter: SoldierState, spread: number, isPlayer: boolean, def: WeaponDef = WEAPONS.assault) {
    const origin = new THREE.Vector3(shooter.pos.x, shooter.pos.y + (isPlayer ? EYE : 1.45), shooter.pos.z);
    this.emitSound(origin, def.id === 'sniper' ? 68 : (def.id === 'shotgun' ? 52 : 44), shooter.team, true);
    const pellets = def.pellets || 1;
    const MAXD = 120;
    let anyHit = false;

    for (let pIdx = 0; pIdx < pellets; pIdx++) {
      const dir = new THREE.Vector3(
        -Math.sin(shooter.yaw) * Math.cos(shooter.pitch),
        Math.sin(shooter.pitch),
        -Math.cos(shooter.yaw) * Math.cos(shooter.pitch)
      );
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.z += (Math.random() - 0.5) * spread * 2;
      dir.normalize();

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
          if (pIdx === 0) this.effects.muzzleFlash(tip);
        }
      }

      if (victim) {
        anyHit = true;
        // damage falloff
        const falloff = bestT < def.falloffStart ? 1 : Math.max(def.falloffMin, 1 - (bestT - def.falloffStart) / 70);
        let dmg = def.damage * falloff;
        if (isHead) dmg *= def.headshotMult;
        if (!isPlayer) dmg *= 0.62; // bots are merciful
        this.damage(victim, dmg, shooter, isHead);
        this.effects.bloodPuff(hitPoint);
      } else if (bestT < MAXD) {
        this.effects.impactSparks(hitPoint);
      }
    }

    if (anyHit && isPlayer) {
      this.hitMarker++;
      this.audio.hitMarker();
      this.pushHud();
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
    } else {
      // Victim is a bot: alert it to attacker's location immediately!
      const botObj = this.bots.find((b) => b.s.id === victim.id);
      if (botObj && attacker.alive) {
        botObj.target = attacker.id;
        botObj.lkp = attacker.pos.clone();
        botObj.lkpTimer = 4.5;
        botObj.reaction = Math.min(botObj.reaction, 0.12);
        this.squadCallouts.push({
          pos: attacker.pos.clone(),
          targetId: attacker.id,
          team: victim.team,
          expires: performance.now() / 1000 + 3.5,
          type: 'spot',
        });
      }
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
      if (attacker && attacker.alive) {
        this.squadCallouts.push({
          pos: attacker.pos.clone(),
          targetId: attacker.id,
          team: victim.team,
          expires: performance.now() / 1000 + 4.5,
          type: 'mandown',
        });
        if (this.squadCallouts.length > 25) this.squadCallouts.shift();
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
  private emitSound(pos: THREE.Vector3, radius: number, team: Team, isGunfire = true) {
    this.soundEvents.push({
      pos: pos.clone(),
      radius,
      team,
      time: performance.now() / 1000,
      isGunfire,
    });
    if (this.soundEvents.length > 30) this.soundEvents.shift();
  }

  // TIER 1: Dynamic Tactical Cover Evaluation (TQS-Lite)
  private findTacticalCover(botPos: THREE.Vector3, threatPos: THREE.Vector3, maxSearchDist = 22): THREE.Vector3 | null {
    const threatEye = new THREE.Vector3(threatPos.x, threatPos.y + 1.45, threatPos.z);
    let bestCover: THREE.Vector3 | null = null;
    let bestScore = Infinity;

    for (const c of this.colliders) {
      const h = c.max.y - c.min.y;
      if (h < 1.0) continue; // Cover must be tall enough to conceal a crouching or standing soldier
      const center = new THREE.Vector3((c.min.x + c.max.x) / 2, 0, (c.min.z + c.max.z) / 2);
      const dBot = botPos.distanceTo(center);
      if (dBot > maxSearchDist || dBot < 1.5) continue;

      const candidates: THREE.Vector3[] = [
        new THREE.Vector3(center.x, 0, c.min.z - 1.2),
        new THREE.Vector3(center.x, 0, c.max.z + 1.2),
        new THREE.Vector3(c.min.x - 1.2, 0, center.z),
        new THREE.Vector3(c.max.x + 1.2, 0, center.z),
      ];

      for (const cand of candidates) {
        if (Math.abs(cand.x) > this.bounds || Math.abs(cand.z) > this.bounds) continue;
        const candEye = new THREE.Vector3(cand.x, 0.9, cand.z);
        if (!lineOfSight(candEye, threatEye, this.colliders)) {
          const distToBot = botPos.distanceTo(cand);
          const distToThreat = cand.distanceTo(threatPos);
          const score = distToBot - distToThreat * 0.15;
          if (score < bestScore) {
            bestScore = score;
            bestCover = cand;
          }
        }
      }
    }
    return bestCover;
  }

  // TIER 2: Two-Stage Ballistic Human Aim Model
  private updateHumanAim(b: Bot, targetPos: THREE.Vector3, targetEyeY: number, dt: number, isFiring: boolean) {
    const s = b.s;
    const to = targetPos.clone().sub(s.pos);
    const dist = to.length();
    const desiredYaw = Math.atan2(-to.x, -to.z);
    let dy = Math.atan2(Math.sin(desiredYaw - s.yaw), Math.cos(desiredYaw - s.yaw));

    const eyeH = b.crouched ? 1.0 : 1.45;
    const desiredPitch = Math.atan2(targetEyeY - (s.pos.y + eyeH), Math.max(0.1, dist));
    let dp = desiredPitch - s.pitch;

    // Stage 1: Ballistic Flick & Overshoot
    if (Math.abs(dy) > 0.35 && Math.abs(b.overshootYaw) < 0.001) {
      b.overshootYaw = (Math.random() - 0.5) * (b.role === 'marksman' ? 0.025 : 0.06);
    }
    b.overshootYaw *= Math.max(0, 1 - 9 * dt);
    dy += b.overshootYaw;

    // Stage 2: Smooth acceleration & damping pursuit curve (Minimum-Jerk)
    const maxYawSpeed = b.role === 'rusher' ? 14 : (b.role === 'marksman' ? 8.5 : 11);
    const accelYaw = 5.5 + Math.abs(dy) * 15.0;
    const stepYaw = THREE.MathUtils.clamp(dy * accelYaw * dt, -maxYawSpeed * dt, maxYawSpeed * dt);
    s.yaw += stepYaw;

    const maxPitchSpeed = 7.5;
    const accelPitch = 5.0 + Math.abs(dp) * 12.0;
    const stepPitch = THREE.MathUtils.clamp(dp * accelPitch * dt, -maxPitchSpeed * dt, maxPitchSpeed * dt);
    s.pitch += stepPitch;

    // Recoil compensation
    if (isFiring && b.burstLeft > 0) {
      b.recoilOffset = Math.min(0.035, b.recoilOffset + 0.007);
      s.pitch -= b.recoilOffset * dt * 3.5;
    } else {
      b.recoilOffset = Math.max(0, b.recoilOffset - 0.04 * dt);
    }

    // Physiological hand tremor
    b.tremorPhase += dt * 9.5;
    s.yaw += Math.sin(b.tremorPhase) * 0.0014;
  }

  private updateBot(b: Bot, dt: number) {
    const s = b.s;
    if (!s.alive) {
      s.respawnTimer -= dt;
      b.target = -1;
      b.lkp = null;
      b.lkpTimer = 0;
      b.inCover = false;
      b.coverPoint = null;
      b.crouched = false;
      s.height = 1.75;
      b.mesh.setCrouch?.(false);
      if (s.respawnTimer <= 0 && !this.ended) this.respawn(s);
      return;
    }

    // HP regeneration (faster when safely resting in cover)
    if (s.hp < 100) {
      s.hp = Math.min(100, s.hp + (b.inCover ? 22 : 8) * dt);
    }

    // Dynamic height and mesh crouch posture
    s.height = b.crouched ? 1.15 : 1.75;
    b.mesh.setCrouch?.(b.crouched);

    const now = performance.now() / 1000;
    b.tradeTimer -= dt;
    b.calloutTimer -= dt;
    b.lkpTimer -= dt;
    b.counterStrafeTimer -= dt;
    b.jumpCd -= dt;
    b.coverTimer -= dt;
    b.slideTimer -= dt;

    // Clean up expired sound events & callouts
    while (this.soundEvents.length > 0 && now - this.soundEvents[0].time > 3.0) {
      this.soundEvents.shift();
    }
    while (this.squadCallouts.length > 0 && now > this.squadCallouts[0].expires) {
      this.squadCallouts.shift();
    }

    // Target Acquisition (Vision, Squad Callouts, Sound Perception)
    b.repickT -= dt;
    const eyeH = b.crouched ? 1.0 : 1.45;
    const eye = new THREE.Vector3(s.pos.x, s.pos.y + eyeH, s.pos.z);

    // 1. Direct Visual LOS Check
    let visualTarget: SoldierState | null = null;
    let bestDist = b.role === 'marksman' ? 75 : 62;

    for (const e of this.soldiers) {
      if (e.team === s.team || !e.alive) continue;
      const d = s.pos.distanceTo(e.pos);
      if (d < bestDist) {
        const eEye = new THREE.Vector3(e.pos.x, e.pos.y + 1.25, e.pos.z);
        if (lineOfSight(eye, eEye, this.colliders)) {
          bestDist = d;
          visualTarget = e;
        }
      }
    }

    if (visualTarget) {
      if (b.target !== visualTarget.id && b.reaction <= 0) {
        // Human reaction time based on role
        b.reaction = b.role === 'rusher' ? (0.16 + Math.random() * 0.1) : (b.role === 'marksman' ? (0.14 + Math.random() * 0.08) : (0.2 + Math.random() * 0.12));
      }
      b.target = visualTarget.id;
      b.lkp = visualTarget.pos.clone();
      b.lkpTimer = 4.5;

      // Squad callout broadcast
      if (b.calloutTimer <= 0) {
        b.calloutTimer = 2.0;
        this.squadCallouts.push({
          pos: visualTarget.pos.clone(),
          targetId: visualTarget.id,
          team: s.team,
          expires: now + 3.2,
          type: 'spot',
        });
      }
    } else {
      // Visual LOS lost! Check if we have an unexpired LKP or Squad Callout or Sound
      if (b.target >= 0) {
        if (!b.lkp || b.lkpTimer <= 0) {
          b.target = -1;
        }
      }

      if (b.target < 0) {
        // TIER 3: Check Squad Callouts (Radio Intel)
        for (const call of this.squadCallouts) {
          if (call.team === s.team && now < call.expires && call.targetId >= 0) {
            const enemy = this.soldiers[call.targetId];
            if (enemy && enemy.alive) {
              const d = s.pos.distanceTo(call.pos);
              if (d < 34) {
                b.target = call.targetId;
                b.lkp = call.pos.clone();
                b.lkpTimer = 4.0;
                b.reaction = Math.min(b.reaction, 0.16);
                break;
              }
            }
          }
        }

        // TIER 1: Check Sound Events (Gunfire & Loud Footsteps)
        if (b.target < 0) {
          for (const snd of this.soundEvents) {
            if (snd.team !== s.team && now - snd.time < 1.8) {
              const d = s.pos.distanceTo(snd.pos);
              if (d < snd.radius) {
                b.roamPoint.copy(snd.pos);
                b.lkp = snd.pos.clone();
                b.lkpTimer = 3.5;
                b.reaction = Math.min(b.reaction, 0.18);
                break;
              }
            }
          }
        }
      }
    }

    const activeTarget = b.target >= 0 ? this.soldiers[b.target] : null;
    const wish = new THREE.Vector3();

    // TIER 1: Dynamic Tactical Cover Decision (TQS-Lite)
    if (s.hp < 45 || b.inCover) {
      if (!b.inCover) {
        const threatPos = activeTarget ? activeTarget.pos : (b.lkp || s.pos);
        const cover = this.findTacticalCover(s.pos, threatPos, 22);
        if (cover) {
          b.inCover = true;
          b.coverPoint = cover;
          b.coverTimer = 3.8;
        }
      }

      if (b.inCover && b.coverPoint) {
        const toCover = b.coverPoint.clone().sub(s.pos);
        toCover.y = 0;
        const dCover = toCover.length();
        if (dCover > 1.2) {
          wish.copy(toCover.normalize());
          b.crouched = false;
        } else {
          b.crouched = true;
          b.counterStrafeTimer = 0.5;
          if (s.hp >= 75 || b.coverTimer <= 0) {
            b.inCover = false;
            b.crouched = false;
          }
        }
      }
    }

    // Engagement & Combat Navigation
    if (activeTarget && activeTarget.alive && !b.inCover) {
      const to = activeTarget.pos.clone().sub(s.pos);
      const dist = to.length();
      const hasLOS = visualTarget !== null && visualTarget.id === activeTarget.id;

      if (hasLOS) {
        this.updateHumanAim(b, activeTarget.pos, activeTarget.pos.y + 1.25, dt, b.burstLeft > 0);

        b.reaction -= dt;
        b.strafeT -= dt;
        if (b.strafeT <= 0) {
          b.strafeT = 0.6 + Math.random() * 0.9;
          b.strafeDir = Math.random() > 0.5 ? 1 : -1;
        }

        const f = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
        const r = new THREE.Vector3(-f.z, 0, f.x);

        // TIER 2: Jiggle Peeking & Spacing
        b.jiggleTimer -= dt;
        if (b.jiggleTimer <= 0) {
          b.jiggleTimer = 0.35 + Math.random() * 0.3;
          b.jiggleDir *= -1;
        }

        if (b.role === 'rusher') {
          if (dist > 10) wish.add(f);
          else if (dist < 3) wish.sub(f);
          wish.addScaledVector(r, b.strafeDir * 0.9);
        } else if (b.role === 'marksman') {
          if (dist > 38) wish.add(f);
          else if (dist < 18) wish.sub(f);
          wish.addScaledVector(r, b.jiggleDir * 0.5);
        } else {
          if (dist > 24) wish.add(f);
          else if (dist < 8) wish.sub(f);
          wish.addScaledVector(r, b.jiggleDir * 0.85);
        }

        // TIER 2: Counter-strafing before firing
        const botDef = WEAPONS[b.weaponId];
        const desiredYaw = Math.atan2(-to.x, -to.z);
        const dy = Math.atan2(Math.sin(desiredYaw - s.yaw), Math.cos(desiredYaw - s.yaw));

        if (b.reaction <= 0 && Math.abs(dy) < 0.13) {
          if (b.burstLeft <= 0 && b.burstCd <= 0) {
            b.counterStrafeTimer = 0.08;
            b.burstLeft = b.weaponId === 'sniper' ? 1 : (b.weaponId === 'shotgun' ? 1 : (3 + Math.floor(Math.random() * 4)));
            b.burstCd = b.weaponId === 'sniper' ? (0.95 + Math.random() * 0.4) : (b.weaponId === 'shotgun' ? (0.65 + Math.random() * 0.3) : (0.45 + Math.random() * 0.5));
          }

          b.fireCd -= dt;
          b.burstCd -= dt;
          if (b.burstLeft > 0 && b.fireCd <= 0) {
            b.fireCd = 60 / botDef.rpm;
            b.burstLeft--;
            const roleAccuracyBonus = b.role === 'marksman' ? 0.004 : (b.role === 'rusher' ? 0.018 : 0.012);
            const moveInaccuracy = (s.vel.lengthSq() > 3.0 ? 0.016 : 0);
            const acc = roleAccuracyBonus + dist * 0.00075 + moveInaccuracy;
            this.shoot(s, acc, false, botDef);

            const p = this.soldiers[0];
            const toBot = s.pos.clone().sub(p.pos);
            const d = toBot.length();
            if (d < 75) {
              const right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
              const pan = THREE.MathUtils.clamp(toBot.normalize().dot(right), -1, 1);
              this.audio.gunshot(THREE.MathUtils.clamp(1 - d / 75, 0.08, 0.75), pan, d > 30, b.weaponId);
            }
          }
        }
      } else if (b.lkp && b.lkpTimer > 0) {
        // TIER 1: HUNTING LAST-KNOWN POSITION (Corner Clearing)
        const toLkp = b.lkp.clone().sub(s.pos);
        toLkp.y = 0;
        const distLkp = toLkp.length();
        if (distLkp > 3.2) {
          wish.copy(toLkp.normalize());
          this.updateHumanAim(b, b.lkp, b.lkp.y + 1.25, dt, false);
        } else {
          b.target = -1;
          b.lkp = null;
        }
      }
    } else if (!b.inCover) {
      // Roaming & Searching
      if (b.lkp && b.lkpTimer > 0) {
        const toLkp = b.lkp.clone().sub(s.pos);
        toLkp.y = 0;
        if (toLkp.length() > 3.0) {
          wish.copy(toLkp.normalize());
          this.updateHumanAim(b, b.lkp, b.lkp.y + 1.2, dt, false);
        } else {
          b.lkp = null;
        }
      } else {
        if (s.pos.distanceTo(b.roamPoint) < 3.5 || Math.random() < 0.003) {
          b.roamPoint.set((Math.random() - 0.5) * this.bounds * 1.5, 0, (Math.random() - 0.5) * this.bounds * 1.5);
        }
        const to = b.roamPoint.clone().sub(s.pos);
        to.y = 0;
        const desiredYaw = Math.atan2(-to.x, -to.z);
        const dy = Math.atan2(Math.sin(desiredYaw - s.yaw), Math.cos(desiredYaw - s.yaw));
        s.yaw += THREE.MathUtils.clamp(dy, -2.8 * dt, 2.8 * dt);
        s.pitch *= 0.94; // Keep crosshair level at head height
        wish.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));

        const f = wish.clone();
        const ahead = raycastWorld(eye, f, this.colliders, 2.8);
        if (ahead) {
          const left = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.85);
          const right = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.85);
          const lFree = !raycastWorld(eye, left, this.colliders, 2.8);
          const rFree = !raycastWorld(eye, right, this.colliders, 2.8);
          wish.copy(lFree && (!rFree || Math.random() > 0.5) ? left : right);
          s.yaw = Math.atan2(-wish.x, -wish.z);
        }
      }
    }

    if (wish.lengthSq() > 0) wish.normalize();

    let speed = b.inCover ? 5.2 : (activeTarget ? 4.3 : 3.6);
    if (b.crouched) speed *= 0.55;

    if (b.counterStrafeTimer > 0) {
      s.vel.x *= Math.max(0, 1 - 20 * dt);
      s.vel.z *= Math.max(0, 1 - 20 * dt);
    } else {
      s.vel.x += (wish.x * speed - s.vel.x) * Math.min(1, 8.5 * dt);
      s.vel.z += (wish.z * speed - s.vel.z) * Math.min(1, 8.5 * dt);
    }

    // Bot stuck detection and jump obstacle clearance
    const hSpeed = Math.hypot(s.vel.x, s.vel.z);
    if (wish.lengthSq() > 0.1 && hSpeed < 0.95 && !b.crouched) {
      b.stuckTimer += dt;
      if (b.stuckTimer > 0.35 && b.jumpCd <= 0 && s.onGround) {
        s.vel.y = 7.8;
        s.onGround = false;
        b.jumpCd = 1.2;
        b.stuckTimer = 0;
      }
      if (b.stuckTimer > 1.4) {
        b.roamPoint.set((Math.random() - 0.5) * this.bounds * 1.5, 0, (Math.random() - 0.5) * this.bounds * 1.5);
        b.target = -1;
        b.inCover = false;
        b.stuckTimer = 0;
      }
    } else {
      b.stuckTimer = Math.max(0, b.stuckTimer - dt * 2);
    }

    this.moveEntity(s, dt);

    // Update mesh
    const m = b.mesh;
    m.group.position.copy(s.pos);
    m.group.rotation.y = s.yaw;
    m.setAimPitch(s.pitch);
    m.animateWalk(performance.now() / 1000, Math.hypot(s.vel.x, s.vel.z), dt);
  }

  // ---------- HUD / match ----------
  private pushHud() {
    const p = this.soldiers[0];
    if (!p) return;
    const def = WEAPONS[this.currentWeaponId];
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
      weaponId: this.currentWeaponId,
      weaponName: def.name,
      weaponCategory: def.category,
      nextWeaponId: this.nextWeaponId,
      nextWeaponName: WEAPONS[this.nextWeaponId].name,
      isSniperScope: !!def.hasSniperScope && this.adsT > 0.65,
      magSize: def.magSize,
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
