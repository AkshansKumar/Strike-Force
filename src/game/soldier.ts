import * as THREE from 'three';
import type { Team } from './types';
import type { WeaponId } from './weapons';

export type OperatorClass = 'assault' | 'smg' | 'sniper' | 'shotgun' | 'lmg';
export type BootStyle = 'stomper' | 'tactical' | 'patrol' | 'stealth';

export interface SoldierMesh {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  gunTip: THREE.Object3D;
  setDead(d: boolean): void;
  setAimPitch(p: number): void;
  animateWalk(t: number, speed: number, dt?: number): void;
  setWeapon(w: WeaponId): void;
  setOperator(op: OperatorClass, boot?: BootStyle): void;
  setCrouch?(crouch: boolean): void;
}

export function buildSoldier(
  team: Team,
  initialWeapon: WeaponId = 'assault',
  initialOperator?: OperatorClass,
  initialBoot?: BootStyle
): SoldierMesh {
  const group = new THREE.Group();
  const primary = team === 'alpha' ? 0x2563eb : 0xdc2626;
  const dark = team === 'alpha' ? 0x1d3f63 : 0x5e1f18;

  // Base tactical materials
  const matBody = new THREE.MeshStandardMaterial({ color: primary, roughness: 0.75, metalness: 0.15 });
  const matDark = new THREE.MeshStandardMaterial({ color: dark, roughness: 0.85 });
  const matSkin = new THREE.MeshStandardMaterial({ color: 0xc9a486, roughness: 0.8 });
  const matVisor = new THREE.MeshStandardMaterial({ color: 0x182026, roughness: 0.25, metalness: 0.85 });

  // Dedicated gear materials
  const matTan = new THREE.MeshStandardMaterial({ color: 0xc49354, roughness: 0.7 });
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.85 });
  const matShellRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const matBrassGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.9 });
  const matGhillie = new THREE.MeshStandardMaterial({ color: 0x47553b, roughness: 0.9 });
  const matNVGLens = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const matCyanGlow = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

  // Boot materials
  const matBootBlack = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 });
  const matBootSole = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.95 });
  const matBootTan = new THREE.MeshStandardMaterial({ color: 0xa1713d, roughness: 0.8 });

  // Weapon materials
  const matGunMetal = new THREE.MeshStandardMaterial({ color: 0x181c20, roughness: 0.45, metalness: 0.75 });
  const matWoodPump = new THREE.MeshStandardMaterial({ color: 0xba7e44, roughness: 0.8 });
  const matDrumGreen = new THREE.MeshStandardMaterial({ color: 0x364835, roughness: 0.5, metalness: 0.4 });
  const matSniperBody = new THREE.MeshStandardMaterial({ color: 0x485244, roughness: 0.6 });
  const matScopeLens = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const matSilverSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.9 });

  // ================= SKELETON HIERARCHY =================
  // Pelvis / Hips root
  const pelvis = new THREE.Group();
  pelvis.position.y = 0.74;
  group.add(pelvis);

  // Torso / Upper body
  const torso = new THREE.Group();
  pelvis.add(torso);

  // Fatigues Torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.64, 0.32), matBody);
  body.position.y = 0.34;
  body.castShadow = true;
  torso.add(body);

  // Base plate carrier vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.40, 0.36), matDark);
  vest.position.set(0, 0.40, -0.01);
  torso.add(vest);

  // Dynamic class gear container (mag pouches, shotgun shells, ammo chain, radio, etc.)
  const gearGroup = new THREE.Group();
  torso.add(gearGroup);

  // Head pivot
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.74, 0);
  torso.add(headPivot);

  // Base head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), matSkin);
  head.position.y = 0.14;
  head.castShadow = true;
  headPivot.add(head);

  // Dynamic helmet / headgear container
  const helmetGroup = new THREE.Group();
  headPivot.add(helmetGroup);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.15, 0.48, 0.15);
  const armPivotL = new THREE.Group();
  armPivotL.position.set(-0.36, 0.46, -0.06);
  armPivotL.rotation.x = 1.08;
  const armMeshL = new THREE.Mesh(armGeo, matBody);
  armMeshL.position.y = -0.2;
  const gloveL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), matDark);
  gloveL.position.y = -0.42;
  armPivotL.add(armMeshL, gloveL);
  torso.add(armPivotL);

  const armPivotR = new THREE.Group();
  armPivotR.position.set(0.36, 0.46, -0.06);
  armPivotR.rotation.x = 1.08;
  const armMeshR = new THREE.Mesh(armGeo, matBody);
  armMeshR.position.y = -0.2;
  const gloveR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), matDark);
  gloveR.position.y = -0.42;
  armPivotR.add(armMeshR, gloveR);
  torso.add(armPivotR);

  // Gun mount
  const gun = new THREE.Group();
  const gunTip = new THREE.Object3D();
  gun.position.set(0.16, 0.48, -0.45);
  torso.add(gun);

  // Legs: clean Minecraft-style limbs in the body uniform color
  const legPivotL = new THREE.Group();
  legPivotL.position.set(-0.16, 0, 0);
  pelvis.add(legPivotL);

  const legMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.54, 0.24), matBody);
  legMeshL.position.y = -0.27;
  legMeshL.castShadow = true;
  legPivotL.add(legMeshL);

  const bootLGroup = new THREE.Group();
  bootLGroup.position.set(0, -0.54, 0);
  legPivotL.add(bootLGroup);

  // Right leg
  const legPivotR = new THREE.Group();
  legPivotR.position.set(0.16, 0, 0);
  pelvis.add(legPivotR);

  const legMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.54, 0.24), matBody);
  legMeshR.position.y = -0.27;
  legMeshR.castShadow = true;
  legPivotR.add(legMeshR);

  const bootRGroup = new THREE.Group();
  bootRGroup.position.set(0, -0.54, 0);
  legPivotR.add(bootRGroup);

  // ================= BUILD BOOTS =================
  const attachBoots = (style: BootStyle = 'tactical') => {
    while (bootLGroup.children.length > 0) bootLGroup.remove(bootLGroup.children[0]);
    while (bootRGroup.children.length > 0) bootRGroup.remove(bootRGroup.children[0]);

    const leatherMat = style === 'patrol' ? matBootTan : (style === 'stealth' ? matDark : matBootBlack);

    // Left Boot (clean block at base of leg)
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.26), leatherMat);
    bootL.position.set(0, -0.075, -0.01);
    const soleL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.28), style === 'patrol' ? matTan : matBootSole);
    soleL.position.set(0, -0.165, -0.01);
    bootLGroup.add(bootL, soleL);

    if (style === 'stomper') {
      const toeCapL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.07), matSteel);
      toeCapL.position.set(0, -0.11, -0.135);
      bootLGroup.add(toeCapL);
    } else if (style === 'stealth') {
      const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.05), matCyanGlow);
      stripeL.position.set(0, -0.10, 0.11);
      bootLGroup.add(stripeL);
    }

    // Right Boot
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.26), leatherMat);
    bootR.position.set(0, -0.075, -0.01);
    const soleR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.28), style === 'patrol' ? matTan : matBootSole);
    soleR.position.set(0, -0.165, -0.01);
    bootRGroup.add(bootR, soleR);

    if (style === 'stomper') {
      const toeCapR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.07), matSteel);
      toeCapR.position.set(0, -0.11, -0.135);
      bootRGroup.add(toeCapR);
    } else if (style === 'stealth') {
      const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.05), matCyanGlow);
      stripeR.position.set(0, -0.10, 0.11);
      bootRGroup.add(stripeR);
    }
  };

  // ================= 5 DETAILED OPERATOR MODELS =================
  const attachOperator = (op: OperatorClass = 'assault', bootStyle?: BootStyle) => {
    while (gearGroup.children.length > 0) gearGroup.remove(gearGroup.children[0]);
    while (helmetGroup.children.length > 0) helmetGroup.remove(helmetGroup.children[0]);

    const chosenBoot = bootStyle || (
      op === 'shotgun' ? 'stomper' : (op === 'smg' ? 'stealth' : (op === 'sniper' ? 'patrol' : 'tactical'))
    );
    attachBoots(chosenBoot);

    if (op === 'assault') {
      // 1. ASSAULT COMMANDO: MICH helmet with NVG goggles raised, radio antenna, 3x AR mag pouches, shoulder radio
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.35), matDark);
      helmet.position.y = 0.22;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.05), matVisor);
      visor.position.set(0, 0.15, -0.15);
      const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.05), matDark);
      nvgMount.position.set(0, 0.25, -0.18);
      const nvgTubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 8), matDark);
      nvgTubeL.rotation.x = -Math.PI / 3.2;
      nvgTubeL.position.set(-0.06, 0.29, -0.22);
      const nvgTubeR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 8), matDark);
      nvgTubeR.rotation.x = -Math.PI / 3.2;
      nvgTubeR.position.set(0.06, 0.29, -0.22);
      const lensL = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), matNVGLens);
      lensL.rotation.x = -Math.PI / 3.2;
      lensL.position.set(-0.06, 0.34, -0.26);
      const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), matNVGLens);
      lensR.rotation.x = -Math.PI / 3.2;
      lensR.position.set(0.06, 0.34, -0.26);

      // Comms headset
      const earL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.08), matDark);
      earL.position.set(-0.16, 0.14, -0.02);
      const earR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.08), matDark);
      earR.position.set(0.16, 0.14, -0.02);
      const boomMic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), matDark);
      boomMic.rotation.z = Math.PI / 3;
      boomMic.position.set(-0.12, 0.06, -0.14);
      helmetGroup.add(helmet, visor, nvgMount, nvgTubeL, nvgTubeR, lensL, lensR, earL, earR, boomMic);

      // Gear: 3x AR mag pouches on chest in coyote tan
      for (let i = -1; i <= 1; i++) {
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.07), matTan);
        pouch.position.set(i * 0.14, 0.36, -0.21);
        gearGroup.add(pouch);
      }
      // Shoulder tactical radio + antenna
      const radio = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.08), matDark);
      radio.position.set(-0.24, 0.54, -0.08);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6), matDark);
      antenna.position.set(-0.27, 0.70, -0.08);
      gearGroup.add(radio, antenna);

    } else if (op === 'smg') {
      // 2. RECON INFILTRATOR: Balaclava mask, glowing cyan night-ops visor, slim SMG stick pouches, chest combat knife
      const balaclava = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.20, 0.29), matDark);
      balaclava.position.y = 0.10;
      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.06), matCyanGlow);
      goggles.position.set(0, 0.17, -0.15);
      const bumpHelmet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.33), matDark);
      bumpHelmet.position.y = 0.23;
      helmetGroup.add(balaclava, goggles, bumpHelmet);

      // 3x slim vertical SMG pouches
      for (let i = -1; i <= 1; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.06), matDark);
        p.position.set(i * 0.11, 0.36, -0.20);
        gearGroup.add(p);
      }
      // Tactical knife sheathed horizontally across upper chest
      const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.05), matDark);
      sheath.position.set(0, 0.52, -0.20);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.045), matTan);
      handle.position.set(0.14, 0.52, -0.20);
      gearGroup.add(sheath, handle);

    } else if (op === 'sniper') {
      // 3. GHOST SHARPSHOOTER: Ghillie cowl hood with foliage drape, mirror-tint visor, heavy .50 mag pouch, prone-mat pack
      const ghillieHood = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.38), matGhillie);
      ghillieHood.position.y = 0.20;
      const mirrorVisor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.05), matVisor);
      mirrorVisor.position.set(0, 0.16, -0.16);
      helmetGroup.add(ghillieHood, mirrorVisor);

      // Ghillie shoulder drape
      const drapeL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), matGhillie);
      drapeL.position.set(-0.30, 0.50, 0);
      const drapeR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), matGhillie);
      drapeR.position.set(0.30, 0.50, 0);
      // Heavy sniper .50 ammo pouch
      const sniperPouch = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.10), matDark);
      sniperPouch.position.set(0, 0.36, -0.21);
      // Prone-mat bedroll strapped horizontally on lower back
      const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.48, 8), matGhillie);
      bedroll.rotation.z = Math.PI / 2;
      bedroll.position.set(0, 0.18, 0.22);
      gearGroup.add(drapeL, drapeR, sniperPouch, bedroll);

    } else if (op === 'shotgun') {
      // 4. BREACHER POINTMAN: Riot helmet with transparent blast shield, heavy collar gorget, 5x red/gold 12G shells, sledgehammer
      const riotHelmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.20, 0.37), matDark);
      riotHelmet.position.y = 0.23;
      const blastVisor = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.20, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, roughness: 0.1 })
      );
      blastVisor.position.set(0, 0.14, -0.19);
      helmetGroup.add(riotHelmet, blastVisor);

      // Heavy collar blast gorget
      const gorget = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.10, 0.34), matSteel);
      gorget.position.set(0, 0.62, 0);
      gearGroup.add(gorget);

      // 5 visible shotgun shells on chest (red cylinder + brass rim)
      for (let i = 0; i < 5; i++) {
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.11, 8), matShellRed);
        shell.rotation.z = Math.PI / 2;
        shell.position.set(-0.20 + i * 0.10, 0.38, -0.20);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 8), matBrassGold);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(-0.24 + i * 0.10, 0.38, -0.20);
        gearGroup.add(shell, rim);
      }

      // Breaching sledgehammer strapped to back
      const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 6), matWoodPump);
      hammerHandle.rotation.z = 0.6;
      hammerHandle.position.set(0.05, 0.44, 0.22);
      const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.10), matSteel);
      hammerHead.rotation.z = 0.6;
      hammerHead.position.set(0.24, 0.72, 0.22);
      gearGroup.add(hammerHandle, hammerHead);

    } else {
      // 5. TITAN JUGGERNAUT: Ballistic welding face plate with narrow eye slit, heavy shoulder pauldrons, golden brass belted ammo chain
      const jugMask = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.08), matSteel);
      jugMask.position.set(0, 0.14, -0.16);
      const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.06), matCyanGlow);
      eyeSlit.position.set(0, 0.17, -0.19);
      const heavyCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), matDark);
      heavyCap.position.y = 0.28;
      helmetGroup.add(jugMask, eyeSlit, heavyCap);

      // Heavy shoulder pauldrons
      const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), matSteel);
      pauldronL.position.set(-0.36, 0.58, 0);
      const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), matSteel);
      pauldronR.position.set(0.36, 0.58, 0);
      // Heavy chest blast plate
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.08), matSteel);
      chestPlate.position.set(0, 0.40, -0.20);
      // Golden belted ammo chain draped across chest
      const ammoBelt = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.08), matBrassGold);
      ammoBelt.rotation.z = 0.55;
      ammoBelt.position.set(0, 0.40, -0.22);
      // Heavy backpack ammo pack
      const ammoPack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.24), matDrumGreen);
      ammoPack.position.set(0, 0.38, 0.26);
      gearGroup.add(pauldronL, pauldronR, chestPlate, ammoBelt, ammoPack);
    }
  };

  // ================= 5 WEAPON MODELS =================
  const attachGun = (w: WeaponId) => {
    while (gun.children.length > 0) gun.remove(gun.children[0]);

    if (w === 'sniper') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.72), matSniperBody);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.68, 8), matGunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.65;
      const mBrake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.09), matGunMetal);
      mBrake.position.set(0, 0, -1.02);

      const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.36, 8), matGunMetal);
      scopeBody.rotation.x = Math.PI / 2;
      scopeBody.position.set(0, 0.125, -0.06);
      const scopeLensF = new THREE.Mesh(new THREE.CircleGeometry(0.032, 8), matScopeLens);
      scopeLensF.position.set(0, 0.125, -0.245);
      const scopeLensB = new THREE.Mesh(new THREE.CircleGeometry(0.032, 8), matScopeLens);
      scopeLensB.rotation.y = Math.PI;
      scopeLensB.position.set(0, 0.125, 0.125);

      const bipodL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), matSilverSteel);
      bipodL.position.set(-0.06, -0.1, -0.58);
      bipodL.rotation.z = -0.35;
      const bipodR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.012), matSilverSteel);
      bipodR.position.set(0.06, -0.1, -0.58);
      bipodR.rotation.z = 0.35;

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.14), matGunMetal);
      mag.position.set(0, -0.16, 0.02);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.28), matSniperBody);
      stock.position.set(0, 0.02, 0.42);

      gun.add(receiver, barrel, mBrake, scopeBody, scopeLensF, scopeLensB, bipodL, bipodR, mag, stock);
      gunTip.position.set(0, 0, -1.08);

    } else if (w === 'smg') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.38), matGunMetal);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), matGunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.28;

      const stickMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.055), matSilverSteel);
      stickMag.position.set(0, -0.18, 0.04);
      stickMag.rotation.x = -0.18;

      const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.035), matDark);
      foregrip.position.set(0, -0.1, -0.14);

      const reflex = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.06), matScopeLens);
      reflex.position.set(0, 0.09, -0.04);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.16), matDark);
      stock.position.set(0, 0.01, 0.24);

      gun.add(receiver, barrel, stickMag, foregrip, reflex, stock);
      gunTip.position.set(0, 0, -0.46);

    } else if (w === 'shotgun') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 0.52), matGunMetal);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.46, 8), matGunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.44;

      const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.42, 8), matGunMetal);
      magTube.rotation.x = Math.PI / 2;
      magTube.position.set(0, -0.05, -0.42);

      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.22), matWoodPump);
      pump.position.set(0, -0.045, -0.38);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.26), matWoodPump);
      stock.position.set(0, 0.01, 0.35);

      gun.add(receiver, barrel, magTube, pump, stock);
      gunTip.position.set(0, 0, -0.72);

    } else if (w === 'lmg') {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.64), matGunMetal);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 8), matGunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.52;

      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.11, 12), matDrumGreen);
      drum.rotation.z = Math.PI / 2;
      drum.position.set(0.11, -0.14, 0.02);

      const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.2), matDark);
      carryHandle.position.set(-0.04, 0.13, -0.1);
      carryHandle.rotation.z = -0.25;

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.24), matDark);
      stock.position.set(0, 0.02, 0.4);

      gun.add(receiver, barrel, drum, carryHandle, stock);
      gunTip.position.set(0, 0, -0.78);

    } else {
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.13, 0.58), matGunMetal);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.36, 8), matGunMetal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.45;

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.11), matTan);
      mag.position.set(0, -0.16, 0.02);
      mag.rotation.x = 0.2;

      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), matDark);
      sight.position.set(0, 0.06, -0.44);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.24), matDark);
      stock.position.set(0, 0.02, 0.35);

      gun.add(receiver, barrel, mag, sight, stock);
      gunTip.position.set(0, 0, -0.68);
    }

    gun.add(gunTip);
  };

  // Initialize
  const defaultClass = initialOperator || (initialWeapon as OperatorClass);
  attachOperator(defaultClass, initialBoot);
  attachGun(initialWeapon);

  // ================= MINECRAFT-STYLE BIPED LOCOMOTION =================
  const state = { walkT: 0, lastT: 0, blendS: 0 };
  let isCrouched = false;
  let crouchBlend = 0;

  return {
    group,
    body,
    head,
    gunTip,
    setCrouch(c: boolean) {
      isCrouched = c;
    },
    setDead(d: boolean) {
      if (d) {
        group.rotation.z = Math.PI / 2;
        group.position.y = 0.35;
      } else {
        group.rotation.z = 0;
        group.position.y = 0;
      }
    },
    setAimPitch(p: number) {
      headPivot.rotation.x = p * 0.4;
      gun.rotation.x = p;
    },
    animateWalk(t: number, speed: number, dt?: number) {
      // Precise frame delta calculation
      const delta = (dt !== undefined && dt > 0 && dt < 0.2)
        ? dt
        : (state.lastT > 0 ? Math.min(0.05, Math.max(0.001, t - state.lastT)) : 0.016);
      state.lastT = t;

      // Smooth blend weight based on speed
      const targetS = Math.min(speed / 3.6, 1);
      state.blendS += (targetS - state.blendS) * Math.min(1, 10 * delta);
      const s = state.blendS;

      // Advance gait cycle phase synchronized with ground velocity
      if (speed > 0.05) {
        state.walkT += 2.25 * speed * delta;
      }

      crouchBlend += ((isCrouched ? 1 : 0) - crouchBlend) * Math.min(1, 14 * delta);

      // Neutral standing ready stance when idle
      if (s < 0.02) {
        const breath = Math.sin(t * 2.2) * 0.012;
        torso.position.y = breath - crouchBlend * 0.12;
        gun.position.y = 0.48 + breath * 0.4 - crouchBlend * 0.12;
        gun.position.x = 0.16;
        gun.rotation.z = 0;
        torso.rotation.set(Math.sin(t * 1.4) * 0.01 + crouchBlend * 0.12, 0, 0);
        armPivotL.rotation.x = 1.08 + Math.sin(t * 1.8) * 0.015;
        armPivotR.rotation.x = 1.08 - Math.sin(t * 1.8) * 0.015;
        pelvis.position.y = 0.72 - crouchBlend * 0.28;
        pelvis.rotation.set(0, 0, 0);
        headPivot.rotation.set(0, 0, 0);

        // Standing / crouching leg posture
        legPivotL.rotation.set(-crouchBlend * 0.45, 0, 0);
        legPivotR.rotation.set(-crouchBlend * 0.45, 0, 0);
        return;
      }

      torso.position.y = -crouchBlend * 0.12;

      // Pure Minecraft biped leg swing:
      // Left leg and Right leg swing as solid blocks in clean opposing pendulum motion!
      const strideAmp = (0.36 + 0.05 * Math.min(speed, 5.0)) * s;
      const swing = Math.sin(state.walkT);

      // In Three.js: -X swings forward (-Z), +X swings backward (+Z)
      legPivotL.rotation.x = -swing * strideAmp - crouchBlend * 0.3;
      legPivotR.rotation.x = swing * strideAmp - crouchBlend * 0.3;
      legPivotL.rotation.y = 0;
      legPivotR.rotation.y = 0;
      legPivotL.rotation.z = 0;
      legPivotR.rotation.z = 0;

      // Pelvis stays steady and level
      pelvis.position.y = 0.72 - crouchBlend * 0.28;
      pelvis.rotation.set(0, 0, 0);

      // Subtle upper-body counter-swing:
      torso.rotation.y = -0.06 * s * swing;
      torso.rotation.x = 0.06 * s; // slight forward athletic lean
      headPivot.rotation.y = -torso.rotation.y;

      // Arms counter-swing opposite to legs
      armPivotL.rotation.x = 1.08 + 0.12 * s * swing;
      armPivotR.rotation.x = 1.08 - 0.12 * s * swing;

      // Weapon breathing bob
      gun.position.y = 0.48 + 0.012 * s * Math.cos(2 * state.walkT);
      gun.position.x = 0.16 + 0.008 * s * swing;
    },
    setWeapon(w: WeaponId) {
      attachGun(w);
    },
    setOperator(op: OperatorClass, boot?: BootStyle) {
      attachOperator(op, boot);
    },
  };
}
