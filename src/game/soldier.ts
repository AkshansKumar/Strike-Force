import * as THREE from 'three';
import type { Team } from './types';

export interface SoldierMesh {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  gunTip: THREE.Object3D;
  legs: THREE.Mesh[];
  armR: THREE.Mesh;
  setDead(d: boolean): void;
  setAimPitch(p: number): void;
  animateWalk(t: number, speed: number): void;
}

export function buildSoldier(team: Team): SoldierMesh {
  const group = new THREE.Group();
  const primary = team === 'alpha' ? 0x2e6fb7 : 0xc23b2e;
  const dark = team === 'alpha' ? 0x1d3f63 : 0x5e1f18;

  const matBody = new THREE.MeshStandardMaterial({ color: primary, roughness: 0.75, metalness: 0.15 });
  const matDark = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.85 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc9a486, roughness: 0.8 });
  const matGun = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.45, metalness: 0.7 });
  const matVisor = new THREE.MeshStandardMaterial({ color: 0x182026, roughness: 0.25, metalness: 0.85 });

  // torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), matBody);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);

  // vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.38), matDark);
  vest.position.set(0, 1.12, -0.02);
  group.add(vest);

  // head with helmet & visor (front is -Z)
  const headPivot = new THREE.Group();
  headPivot.position.y = 1.46;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matSkin);
  head.position.y = 0.16;
  head.castShadow = true;
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.36), matDark);
  helmet.position.y = 0.32;
  // Tactical visor facing forward (-Z)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.06), matVisor);
  visor.position.set(0, 0.18, -0.16);
  headPivot.add(head, helmet, visor);
  group.add(headPivot);

  // legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.68, 0.26);
  const legL = new THREE.Mesh(legGeo, matDark);
  legL.position.set(-0.16, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, matDark);
  legR.position.set(0.16, 0.35, 0);
  legL.castShadow = legR.castShadow = true;
  group.add(legL, legR);

  // arms + gun (held forward along -Z)
  const armGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);
  const armL = new THREE.Mesh(armGeo, matBody);
  armL.position.set(-0.4, 1.12, -0.08);
  armL.rotation.x = 1.1; // reach forward (-Z)
  const armR = new THREE.Mesh(armGeo, matBody);
  armR.position.set(0.4, 1.12, -0.08);
  armR.rotation.x = 1.1; // reach forward (-Z)
  group.add(armL, armR);

  const gun = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.62), matGun);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), matGun);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.45; // barrel extends forward (-Z)
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.12), matGun);
  mag.position.set(0, -0.15, -0.05);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.22), matDark);
  stock.position.set(0, 0.02, 0.32); // stock at rear (+Z)
  gun.add(receiver, barrel, mag, stock);
  gun.position.set(0.18, 1.22, -0.45); // weapon placed forward (-Z) in right hand
  group.add(gun);

  const gunTip = new THREE.Object3D();
  gunTip.position.set(0, 0, -0.66); // muzzle at forward tip (-Z)
  gun.add(gunTip);

  const state = { walkT: 0 };

  return {
    group,
    body,
    head,
    gunTip,
    legs: [legL, legR],
    armR,
    setDead(d: boolean) {
      if (d) {
        group.rotation.z = Math.PI / 2;
        group.position.y = 0.35;
      } else {
        group.rotation.z = 0;
      }
    },
    setAimPitch(p: number) {
      headPivot.rotation.x = p * 0.4;
      gun.rotation.x = p;
    },
    animateWalk(_t: number, speed: number) {
      state.walkT += speed * 0.16;
      const s = Math.min(speed / 5, 1);
      legL.rotation.x = Math.sin(state.walkT) * 0.7 * s;
      legR.rotation.x = -Math.sin(state.walkT) * 0.7 * s;
      body.position.y = 1.05 + Math.abs(Math.sin(state.walkT)) * 0.04 * s;
    },
  };
}
