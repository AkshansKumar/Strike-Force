import * as THREE from 'three';

export type WeaponId = 'assault' | 'smg' | 'sniper' | 'shotgun' | 'lmg';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  category: string;
  description: string;
  magSize: number;
  reserve: number;
  rpm: number;
  damage: number;
  pellets?: number;
  headshotMult: number;
  reloadTime: number;
  spreadHip: number;
  spreadAds: number;
  zoomFov: number; // FOV reduction (targetFov = baseFov - zoomFov)
  recoil: number;
  falloffStart: number;
  falloffMin: number;
  hipPos: THREE.Vector3;
  adsPos: THREE.Vector3;
  adsRot?: THREE.Vector3;
  hasSniperScope?: boolean;
  isPumpAction?: boolean;
  pumpDuration?: number;
  isBoltAction?: boolean;
  boltDuration?: number;
  // UI rating bars (0-100)
  damageRating: number;
  fireRateRating: number;
  rangeRating: number;
  mobilityRating: number;
  controlRating: number;
  hotkey: string;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  assault: {
    id: 'assault',
    name: 'MK-7 CARBINE',
    category: 'Assault Rifle',
    description: 'Standard issue tactical carbine. Exceptional balance of automatic fire rate, mid-range precision, and controllable recoil.',
    magSize: 30,
    reserve: 120,
    rpm: 720,
    damage: 30,
    headshotMult: 2.1,
    reloadTime: 2.1,
    spreadHip: 0.028,
    spreadAds: 0.004,
    zoomFov: 18,
    recoil: 0.05,
    falloffStart: 24,
    falloffMin: 0.55,
    hipPos: new THREE.Vector3(0.22, -0.2, -0.45),
    adsPos: new THREE.Vector3(0, -0.078, -0.28),
    damageRating: 68,
    fireRateRating: 72,
    rangeRating: 70,
    mobilityRating: 70,
    controlRating: 75,
    hotkey: '1',
  },
  smg: {
    id: 'smg',
    name: 'VIPER-9 SMG',
    category: 'Submachine Gun',
    description: 'Ultra-high cyclic rate submachine gun with reflex holographic sight. Dominates close-quarters combat with lightning handling.',
    magSize: 35,
    reserve: 140,
    rpm: 1050,
    damage: 22,
    headshotMult: 1.85,
    reloadTime: 1.5,
    spreadHip: 0.034,
    spreadAds: 0.007,
    zoomFov: 14,
    recoil: 0.038,
    falloffStart: 15,
    falloffMin: 0.42,
    hipPos: new THREE.Vector3(0.2, -0.18, -0.42),
    adsPos: new THREE.Vector3(0, -0.095, -0.28),
    damageRating: 52,
    fireRateRating: 95,
    rangeRating: 45,
    mobilityRating: 92,
    controlRating: 72,
    hotkey: '2',
  },
  sniper: {
    id: 'sniper',
    name: 'REAPER-50',
    category: 'Sniper Rifle',
    description: 'Heavy bolt-action anti-materiel sniper rifle with high-magnification ballistic optic. Lethal one-shot elimination on upper torso or head.',
    magSize: 5,
    reserve: 25,
    rpm: 48,
    damage: 96,
    headshotMult: 2.5,
    reloadTime: 3.2,
    spreadHip: 0.095,
    spreadAds: 0.0005,
    zoomFov: 50, // zooms from 75 to 25
    recoil: 0.22,
    falloffStart: 90,
    falloffMin: 0.85,
    hipPos: new THREE.Vector3(0.24, -0.22, -0.48),
    adsPos: new THREE.Vector3(0, -0.13, -0.28),
    hasSniperScope: true,
    isBoltAction: true,
    boltDuration: 0.8,
    damageRating: 98,
    fireRateRating: 18,
    rangeRating: 99,
    mobilityRating: 38,
    controlRating: 42,
    hotkey: '3',
  },
  shotgun: {
    id: 'shotgun',
    name: 'BULLDOG-12',
    category: 'Combat Shotgun',
    description: '12-gauge tactical pump-action shotgun firing an 8-pellet buckshot spread. Unmatched destructive power at point-blank range.',
    magSize: 8,
    reserve: 32,
    rpm: 75,
    damage: 18,
    pellets: 8,
    headshotMult: 1.5,
    reloadTime: 2.4,
    spreadHip: 0.065,
    spreadAds: 0.038,
    zoomFov: 10,
    recoil: 0.16,
    falloffStart: 9,
    falloffMin: 0.22,
    hipPos: new THREE.Vector3(0.22, -0.2, -0.44),
    adsPos: new THREE.Vector3(0, -0.082, -0.32),
    isPumpAction: true,
    pumpDuration: 0.5,
    damageRating: 92,
    fireRateRating: 32,
    rangeRating: 30,
    mobilityRating: 75,
    controlRating: 54,
    hotkey: '4',
  },
  lmg: {
    id: 'lmg',
    name: 'TITAN LMG',
    category: 'Light Machine Gun',
    description: 'Sustained-fire squad automatic weapon equipped with a 75-round high-capacity drum. Unstoppable area suppression and penetrating power.',
    magSize: 75,
    reserve: 150,
    rpm: 600,
    damage: 34,
    headshotMult: 2.0,
    reloadTime: 3.6,
    spreadHip: 0.038,
    spreadAds: 0.005,
    zoomFov: 16,
    recoil: 0.046,
    falloffStart: 38,
    falloffMin: 0.72,
    hipPos: new THREE.Vector3(0.24, -0.22, -0.48),
    adsPos: new THREE.Vector3(0, -0.095, -0.34),
    damageRating: 78,
    fireRateRating: 64,
    rangeRating: 82,
    mobilityRating: 40,
    controlRating: 60,
    hotkey: '5',
  },
};

export const WEAPON_LIST: WeaponDef[] = [
  WEAPONS.assault,
  WEAPONS.smg,
  WEAPONS.sniper,
  WEAPONS.shotgun,
  WEAPONS.lmg,
];

export interface ViewmodelComponents {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  flash: THREE.Mesh;
  magMesh?: THREE.Object3D;
  boltMesh?: THREE.Object3D;
  pumpMesh?: THREE.Object3D;
  sightMesh?: THREE.Object3D;
  handL: THREE.Object3D;
  handR: THREE.Object3D;
}

export function buildWeaponViewmodel(id: WeaponId): ViewmodelComponents {
  const g = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.4, metalness: 0.75 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.6, metalness: 0.85 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x3b3428, roughness: 0.9 });
  const tanMat = new THREE.MeshStandardMaterial({ color: 0x7a6b52, roughness: 0.85 });
  const handMat = new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 0.9 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.25, metalness: 0.95 });

  const muzzle = new THREE.Object3D();
  let flashMesh: THREE.Mesh;
  let magMesh: THREE.Object3D | undefined;
  let boltMesh: THREE.Object3D | undefined;
  let pumpMesh: THREE.Object3D | undefined;
  let sightMesh: THREE.Object3D | undefined;

  let handL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.12), handMat);
  let handR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.08), handMat);

  if (id === 'assault') {
    // MK-7 CARBINE
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.55), gunMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.42);
    const mBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), darkMat);
    mBrake.rotation.x = Math.PI / 2;
    mBrake.position.set(0, 0.02, -0.6);

    // Handguard / tactical rail around the barrel
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.075, 0.22), gripMat);
    handguard.position.set(0, 0.02, -0.34);

    magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.09), tanMat);
    magMesh.position.set(0, -0.13, 0.04);
    magMesh.rotation.x = 0.15;

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.2), gripMat);
    stock.position.set(0, -0.01, 0.34);

    // Solid front sight tower mounted directly onto the barrel (A2 style)
    const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.035), darkMat);
    sightBase.position.set(0, 0.042, -0.46);
    const sightWingL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.026, 0.02), darkMat);
    sightWingL.position.set(-0.013, 0.072, -0.46);
    const sightWingR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.026, 0.02), darkMat);
    sightWingR.position.set(0.013, 0.072, -0.46);
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.022, 0.012), darkMat);
    frontPost.position.set(0, 0.068, -0.46);
    const frontBead = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 8), new THREE.MeshBasicMaterial({ color: 0x33ff55 }));
    frontBead.position.set(0, 0.078, -0.46);

    // Rear aperture sight on receiver rail
    const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.03), darkMat);
    rearBase.position.set(0, 0.062, 0.16);
    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.022, 0.02), darkMat);
    rearL.position.set(-0.013, 0.075, 0.16);
    const rearR = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.022, 0.02), darkMat);
    rearR.position.set(0.013, 0.075, 0.16);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), gripMat);
    grip.position.set(0, -0.1, 0.2);
    grip.rotation.x = 0.3;

    handL.position.set(-0.02, -0.05, -0.14);
    handR.position.set(0, -0.11, 0.2);

    muzzle.position.set(0, 0.02, -0.64);
    g.add(
      body, barrel, handguard, mBrake, magMesh, stock,
      sightBase, sightWingL, sightWingR, frontPost, frontBead,
      rearBase, rearL, rearR, grip, handL, handR, muzzle
    );

  } else if (id === 'smg') {
    // VIPER-9 SMG (Compact, fast, holographic reflex sight)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.42), darkMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.28);

    const muzzleDevice = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.08), gunMat);
    muzzleDevice.position.set(0, 0.01, -0.38);

    magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.22, 0.055), tanMat);
    magMesh.position.set(0, -0.14, 0.06);
    magMesh.rotation.x = -0.08;

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.16), darkMat);
    stock.position.set(0, -0.01, 0.26);

    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.04), gripMat);
    foregrip.position.set(0, -0.08, -0.14);
    foregrip.rotation.x = 0.15;

    const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.055), gripMat);
    pistolGrip.position.set(0, -0.09, 0.14);
    pistolGrip.rotation.x = 0.28;

    // Reflex Holographic sight
    const holoBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.08), darkMat);
    holoBase.position.set(0, 0.065, -0.02);
    const holoPostL = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.05, 0.02), darkMat);
    holoPostL.position.set(-0.022, 0.095, -0.02);
    const holoPostR = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.05, 0.02), darkMat);
    holoPostR.position.set(0.022, 0.095, -0.02);
    const holoTop = new THREE.Mesh(new THREE.BoxGeometry(0.051, 0.007, 0.02), darkMat);
    holoTop.position.set(0, 0.12, -0.02);

    const holoLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.037, 0.045, 0.003),
      new THREE.MeshBasicMaterial({ color: 0x33e5ff, transparent: true, opacity: 0.22, depthWrite: false })
    );
    holoLens.position.set(0, 0.095, -0.02);

    // Glowing reticle quad
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    sightMesh = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.010, 16), reticleMat);
    sightMesh.position.set(0, 0.095, -0.018);
    const reticleDot = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 8), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    sightMesh.add(reticleDot);

    handL.position.set(-0.01, -0.06, -0.13);
    handR.position.set(0, -0.09, 0.14);

    muzzle.position.set(0, 0.01, -0.44);
    g.add(body, barrel, muzzleDevice, magMesh, stock, foregrip, pistolGrip, holoBase, holoPostL, holoPostR, holoTop, holoLens, sightMesh, handL, handR, muzzle);

  } else if (id === 'sniper') {
    // REAPER-50 (Heavy sniper with giant scope, long fluted barrel, bolt handle)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.65), darkMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.62, 10), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.58);

    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.12), darkMat);
    muzzleBrake.position.set(0, 0.03, -0.92);

    magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.14), darkMat);
    magMesh.position.set(0, -0.13, 0.02);

    // Bolt handle that can animate!
    boltMesh = new THREE.Group();
    const boltBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), chromeMat);
    boltBar.rotation.z = Math.PI / 2;
    boltBar.position.set(0.045, 0.05, 0.12);
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), darkMat);
    boltKnob.position.set(0.08, 0.05, 0.12);
    boltMesh.add(boltBar, boltKnob);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.28), tanMat);
    stock.position.set(0, -0.01, 0.44);
    const cheekPad = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.12), gripMat);
    cheekPad.position.set(0, 0.06, 0.42);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.06), gripMat);
    grip.position.set(0, -0.11, 0.22);
    grip.rotation.x = 0.32;

    // Sniper Optic Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), darkMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.115, -0.05);
    const scopeRing1 = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.065, 0.03), gunMat);
    scopeRing1.position.set(0, 0.09, 0.06);
    const scopeRing2 = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.065, 0.03), gunMat);
    scopeRing2.position.set(0, 0.09, -0.14);
    const scopeFrontHood = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.08, 12), darkMat);
    scopeFrontHood.rotation.x = Math.PI / 2;
    scopeFrontHood.position.set(0, 0.115, -0.22);

    // Folded bipod
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.2), darkMat);
    bipod.position.set(0, -0.04, -0.48);

    handL.position.set(-0.02, -0.04, -0.2);
    handR.position.set(0, -0.11, 0.22);

    muzzle.position.set(0, 0.03, -0.98);
    g.add(body, barrel, muzzleBrake, magMesh, boltMesh, stock, cheekPad, grip, scopeTube, scopeRing1, scopeRing2, scopeFrontHood, bipod, handL, handR, muzzle);

  } else if (id === 'shotgun') {
    // BULLDOG-12 (Combat Shotgun with sliding pump forend)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.52), gunMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.44, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.46);

    const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), darkMat);
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.02, -0.44);

    // Sliding pump forend!
    pumpMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.22, 10), gripMat);
    pumpMesh.rotation.x = Math.PI / 2;
    pumpMesh.position.set(0, -0.015, -0.38);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.26), gripMat);
    stock.position.set(0, -0.02, 0.35);

    const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), gripMat);
    pistolGrip.position.set(0, -0.1, 0.18);
    pistolGrip.rotation.x = 0.35;

    // Ghost ring sight
    const ghostRing = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), darkMat);
    ghostRing.position.set(0, 0.08, 0.16);
    const frontBead = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), tanMat);
    frontBead.position.set(0, 0.065, -0.66);

    handL.position.set(0, -0.03, -0.38); // holding pump
    handR.position.set(0, -0.1, 0.18);

    muzzle.position.set(0, 0.03, -0.7);
    g.add(body, barrel, magTube, pumpMesh, stock, pistolGrip, ghostRing, frontBead, handL, handR, muzzle);

  } else {
    // TITAN LMG (Heavy body, side drum box, perforated barrel shroud)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.62), darkMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.48, 10), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.5);

    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.36), darkMat);
    shroud.position.set(0, 0.025, -0.42);

    // Large Ammo Drum Magazine
    magMesh = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 14), tanMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0.08, -0.13, 0.02);
    const drumBracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), darkMat);
    drumBracket.position.set(0.04, -0.08, 0.02);
    magMesh.add(drum, drumBracket);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 0.22), gripMat);
    stock.position.set(0, -0.02, 0.38);

    const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.18), darkMat);
    carryHandle.position.set(-0.05, 0.12, -0.12);
    carryHandle.rotation.z = -0.25;

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.065), gripMat);
    grip.position.set(0, -0.11, 0.22);
    grip.rotation.x = 0.3;

    // Elevated tactical rear notch & front illuminated post
    const rearL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.02), darkMat);
    rearL.position.set(-0.014, 0.1, 0.16);
    const rearR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.02), darkMat);
    rearR.position.set(0.014, 0.1, 0.16);
    const rearBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.02), darkMat);
    rearBase.position.set(0, 0.076, 0.16);

    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.05, 0.02), darkMat);
    frontPost.position.set(0, 0.095, -0.58);
    const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa22 }));
    frontDot.position.set(0, 0.115, -0.58);

    handL.position.set(-0.03, -0.06, -0.18);
    handR.position.set(0, -0.11, 0.22);

    muzzle.position.set(0, 0.025, -0.74);
    g.add(body, barrel, shroud, magMesh, stock, carryHandle, grip, rearL, rearR, rearBase, frontPost, frontDot, handL, handR, muzzle);
  }

  // Muzzle flash disc
  const flashMat = new THREE.MeshBasicMaterial({
    color: id === 'smg' ? 0x88ffff : (id === 'sniper' ? 0xffbb44 : 0xffe082),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flashRadius = id === 'sniper' ? 0.22 : (id === 'shotgun' ? 0.2 : (id === 'smg' ? 0.1 : 0.14));
  flashMesh = new THREE.Mesh(new THREE.CircleGeometry(flashRadius, 8), flashMat);
  flashMesh.position.copy(muzzle.position);
  g.add(flashMesh);

  const def = WEAPONS[id];
  g.position.copy(def.hipPos);
  g.traverse((o) => { o.frustumCulled = false; });

  return {
    group: g,
    muzzle,
    flash: flashMesh,
    magMesh,
    boltMesh,
    pumpMesh,
    sightMesh,
    handL,
    handR,
  };
}
