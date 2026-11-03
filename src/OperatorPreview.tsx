import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildSoldier } from './game/soldier';
import type { SoldierMesh, OperatorClass, BootStyle } from './game/soldier';
import type { WeaponId } from './game/weapons';

export interface OperatorInfo {
  id: OperatorClass;
  callsign: string;
  name: string;
  role: string;
  doctrine: string;
  armor: number; // 0-100
  mobility: number; // 0-100
  headgear: string;
  rig: string;
  defaultBoot: BootStyle;
}

export const OPERATOR_DATA: Record<OperatorClass, OperatorInfo> = {
  assault: {
    id: 'assault',
    callsign: 'VIPER-1',
    name: 'ASSAULT COMMANDO',
    role: 'Frontline Assault & CQB',
    doctrine: 'Versatile pointman optimized for tactical mid-range firefights and rapid room clearing.',
    armor: 74,
    mobility: 80,
    headgear: 'MICH Helmet w/ GPNVG-18 Glowing Dual NVG Tubes',
    rig: 'Triple AR-15 Mag Pouches + Shoulder Tactical Radio',
    defaultBoot: 'tactical',
  },
  smg: {
    id: 'smg',
    callsign: 'SPECTRE-4',
    name: 'RECON INFILTRATOR',
    role: 'High-Speed Flanker & Point CQB',
    doctrine: 'Ultralight sprint kit with tactical balaclava and HUD goggles for swift flanking maneuvers.',
    armor: 52,
    mobility: 98,
    headgear: 'Fast-Bump Ops Helmet + Glowing Cyan Goggles & Balaclava',
    rig: 'Slim Vertical 9mm SMG Pouches + Chest Combat Knife',
    defaultBoot: 'stealth',
  },
  sniper: {
    id: 'sniper',
    callsign: 'SHADOW-6',
    name: 'GHOST SHARPSHOOTER',
    role: 'Long-Range Anti-Materiel & Recon',
    doctrine: 'Camouflaged ghillie cowl and mirror visor for extreme-range target elimination and perimeter denial.',
    armor: 48,
    mobility: 72,
    headgear: 'Tactical Ghillie Cowl Hood & Dark Polarized Mirror Visor',
    rig: '.50 BMG Heavy Ammo Rig + Prone Stabilization Bedroll',
    defaultBoot: 'patrol',
  },
  shotgun: {
    id: 'shotgun',
    callsign: 'BULLDOZER-2',
    name: 'BREACHER POINTMAN',
    role: 'Heavy Entry & Close-Quarters Domination',
    doctrine: 'Reinforced ballistic shield helmet and heavy steel gorget collar built to spearhead building entries.',
    armor: 90,
    mobility: 64,
    headgear: 'Heavy Riot Helmet + Transparent Polycarbonate Face Shield',
    rig: 'Blast Gorget + 5x 12G Brass Shells + Breaching Sledgehammer',
    defaultBoot: 'stomper',
  },
  lmg: {
    id: 'lmg',
    callsign: 'COLOSSUS-9',
    name: 'TITAN JUGGERNAUT',
    role: 'Heavy Area Denial & Sustained Fire',
    doctrine: 'Armored juggernaut plate with ballistic welding face mask and belted 7.62mm ammunition feed.',
    armor: 98,
    mobility: 46,
    headgear: 'Ballistic Welding Face Plate w/ Cyan Optics Slit & Heavy Cap',
    rig: 'Steel Shoulder Pauldrons + Draped Brass Ammo Chain + Drum Pack',
    defaultBoot: 'stomper',
  },
};

export const BOOT_LABELS: Record<BootStyle, { name: string; tag: string }> = {
  tactical: { name: 'TACTICAL COMBAT', tag: 'Standard Issue Mil-Spec Tread' },
  stomper: { name: 'STEEL-TOE STOMPER', tag: 'Reinforced Cap & Heavy Lug Sole' },
  patrol: { name: 'DESERT PATROL', tag: 'Coyote Tan All-Terrain Outsole' },
  stealth: { name: 'STEALTH RUNNER', tag: 'Ultra-Lightweight Silent Rubber' },
};

interface OperatorPreviewProps {
  operatorClass: OperatorClass;
  weaponId: WeaponId;
  bootStyle: BootStyle;
  onBootChange: (boot: BootStyle) => void;
  onRandomBoot: () => void;
}

export function OperatorPreview({
  operatorClass,
  weaponId,
  bootStyle,
  onBootChange,
  onRandomBoot,
}: OperatorPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soldierRef = useRef<SoldierMesh | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [previewWalk, setPreviewWalk] = useState(false);
  const previewWalkRef = useRef(false);
  previewWalkRef.current = previewWalk;
  const [isDragging, setIsDragging] = useState(false);
  const initialFacing = Math.PI - 0.28;
  const dragStart = useRef({ x: 0, rotY: initialFacing });
  const currentRotY = useRef(initialFacing);

  const opInfo = OPERATOR_DATA[operatorClass] || OPERATOR_DATA.assault;
  const bootInfo = BOOT_LABELS[bootStyle] || BOOT_LABELS.tactical;

  // Initialize and maintain Three.js 3D viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0.98, 3.1);
    camera.lookAt(0, 0.88, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Tactical Armory Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    // Key Light (illuminating the front chest, helmet & weapon)
    const keyLight = new THREE.DirectionalLight(0xdbeafe, 2.6);
    keyLight.position.set(2.5, 4, 3.5);
    scene.add(keyLight);

    // Front Fill Light (soft warm fill on other front flank)
    const fillLight = new THREE.DirectionalLight(0xfef08a, 0.85);
    fillLight.position.set(-2.5, 2.5, 3.0);
    scene.add(fillLight);

    // Rim Light (cyan highlight on back/shoulders)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
    rimLight.position.set(-2.5, 3.5, -3.5);
    scene.add(rimLight);

    // Turntable circular showcase base
    const baseGeo = new THREE.CylinderGeometry(0.85, 0.92, 0.05, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.025;
    scene.add(base);

    // Neon edge ring on turntable
    const ringGeo = new THREE.RingGeometry(0.84, 0.89, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    // Inner hex disc
    const innerGeo = new THREE.CircleGeometry(0.78, 6);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.5,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.003;
    scene.add(inner);

    // Build Soldier Model
    const soldier = buildSoldier('alpha', weaponId, operatorClass, bootStyle);
    soldier.group.position.set(0, 0, 0);
    soldier.group.rotation.y = currentRotY.current;
    scene.add(soldier.group);
    soldierRef.current = soldier;

    let animId: number;
    let lastT = performance.now();

    const loop = (t: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      if (soldierRef.current) {
        // Auto-rotation when not dragging
        if (autoRotate && !isDragging) {
          currentRotY.current += 0.55 * dt;
          soldierRef.current.group.rotation.y = currentRotY.current;
        } else {
          soldierRef.current.group.rotation.y = currentRotY.current;
        }

        // Analytical 2-bone IK walk cycle or tactical ready stance
        soldierRef.current.animateWalk(
          t / 1000,
          previewWalkRef.current ? 3.8 : 0,
          dt
        );
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(loop);

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          camera.aspect = cr.width / cr.height;
          camera.updateProjectionMatrix();
          renderer.setSize(cr.width, cr.height);
        }
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      soldierRef.current = null;
    };
  }, []);

  // Update operator, weapon, and boots when props change
  useEffect(() => {
    if (soldierRef.current) {
      soldierRef.current.setOperator(operatorClass, bootStyle);
      soldierRef.current.setWeapon(weaponId);
      currentRotY.current = Math.PI - 0.28;
      soldierRef.current.group.rotation.y = currentRotY.current;
    }
  }, [operatorClass, weaponId, bootStyle]);

  // Pointer drag controls to spin the soldier 360 degrees
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      rotY: currentRotY.current,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    currentRotY.current = dragStart.current.rotY + dx * 0.012;
    if (soldierRef.current) {
      soldierRef.current.group.rotation.y = currentRotY.current;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const allBoots: BootStyle[] = ['tactical', 'stomper', 'patrol', 'stealth'];

  const cycleBoot = () => {
    const nextIdx = (allBoots.indexOf(bootStyle) + 1) % allBoots.length;
    onBootChange(allBoots[nextIdx]);
  };

  return (
    <div className="w-full bg-[#070b12]/95 border border-sky-950/80 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-md">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-900/40 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="font-mono text-xs tracking-[0.25em] text-sky-400 font-bold uppercase">
            OPERATOR ROSTER · 3D PREVIEW
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewWalk(!previewWalk)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-all cursor-pointer ${
              previewWalk
                ? 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle procedural locomotion walking preview"
          >
            {previewWalk ? '🚶 WALK ANIMATION: ON' : '🧍 IDLE READY STANCE'}
          </button>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider border transition-all cursor-pointer ${
              autoRotate
                ? 'bg-sky-500/20 text-sky-300 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle 360 Turntable Auto-Rotation"
          >
            {autoRotate ? '⟳ TURNTABLE ON' : '⏸ PAUSED'}
          </button>
        </div>
      </div>

      {/* Main Grid: 3D Showcase (Left) + Tactical Dossier (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* 3D Model Viewport (7 cols) */}
        <div
          ref={containerRef}
          className="md:col-span-6 lg:col-span-6 relative w-full h-[320px] sm:h-[360px] md:h-[390px] rounded-xl overflow-hidden bg-gradient-to-b from-[#0a121e] via-[#080d16] to-[#04060a] border border-sky-900/30 shadow-inner flex items-center justify-center select-none"
        >
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* 3D Canvas with Drag-to-Rotate */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full cursor-grab active:cursor-grabbing block touch-none z-10"
          />

          {/* Overlay Tag Top-Left */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-sky-400/90 tracking-wider">
              {opInfo.callsign}
            </span>
            <span className="text-sm font-black italic tracking-tight text-white drop-shadow">
              {opInfo.name}
            </span>
          </div>

          {/* Drag Hint Bottom-Center */}
          <div className="absolute bottom-3 inset-x-0 mx-auto w-fit z-20 pointer-events-none px-3 py-1 bg-black/60 backdrop-blur-sm border border-slate-800 rounded-full text-[10px] font-mono text-slate-400 flex items-center gap-1.5 shadow">
            <span>↔</span>
            <span>DRAG TO ROTATE 360°</span>
          </div>
        </div>

        {/* Tactical Dossier & Boots Customizer (6 cols) */}
        <div className="md:col-span-6 lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Header Details */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-sky-400 tracking-widest font-black uppercase">
                {opInfo.role}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-bold">
                CLASS: {operatorClass.toUpperCase()}
              </span>
            </div>
            <h3 className="text-2xl font-black italic tracking-tight text-white">
              {opInfo.name}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {opInfo.doctrine}
            </p>
          </div>

          {/* Operator Combat Ratings */}
          <div className="space-y-2 bg-[#090e17]/80 border border-slate-800/80 rounded-xl p-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">ARMOR RATING</span>
              <span className="text-sky-300 font-bold">{opInfo.armor}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-300"
                style={{ width: `${opInfo.armor}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono mt-2">
              <span className="text-slate-400">MOBILITY</span>
              <span className="text-amber-300 font-bold">{opInfo.mobility}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${opInfo.mobility}%` }}
              />
            </div>
          </div>

          {/* Tactical Gear Loadout Specs */}
          <div className="space-y-1.5 text-[11px] font-mono text-slate-300 bg-[#090e17]/80 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <span className="text-sky-400 font-bold shrink-0">HELMET:</span>
              <span className="text-slate-300 truncate">{opInfo.headgear}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sky-400 font-bold shrink-0">CHEST RIG:</span>
              <span className="text-slate-300 truncate">{opInfo.rig}</span>
            </div>
          </div>

          {/* Footwear / Boots Customizer */}
          <div className="bg-[#0b1320] border border-sky-800/40 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase font-bold">
                TACTICAL FOOTWEAR MODEL
              </span>
              <button
                onClick={onRandomBoot}
                className="text-[10px] font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Randomize boot style"
              >
                <span>🎲</span>
                <span>RANDOMIZE</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-black text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {bootInfo.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {bootInfo.tag}
                </div>
              </div>

              <button
                onClick={cycleBoot}
                className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/40 rounded font-mono text-xs font-bold transition-all cursor-pointer"
              >
                CYCLE BOOTS ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
