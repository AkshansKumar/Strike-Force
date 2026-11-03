import * as THREE from 'three';
import type { Collider, SpawnPoint, BuiltMap } from './types';

export function buildRailYardMap(): BuiltMap {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const spawns: SpawnPoint[] = [];
  const bounds = 40; // 80m x 80m map
  const PI = Math.PI;

  let seed = 23;
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

  const streak = (g: CanvasRenderingContext2D, w: number, h: number, rgb: string, a: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const r = g.createLinearGradient(0, 0, 0, h);
      r.addColorStop(0, `rgba(${rgb},0)`);
      r.addColorStop(1, `rgba(${rgb},${a})`);
      g.fillStyle = r;
      g.fillRect(rnd() * w, 0, 3 + rnd() * 10, h);
    }
  };

  const gndT = tex(
    512,
    512,
    (g, w, h) => {
      g.fillStyle = '#b4ab97';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 200; i++) {
        g.fillStyle = i % 2 ? '#c7b48a' : '#a29882';
        g.globalAlpha = 0.12;
        g.beginPath();
        g.arc(rnd() * w, rnd() * h, 10 + rnd() * 50, 0, 7);
        g.fill();
      }
      g.globalAlpha = 1;
      speck(g, w, h, 9000, ['#8d8574', '#d8cdb4'], 2.5);
      g.strokeStyle = 'rgba(50,45,35,.3)';
      g.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        g.beginPath();
        g.moveTo(i * 128, 0);
        g.lineTo(i * 128, h);
        g.moveTo(0, i * 128);
        g.lineTo(w, i * 128);
        g.stroke();
      }
    },
    17
  );

  const concT = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#bdb5a3';
    g.fillRect(0, 0, w, h);
    speck(g, w, h, 9000, ['#9d9584', '#d6cfbe', '#867e6e'], 3);
    g.strokeStyle = 'rgba(60,55,45,.35)';
    g.lineWidth = 3;
    g.strokeRect(0, 0, w, h);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();
    streak(g, w, h, '70,60,40', 0.2, 30);
  });

  const corrT = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#98a08c';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.fillRect(x, 0, 6, h);
      g.fillStyle = 'rgba(0,0,0,.16)';
      g.fillRect(x + 8, 0, 6, h);
    }
    streak(g, w, h, '120,70,30', 0.3, 25);
    speck(g, w, h, 1500, ['#5c3a1c', '#cbd0c0'], 3);
  });

  const boxT = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#7b3f2d';
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.fillRect(x, 0, 3, h);
    }
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    streak(g, w, h, '40,20,10', 0.35, 20);
    speck(g, w, h, 2000, ['#c88a4a', '#2b1a10'], 3);
  });

  const hazT = tex(128, 32, (g, w, h) => {
    g.fillStyle = '#e6b422';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#222';
    for (let i = -2; i < 10; i++) {
      g.beginPath();
      g.moveTo(i * 24, h);
      g.lineTo(i * 24 + 12, h);
      g.lineTo(i * 24 + 12 + h, 0);
      g.lineTo(i * 24 + h, 0);
      g.fill();
    }
  });

  const gravT = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#6f685b';
    g.fillRect(0, 0, w, h);
    speck(g, w, h, 7000, ['#4a453c', '#948b7a', '#2e2b26'], 3);
  });
  gravT.repeat.set(30, 4);

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

  const fenceT = tex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#9aa1a6';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, h);
    g.moveTo(w, 0);
    g.lineTo(0, h);
    g.stroke();
  });

  const dtex = tex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(30,25,20,.4)');
    r.addColorStop(1, 'rgba(30,25,20,0)');
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
        streak(g, w, h, '60,30,10', 0.3, 12);
        speck(g, w, h, 1800, ['#5a3a1e', '#000', '#d9d9d9'], 3);
      }),
      0.55
    );

  const padT = (col: string, txt: string) =>
    tex(512, 256, (g, w, h) => {
      g.globalAlpha = 0.3;
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

  const conc = mat(concT);
  const corr = mat(corrT);
  const boxM = mat(boxT);
  const hazM = mat(hazT, 0.8);
  const grav = mat(gravT, 1);
  const woodM = mat(woodT);
  const crateM = mat(crateT);
  const awnR = mat(hazT, 0.8);
  const dk = mat(null, 0.8, 0x34302a);
  const steel = mat(null, 0.5, 0x6b6f72);
  const rustM = mat(null, 0.65, 0x8a5a3a);
  const tankM = mat(null, 0.5, 0xc9c1ad);
  const cranM = mat(null, 0.6, 0xd9a326);
  const yel = mat(null, 0.6, 0xe6b422);
  const trM = mat(null, 0.5, 0x5f7a6a);
  const green = mat(null, 0.7, 0x3f5a3a);
  const rockM = mat(null, 1, 0x9d9482);
  const barR = mat(null, 0.55, 0x9a3b27);
  const barG = mat(null, 0.55, 0x55603a);
  const lampM = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
  const fenceM = new THREE.MeshStandardMaterial({
    map: fenceT,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const ctnR = ctnM('#a63a2a');
  const ctnG = ctnM('#4f6b46');
  const ctnB = ctnM('#3d5f8a');
  const ctnO = ctnM('#c0732a');
  const ctnW = ctnM('#cdc8b8');
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

  const wall = (x: number, z: number, w: number, d: number, h: number, m = conc) => {
    B(x, z, w, d, h, m);
    if (h >= 3.5) {
      B(x, z, w + 0.3, d + 0.3, 0.35, conc, { y: h, nc: 1, t: 2 });
      B(x, z, w + 0.14, d + 0.14, 0.6, dk, { nc: 1, t: 2 });
    }
  };

  const crate = (x: number, z: number, s: number, y = 0) => B(x, z, s, s, s, crateM, { y, t: s });

  const ct = (x: number, z: number, w: number, d: number, m: THREE.Material, y = 0, step?: boolean | number) =>
    B(x, z, w, d, 2.6, m, { y, t: 2.6, step });

  const bar = (x: number, z: number, w = 3, d = 0.8) => {
    B(x, z, w, d, 1.1, conc, { t: 1.5 });
    B(x, z, w + 0.02, d + 0.02, 0.1, hazM, { y: 1.1, nc: 1, t: 1 });
  };

  const barrel = (x: number, z: number, m = barR) => {
    C(x, z, 0.45, 1.1, m, { seg: 14 });
    C(x, z, 0.47, 0.08, dk, { y: 0.25, seg: 14, nc: 1 });
    C(x, z, 0.47, 0.08, dk, { y: 0.8, seg: 14, nc: 1 });
  };

  const decal = (x: number, z: number, w: number, d: number, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), decM);
    m.rotation.x = -PI / 2;
    m.rotation.y = ry;
    m.position.set(x, 0.02, z);
    m.userData.ns = 1;
    add(m);
  };

  const awn = (x: number, y: number, z: number, w: number, s = -1) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 1.5), awnR);
    o.position.set(x, y, z);
    o.rotation.x = 0.28 * s;
    add(o);
  };

  const fence = (x: number, z: number, w: number, ry = 0, y = 0, h = 2.4) => {
    const g = new THREE.PlaneGeometry(w, h);
    const u = g.attributes.uv;
    for (let i = 0; i < u.count; i++) u.setXY(i, (u.getX(i) * w) / 1.5, (u.getY(i) * h) / 1.5);
    const m = new THREE.Mesh(g, fenceM);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    m.userData.ns = 1;
    add(m);
    regCollider(x, y, z, ry === 0 ? w : 0.2, h, ry === 0 ? 0.2 : w, true);
  };

  const house = (x: number, z: number, w: number, d: number, h: number) => {
    wall(x, z, w, d, h);
    B(x, z, w - 0.4, d - 0.4, 0.5, corr, { y: h + 0.35, nc: 1, t: 3 });
    const fz = z - d / 2 - 0.06;
    B(x, fz, 1.5, 0.14, 2.3, dk, { nc: 1 });
    [-1, 1].forEach((s) => B(x + (s * w) / 3, fz, 1.4, 0.14, 1.1, dk, { y: 1.3, nc: 1 }));
    awn(x, 2.9, fz - 0.7, 2.6);
  };

  const flood = (x: number, z: number) => {
    C(x, z, 0.12, 9, dk, { seg: 6 });
    B(x, z, 1.8, 0.4, 0.5, dk, { y: 9, nc: 1 });
    B(x, z, 1.6, 0.1, 0.4, lampM, { y: 8.9, nc: 1 });
  };

  const rack = (x: number, z: number, len: number) => {
    [-1, 1].forEach((s) =>
      [-len / 2, 0, len / 2].forEach((a) => B(x + a, z + s * 0.4, 0.1, 0.1, 3.2, steel, { nc: 1, t: 1 }))
    );
    [0.5, 1.7, 2.9].forEach((y) => {
      B(x, z, len, 0.9, 0.08, woodM, { y, nc: 1, t: 1 });
      for (let i = 0; i < 3; i++) crate(x - len / 3 + (i * len) / 3, z, 0.7, y + 0.08);
    });
    reg(x, z, len, 0.9, 3.2, false, true);
    regCollider(x, 0, z, len, 3.2, 0.9, true);
  };

  const forklift = (x: number, z: number) => {
    const g = new THREE.Group();
    const a = (w: number, h: number, d: number, m: THREE.Material, px: number, py: number, pz: number) => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      k.position.set(px, py, pz);
      g.add(k);
    };
    a(1.3, 0.9, 2.2, yel, 0, 0.8, 0);
    a(1.2, 0.1, 1.2, dk, 0, 2.1, -0.3);
    [-0.55, 0.55].forEach((s) => {
      a(0.08, 1.4, 0.08, dk, s, 1.5, 0.5);
      a(0.08, 0.08, 0.08, dk, s, 2.1, -0.9);
      a(0.12, 2.4, 0.12, steel, s * 0.8, 1.2, -1.2);
      a(0.15, 0.06, 1.2, steel, s * 0.8, 0.15, -1.8);
    });
    g.position.set(x, 0, z);
    add(g);
    reg(x, z, 1.4, 2.2, 2.2, false, true);
    regCollider(x, 0, z, 1.4, 2.2, 2.2, true);
  };

  const tank = (x: number, z: number) => {
    C(x, z, 3.5, 7, tankM, { seg: 28 });
    const r = new THREE.Mesh(new THREE.ConeGeometry(3.6, 0.9, 28), dk);
    r.position.set(x, 7.45, z);
    add(r);
    C(x, z, 3.8, 0.15, dk, { y: 5, nc: 1, seg: 28 });
    B(x + 3.55, z, 0.1, 0.6, 6, dk, { nc: 1 });
    B(x, z + 3.6, 0.3, 0.3, 0.3, rustM, { y: 0.4, nc: 1, t: 1 });
  };

  const crane = (x: number, z: number) => {
    const g = new THREE.Group();
    const H = 22;
    const ad = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => {
      const k = new THREE.Mesh(geo, m);
      k.position.set(px, py, pz);
      g.add(k);
      return k;
    };
    [
      [-0.8, -0.8],
      [0.8, -0.8],
      [-0.8, 0.8],
      [0.8, 0.8],
    ].forEach(([a, b]) => ad(new THREE.CylinderGeometry(0.1, 0.1, H, 6), cranM, a, H / 2, b));
    for (let h = 1.5; h < H; h += 2.2) {
      [-0.8, 0.8].forEach((b) => {
        ad(new THREE.BoxGeometry(1.6, 0.08, 0.08), cranM, 0, h, b);
        ad(new THREE.BoxGeometry(0.08, 0.08, 1.6), cranM, b, h, 0);
      });
    }
    ad(new THREE.BoxGeometry(30, 0.7, 0.7), cranM, 8, H + 0.9, 0);
    ad(new THREE.BoxGeometry(9, 0.7, 0.7), cranM, -5.5, H + 0.9, 0);
    ad(new THREE.BoxGeometry(2.2, 1.6, 1.6), dk, -9, H + 0.5, 0);
    ad(new THREE.BoxGeometry(1.8, 1.6, 1.8), yel, 1.6, H + 1.5, 1.3);
    ad(new THREE.ConeGeometry(0.9, 2.5, 4), cranM, 0, H + 2.1, 0);
    ad(new THREE.CylinderGeometry(0.03, 0.03, 10, 4), dk, 14, H - 4, 0);
    ad(new THREE.BoxGeometry(4, 1.4, 1.6), new THREE.MeshStandardMaterial({ color: 0xa63a2a }), 14, H - 9.7, 0);
    g.position.set(x, 0, z);
    add(g);
    reg(x, z, 2.2, 2.2, 22, false, true);
    regCollider(x, 0, z, 2.2, 22, 2.2, true);
  };

  const boxcar = (x: number, z: number) => {
    B(x, z, 12, 3, 3, boxM, { y: 1, t: 3 });
    B(x, z, 12.3, 3.3, 0.25, rustM, { y: 4, nc: 1 });
    [1.52, -1.52].forEach((s) => B(x, z + s, 3, 0.1, 2.4, dk, { y: 1.3, nc: 1 }));
    [-4, 4].forEach((a) => B(x + a, z, 2.6, 2.4, 0.7, dk, { y: 0.2, nc: 1 }));
  };

  const tanker = (x: number, z: number) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 11, 20), tankM);
    o.rotation.z = PI / 2;
    o.position.set(x, 2.9, z);
    add(o);
    reg(x, z, 11, 3, 4.4, false, true);
    regCollider(x, 0, z, 11, 4.4, 3, true);
    B(x, z, 12, 2.6, 0.35, dk, { y: 1, nc: 1 });
    [-4, 4].forEach((a) => B(x + a, z, 2.6, 2.4, 0.7, dk, { y: 0.2, nc: 1 }));
  };

  const flatcar = (x: number, z: number) => {
    B(x, z, 12.5, 3, 0.5, dk, { y: 1, nc: 1, t: 3 });
    [-4, 4].forEach((a) => B(x + a, z, 2.6, 2.4, 0.7, dk, { y: 0.2, nc: 1 }));
    B(x - 3, z, 6.1, 2.5, 2.6, ctnB, { y: 1.5, t: 2.6, nc: 1 });
    B(x + 3.2, z, 6.1, 2.5, 2.6, ctnO, { y: 1.5, t: 2.6, nc: 1 });
    reg(x, z, 12.5, 3, 4.1, false, true);
    regCollider(x, 0, z, 12.5, 4.1, 3, true);
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
    m.rotation.x = -PI / 2;
    m.rotation.y = ry;
    m.position.set(0, 0.04, z);
    m.userData.ns = 1;
    add(m, false);
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

  /* ---------- ground & rail tracks ---------- */
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ map: gndT, roughness: 1 }));
  gnd.rotation.x = -PI / 2;
  gnd.receiveShadow = true;
  group.add(gnd);
  colliders.push({ min: new THREE.Vector3(-bounds - 60, -2, -bounds - 60), max: new THREE.Vector3(bounds + 60, 0, bounds + 60) });

  const far = new THREE.Mesh(new THREE.RingGeometry(70, 430, 48), new THREE.MeshStandardMaterial({ color: 0xd2bf92, roughness: 1 }));
  far.rotation.x = -PI / 2;
  far.position.y = -0.05;
  group.add(far);

  decal(-14, 20, 16, 10);
  decal(16, -18, 14, 12, 0.4);
  decal(0, 30, 18, 8);
  decal(-30, -28, 12, 10);
  decal(34, 28, 12, 10);

  // Ballast bed & ties
  {
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(82, 11), grav);
    bed.rotation.x = -PI / 2;
    bed.position.y = 0.04;
    bed.receiveShadow = true;
    group.add(bed);

    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.14, 2.8), mat(null, 1, 0x4a3a2a), 140);
    const dm = new THREE.Object3D();
    let n = 0;
    [-2.4, 2.4].forEach((z) => {
      for (let x = -39.5; x < 40; x += 1.2) {
        dm.position.set(x, 0.1, z);
        dm.updateMatrix();
        sl.setMatrixAt(n++, dm.matrix);
      }
    });
    sl.count = n;
    sl.castShadow = sl.receiveShadow = true;
    group.add(sl);
  }

  // Steel rails
  [-2.4, 2.4].forEach((z) =>
    [-0.72, 0.72].forEach((o) => B(0, z + o, 82, 0.15, 0.18, steel, { y: 0.14, nc: 1, both: false }))
  );

  boxcar(14, -2.4);
  tanker(30, -2.4);
  flatcar(30, 2.4);

  // Crossing signals
  [-8, 8].forEach((a) => {
    [-1, 1].forEach((s) => {
      C(a, 5.7 * s, 0.07, 3.2, dk, { nc: 1, seg: 6, both: false });
      [0.7, -0.7].forEach((r) => {
        const k = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.08), mat(null, 0.5, 0xeeeeee));
        k.position.set(a, 3.3, 5.7 * s);
        k.rotation.z = r;
        add(k, false);
      });
    });
  });

  /* ---------- perimeter & floodlights ---------- */
  wall(0, 40.5, 82, 1, 5.5);
  wall(40.5, 0, 1, 82, 5.5);
  for (let x = -36; x <= 36; x += 8) {
    B(x, 39.6, 1.4, 0.6, 5, conc, { nc: 1, t: 2 });
    B(39.6, x, 0.6, 1.4, 5, conc, { nc: 1, t: 2 });
  }
  flood(-20, 38);
  flood(20, 36);
  flood(36, 22);
  flood(-37, 10);

  /* ---------- spawn zone: barrier line, office, tanks ---------- */
  [
    [-33, 14],
    [-12, 6],
    [12, 6],
    [33, 14],
  ].forEach(([x, w]) => {
    B(x, 27, w, 0.9, 1.4, conc, { t: 2 });
    B(x, 27, w + 0.02, 0.92, 0.1, hazM, { y: 1.4, nc: 1, t: 1 });
    if (w > 10) fence(x, 27, w, 0, 1.5, 2);
  });
  house(-28, 34, 12, 7, 4.2);
  ct(-14, 37, 6.2, 2.5, ctnG);
  tank(30, 34);
  tank(36.5, 31);
  B(33, 33, 3, 0.4, 0.4, dk, { y: 1.2, nc: 1 });
  B(-6, 38.3, 3, 1.5, 1.5, green);
  B(-6, 38.3, 3.1, 1.6, 0.1, dk, { y: 1.5, nc: 1, t: 1 });
  crate(8, 37, 1.4);
  crate(9.5, 37.2, 1.2);
  crate(8.7, 37.1, 1.1, 1.4);
  barrel(12, 37.5);
  barrel(12.9, 37, barG);
  bar(-8, 30);
  bar(8, 30);

  // Markers and pads
  pad(33, '#2f6bd6', 'BLUE SPAWN', 0);
  pad(-33, '#d6432f', 'RED SPAWN', PI);
  flag(-12, 35, 0x2f6bd6);
  flag(12, -35, 0xd6432f);

  /* ---------- warehouse with roll-up doors ---------- */
  const wh = (x: number, z: number, w: number, d: number) => wall(x, z, w, d, 7, corr);
  wh(-36.5, 10, 3, 1);
  wh(-29, 10, 4, 1);
  wh(-21.5, 10, 3, 1);
  B(-33, 10, 4, 1, 3, corr, { y: 4, t: 4 });
  B(-25, 10, 4, 1, 3, corr, { y: 4, t: 4 });
  wh(-29, 24, 18, 1);
  wh(-38, 17, 1, 14);
  wh(-20, 12.5, 1, 5);
  wh(-20, 21, 1, 6);
  B(-20, 16.5, 1, 3, 3, corr, { y: 4 });
  B(-29, 17, 18.8, 14.8, 0.5, corr, { y: 7, nc: 1, t: 4 });
  B(-29, 17, 12, 2, 0.6, dk, { y: 7.5, nc: 1 });
  [
    [-34, 20],
    [-28, 14],
    [-24, 20],
  ].forEach(([x, z]) => B(x, z, 1.8, 1.2, 1, steel, { y: 7.5, nc: 1, t: 1 }));
  for (let z = 12; z <= 22; z += 3) B(-38.07, z, 0.15, 1.6, 0.9, dk, { y: 5.3, nc: 1 });
  for (let x = -36; x <= -22; x += 4) B(x, 24.07, 1.8, 0.15, 0.9, dk, { y: 5.3, nc: 1 });
  B(-29, 8.6, 18, 1.8, 1.2, conc, { step: 1, t: 3 });
  B(-29, 7.7, 18, 0.3, 0.04, hazM, { y: 1.2, nc: 1, t: 1 });
  rack(-34, 19, 8);
  rack(-34, 22, 8);
  rack(-26, 22, 6);
  forklift(-25, 14);
  crate(-23, 18, 1.4);
  crate(-23, 19.4, 1.2);
  barrel(-36.5, 13.5);
  barrel(-36.5, 14.4, barG);

  /* ---------- container maze (east) ---------- */
  ct(21, 10, 6.2, 2.5, ctnR);
  ct(21, 10, 6.2, 2.5, ctnW, 2.6);
  ct(29, 10, 6.2, 2.5, ctnG, 0, 1);
  ct(17.5, 17, 2.5, 6.2, ctnB);
  ct(17.5, 17, 2.5, 6.2, ctnO, 2.6);
  ct(34, 16, 2.5, 6.2, ctnW);
  ct(26, 18, 6.2, 2.5, ctnB, 0, 1);
  ct(26, 22, 6.2, 2.5, ctnR);
  ct(33, 23, 2.5, 6.2, ctnG, 0, 1);
  B(21, 6.7, 16, 1.8, 1.2, conc, { step: 1, t: 3 });
  B(21, 5.75, 16, 0.3, 0.04, hazM, { y: 1.2, nc: 1, t: 1 });
  crate(30, 13.5, 1.4);
  crate(31.5, 13.8, 1.2);
  barrel(22.5, 14.5);
  barrel(23.4, 15, barG);

  /* ---------- central yard: crane, substation, cover ---------- */
  crane(-12, -15);
  B(2, 16, 10, 6, 0.2, conc, { nc: 1, t: 3 });
  [-1, 2, 5].forEach((x) => {
    B(x, 16, 2.2, 2, 2.6, trM, { t: 2 });
    [-0.5, 0.5].forEach((a) => C(x + a, 16, 0.15, 0.8, dk, { y: 2.6, nc: 1, seg: 6 }));
  });
  fence(2, 12.9, 10, 0, 0, 2.2);
  fence(2, 19.1, 10, 0, 0, 2.2);
  fence(-3, 16, 6.2, PI / 2, 0, 2.2);
  fence(7, 16, 6.2, PI / 2, 0, 2.2);
  forklift(8, 11);
  bar(-8, 14);
  bar(-4.5, 10.5, 0.8, 3);
  bar(-9, 20);
  bar(13, 22);
  crate(-5, 22, 1.4);
  crate(-3.6, 22.3, 1.2);
  crate(-4.4, 22.1, 1.1, 1.4);
  barrel(0, 10);
  barrel(0.9, 10.4, barG);
  B(10, 6.6, 16, 2, 1.2, conc, { step: 1, t: 3 });
  B(10, 5.65, 16, 0.3, 0.04, hazM, { y: 1.2, nc: 1, t: 1 });

  /* ---------- rubble ---------- */
  for (let i = 0, n = 0; i < 500 && n < 70; i++) {
    const x = (rnd() - 0.5) * 78;
    const z = (rnd() - 0.5) * 78;
    if (Math.abs(z) < 6 || R.some((r) => Math.abs(x - r[0]) < r[2] / 2 + 1 && Math.abs(z - r[1]) < r[3] / 2 + 1)) continue;
    n++;
    const s = 0.15 + rnd() * 0.4;
    const o = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM);
    o.position.set(x, s * 0.5, z);
    o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    add(o);
  }

  /* ---------- drifting dust ---------- */
  const N = 500;
  const dp = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) dp[i] = (rnd() - 0.5) * 70;
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({ color: 0xf0e4c0, size: 0.13, transparent: true, opacity: 0.5, depthWrite: false })
  );
  dust.frustumCulled = false;
  group.add(dust);

  /* ---------- harsh midday sky dome ---------- */
  const skyT = tex(8, 256, (g, w, h) => {
    const r = g.createLinearGradient(0, 0, 0, h);
    r.addColorStop(0, '#2f79d0');
    r.addColorStop(0.42, '#8dc0ee');
    r.addColorStop(0.49, '#e6e2cf');
    r.addColorStop(0.5, '#e8dcbc');
    r.addColorStop(1, '#e4d9bd');
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
    [-14, 33],
    [14, 33],
    [0, 30],
  ];

  // Red / Bravo at North (Z ~ -33)
  const bravoSpawns: [number, number][] = [
    [0, -33],
    [-6, -33],
    [6, -33],
    [-14, -33],
    [14, -33],
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
