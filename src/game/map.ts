import * as THREE from 'three';
import type { Collider, SpawnPoint } from './types';

function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  draw(c);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noiseOverlay(c: CanvasRenderingContext2D, size: number, alpha: number) {
  for (let i = 0; i < size * size * 0.06; i++) {
    const v = Math.floor(Math.random() * 255);
    c.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    c.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}

export function concreteTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (c) => {
    c.fillStyle = '#8a8578';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      c.fillStyle = `rgba(${60 + Math.random() * 40},${58 + Math.random() * 36},${50 + Math.random() * 30},0.22)`;
      c.beginPath();
      c.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 8, 0, 7);
      c.fill();
    }
    c.strokeStyle = 'rgba(40,38,32,0.35)';
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      let x = Math.random() * 256, y = Math.random() * 256;
      c.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; c.lineTo(x, y); }
      c.stroke();
    }
    noiseOverlay(c, 256, 0.08);
  });
}

export function metalTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (c) => {
    c.fillStyle = '#5c646e';
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, y, 256, 2);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(0, y + 2, 256, 1);
    }
    for (let i = 0; i < 20; i++) {
      c.fillStyle = 'rgba(120,70,30,0.18)';
      c.fillRect(Math.random() * 256, Math.random() * 256, 3 + Math.random() * 10, 3 + Math.random() * 20);
    }
    noiseOverlay(c, 256, 0.06);
  });
}

export function crateTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (c) => {
    c.fillStyle = '#7a6a4f';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(40,30,15,0.7)';
    c.lineWidth = 6;
    c.strokeRect(8, 8, 240, 240);
    c.beginPath();
    c.moveTo(8, 8); c.lineTo(248, 248);
    c.moveTo(248, 8); c.lineTo(8, 248);
    c.stroke();
    c.fillStyle = 'rgba(255,240,200,0.35)';
    c.font = 'bold 26px monospace';
    c.fillText('MUNITION', 62, 134);
    noiseOverlay(c, 256, 0.1);
  });
}

export function groundTexture(): THREE.CanvasTexture {
  const t = canvasTexture(512, (c) => {
    c.fillStyle = '#6f6a55';
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(${80 + Math.random() * 50},${75 + Math.random() * 45},${55 + Math.random() * 35},0.35)`;
      c.beginPath();
      c.arc(Math.random() * 512, Math.random() * 512, 4 + Math.random() * 26, 0, 7);
      c.fill();
    }
    // scattered rubble
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(${40 + Math.random() * 60},${40 + Math.random() * 55},${35 + Math.random() * 45},0.5)`;
      c.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 5);
    }
    noiseOverlay(c, 512, 0.07);
  });
  t.repeat.set(24, 24);
  return t;
}

export interface BuiltMap {
  group: THREE.Group;
  colliders: Collider[];
  spawns: SpawnPoint[];
  bounds: number; // playable half-extent
}

export function buildMap(): BuiltMap {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const spawns: SpawnPoint[] = [];
  const B = 48; // half-extent of playable area

  const matConcrete = new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.92, metalness: 0.05 });
  const matMetal = new THREE.MeshStandardMaterial({ map: metalTexture(), roughness: 0.5, metalness: 0.35 });
  const matCrate = new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.85, metalness: 0.05 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.8, metalness: 0.3 });

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(B * 2 + 60, B * 2 + 60), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  colliders.push({ min: new THREE.Vector3(-B - 60, -2, -B - 60), max: new THREE.Vector3(B + 60, 0, B + 60) });

  const addBox = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material, opts?: { ry?: number; y?: number; collide?: boolean }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, (opts?.y ?? 0) + h / 2, z);
    if (opts?.ry) m.rotation.y = opts.ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (opts?.collide !== false && !opts?.ry) {
      colliders.push({ min: new THREE.Vector3(x - w / 2, opts?.y ?? 0, z - d / 2), max: new THREE.Vector3(x + w / 2, (opts?.y ?? 0) + h, z + d / 2), mesh: m });
    }
    return m;
  };

  // Perimeter walls (tall concrete, segmented so the texture tiles cleanly)
  const wallH = 6;
  for (let i = -B; i < B; i += 8) {
    addBox(i + 4, -B - 1.5, 8, wallH, 3, matConcrete);
    addBox(i + 4, B + 1.5, 8, wallH, 3, matConcrete);
    addBox(-B - 1.5, i + 4, 3, wallH, 8, matConcrete);
    addBox(B + 1.5, i + 4, 3, wallH, 8, matConcrete);
  }

  // Symmetric layout (mirrored across center). List of [x, z, w, h, d, mat]
  type S = [number, number, number, number, number, THREE.Material];
  const half: S[] = [
    // big warehouse blocks
    [22, 22, 14, 7, 10, matConcrete],
    [22, -22, 14, 7, 10, matConcrete],
    // metal containers
    [10, 0, 8, 3, 3, matMetal],
    [34, 0, 6, 2.6, 2.4, matMetal],
    // crates clusters
    [14, 14, 2.2, 2.2, 2.2, matCrate],
    [16.4, 13, 2.2, 2.2, 2.2, matCrate],
    [15, 15, 2.2, 2.2, 2.2, matCrate],
    [30, -12, 2.2, 2.2, 2.2, matCrate],
    [28, -10, 2.2, 2.2, 2.2, matCrate],
    [31.5, -9.5, 2.2, 2.2, 2.2, matCrate],
    // low barriers
    [6, -20, 6, 1.2, 1, matConcrete],
    [6, 20, 6, 1.2, 1, matConcrete],
    [40, 20, 1, 1.2, 6, matConcrete],
    [40, -20, 1, 1.2, 6, matConcrete],
    // mid-lane pillars
    [8, 34, 3, 5, 3, matConcrete],
    [8, -34, 3, 5, 3, matConcrete],
  ];
  for (const [x, z, w, h, d, mat] of half) {
    addBox(x, z, w, h, d, mat);
    if (x !== 0 || z !== 0) addBox(-x, -z === 0 ? 0 : -z, w, h, d, mat);
    else addBox(-x, 0, w, h, d, mat);
  }

  // Center bunker
  addBox(0, 0, 8, 3.4, 1.2, matConcrete);
  addBox(0, 0, 1.2, 3.4, 8, matConcrete);

  // Stacked crates (climbable feel)
  addBox(-18, 8, 2.2, 4.4, 2.2, matCrate);
  addBox(18, -8, 2.2, 4.4, 2.2, matCrate);

  // Towers with roofs at corners of mid area
  for (const [tx, tz] of [[26, 8], [-26, -8]] as const) {
    addBox(tx, tz, 5, 8, 5, matMetal);
    addBox(tx, tz, 7, 0.4, 7, matDark, { y: 8, collide: false });
  }

  // Scattered barrels (visual only, small colliders)
  const barrelGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 12);
  const barrelMats = [0x8c2f2f, 0x2f5e8c, 0x6e6e2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.4 }));
  const barrelSpots: [number, number][] = [[5, 8], [-5, -8], [12, -30], [-12, 30], [36, 6], [-36, -6], [20, 34], [-20, -34], [44, -14], [-44, 14]];
  barrelSpots.forEach(([x, z], i) => {
    const b = new THREE.Mesh(barrelGeo, barrelMats[i % 3]);
    b.position.set(x, 0.75, z);
    b.castShadow = b.receiveShadow = true;
    group.add(b);
    colliders.push({ min: new THREE.Vector3(x - 0.55, 0, z - 0.55), max: new THREE.Vector3(x + 0.55, 1.5, z + 0.55), mesh: b });
  });

  // Rubble piles (visual)
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x5d5748, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5), rubbleMat);
    r.position.set((Math.random() - 0.5) * B * 1.8, 0.2, (Math.random() - 0.5) * B * 1.8);
    r.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    r.castShadow = true;
    group.add(r);
  }

  // Distant scenery hills (outside walls)
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x4c5340, roughness: 1 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const d = 110 + Math.random() * 60;
    const h = new THREE.Mesh(new THREE.ConeGeometry(30 + Math.random() * 30, 22 + Math.random() * 22, 7), hillMat);
    h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    group.add(h);
  }

  // Spawn points: alpha at -x side, bravo at +x side
  const alphaSpawns: [number, number][] = [[-42, 0], [-42, 10], [-42, -10], [-38, 20], [-38, -20], [-44, 28]];
  const bravoSpawns: [number, number][] = alphaSpawns.map(([x, z]) => [-x, -z] as [number, number]);
  for (const [x, z] of alphaSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'alpha' });
  for (const [x, z] of bravoSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'bravo' });

  return { group, colliders, spawns, bounds: B };
}

// Ray vs AABB (slab method). Returns t or null.
export function rayAABB(origin: THREE.Vector3, dir: THREE.Vector3, box: Collider, maxT: number): number | null {
  let tmin = 0;
  let tmax = maxT;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const mn = [box.min.x, box.min.y, box.min.z];
  const mx = [box.max.x, box.max.y, box.max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return null;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

export function raycastWorld(origin: THREE.Vector3, dir: THREE.Vector3, colliders: Collider[], maxDist: number): { t: number; point: THREE.Vector3 } | null {
  let best: number | null = null;
  for (const c of colliders) {
    const t = rayAABB(origin, dir, c, maxDist);
    if (t !== null && t > 0.001 && (best === null || t < best)) best = t;
  }
  if (best === null) return null;
  return { t: best, point: origin.clone().addScaledVector(dir, best) };
}

// Segment vs AABB for line of sight
export function lineOfSight(a: THREE.Vector3, b: THREE.Vector3, colliders: Collider[]): boolean {
  const dir = b.clone().sub(a);
  const dist = dir.length();
  if (dist < 0.001) return true;
  dir.divideScalar(dist);
  return raycastWorld(a, dir, colliders, dist - 0.1) === null;
}
