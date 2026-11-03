import * as THREE from 'three';
import type { Collider, SpawnPoint, BuiltMap } from './types';

export function buildDustYardMap(): BuiltMap {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const spawns: SpawnPoint[] = [];
  const bounds = 40; // 80m x 80m map

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- textures & materials ---------- */
  function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rep?: number) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (rep) t.repeat.set(rep, rep);
    return t;
  }

  function speck(g: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[], s: number) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length];
      g.globalAlpha = 0.05 + rnd() * 0.2;
      const r = rnd() * s + 0.5;
      g.fillRect(rnd() * w, rnd() * h, r, r);
    }
    g.globalAlpha = 1;
  }

  const mat = (map: THREE.Texture | null, r = 0.95, c: THREE.ColorRepresentation = 0xffffff) =>
    new THREE.MeshStandardMaterial({ map: map ?? undefined, roughness: r, color: c });

  const sandT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#d7bd87';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = i % 2 ? '#c9a96c' : '#e4cf9d';
      g.globalAlpha = 0.12;
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, 10 + rnd() * 50, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    speck(g, w, h, 9000, ['#b8985a', '#efdcae', '#a98a50'], 2.5);
  }, 34);

  const plastT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#d2b27a';
    g.fillRect(0, 0, w, h);
    speck(g, w, h, 7000, ['#b9965c', '#e6cd9a', '#a8854f'], 3);
    for (let i = 0; i < 40; i++) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(90,60,25,0)');
      gr.addColorStop(1, 'rgba(90,60,25,.22)');
      g.fillStyle = gr;
      g.fillRect(rnd() * w, 0, 4 + rnd() * 14, h);
    }
    const b = g.createLinearGradient(0, h * 0.7, 0, h);
    b.addColorStop(0, 'rgba(80,55,25,0)');
    b.addColorStop(1, 'rgba(80,55,25,.35)');
    g.fillStyle = b;
    g.fillRect(0, h * 0.7, w, h * 0.3);
  });

  const stoneT = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#a58a62';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(60,42,22,.55)';
    g.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      g.strokeRect(-2, r * 64, w + 4, 64);
      for (let c = 0; c < 4; c++) {
        const x = c * 64 + (r % 2) * 32;
        g.beginPath();
        g.moveTo(x, r * 64);
        g.lineTo(x, r * 64 + 64);
        g.stroke();
      }
    }
    speck(g, w, h, 2500, ['#7b6444', '#c4a97c'], 3);
  });

  const woodDraw = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = '#8c6537';
    g.fillRect(0, 0, w, h);
    for (let r = 0; r < 6; r++) {
      g.fillStyle = `hsl(30,45%,${30 + rnd() * 10}%)`;
      g.fillRect(0, r * 43 + 2, w, 40);
      for (let k = 0; k < 30; k++) {
        g.fillStyle = 'rgba(40,22,8,.25)';
        g.fillRect(rnd() * w, r * 43 + 4 + rnd() * 36, 20 + rnd() * 60, 1);
      }
    }
  };
  const woodT = tex(256, 256, woodDraw);

  const crateT = tex(256, 256, (g, w, h) => {
    woodDraw(g, w, h);
    g.strokeStyle = '#4a2f14';
    g.lineWidth = 22;
    g.strokeRect(11, 11, w - 22, h - 22);
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(14, 14);
    g.lineTo(w - 14, h - 14);
    g.stroke();
  });

  const awnT = tex(128, 64, (g, _w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#efe3c4' : '#b5452b';
      g.fillRect(i * 16, 0, 16, h);
    }
  });

  const dtex = tex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(110,80,40,.38)');
    r.addColorStop(1, 'rgba(110,80,40,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  });

  const ctnM = (c: string) =>
    mat(
      tex(256, 256, (g, w, h) => {
        g.fillStyle = c;
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 16) {
          g.fillStyle = 'rgba(0,0,0,.22)';
          g.fillRect(x, 0, 5, h);
        }
        speck(g, w, h, 1800, ['#5a3a1e', '#000', '#d9d9d9'], 3);
      }),
      0.55
    );

  const padT = (col: string, txt: string) =>
    tex(512, 256, (g, w, h) => {
      g.globalAlpha = 0.28;
      g.fillStyle = col;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
      g.strokeStyle = col;
      g.lineWidth = 10;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.setLineDash([24, 16]);
      g.strokeRect(30, 30, w - 60, h - 60);
      g.setLineDash([]);
      g.fillStyle = col;
      g.font = 'bold 74px system-ui,sans-serif';
      g.textAlign = 'center';
      g.fillText(txt, w / 2, h / 2 + 26);
    });

  const plast = mat(plastT);
  const stone = mat(stoneT);
  const woodM = mat(woodT);
  const crateM = mat(crateT);
  const awnM = mat(awnT);
  const roofM = mat(stoneT, 0.9, 0xe0b9a0);
  const dk = mat(null, 0.8, 0x3a2f24);
  const sandM = mat(null, 1, 0xb89d66);
  const rockM = mat(null, 1, 0x9d8660);
  const barR = mat(null, 0.55, 0x9a3b27);
  const barG = mat(null, 0.55, 0x55603a);
  const rustM = mat(null, 0.6, 0x8a5a3a);
  const barkM = mat(null, 1, 0x7a6240);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x6f8a3c, side: THREE.DoubleSide, roughness: 0.9 });
  const ctnG = ctnM('#4f6b46');
  const ctnB = ctnM('#3d5f8a');
  const water = mat(null, 0.2, 0x4b8ea0);
  const decM = new THREE.MeshBasicMaterial({
    map: dtex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });

  /* ---------- builders (180° mirrored => symmetric) ---------- */
  const R: [number, number, number, number, number, number][] = [];

  function bgeo(w: number, h: number, d: number, s: number) {
    const g = new THREE.BoxGeometry(w, h, d);
    const u = g.attributes.uv;
    const dm = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 4; i++) {
        const k = f * 4 + i;
        u.setXY(k, (u.getX(k) * dm[f][0]) / s, (u.getY(k) * dm[f][1]) / s);
      }
    }
    return g;
  }

  const add = (o: THREE.Object3D, both = true) => {
    o.rotation.order = 'YXZ';
    o.traverse((k: any) => {
      if (k.isMesh) {
        k.castShadow = !o.userData.ns;
        k.receiveShadow = true;
      }
    });
    group.add(o);
    if (both) {
      const c = o.clone(true);
      c.position.x *= -1;
      c.position.z *= -1;
      c.rotation.y += Math.PI;
      group.add(c);
    }
    return o;
  };

  const reg = (x: number, z: number, w: number, d: number, top: number, st: boolean, both: boolean) => {
    R.push([x, z, w, d, top, st ? 1 : 0]);
    if (both) R.push([-x, -z, w, d, top, st ? 1 : 0]);
  };

  const regCollider = (x: number, y: number, z: number, w: number, h: number, d: number, both: boolean) => {
    colliders.push({
      min: new THREE.Vector3(x - w / 2, y, z - d / 2),
      max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
    });
    if (both) {
      colliders.push({
        min: new THREE.Vector3(-x - w / 2, y, -z - d / 2),
        max: new THREE.Vector3(-x + w / 2, y + h, -z + d / 2),
      });
    }
  };

  const B = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    m: THREE.Material,
    { y = 0, nc = false, t = 4, ry = 0, step = false, both = true }: { y?: number; nc?: boolean | number; t?: number; ry?: number; step?: boolean | number; both?: boolean } = {}
  ) => {
    const o = new THREE.Mesh(bgeo(w, h, d, t), m);
    o.position.set(x, y + h / 2, z);
    o.rotation.y = ry;
    add(o, both);
    if (!nc && y < 1.5) {
      reg(x, z, w, d, y + h, !!step, both);
      regCollider(x, y, z, w, h, d, both);
    }
    return o;
  };

  const C = (
    x: number,
    z: number,
    r: number,
    h: number,
    m: THREE.Material,
    { y = 0, nc = false, seg = 20, step = false, both = true, rt = r }: { y?: number; nc?: boolean | number; seg?: number; step?: boolean | number; both?: boolean; rt?: number } = {}
  ) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, seg), m);
    o.position.set(x, y + h / 2, z);
    add(o, both);
    if (!nc && y < 1.5) {
      reg(x, z, r * 2, r * 2, y + h, !!step, both);
      regCollider(x, y, z, r * 2, h, r * 2, both);
    }
    return o;
  };

  const wall = (x: number, z: number, w: number, d: number, h: number, m = plast) => {
    B(x, z, w, d, h, m);
    if (h >= 3.5) {
      B(x, z, w + 0.3, d + 0.3, 0.35, stone, { y: h, nc: 1, t: 2 });
      B(x, z, w + 0.14, d + 0.14, 0.7, stone, { nc: 1, t: 2 });
    }
  };

  const low = (x: number, z: number, w: number, d: number, h = 2.3) => {
    B(x, z, w, d, h, plast);
    B(x, z, w + 0.25, d + 0.25, 0.25, stone, { y: h, nc: 1, t: 2 });
  };

  const crate = (x: number, z: number, s: number, y = 0, ry = 0) => B(x, z, s, s, s, crateM, { y, t: s, ry });

  const barrel = (x: number, z: number, m = barR) => {
    C(x, z, 0.45, 1.1, m, { seg: 14 });
    C(x, z, 0.47, 0.08, dk, { y: 0.25, seg: 14, nc: 1 });
    C(x, z, 0.47, 0.08, dk, { y: 0.8, seg: 14, nc: 1 });
  };

  const bags = (x: number, z: number, n: number) => {
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < n - r; i++) {
        B(x + i * 0.95 + r * 0.47, z, 0.95, 0.55, 0.34, sandM, { y: r * 0.34, t: 1 });
      }
    }
  };

  const decal = (x: number, z: number, w: number, d: number, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), decM);
    m.rotation.x = -Math.PI / 2;
    m.rotation.y = ry;
    m.position.set(x, 0.02, z);
    m.userData.ns = 1;
    add(m);
  };

  const awn = (x: number, y: number, z: number, w: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 1.5), awnM);
    m.position.set(x, y, z);
    m.rotation.x = -0.28;
    add(m);
  };

  const house = (x: number, z: number, w: number, d: number, h: number) => {
    wall(x, z, w, d, h);
    B(x, z, w - 0.4, d - 0.4, 0.5, roofM, { y: h + 0.35, nc: 1, t: 3 });
    const fz = z - d / 2 - 0.06;
    B(x, fz, 1.5, 0.14, 2.3, dk, { nc: 1 });
    B(x, fz, 2, 0.2, 0.3, woodM, { y: 2.3, nc: 1, t: 1 });
    B(x - w / 3, fz, 1.2, 0.14, 1.1, dk, { y: 1.3, nc: 1 });
    B(x + w / 3, fz, 1.2, 0.14, 1.1, dk, { y: 1.3, nc: 1 });
    awn(x, 2.9, fz - 0.7, 2.6);
  };

  const palm = (x: number, z: number) => {
    const g = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 5.5, 8), barkM);
    tr.position.y = 2.75;
    g.add(tr);
    for (let i = 0; i < 8; i++) {
      const lg = new THREE.PlaneGeometry(0.9, 3.4);
      lg.translate(0, 1.7, 0);
      const l = new THREE.Mesh(lg, leafM);
      l.position.y = 5.5;
      l.rotation.order = 'YXZ';
      l.rotation.set(1.15, i * 0.785, 0);
      g.add(l);
    }
    g.position.set(x, 0, z);
    add(g);
    reg(x, z, 0.6, 0.6, 5, false, true);
    regCollider(x, 0, z, 0.6, 5, 0.6, true);
  };

  const wtower = (x: number, z: number) => {
    const g = new THREE.Group();
    [
      [-1.2, -1.2],
      [1.2, -1.2],
      [-1.2, 1.2],
      [1.2, 1.2],
    ].forEach(([a, b]) => {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 7, 8), dk);
      l.position.set(a, 3.5, b);
      g.add(l);
    });
    for (let h = 2; h < 7; h += 2.5) {
      [-1.2, 1.2].forEach((b) => {
        const k = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), dk);
        k.position.set(0, h, b);
        g.add(k);
        const k2 = k.clone();
        k2.rotation.y = Math.PI / 2;
        k2.position.set(b, h, 0);
        g.add(k2);
      });
    }
    const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 2.8, 20), rustM);
    t.position.y = 8.4;
    g.add(t);
    const r = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.2, 20), dk);
    r.position.y = 10.4;
    g.add(r);
    g.position.set(x, 0, z);
    add(g);
    reg(x, z, 2.6, 2.6, 9, false, true);
    regCollider(x, 0, z, 2.6, 9, 2.6, true);
  };

  const flag = (x: number, z: number, col: THREE.ColorRepresentation) => {
    C(x, z, 0.08, 5, dk, { nc: 1, both: false });
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.3),
      new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide })
    );
    m.position.set(x + 1.15, 4.2, z);
    add(m, false);
  };

  const pad = (z: number, col: string, txt: string, ry: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 11),
      new THREE.MeshBasicMaterial({
        map: padT(col, txt),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.y = ry;
    m.position.set(0, 0.04, z);
    m.userData.ns = 1;
    add(m, false);
  };

  /* ---------- ground ---------- */
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshStandardMaterial({ map: sandT, roughness: 1 }));
  gnd.rotation.x = -Math.PI / 2;
  gnd.receiveShadow = true;
  group.add(gnd);
  colliders.push({ min: new THREE.Vector3(-bounds - 60, -2, -bounds - 60), max: new THREE.Vector3(bounds + 60, 0, bounds + 60) });

  const far = new THREE.Mesh(new THREE.RingGeometry(65, 420, 48), new THREE.MeshStandardMaterial({ color: 0xd0b27a, roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.05;
  group.add(far);

  decal(-31, 8, 16, 44, 0.1);
  decal(0, 12, 14, 34);
  decal(31, -8, 16, 44, -0.1);
  decal(0, -12, 14, 34);

  /* ---------- perimeter ---------- */
  wall(0, 40.5, 82, 1, 6);
  wall(40.5, 0, 1, 82, 6);
  for (let x = -38; x <= 38; x += 4) {
    B(x, 40.5, 1.8, 1.3, 0.9, stone, { y: 6.35, nc: 1, t: 2 });
    B(40.5, x, 1.3, 1.8, 0.9, stone, { y: 6.35, nc: 1, t: 2 });
  }
  for (let x = -36; x <= 36; x += 8) {
    B(x, 39.6, 1.4, 0.6, 5.7, stone, { nc: 1, t: 2 });
    B(39.6, x, 0.6, 1.4, 5.7, stone, { nc: 1, t: 2 });
  }

  /* ---------- spawn gate wall (3 arched exits) ---------- */
  [
    [-35, 10],
    [-13, 18],
    [13, 18],
    [35, 10],
  ].forEach(([x, w]) => wall(x, 25, w, 1, 4.5));

  [-26, 0, 26].forEach((x) => {
    B(x, 25, 8, 1.1, 1.1, plast, { y: 3.4 });
    B(x, 25, 8.3, 1.4, 0.3, stone, { y: 4.5, nc: 1, t: 2 });
  });

  [-30, -22, -4, 4, 22, 30].forEach((x) => {
    C(x, 25, 0.55, 5.2, stone, { seg: 12 });
    C(x, 25, 0.8, 0.3, stone, { y: 5.2, seg: 12, nc: 1 });
  });

  /* ---------- west block: two-door building ---------- */
  wall(-21.5, 8, 1, 4, 5.5);
  wall(-21.5, 18, 1, 8, 5.5);
  wall(-10.5, 9, 1, 6, 5.5);
  wall(-10.5, 19, 1, 6, 5.5);
  wall(-16, 6.5, 12, 1, 5.5);
  wall(-16, 21.5, 12, 1, 5.5);
  B(-21.5, 12, 1, 4, 1.9, plast, { y: 3.6 });
  B(-10.5, 14, 1, 4, 1.9, plast, { y: 3.6 });
  B(-16, 14, 12, 16, 0.5, roofM, { y: 5.5, nc: 1, t: 3 });
  [-19, -16, -13].forEach((x) => {
    B(x, 22.07, 1.3, 0.15, 1.6, dk, { y: 2.4, nc: 1 });
    B(x, 22.1, 1.7, 0.2, 0.2, stone, { y: 2.25, nc: 1, t: 1 });
    B(x, 5.93, 1.3, 0.15, 1.6, dk, { y: 2.4, nc: 1 });
  });
  wall(-16, 14, 1, 5, 3.2);
  crate(-13, 9.5, 1.4);
  crate(-13, 10.9, 1.2);
  crate(-12.9, 10.2, 1.1, 1.4);
  crate(-19, 19, 1.5);
  barrel(-19.5, 16.5, barG);
  barrel(-18.6, 16.8);

  /* ---------- west lane ---------- */
  crate(-35, 19, 1.6);
  crate(-33.2, 19.2, 1.2);
  crate(-34.3, 19.1, 1.1, 1.6);
  crate(-37.5, 22, 1.4);
  B(-33, 10.5, 2.6, 6.4, 2.6, ctnG, { t: 2.6 });
  crate(-33, 9, 1.2, 2.6);
  B(-36, 3.5, 8, 6, 1.1, stone, { step: 1, t: 3 });
  B(-31.5, 3.5, 1, 6, 0.55, stone, { step: 1, t: 2 });
  crate(-38, 2.5, 1.3, 1.1);
  crate(-36.6, 2.7, 1.1, 1.1);
  barrel(-26, 19.5);
  barrel(-25.2, 18.8, barG);
  barrel(-26.9, 18.9);
  bags(-28.5, 23.3, 5);
  bags(-39, 14.5, 2);
  low(-27, 5, 1, 5);

  /* ---------- mid, south half ---------- */
  low(-6, 17, 6, 1);
  low(-8.5, 14.5, 1, 4);
  low(7, 11, 1, 6);
  low(9.5, 14, 5, 1);
  crate(0, 20, 1.4);
  crate(1.5, 20.4, 1.2);
  crate(0.7, 20.2, 1.1, 1.4);
  barrel(-3, 19);
  barrel(-3.8, 19.6, barG);
  bags(-2.5, 23.2, 6);
  decal(0, 22, 8, 8);

  /* ---------- east lane: tunnel, container, cover ---------- */
  wall(36.5, 14, 1, 12, 4);
  wall(26.5, 9.5, 1, 3, 4);
  wall(26.5, 18.5, 1, 3, 4);
  B(26.5, 14, 1, 6, 1.2, plast);
  B(31.5, 14, 11.4, 12.4, 0.5, stone, { y: 4, nc: 1, t: 3 });
  [10, 14, 18].forEach((z) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }));
    l.position.set(31.5, 3.5, z);
    add(l);
  });
  B(35, 6, 6.4, 2.6, 2.6, ctnB, { t: 2.6 });
  crate(36, 6, 1.4, 2.6);
  crate(31.5, 3.3, 1.5);
  crate(33.1, 3.2, 1.2);
  B(24, 2, 1, 5, 2.3, plast);
  barrel(29, 22);
  barrel(29.9, 22.6, barG);
  crate(38, 22, 1.4);
  crate(36.6, 22.4, 1.1);
  bags(31, 23.3, 4);
  B(24, 2, 1.25, 5.25, 0.25, stone, { y: 2.3, nc: 1, t: 2 });

  /* ---------- central plaza ---------- */
  {
    const d = new THREE.Mesh(new THREE.CircleGeometry(10, 48), mat(stoneT, 1, 0xd8c19a));
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.03;
    d.userData.ns = 1;
    add(d, false);
  }
  C(0, 0, 6.2, 0.5, stone, { seg: 32, step: 1, both: false });
  C(0, 0, 4.8, 0.5, stone, { y: 0.5, seg: 32, step: 1, both: false });
  C(0, 0, 1.9, 1.1, stone, { y: 1, seg: 24, both: false });
  C(0, 0, 1.5, 0.06, water, { y: 2.1, seg: 24, nc: 1, both: false });
  C(0, 0, 0.35, 3, stone, { y: 2.1, rt: 0.2, seg: 12, nc: 1, both: false });
  [
    [-4.2, -4.2],
    [4.2, -4.2],
    [-4.2, 4.2],
    [4.2, 4.2],
  ].forEach(([x, z]) => {
    C(x, z, 0.45, 5, stone, { y: 1, seg: 12, both: false });
    C(x, z, 0.7, 0.3, stone, { y: 6, seg: 12, nc: 1, both: false });
  });
  [-4.2, 4.2].forEach((a) => {
    B(0, a, 9.4, 0.5, 0.4, woodM, { y: 6.3, nc: 1, t: 1, both: false });
    B(a, 0, 0.5, 9.4, 0.4, woodM, { y: 6.3, nc: 1, t: 1, both: false });
  });
  for (let i = -4; i <= 4; i++) B(i, 0, 0.2, 9.4, 0.15, woodM, { y: 6.7, nc: 1, t: 1, both: false });
  crate(11, 2, 1.5);
  crate(12.6, 2.1, 1.2);
  crate(11.7, 2, 1.2, 1.5);

  /* ---------- spawn courtyards ---------- */
  house(-31, 33, 9, 7, 4.2);
  house(31, 34, 8, 6, 3.6);
  wtower(16, 31);
  palm(-6, 34);
  palm(-37, 28);
  palm(21, 37);
  palm(-14, 28.5);
  crate(-18, 36, 1.4);
  crate(-16.6, 36.3, 1.2);
  barrel(-20, 37.5);
  barrel(-20.9, 36.9, barG);
  B(0, 37.5, 6, 0.6, 0.5, woodM, { t: 1 });
  bags(5, 29, 5);
  bags(-9, 30.5, 3);

  // Markers and pads
  pad(33, '#2f6bd6', 'BLUE SPAWN', 0);
  pad(-33, '#d6432f', 'RED SPAWN', Math.PI);
  flag(-9, 34, 0x2f6bd6);
  flag(9, -34, 0xd6432f);
  B(0, 36.5, 18, 0.2, 0.3, stone, { nc: 1, t: 2, both: true });

  /* ---------- scattered rocks ---------- */
  for (let i = 0, n = 0; i < 500 && n < 80; i++) {
    const x = (rnd() - 0.5) * 76;
    const z = (rnd() - 0.5) * 76;
    if (R.some((r) => Math.abs(x - r[0]) < r[2] / 2 + 1 && Math.abs(z - r[1]) < r[3] / 2 + 1)) continue;
    n++;
    const s = 0.15 + rnd() * 0.45;
    const o = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
    o.position.set(x, s * 0.5, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    add(o);
  }

  /* ---------- drifting dust ---------- */
  const N = 600;
  const dp = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) dp[i] = (rnd() - 0.5) * 70;
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({ color: 0xf0dcaa, size: 0.14, transparent: true, opacity: 0.55, depthWrite: false })
  );
  dust.frustumCulled = false;
  group.add(dust);

  /* ---------- sky dome ---------- */
  const skyT = tex(8, 256, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, '#3f86d6');
    r.addColorStop(0.45, '#8fc0ec');
    r.addColorStop(0.5, '#e9dcb8');
    r.addColorStop(1, '#e3cfa0');
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, depthWrite: false })
  );
  group.add(sky);

  /* ---------- SPAWN POINTS ---------- */
  // Blue / Alpha at South (Z ~ +33)
  const alphaSpawns: [number, number][] = [
    [0, 33],
    [-6, 33],
    [6, 33],
    [-12, 33],
    [12, 33],
    [0, 30],
  ];

  // Red / Bravo at North (Z ~ -33)
  const bravoSpawns: [number, number][] = [
    [0, -33],
    [-6, -33],
    [6, -33],
    [-12, -33],
    [12, -33],
    [0, -30],
  ];

  for (const [x, z] of alphaSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'alpha' });
  for (const [x, z] of bravoSpawns) spawns.push({ pos: new THREE.Vector3(x, 0, z), team: 'bravo' });

  return {
    group,
    colliders,
    spawns,
    bounds,
  };
}
