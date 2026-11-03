import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
  gravity: number;
}

const MAX_P = 600;

export class Effects {
  readonly group = new THREE.Group();
  private particles: Particle[] = [];
  private points: THREE.Points;
  private pGeo: THREE.BufferGeometry;
  private pPos: Float32Array;
  private pCol: Float32Array;
  private tracers: { line: THREE.Line; life: number }[] = [];
  private flashes: { light: THREE.PointLight; life: number }[] = [];
  private tracerMat = new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.9 });

  constructor() {
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_P * 3);
    this.pCol = new Float32Array(MAX_P * 3);
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(this.pGeo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  private emit(pos: THREE.Vector3, vel: THREE.Vector3, color: number, life: number, gravity = 9) {
    if (this.particles.length >= MAX_P) this.particles.shift();
    this.particles.push({ pos: pos.clone(), vel: vel.clone(), life, maxLife: life, color: new THREE.Color(color), size: 1, gravity });
  }

  impactSparks(point: THREE.Vector3) {
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5);
      this.emit(point, v, Math.random() > 0.5 ? 0xffcc66 : 0xcccccc, 0.3 + Math.random() * 0.25, 12);
    }
    // dust
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5);
      this.emit(point, v, 0x9a927e, 0.5 + Math.random() * 0.4, 1.5);
    }
  }

  bloodPuff(point: THREE.Vector3) {
    for (let i = 0; i < 12; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 3.5, Math.random() * 3, (Math.random() - 0.5) * 3.5);
      this.emit(point, v, Math.random() > 0.4 ? 0xaa1a1a : 0x7d1010, 0.35 + Math.random() * 0.3, 8);
    }
  }

  deathBurst(point: THREE.Vector3) {
    for (let i = 0; i < 26; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6, (Math.random() - 0.5) * 7);
      this.emit(point, v, Math.random() > 0.5 ? 0xaa1a1a : 0x555555, 0.5 + Math.random() * 0.5, 10);
    }
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3) {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(g, this.tracerMat.clone());
    this.group.add(line);
    this.tracers.push({ line, life: 0.07 });
  }

  muzzleFlash(pos: THREE.Vector3) {
    const light = new THREE.PointLight(0xffb347, 18, 9, 2);
    light.position.copy(pos);
    this.group.add(light);
    this.flashes.push({ light, life: 0.05 });
  }

  update(dt: number) {
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.02) { p.pos.y = 0.02; p.vel.y *= -0.3; p.vel.x *= 0.7; p.vel.z *= 0.7; }
    }
    for (let i = 0; i < MAX_P; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.pPos[i * 3] = p.pos.x;
        this.pPos[i * 3 + 1] = p.pos.y;
        this.pPos[i * 3 + 2] = p.pos.z;
        const f = p.life / p.maxLife;
        this.pCol[i * 3] = p.color.r * f;
        this.pCol[i * 3 + 1] = p.color.g * f;
        this.pCol[i * 3 + 2] = p.color.b * f;
      } else {
        this.pPos[i * 3 + 1] = -100;
      }
    }
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;

    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.group.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (t.line.material as THREE.LineBasicMaterial).opacity = t.life / 0.07;
      }
    }

    // flashes
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.group.remove(f.light);
        this.flashes.splice(i, 1);
      } else {
        f.light.intensity = 18 * (f.life / 0.05);
      }
    }
  }
}
