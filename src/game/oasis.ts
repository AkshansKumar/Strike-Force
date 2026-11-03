import * as THREE from 'three';
import type { Collider, SpawnPoint, BuiltMap } from './types';

export function buildOasisMap(): BuiltMap {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const spawns: SpawnPoint[] = [];
  const bounds = 45; // 90m x 90m map
  const PI = Math.PI;

  let seed = 11;
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
    g.fillStyle = '#dcbf86';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = i % 2 ? '#cba96a' : '#ebd29c';
      g.globalAlpha = 0.12;
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, 10 + rnd() * 50, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
    speck(g, w, h, 9000, ['#b8985a', '#f0dcae', '#a98a50'], 2.5);
  }, 38);

  const clayT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9a977';
    g.fillRect(0, 0, w, h);
    speck(g, w, h, 7000, ['#b98455', '#ecc79a', '#a77046'], 3);
    for (let i = 0; i < 40; i++) {
      const r = g.createLinearGradient(0, 0, 0, h);
      r.addColorStop(0, 'rgba(90,50,20,0)');
      r.addColorStop(1, 'rgba(90,50,20,.22)');
      g.fillStyle = r;
      g.fillRect(rnd() * w, 0, 4 + rnd() * 14, h);
    }
    const b = g.createLinearGradient(0, h * 0.7, 0, h);
    b.addColorStop(0, 'rgba(80,45,20,0)');
    b.addColorStop(1, 'rgba(80,45,20,.35)');
    g.fillStyle = b;
    g.fillRect(0, h * 0.7, w, h * 0.3);
  });

  const stoneT = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#b19a74';
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

  const stripe = (a: string, b: string) =>
    tex(128, 64, (g, _w, h) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? b : a;
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

  const clockT = tex(256, 256, (g, _w, _h) => {
    g.fillStyle = '#f4ead2';
    g.beginPath();
    g.arc(128, 128, 120, 0, 7);
    g.fill();
    g.strokeStyle = '#3a2a14';
    g.lineWidth = 8;
    g.stroke();
    for (let i = 0; i < 12; i++) {
      g.save();
      g.translate(128, 128);
      g.rotate((i * PI) / 6);
      g.fillRect(-3, -112, 6, 18);
      g.restore();
    }
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(128, 128);
    g.lineTo(128 + 40 * Math.cos(-0.5), 128 + 40 * Math.sin(-0.5));
    g.moveTo(128, 128);
    g.lineTo(128 + 80 * Math.cos(2.6), 128 + 80 * Math.sin(2.6));
    g.stroke();
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

  const clay = mat(clayT);
  const stone = mat(stoneT);
  const woodM = mat(woodT);
  const crateM = mat(crateT);
  const awnR = mat(stripe('#b5452b', '#efe3c4'));
  const awnT = mat(stripe('#2f7a86', '#efe3c4'));
  const roofM = mat(stoneT, 0.9, 0xd9a587);
  const dk = mat(null, 0.8, 0x3a2f24);
  const sandM = mat(null, 1, 0xb89d66);
  const rockM = mat(null, 1, 0x9d8660);
  const barR = mat(null, 0.55, 0x9a3b27);
  const barG = mat(null, 0.55, 0x55603a);
  const rustM = mat(null, 0.6, 0x8a5a3a);
  const barkM = mat(null, 1, 0x7a6240);
  const domeM = mat(null, 0.35, 0x3b8394);
  const water = mat(null, 0.15, 0x3f8fa3);
  const leafM = new THREE.MeshStandardMaterial({ color: 0x6f8a3c, side: THREE.DoubleSide, roughness: 0.9 });
  const lampM = new THREE.MeshBasicMaterial({ color: 0xffd58a });
  const ctnG = ctnM('#4f6b46');
  const ctnB = ctnM('#3d5f8a');
  const ctnO = ctnM('#b4692a');
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
      c.rotation.y += PI;
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

  const wall = (x: number, z: number, w: number, d: number, h: number, m = clay) => {
    B(x, z, w, d, h, m);
    if (h >= 3.5) {
      B(x, z, w + 0.3, d + 0.3, 0.35, stone, { y: h, nc: 1, t: 2 });
      B(x, z, w + 0.14, d + 0.14, 0.7, stone, { nc: 1, t: 2 });
    }
  };

  const low = (x: number, z: number, w: number, d: number, h = 2.2) => {
    B(x, z, w, d, h, clay);
    B(x, z, w + 0.25, d + 0.25, 0.25, stone, { y: h, nc: 1, t: 2 });
  };

  const crate = (x: number, z: number, s: number, y = 0) => B(x, z, s, s, s, crateM, { y, t: s });

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
    m.rotation.x = -PI / 2;
    m.rotation.y = ry;
    m.position.set(x, 0.02, z);
    m.userData.ns = 1;
    add(m);
  };

  const awn = (x: number, y: number, z: number, w: number, s = -1, m: THREE.Material = awnR) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 1.5), m);
    o.position.set(x, y, z);
    o.rotation.x = 0.28 * s;
    add(o);
  };

  const awnX = (x: number, y: number, z: number, w: number, m: THREE.Material = awnR) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, w), m);
    o.position.set(x, y, z);
    o.rotation.z = 0.28;
    add(o);
  };

  const lamp = (x: number, y: number, z: number) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampM);
    l.position.set(x, y, z);
    add(l);
  };

  const house = (x: number, z: number, dx: number, dz: number, h: number) => {
    wall(x, z, dx, dz, h);
    B(x, z, dx - 0.4, dz - 0.4, 0.5, roofM, { y: h + 0.35, nc: 1, t: 3 });
    const fx = x - dx / 2 - 0.06;
    B(fx, z, 0.14, 1.5, 2.3, dk, { nc: 1 });
    B(fx, z, 0.2, 2, 0.3, woodM, { y: 2.3, nc: 1, t: 1 });
    B(fx, z - dz / 3, 0.14, 1.2, 1.1, dk, { y: 1.3, nc: 1 });
    B(fx, z + dz / 3, 0.14, 1.2, 1.1, dk, { y: 1.3, nc: 1 });
    awnX(fx - 0.7, 2.9, z, 2.6);
  };

  const stall = (x: number, z: number, m: THREE.Material) => {
    B(x, z, 2.8, 1.2, 1, woodM, { t: 1 });
    [-1.3, 1.3].forEach((a) => C(x + a, z + 0.5, 0.06, 2.9, woodM, { nc: 1, seg: 6 }));
    awn(x, 2.9, z + 0.25, 3.2, 1, m);
    crate(x - 0.7, z, 0.6, 1);
    C(x + 0.6, z, 0.28, 0.4, barR, { y: 1, nc: 1, seg: 10 });
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
        k2.rotation.y = PI / 2;
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

  const pad = (x: number, col: string, txt: string, ry: number) => {
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
    m.rotation.x = -PI / 2;
    m.rotation.y = ry;
    m.position.set(x, 0.04, 0);
    m.userData.ns = 1;
    add(m, false);
  };

  /* ---------- ground ---------- */
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ map: sandT, roughness: 1 }));
  gnd.rotation.x = -PI / 2;
  gnd.receiveShadow = true;
  group.add(gnd);
  colliders.push({ min: new THREE.Vector3(-bounds - 60, -2, -bounds - 60), max: new THREE.Vector3(bounds + 60, 0, bounds + 60) });

  const far = new THREE.Mesh(new THREE.RingGeometry(75, 440, 48), new THREE.MeshStandardMaterial({ color: 0xd6b27a, roughness: 1 }));
  far.rotation.x = -PI / 2;
  far.position.y = -0.05;
  group.add(far);

  decal(20, -27, 26, 9);
  decal(20, 18, 22, 26, 0.1);
  decal(0, 0, 30, 12, 0.3);

  /* ---------- perimeter (90 x 90 m) ---------- */
  wall(0, 45.5, 92, 1, 6.5);
  wall(45.5, 0, 1, 92, 6.5);
  for (let x = -43; x <= 43; x += 4) {
    B(x, 45.5, 1.8, 1.3, 0.9, stone, { y: 6.85, nc: 1, t: 2 });
    B(45.5, x, 1.3, 1.8, 0.9, stone, { y: 6.85, nc: 1, t: 2 });
  }
  for (let x = -40; x <= 40; x += 8) {
    B(x, 44.6, 1.4, 0.6, 6.2, stone, { nc: 1, t: 2 });
    B(44.6, x, 0.6, 1.4, 6.2, stone, { nc: 1, t: 2 });
  }

  /* ---------- spawn gate wall (x=31, three exits) ---------- */
  [
    [-39.5, 11],
    [-15.5, 21],
    [15.5, 21],
    [39.5, 11],
  ].forEach(([z, l]) => wall(31, z, 1, l, 4.5));

  [
    [-30, 8],
    [0, 10],
    [30, 8],
  ].forEach(([z, w]) => {
    B(31, z, 1.1, w, 1.1, clay, { y: 3.4 });
    B(31, z, 1.4, w + 0.3, 0.3, stone, { y: 4.5, nc: 1, t: 2 });
  });

  [-34, -26, -5, 5, 26, 34].forEach((z) => {
    C(31, z, 0.55, 5.2, stone, { seg: 12 });
    C(31, z, 0.8, 0.3, stone, { y: 5.2, seg: 12, nc: 1 });
  });

  /* ---------- hotel (two-storey, balcony, two doors) ---------- */
  wall(14.5, -18, 1, 4, 7.5);
  wall(14.5, -10, 1, 4, 7.5);
  B(14.5, -14, 1, 4, 3.9, clay, { y: 3.6 });
  wall(25.5, -14, 1, 12, 7.5);
  wall(20, -19.5, 12, 1, 7.5);
  wall(16, -8.5, 4, 1, 7.5);
  wall(24, -8.5, 4, 1, 7.5);
  B(20, -8.5, 4, 1, 3.9, clay, { y: 3.6 });
  B(20, -14, 12, 12, 0.5, roofM, { y: 7.5, nc: 1, t: 3 });
  B(20, -7.2, 6, 1.6, 0.3, woodM, { y: 4.2, nc: 1, t: 1 });
  B(20, -6.45, 6, 0.1, 0.9, woodM, { y: 4.5, nc: 1, t: 1 });
  [-3, -1, 1, 3].forEach((a) => B(20 + a, -7.4, 0.15, 1.2, 0.9, woodM, { y: 3.4, nc: 1, t: 1 }));
  [16, 20, 24].forEach((x) => {
    B(x, -20.07, 1.3, 0.15, 1.6, dk, { y: 2.2, nc: 1 });
    B(x, -20.07, 1.3, 0.15, 1.6, dk, { y: 5.2, nc: 1 });
  });
  [-17, -11].forEach((z) => B(14.07, z, 0.15, 1.3, 1.6, dk, { y: 5.2, nc: 1 }));
  awnX(13.8, 3.2, -14, 4, awnT);
  wall(20, -14, 1, 5, 3);
  crate(23, -17, 1.5);
  crate(24.4, -16.8, 1.2);
  crate(23.6, -17, 1.1, 1.5);
  barrel(16, -17.5, barG);
  barrel(16.9, -17.9);

  /* ---------- bazaar stalls (north avenue) ---------- */
  for (let i = 0; i < 5; i++) stall(10 + i * 4.4, -26, i % 2 ? awnT : awnR);
  bags(12, -31, 5);

  /* ---------- covered arcade + shops with walkable roofs (south-east) ---------- */
  wall(8, 18, 1, 17, 4.2);
  [12, 18, 24].forEach((z) => B(8.55, z, 0.15, 1.6, 2.4, dk, { nc: 1 }));
  [10, 14, 18, 22, 26].forEach((z) => [9.5, 12.8].forEach((x) => C(x, z, 0.3, 4, stone, { seg: 8 })));
  B(11.2, 18, 4.8, 17.4, 0.35, woodM, { y: 4, nc: 1, t: 2 });
  [10, 18, 26].forEach((z) => lamp(11.2, 3.5, z));
  [12, 17, 22].forEach((z) => {
    B(25.5, z, 7, 4.6, 3.2, clay, { step: 1, t: 3 });
    B(25.5, z, 7.3, 4.9, 0.25, stone, { y: 3.2, nc: 1, t: 2 });
  });
  [12, 22].forEach((z) => B(21.95, z, 0.15, 1.5, 2.3, dk, { nc: 1 }));
  B(21.5, 17, 0.9, 2, 2.4, stone, { step: 1, t: 2 });
  B(20.6, 17, 0.9, 2, 1.6, stone, { step: 1, t: 2 });
  B(19.7, 17, 0.9, 2, 0.8, stone, { step: 1, t: 2 });
  crate(26, 12, 1.3, 3.2);
  C(24, 17, 0.5, 0.8, rustM, { y: 3.2, nc: 1, seg: 10 });
  C(28, 22, 0.04, 3, dk, { y: 3.2, nc: 1, seg: 6 });
  awnX(21.2, 2.9, 12, 2.4, awnT);
  awnX(21.2, 2.9, 22, 2.4, awnR);

  /* ---------- back alley: containers & cover ---------- */
  B(24, -38, 6.4, 2.6, 2.6, ctnO, { t: 2.6 });
  crate(24, -38, 1.2, 2.6);
  B(14, -41, 2.6, 6.4, 2.6, ctnG, { t: 2.6 });
  B(27, -33, 2.6, 6.4, 2.6, ctnB, { t: 2.6 });
  crate(12, -35, 1.5);
  crate(13.6, -35.3, 1.2);
  crate(12.7, -35.1, 1.1, 1.5);
  barrel(19, -34);
  barrel(19.9, -34.5, barG);
  barrel(18.2, -34.6);
  low(18, -31.2, 6, 1);
  low(14, 5.5, 5, 1);
  low(14, -5.5, 5, 1);
  bags(27, 3.2, 4);
  crate(22, 0, 1.4);
  crate(23.5, 0.3, 1.2);

  /* ---------- central oasis & clock tower ---------- */
  {
    const d = new THREE.Mesh(new THREE.CircleGeometry(12.5, 48), mat(stoneT, 1, 0xe6caa0));
    d.rotation.x = -PI / 2;
    d.position.y = 0.03;
    d.userData.ns = 1;
    add(d, false);
  }
  C(0, 0, 7.4, 0.7, stone, { seg: 40, both: false });
  C(0, 0, 6.6, 0.1, water, { y: 0.62, seg: 40, nc: 1, both: false });
  [
    [3, 1],
    [-3.5, 2.5],
    [1.5, -4],
    [-2, -3.2],
    [4.2, -2],
  ].forEach(([x, z]) => C(x, z, 0.5, 0.02, leafM, { y: 0.72, nc: 1, seg: 10, both: false }));

  B(0, 0, 3.4, 3.4, 11, clay, { y: 0.7, t: 3, both: false });
  B(0, 0, 3.9, 3.9, 0.4, stone, { y: 11.7, nc: 1, t: 2, both: false });
  B(0, 0, 3, 3, 2, clay, { y: 12.1, nc: 1, t: 3, both: false });
  [
    [0, 1.6],
    [0, -1.6],
  ].forEach(([a, b]) => B(a, b, 0.9, 0.1, 1.2, dk, { y: 12.5, nc: 1, both: false }));
  [1.6, -1.6].forEach((a) => B(a, 0, 0.1, 0.9, 1.2, dk, { y: 12.5, nc: 1, both: false }));
  {
    const dm = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 12, 0, PI * 2, 0, PI / 2), domeM);
    dm.position.y = 14.1;
    add(dm, false);
    C(0, 0, 0.08, 2, dk, { y: 16.2, rt: 0.03, seg: 6, nc: 1, both: false });
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: clockT, transparent: true }));
      f.position.set(Math.sin((k * PI) / 2) * 1.76, 9.3, Math.cos((k * PI) / 2) * 1.76);
      f.rotation.y = (k * PI) / 2;
      add(f, false);
    }
  }
  [0.35, 1.1, 1.8, 2.6].forEach((a) => palm(9.4 * Math.cos(a), 9.4 * Math.sin(a)));

  /* ---------- spawn courtyards (east = blue, west = red) ---------- */
  house(38, -36, 8, 9, 4.2);
  house(37, 35, 7, 8, 3.6);
  wtower(37, 16);
  palm(35, -24);
  palm(41, 28);
  palm(34, 6);
  palm(42, -8);
  crate(40, -18, 1.4);
  crate(40, -16.6, 1.2);
  barrel(42, -22);
  barrel(42.9, -21.3, barG);
  B(43, 0, 0.6, 6, 0.5, woodM, { t: 1 });
  bags(34, -3.5, 4);
  bags(34, 9, 3);

  // Markers and pads
  pad(38, '#2f6bd6', 'BLUE SPAWN', PI / 2);
  pad(-38, '#d6432f', 'RED SPAWN', -PI / 2);
  flag(34, -14, 0x2f6bd6);
  flag(-34, 14, 0xd6432f);

  /* ---------- rocks ---------- */
  for (let i = 0, n = 0; i < 600 && n < 90; i++) {
    const x = (rnd() - 0.5) * 86;
    const z = (rnd() - 0.5) * 86;
    if (Math.hypot(x, z) < 13 || R.some((r) => Math.abs(x - r[0]) < r[2] / 2 + 1 && Math.abs(z - r[1]) < r[3] / 2 + 1)) continue;
    n++;
    const s = 0.15 + rnd() * 0.45;
    const o = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
    o.position.set(x, s * 0.5, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    add(o);
  }

  /* ---------- drifting dust particles ---------- */
  const N = 600;
  const dp = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) dp[i] = (rnd() - 0.5) * 80;
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({ color: 0xffe0a8, size: 0.14, transparent: true, opacity: 0.55, depthWrite: false })
  );
  dust.frustumCulled = false;
  group.add(dust);

  /* ---------- sky dome (golden-hour atmosphere) ---------- */
  const skyT = tex(8, 256, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, '#3d6fb0');
    r.addColorStop(0.4, '#8fb0d0');
    r.addColorStop(0.49, '#f0c690');
    r.addColorStop(0.5, '#f0d3a4');
    r.addColorStop(1, '#eccb9b');
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, depthWrite: false })
  );
  group.add(sky);

  /* ---------- SPAWN POINTS ---------- */
  // Blue / Alpha at East (X ~ +38)
  const alphaSpawns: [number, number][] = [
    [38, 0],
    [38, -6],
    [38, 6],
    [36, -3],
    [36, 3],
    [40, 0],
  ];

  // Red / Bravo at West (X ~ -38)
  const bravoSpawns: [number, number][] = [
    [-38, 0],
    [-38, -6],
    [-38, 6],
    [-36, -3],
    [-36, 3],
    [-40, 0],
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
