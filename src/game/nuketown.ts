import * as THREE from 'three';
import type { Collider, SpawnPoint, BuiltMap } from './types';

// ─── PALETTE (CS:Dust vibes) ───
export const PAL = {
  sand:       0xc4a86b,
  sandLight:  0xd4ba80,
  sandDark:   0x9e8550,
  wall:       0xc9b07a,
  wallDark:   0xa08a55,
  wallLight:  0xd8c998,
  concrete:   0x9a9080,
  concreteDk: 0x7a7060,
  roof:       0x8b6e4e,
  roofDark:   0x6b5030,
  wood:       0x8b6b3e,
  woodDark:   0x6b5030,
  metal:      0x6a6a6a,
  metalDark:  0x4a4a4a,
  road:       0x6e6555,
  roadLine:   0xbba860,
  sky:        0x87CEEB,
  sun:        0xfff4d6,
  rust:       0x8b5e3c,
  green:      0x5a7040,
  greenDark:  0x3e5028,
  glass:      0x88aacc,
  tarp:       0x7a8855,
  crate:      0x9a7a4a,
  barrel:     0x5a6a4a,
  tire:       0x2a2a2a,
  white:      0xe8dcc8,
  sign:       0xd4c090,
  fence:      0xb09a6a,
  trim:       0x6b5838,
};

// ─── TEXTURE GENERATOR ───
function makeTexture(w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function sandTexture(): THREE.CanvasTexture {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c4a86b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const b = 160 + Math.random() * 60;
      ctx.fillStyle = `rgba(${b},${b - 20},${b - 50},0.3)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
}

export function wallTexture(baseColor = '#c9b07a'): THREE.CanvasTexture {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);
    // brick lines
    const bh = 16;
    for (let row = 0; row < h / bh; row++) {
      const off = (row % 2) * 32;
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, row * bh);
      ctx.lineTo(w, row * bh);
      ctx.stroke();
      for (let x = off; x < w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, row * bh);
        ctx.lineTo(x, (row + 1) * bh);
        ctx.stroke();
      }
    }
    // noise
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

export function roadTexture(): THREE.CanvasTexture {
  return makeTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#6e6555';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const g = 80 + Math.random() * 40;
      ctx.fillStyle = `rgba(${g},${g - 5},${g - 10},0.2)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    // center dashes
    ctx.fillStyle = '#bba860';
    for (let y = 0; y < h; y += 40) {
      ctx.fillRect(w / 2 - 2, y, 4, 24);
    }
  });
}

export function roofTexture(): THREE.CanvasTexture {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8b6e4e';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      ctx.fillStyle = y % 16 < 8 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, y, w, 8);
    }
  });
}

export function concreteTexture(): THREE.CanvasTexture {
  return makeTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9a9080';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const g = 120 + Math.random() * 40;
      ctx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

export function woodTexture(): THREE.CanvasTexture {
  return makeTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8b6b3e';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.04})`;
      ctx.fillRect(0, y, w, 2);
    }
  });
}

// ─── BUILD NUKETOWN MAP (CS:Dust Edition) ───
export function buildNuketownMap(): BuiltMap {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const spawns: SpawnPoint[] = [];

  // Playable bounds: perimeter walls at X: +/-50, Z: +/-55
  const bounds = 50;

  // ─── TEXTURES ───
  const texSand = sandTexture();
  texSand.repeat.set(20, 20);
  const texWall = wallTexture();
  texWall.repeat.set(2, 2);
  const texWallDark = wallTexture('#a08a55');
  texWallDark.repeat.set(2, 2);
  const texRoad = roadTexture();
  texRoad.repeat.set(1, 4);
  const texRoof = roofTexture();
  texRoof.repeat.set(4, 4);
  const texConcrete = concreteTexture();
  texConcrete.repeat.set(2, 2);
  const texWood = woodTexture();
  texWood.repeat.set(2, 2);

  // ─── MATERIALS ───
  const matSand = new THREE.MeshStandardMaterial({ map: texSand, roughness: 0.95, metalness: 0 });
  const matWall = new THREE.MeshStandardMaterial({ map: texWall, roughness: 0.85, metalness: 0 });
  const matWallDark = new THREE.MeshStandardMaterial({ map: texWallDark, roughness: 0.85, metalness: 0 });
  const matRoad = new THREE.MeshStandardMaterial({ map: texRoad, roughness: 0.9, metalness: 0 });
  const matRoof = new THREE.MeshStandardMaterial({ map: texRoof, roughness: 0.8, metalness: 0.05 });
  const matConcrete = new THREE.MeshStandardMaterial({ map: texConcrete, roughness: 0.9, metalness: 0 });
  const matWood = new THREE.MeshStandardMaterial({ map: texWood, roughness: 0.9, metalness: 0 });
  const matMetal = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.6, metalness: 0.4 });
  const matMetalDark = new THREE.MeshStandardMaterial({ color: PAL.metalDark, roughness: 0.5, metalness: 0.5 });
  const matGlass = new THREE.MeshStandardMaterial({ color: PAL.glass, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4 });
  const matGreenDark = new THREE.MeshStandardMaterial({ color: PAL.greenDark, roughness: 0.9, metalness: 0 });
  const matTire = new THREE.MeshStandardMaterial({ color: PAL.tire, roughness: 0.9, metalness: 0 });
  const matWhite = new THREE.MeshStandardMaterial({ color: PAL.white, roughness: 0.7, metalness: 0 });
  const matCrate = new THREE.MeshStandardMaterial({ color: PAL.crate, roughness: 0.9, metalness: 0 });
  const matBarrel = new THREE.MeshStandardMaterial({ color: PAL.barrel, roughness: 0.8, metalness: 0.1 });
  const matRust = new THREE.MeshStandardMaterial({ color: PAL.rust, roughness: 0.9, metalness: 0.1 });
  const matSign = new THREE.MeshStandardMaterial({ color: PAL.sign, roughness: 0.7, metalness: 0 });
  const matFence = new THREE.MeshStandardMaterial({ color: PAL.fence, roughness: 0.85, metalness: 0 });
  const matTrim = new THREE.MeshStandardMaterial({ color: PAL.trim, roughness: 0.8, metalness: 0 });
  const matTarp = new THREE.MeshStandardMaterial({ color: PAL.tarp, roughness: 0.9, metalness: 0 });

  function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function cyl(rt: number, rb: number, h: number, seg: number, mat: THREE.Material): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }


  // ─── GROUND ───
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 160), matSand);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Ground collider
  colliders.push({
    min: new THREE.Vector3(-100, -2, -80),
    max: new THREE.Vector3(100, 0, 80),
  });

  // ─── ROAD (center street) ───
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 100), matRoad);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.05, 0);
  road.receiveShadow = true;
  group.add(road);

  // ─── SIDEWALKS ───
  function makeSidewalk(x: number, z: number, w: number, d: number) {
    const s = box(w, 0.3, d, matConcrete);
    s.position.set(x, 0.15, z);
    group.add(s);
  }
  makeSidewalk(-9, 0, 4, 100);
  makeSidewalk(9, 0, 4, 100);
  makeSidewalk(0, -52, 22, 4);
  makeSidewalk(0, 52, 22, 4);

  // ─── HOUSE BUILDER ───
  function createHouse(px: number, pz: number, rotY: number, wallMat: THREE.Material, accentMat: THREE.Material, _name: string) {
    const hGroup = new THREE.Group();
    hGroup.position.set(px, 0, pz);
    hGroup.rotation.y = rotY;

    // Foundation
    const foundation = box(18, 0.6, 14, matConcrete);
    foundation.position.set(0, 0.3, 0);
    hGroup.add(foundation);

    // === FIRST FLOOR WALLS ===
    const floorH = 3.5;
    const y1 = 0.6 + floorH / 2;

    // Front wall (with door gap and windows)
    const fw1 = box(5, floorH, 0.4, wallMat);
    fw1.position.set(-6.5, y1, -7);
    hGroup.add(fw1);

    const fw2 = box(5, floorH, 0.4, wallMat);
    fw2.position.set(6.5, y1, -7);
    hGroup.add(fw2);

    const fw3 = box(4, 1, 0.4, wallMat);
    fw3.position.set(0, y1 + 1.25, -7);
    hGroup.add(fw3);

    const fw4 = box(1.5, floorH, 0.4, wallMat);
    fw4.position.set(-2.75, y1, -7);
    hGroup.add(fw4);

    const fw5 = box(1.5, floorH, 0.4, wallMat);
    fw5.position.set(2.75, y1, -7);
    hGroup.add(fw5);

    // Front door
    const door = box(2.5, 2.8, 0.3, matWood);
    door.position.set(0, 0.6 + 1.4, -7);
    hGroup.add(door);

    const handle = cyl(0.08, 0.08, 0.3, 8, matMetal);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.8, 0.6 + 1.4, -7.2);
    hGroup.add(handle);

    // Front windows
    const fWin1 = box(2.5, 1.8, 0.1, matGlass);
    fWin1.position.set(-6.5, y1, -7.1);
    hGroup.add(fWin1);

    const fWinFrame1 = box(2.7, 0.15, 0.2, matTrim);
    fWinFrame1.position.set(-6.5, y1 + 0.9, -7.1);
    hGroup.add(fWinFrame1);
    const fWinFrame1b = box(2.7, 0.15, 0.2, matTrim);
    fWinFrame1b.position.set(-6.5, y1 - 0.9, -7.1);
    hGroup.add(fWinFrame1b);

    const fWin2 = box(2.5, 1.8, 0.1, matGlass);
    fWin2.position.set(6.5, y1, -7.1);
    hGroup.add(fWin2);

    // Back wall
    const bw = box(18, floorH, 0.4, wallMat);
    bw.position.set(0, y1, 7);
    hGroup.add(bw);

    const bWin = box(3, 1.8, 0.1, matGlass);
    bWin.position.set(0, y1 + 0.2, 7.1);
    hGroup.add(bWin);

    // Side walls
    const sw1 = box(0.4, floorH, 14, wallMat);
    sw1.position.set(-9, y1, 0);
    hGroup.add(sw1);
    const sw2 = box(0.4, floorH, 14, wallMat);
    sw2.position.set(9, y1, 0);
    hGroup.add(sw2);

    // Side windows
    for (const side of [-1, 1]) {
      for (const wz of [-3, 3]) {
        const sWin = box(0.1, 1.5, 2, matGlass);
        sWin.position.set(side * 9.1, y1 + 0.2, wz);
        hGroup.add(sWin);
      }
    }

    // First floor ceiling / second floor
    const ceil1 = box(18, 0.3, 14, matConcrete);
    ceil1.position.set(0, 0.6 + floorH, 0);
    hGroup.add(ceil1);

    // Interior wall (first floor)
    const iw1 = box(0.3, floorH, 7, wallMat);
    iw1.position.set(-3, y1, 3.5);
    hGroup.add(iw1);

    // === SECOND FLOOR ===
    const y2 = 0.6 + floorH + 0.3 + floorH / 2;

    const sf_front = box(18, floorH, 0.4, wallMat);
    sf_front.position.set(0, y2, -7);
    hGroup.add(sf_front);

    const sf_win1 = box(2.8, 1.6, 0.1, matGlass);
    sf_win1.position.set(-4, y2 + 0.2, -7.1);
    hGroup.add(sf_win1);
    const sf_win2 = box(2.8, 1.6, 0.1, matGlass);
    sf_win2.position.set(4, y2 + 0.2, -7.1);
    hGroup.add(sf_win2);

    const sf_back = box(18, floorH, 0.4, wallMat);
    sf_back.position.set(0, y2, 7);
    hGroup.add(sf_back);

    const sf_bwin = box(3, 1.4, 0.1, matGlass);
    sf_bwin.position.set(0, y2 + 0.3, 7.1);
    hGroup.add(sf_bwin);

    const sf_side1 = box(0.4, floorH, 14, wallMat);
    sf_side1.position.set(-9, y2, 0);
    hGroup.add(sf_side1);
    const sf_side2 = box(0.4, floorH, 14, wallMat);
    sf_side2.position.set(9, y2, 0);
    hGroup.add(sf_side2);

    for (const side of [-1, 1]) {
      const sWin = box(0.1, 1.5, 2.5, matGlass);
      sWin.position.set(side * 9.1, y2 + 0.2, 0);
      hGroup.add(sWin);
    }

    // Second floor ceiling
    const ceil2 = box(18, 0.3, 14, matConcrete);
    ceil2.position.set(0, 0.6 + floorH * 2 + 0.3, 0);
    hGroup.add(ceil2);

    // === ROOF ===
    const roofBase = 0.6 + floorH * 2 + 0.6;
    const roofGeo = new THREE.BufferGeometry();
    const rw = 9.5, rh = 3.5, rd = 7.5;
    const vertices = new Float32Array([
      -rw, 0, -rd,  rw, 0, -rd,  0, rh, -rd,
      -rw, 0, rd,   0, rh, rd,   rw, 0, rd,
      -rw, 0, -rd,  0, rh, -rd,  -rw, 0, rd,
      0, rh, -rd,   0, rh, rd,   -rw, 0, rd,
      rw, 0, -rd,   rw, 0, rd,   0, rh, -rd,
      0, rh, -rd,   rw, 0, rd,   0, rh, rd,
      -rw, 0, -rd,  -rw, 0, rd,  rw, 0, -rd,
      rw, 0, -rd,   -rw, 0, rd,  rw, 0, rd,
    ]);
    roofGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    roofGeo.computeVertexNormals();
    const roofMesh = new THREE.Mesh(roofGeo, matRoof);
    roofMesh.position.set(0, roofBase, 0);
    roofMesh.castShadow = true;
    hGroup.add(roofMesh);

    // Overhang trims
    const roofTrimF = box(20, 0.3, 0.5, matTrim);
    roofTrimF.position.set(0, roofBase, -7.3);
    hGroup.add(roofTrimF);
    const roofTrimB = box(20, 0.3, 0.5, matTrim);
    roofTrimB.position.set(0, roofBase, 7.3);
    hGroup.add(roofTrimB);

    // === FRONT PORCH ===
    const porch = box(10, 0.2, 4, matConcrete);
    porch.position.set(0, 0.5, -9);
    hGroup.add(porch);

    for (let s = 0; s < 3; s++) {
      const step = box(4, 0.18, 0.6, matConcrete);
      step.position.set(0, 0.1 + s * 0.15, -11 - s * 0.5 + 1.5);
      hGroup.add(step);
    }

    for (const px2 of [-4, 4]) {
      const pillar = box(0.4, 4.5, 0.4, accentMat);
      pillar.position.set(px2, 2.85, -9.5);
      hGroup.add(pillar);
    }

    const porchRoof = box(11, 0.2, 4.5, matRoof);
    porchRoof.position.set(0, 5, -9.2);
    hGroup.add(porchRoof);

    // === BACK PATIO ===
    const patio = box(12, 0.15, 5, matConcrete);
    patio.position.set(0, 0.4, 9.5);
    hGroup.add(patio);

    // === ACCENT TRIM ===
    for (const cx of [-9.1, 9.1]) {
      const cornerTrim = box(0.5, floorH * 2 + 2, 0.5, matTrim);
      cornerTrim.position.set(cx, (floorH * 2 + 2) / 2 + 0.6, -7);
      hGroup.add(cornerTrim);
      const cornerTrim2 = box(0.5, floorH * 2 + 2, 0.5, matTrim);
      cornerTrim2.position.set(cx, (floorH * 2 + 2) / 2 + 0.6, 7);
      hGroup.add(cornerTrim2);
    }

    // === CHIMNEY ===
    const chimney = box(1.5, 4, 1.5, accentMat);
    chimney.position.set(6, roofBase + 3, 3);
    hGroup.add(chimney);

    group.add(hGroup);

    // House Solid Collider
    colliders.push({
      min: new THREE.Vector3(px - 9.5, 0, pz - 7.5),
      max: new THREE.Vector3(px + 9.5, 8.5, pz + 7.5),
      mesh: hGroup,
    });

    return hGroup;
  }

  // ─── BUILD THE 4 HOUSES ───
  createHouse(-28, -18, 0, matWall, matWallDark, 'Yellow House');
  createHouse(-28, 18, Math.PI, matWallDark, matWall, 'Green House');
  createHouse(28, -18, 0, matWall, matWallDark, 'Yellow House 2');
  createHouse(28, 18, Math.PI, matWallDark, matWall, 'Green House 2');

  // ─── CENTER BUSES ───
  function createBus(px: number, pz: number, rotY: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;

    // Bus body
    const body = box(3.5, 3, 10, matRust);
    body.position.set(0, 2.2, 0);
    g.add(body);

    // Bus roof
    const busRoof = box(3.8, 0.15, 10.5, matMetalDark);
    busRoof.position.set(0, 3.75, 0);
    g.add(busRoof);

    // Windows
    for (const side of [-1, 1]) {
      for (let wz = -3.5; wz <= 3.5; wz += 1.8) {
        const win = box(0.05, 1.2, 1.2, matGlass);
        win.position.set(side * 1.78, 2.8, wz);
        g.add(win);
      }
    }

    // Front windshield
    const windshield = box(2.8, 1.8, 0.05, matGlass);
    windshield.position.set(0, 2.5, -5.05);
    g.add(windshield);

    // Back
    const busBack = box(3.5, 3, 0.15, matMetalDark);
    busBack.position.set(0, 2.2, 5.05);
    g.add(busBack);

    // Wheels
    for (const wz of [-3, 3]) {
      for (const side of [-1, 1]) {
        const wheel = cyl(0.6, 0.6, 0.4, 12, matTire);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.9, 0.6, wz);
        g.add(wheel);
        const hub = cyl(0.25, 0.25, 0.45, 8, matMetal);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(side * 1.9, 0.6, wz);
        g.add(hub);
      }
    }

    // Front bumper
    const bumper = box(3.8, 0.5, 0.3, matMetal);
    bumper.position.set(0, 0.9, -5.2);
    g.add(bumper);

    group.add(g);

    // Collider
    if (Math.abs(rotY - Math.PI / 2) < 0.1) {
      colliders.push({
        min: new THREE.Vector3(px - 5.5, 0, pz - 2.0),
        max: new THREE.Vector3(px + 5.5, 4.0, pz + 2.0),
        mesh: g,
      });
    } else {
      colliders.push({
        min: new THREE.Vector3(px - 2.5, 0, pz - 5.5),
        max: new THREE.Vector3(px + 2.5, 4.0, pz + 5.5),
        mesh: g,
      });
    }

    return g;
  }

  createBus(0, 0, Math.PI / 2);
  createBus(4, 8, 0.3);

  // ─── CARS ───
  function createCar(px: number, pz: number, rotY: number, color: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    const carMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });

    const carBody = box(2.2, 1, 4.5, carMat);
    carBody.position.set(0, 0.9, 0);
    g.add(carBody);

    const cabin = box(2, 1, 2.2, carMat);
    cabin.position.set(0, 1.9, -0.3);
    g.add(cabin);

    const ws = box(1.8, 0.8, 0.05, matGlass);
    ws.position.set(0, 1.8, -1.45);
    ws.rotation.x = 0.2;
    g.add(ws);

    const rw2 = box(1.8, 0.7, 0.05, matGlass);
    rw2.position.set(0, 1.8, 0.8);
    rw2.rotation.x = -0.2;
    g.add(rw2);

    for (const side of [-1, 1]) {
      const sw = box(0.05, 0.65, 1.6, matGlass);
      sw.position.set(side * 1.02, 1.85, -0.3);
      g.add(sw);
    }

    for (const wz of [-1.3, 1.3]) {
      for (const side of [-1, 1]) {
        const wheel = cyl(0.38, 0.38, 0.25, 10, matTire);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.2, 0.38, wz);
        g.add(wheel);
      }
    }

    for (const hx of [-0.7, 0.7]) {
      const hl = box(0.4, 0.25, 0.1, matWhite);
      hl.position.set(hx, 0.9, -2.3);
      g.add(hl);
    }

    const fb = box(2.3, 0.3, 0.2, matMetal);
    fb.position.set(0, 0.55, -2.35);
    g.add(fb);
    const rb = box(2.3, 0.3, 0.2, matMetal);
    rb.position.set(0, 0.55, 2.35);
    g.add(rb);

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(px - 1.3, 0, pz - 2.5),
      max: new THREE.Vector3(px + 1.3, 2.2, pz + 2.5),
      mesh: g,
    });
  }

  createCar(-28, -30, 0, 0x8a7050);
  createCar(-28, 30, Math.PI, 0x6a8a6a);
  createCar(28, -30, 0.1, 0x7a6050);
  createCar(28, 30, Math.PI + 0.15, 0x5a6a7a);
  createCar(-5, -20, 0.4, 0x9a7a4a);

  // ─── FENCES ───
  function createFence(x1: number, z1: number, x2: number, z2: number, height = 1.8) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = angle;

    for (const ry of [0.3, height - 0.2]) {
      const rail = box(0.08, 0.08, len, matFence);
      rail.position.set(0, ry, 0);
      g.add(rail);
    }

    const spacing = 0.25;
    const count = Math.floor(len / spacing);
    for (let i = 0; i <= count; i++) {
      const picket = box(0.06, height, 0.06, matFence);
      picket.position.set(0, height / 2, -len / 2 + i * spacing);
      g.add(picket);
    }

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(Math.min(x1, x2) - 0.2, 0, Math.min(z1, z2) - 0.2),
      max: new THREE.Vector3(Math.max(x1, x2) + 0.2, height, Math.max(z1, z2) + 0.2),
      mesh: g,
    });
  }

  // Fences around yards — Yellow house (south) left
  createFence(-37, -11, -37, -25);
  createFence(-19, -11, -19, -25);
  createFence(-37, -25, -19, -25);
  createFence(-37, -11, -23, -11);
  createFence(-19, -11, -23, -11);

  // Green house (south) left
  createFence(-37, 11, -37, 25);
  createFence(-19, 11, -19, 25);
  createFence(-37, 25, -19, 25);

  // Right side fences
  createFence(19, -11, 19, -25);
  createFence(37, -11, 37, -25);
  createFence(19, -25, 37, -25);
  createFence(19, 11, 19, 25);
  createFence(37, 11, 37, 25);
  createFence(19, 25, 37, 25);

  // ─── HEDGES ───
  function createHedge(px: number, pz: number, w: number, d: number, h = 1.5) {
    const hedge = box(w, h, d, matGreenDark);
    hedge.position.set(px, h / 2, pz);
    group.add(hedge);
    colliders.push({
      min: new THREE.Vector3(px - w / 2, 0, pz - d / 2),
      max: new THREE.Vector3(px + w / 2, h, pz + d / 2),
      mesh: hedge,
    });
  }

  createHedge(-14, -15, 1.5, 8);
  createHedge(-14, 15, 1.5, 8);
  createHedge(14, -15, 1.5, 8);
  createHedge(14, 15, 1.5, 8);

  createHedge(-28, -11.5, 8, 1, 1.2);
  createHedge(-28, 11.5, 8, 1, 1.2);
  createHedge(28, -11.5, 8, 1, 1.2);
  createHedge(28, 11.5, 8, 1, 1.2);

  // ─── NUKETOWN SIGNS ───
  function createNuketownSign(pz: number, rotY = 0) {
    const g = new THREE.Group();

    const post = cyl(0.15, 0.15, 5, 8, matMetal);
    post.position.set(0, 2.5, 0);
    g.add(post);

    const signBoard = box(4, 2.5, 0.2, matSign);
    signBoard.position.set(0, 5.5, 0);
    g.add(signBoard);

    const border = box(4.3, 2.8, 0.15, matTrim);
    border.position.set(0, 5.5, 0.05);
    g.add(border);

    const signTex = makeTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#d4c090';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6b5838';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#3a2810';
      ctx.font = 'bold 60px serif';
      ctx.textAlign = 'center';
      ctx.fillText('NUKETOWN', w / 2, 90);
      ctx.font = '28px serif';
      ctx.fillText('Population', w / 2, 140);
      ctx.font = 'bold 72px serif';
      ctx.fillStyle = '#8b2010';
      ctx.fillText('☢', w / 2 - 40, 220);
      ctx.fillStyle = '#3a2810';
      ctx.font = 'bold 48px serif';
      ctx.fillText('0', w / 2 + 20, 215);
    });

    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.3),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 })
    );
    signFace.position.set(0, 5.5, 0.12);
    g.add(signFace);

    const backFace = box(3.6, 2.1, 0.05, matRust);
    backFace.position.set(0, 5.5, -0.12);
    g.add(backFace);

    g.position.set(0, 0, pz);
    g.rotation.y = rotY;
    group.add(g);

    colliders.push({
      min: new THREE.Vector3(-2.2, 0, pz - 0.3),
      max: new THREE.Vector3(2.2, 7.0, pz + 0.3),
      mesh: g,
    });
  }

  createNuketownSign(-48, 0);
  createNuketownSign(48, Math.PI);

  // ─── SHIPPING CONTAINERS ───
  function createContainer(px: number, pz: number, rotY: number, color: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    const cMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });

    const body2 = box(2.5, 2.8, 6, cMat);
    body2.position.set(0, 1.4, 0);
    g.add(body2);

    for (let ry = 0.4; ry < 2.6; ry += 0.4) {
      for (const side of [-1, 1]) {
        const ridge = box(0.05, 0.08, 6, matMetalDark);
        ridge.position.set(side * 1.28, ry, 0);
        g.add(ridge);
      }
    }

    const doorLine = box(0.02, 2.5, 0.02, matMetalDark);
    doorLine.position.set(0, 1.4, -3.02);
    g.add(doorLine);

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(px - 1.8, 0, pz - 3.2),
      max: new THREE.Vector3(px + 1.8, 2.9, pz + 3.2),
      mesh: g,
    });
  }

  createContainer(-8, -35, 0.2, 0x6a7a5a);
  createContainer(10, 30, -0.3, 0x8a6a4a);
  createContainer(8, -38, 0.5, 0x5a5a6a);

  // ─── CRATES & BARRELS ───
  function createCrate(px: number, pz: number, size = 1) {
    const c = box(size, size, size, matCrate);
    c.position.set(px, size / 2, pz);
    group.add(c);
    colliders.push({
      min: new THREE.Vector3(px - size / 2, 0, pz - size / 2),
      max: new THREE.Vector3(px + size / 2, size, pz + size / 2),
      mesh: c,
    });
  }

  function createBarrel(px: number, pz: number) {
    const b = cyl(0.4, 0.4, 1.1, 10, matBarrel);
    b.position.set(px, 0.55, pz);
    group.add(b);

    const rim = cyl(0.42, 0.42, 0.08, 10, matMetal);
    rim.position.set(px, 1.1, pz);
    group.add(rim);

    colliders.push({
      min: new THREE.Vector3(px - 0.45, 0, pz - 0.45),
      max: new THREE.Vector3(px + 0.45, 1.2, pz + 0.45),
      mesh: b,
    });
  }

  createCrate(-15, -20, 1.2);
  createCrate(-15, -18.8, 1);
  createCrate(-13.8, -20, 0.8);
  createCrate(15, 20, 1.2);
  createCrate(15, 18.8, 1);

  createBarrel(-16, -22);
  createBarrel(-16.8, -22);
  createBarrel(16, 22);
  createBarrel(5, -12);
  createBarrel(-5, 12);

  createCrate(-3, -15, 1.1);
  createCrate(4, 15, 0.9);
  createCrate(4, 13.8, 1.2);

  // ─── SANDBAG WALLS ───
  function createSandbags(px: number, pz: number, rotY: number, count = 4, layers = 2) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;

    const sbMat = new THREE.MeshStandardMaterial({ color: 0xb0a070, roughness: 0.95, metalness: 0 });
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < count; i++) {
        const offset = (layer % 2) * 0.25;
        const sb = box(0.5, 0.25, 0.7, sbMat);
        sb.position.set(offset + i * 0.55 - (count * 0.55) / 2, 0.125 + layer * 0.25, 0);
        g.add(sb);
      }
    }

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(px - 1.5, 0, pz - 0.5),
      max: new THREE.Vector3(px + 1.5, layers * 0.25, pz + 0.5),
      mesh: g,
    });
  }

  createSandbags(-12, 0, 0, 5, 3);
  createSandbags(12, 0, 0, 5, 3);
  createSandbags(0, -25, Math.PI / 2, 4, 2);
  createSandbags(0, 25, Math.PI / 2, 4, 2);
  createSandbags(-6, -10, 0.3, 6, 3);
  createSandbags(6, 10, -0.3, 6, 3);

  // ─── UTILITY POLES ───
  function createPole(px: number, pz: number) {
    const pole = cyl(0.12, 0.15, 10, 8, matWood);
    pole.position.set(px, 5, pz);
    group.add(pole);

    const crossarm = box(4, 0.15, 0.15, matWood);
    crossarm.position.set(px, 9.5, pz);
    group.add(crossarm);

    for (const ix of [-1.5, 0, 1.5]) {
      const ins = cyl(0.06, 0.06, 0.4, 6, matWhite);
      ins.position.set(px + ix, 9.7, pz);
      group.add(ins);
    }

    colliders.push({
      min: new THREE.Vector3(px - 0.25, 0, pz - 0.25),
      max: new THREE.Vector3(px + 0.25, 10, pz + 0.25),
      mesh: pole,
    });
  }

  createPole(-11, -35);
  createPole(-11, 0);
  createPole(-11, 35);
  createPole(11, -35);
  createPole(11, 35);

  // Wires between poles
  function createWire(p1: [number, number], p2: [number, number]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(p1[0], 9.7, p1[1]),
      new THREE.Vector3((p1[0] + p2[0]) / 2, 8.5, (p1[1] + p2[1]) / 2),
      new THREE.Vector3(p2[0], 9.7, p2[1]),
    ]);
    const wireGeo = new THREE.TubeGeometry(curve, 20, 0.02, 4, false);
    const wire = new THREE.Mesh(wireGeo, matMetalDark);
    group.add(wire);
  }

  createWire([-11, -35], [-11, 0]);
  createWire([-11, 0], [-11, 35]);
  createWire([11, -35], [11, 35]);

  // ─── PERIMETER WALLS (map boundaries) ───
  function createPerimeterWall(x: number, z: number, w: number, d: number, h = 3) {
    const wall = box(w, h, d, matWallDark);
    wall.position.set(x, h / 2, z);
    group.add(wall);
    colliders.push({
      min: new THREE.Vector3(x - w / 2, 0, z - d / 2),
      max: new THREE.Vector3(x + w / 2, h, z + d / 2),
      mesh: wall,
    });
  }

  // North & South walls
  createPerimeterWall(0, -55, 100, 1, 4);
  createPerimeterWall(0, 55, 100, 1, 4);
  // East & West walls
  createPerimeterWall(-50, 0, 1, 110, 4);
  createPerimeterWall(50, 0, 1, 110, 4);

  // ─── TARP / AWNING STRUCTURES ───
  function createTarp(px: number, pz: number, rotY: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;

    for (const tx of [-2, 2]) {
      for (const tz of [-1.5, 1.5]) {
        const tPost = cyl(0.08, 0.08, 3.5, 6, matMetal);
        tPost.position.set(tx, 1.75, tz);
        g.add(tPost);
      }
    }

    const cloth = box(4.5, 0.05, 3.5, matTarp);
    cloth.position.set(0, 3.5, 0);
    cloth.rotation.z = 0.05;
    g.add(cloth);

    group.add(g);
  }

  createTarp(-14, 0, 0);
  createTarp(14, 0, 0);

  // ─── MOVING TRUCKS ───
  function createTruck(px: number, pz: number, rotY: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;

    const cab = box(2.5, 2.2, 2.5, matRust);
    cab.position.set(0, 1.5, -4.5);
    g.add(cab);

    const cabWS = box(2.2, 1.2, 0.05, matGlass);
    cabWS.position.set(0, 2, -5.78);
    g.add(cabWS);

    const cargo = box(2.8, 3, 6, matWhite);
    cargo.position.set(0, 2, 0);
    g.add(cargo);

    const backFlap = box(2.5, 0.1, 2.5, matMetal);
    backFlap.position.set(0, 0.5, 4);
    backFlap.rotation.x = -0.6;
    g.add(backFlap);

    for (const wz of [-4, -1, 1.5]) {
      for (const side of [-1, 1]) {
        const wheel = cyl(0.5, 0.5, 0.35, 10, matTire);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.5, 0.5, wz);
        g.add(wheel);
      }
    }

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(px - 3.5, 0, pz - 2.0),
      max: new THREE.Vector3(px + 3.5, 3.5, pz + 2.0),
      mesh: g,
    });
  }

  createTruck(35, -18, Math.PI / 2);
  createTruck(-35, 18, -Math.PI / 2);

  // ─── AC UNITS on houses ───
  function createACUnit(px: number, py: number, pz: number) {
    const ac = box(1, 0.8, 0.6, matMetal);
    ac.position.set(px, py, pz);
    group.add(ac);

    const grille = box(0.8, 0.6, 0.02, matMetalDark);
    grille.position.set(px, py, pz - 0.32);
    group.add(grille);
  }

  createACUnit(-28, 4.5, -10.5);
  createACUnit(28, 4.5, -10.5);
  createACUnit(-28, 4.5, 10.5);
  createACUnit(28, 4.5, 10.5);

  // ─── DUMPSTERS ───
  function createDumpster(px: number, pz: number, rotY: number) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    const dMat = new THREE.MeshStandardMaterial({ color: 0x4a6a4a, roughness: 0.8, metalness: 0.3 });
    const body3 = box(2, 1.5, 1.2, dMat);
    body3.position.set(0, 0.75, 0);
    g.add(body3);

    const lid = box(2.1, 0.1, 1.3, matMetalDark);
    lid.position.set(0, 1.55, 0);
    g.add(lid);

    group.add(g);

    colliders.push({
      min: new THREE.Vector3(px - 1.2, 0, pz - 0.8),
      max: new THREE.Vector3(px + 1.2, 1.7, pz + 0.8),
      mesh: g,
    });
  }

  createDumpster(-38, -5, 0.2);
  createDumpster(38, 5, -0.3);

  // ─── HALF-WALLS FOR COVER ───
  function createHalfWall(px: number, pz: number, w: number, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = rotY;
    const hw = box(w, 1.2, 0.4, matConcrete);
    hw.position.set(0, 0.6, 0);
    g.add(hw);
    group.add(g);

    const hwColW = rotY !== 0 ? 0.6 : w;
    const hwColD = rotY !== 0 ? w : 0.6;
    colliders.push({
      min: new THREE.Vector3(px - hwColW / 2, 0, pz - hwColD / 2),
      max: new THREE.Vector3(px + hwColW / 2, 1.2, pz + hwColD / 2),
      mesh: g,
    });
  }

  createHalfWall(-20, 0, 5);
  createHalfWall(20, 0, 5);
  createHalfWall(0, -15, 3, Math.PI / 2);
  createHalfWall(0, 15, 3, Math.PI / 2);

  // ─── DRIVEWAYS ───
  function createDriveway(px: number, pz: number, w: number, d: number) {
    const dw = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matConcrete);
    dw.rotation.x = -Math.PI / 2;
    dw.position.set(px, 0.06, pz);
    dw.receiveShadow = true;
    group.add(dw);
  }
  createDriveway(-28, -28, 5, 8);
  createDriveway(-28, 28, 5, 8);
  createDriveway(28, -28, 5, 8);
  createDriveway(28, 28, 5, 8);

  // ─── LAMP POSTS ───
  function createLampPost(px: number, pz: number) {
    const pole2 = cyl(0.08, 0.1, 5, 6, matMetalDark);
    pole2.position.set(px, 2.5, pz);
    group.add(pole2);

    const arm = box(1.5, 0.08, 0.08, matMetalDark);
    arm.position.set(px + 0.75, 5, pz);
    group.add(arm);

    const lamp = box(0.4, 0.2, 0.4, matWhite);
    lamp.position.set(px + 1.5, 4.9, pz);
    group.add(lamp);

    colliders.push({
      min: new THREE.Vector3(px - 0.2, 0, pz - 0.2),
      max: new THREE.Vector3(px + 0.2, 5.2, pz + 0.2),
      mesh: pole2,
    });
  }

  createLampPost(8, -18);
  createLampPost(-8, 18);
  createLampPost(8, 18);
  createLampPost(-8, -18);

  // ─── MAILBOXES ───
  function createMailbox(px: number, pz: number) {
    const post3 = box(0.1, 1.2, 0.1, matWood);
    post3.position.set(px, 0.6, pz);
    group.add(post3);
    const mbx = box(0.5, 0.35, 0.25, matMetal);
    mbx.position.set(px, 1.3, pz);
    group.add(mbx);
  }

  createMailbox(-21, -12);
  createMailbox(-21, 12);
  createMailbox(21, -12);
  createMailbox(21, 12);

  // ─── DUST PARTICLES ───
  const particleCount = 2000;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 120;
    particlePositions[i * 3 + 1] = Math.random() * 15;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xd4c8a0,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // ─── SKY DOME ───
  const skyGeo = new THREE.SphereGeometry(200, 32, 32);
  const skyTex = makeTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5599cc');
    grad.addColorStop(0.3, '#88bbdd');
    grad.addColorStop(0.6, '#c8d8e8');
    grad.addColorStop(1, '#d8c8a8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Sun glow
    const sunGrad = ctx.createRadialGradient(w * 0.7, h * 0.15, 0, w * 0.7, h * 0.15, 100);
    sunGrad.addColorStop(0, 'rgba(255,250,220,0.8)');
    sunGrad.addColorStop(0.3, 'rgba(255,240,200,0.3)');
    sunGrad.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);
  });
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  group.add(sky);

  // ─── SPAWN POINTS (Alpha at North Z: -42, Bravo at South Z: +42) ───
  const alphaSpawns: [number, number][] = [
    [0, -42],
    [-14, -40],
    [14, -40],
    [-28, -42],
    [28, -42],
    [0, -36],
  ];

  const bravoSpawns: [number, number][] = [
    [0, 42],
    [-14, 40],
    [14, 40],
    [-28, 42],
    [28, 42],
    [0, 36],
  ];

  for (const [x, z] of alphaSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'alpha' });
  for (const [x, z] of bravoSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'bravo' });

  return {
    group,
    colliders,
    spawns,
    bounds, // 50
  };
}
