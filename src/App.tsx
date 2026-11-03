import { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './game/game';
import type { MatchResult } from './game/game';
import type { HudState, KillEvent, PlayerRow } from './game/types';
import { WEAPONS, WEAPON_LIST } from './game/weapons';
import type { WeaponId } from './game/weapons';
import { OperatorPreview } from './OperatorPreview';
import type { BootStyle, OperatorClass } from './game/soldier';
import type { MapId } from './game/types';
import { MAPS } from './game/map';
import { MapSelect } from './MapSelect';

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const defaultHud: HudState = {
  hp: 100, ammo: 30, reserve: 120, reloading: false,
  scoreAlpha: 0, scoreBravo: 0, timeLeft: 480, killTarget: 40,
  alive: true, respawnIn: 0, hitMarker: 0, killMarker: 0,
  damageFlash: 0, damageDir: 0, ads: false,
  weaponId: 'assault',
  weaponName: 'MK-7 CARBINE',
  weaponCategory: 'Assault Rifle',
  nextWeaponId: 'assault',
  nextWeaponName: 'MK-7 CARBINE',
  isSniperScope: false,
  magSize: 30,
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<'menu' | 'map' | 'loadout' | 'playing' | 'ended'>('menu');
  const [selectedLoadout, setSelectedLoadout] = useState<WeaponId>('assault');
  const [selectedMap, setSelectedMap] = useState<MapId>('sandstorm');
  const [playerBoot, setPlayerBoot] = useState<BootStyle>('tactical');
  const [hud, setHud] = useState<HudState>(defaultHud);
  const [feed, setFeed] = useState<KillEvent[]>([]);
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const feedId = useRef(0);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  const pushFeed = useCallback((k: KillEvent) => {
    const id = ++feedId.current;
    setFeed((f) => [...f.slice(-4), { ...k, id }]);
    setTimeout(() => setFeed((f) => f.filter((e) => e.id !== id)), 4200);
  }, []);

  const startGame = useCallback((chosenWeapon?: WeaponId, chosenMap?: MapId) => {
    if (gameRef.current) gameRef.current.dispose();
    const weapon = chosenWeapon || selectedLoadout;
    const map = chosenMap || selectedMap;
    const canvas = canvasRef.current!;
    const game = new Game(canvas, {
      onHud: setHud,
      onKillFeed: pushFeed,
      onMatchEnd: (r) => {
        setResult(r);
        setScreen('ended');
        document.exitPointerLock?.();
      },
      onPause: setPaused,
      onScoreboard: setRows,
    }, weapon, map);
    gameRef.current = game;
    game.start();
    setFeed([]);
    setResult(null);
    setScreen('playing');
    const initDef = WEAPONS[weapon];
    setHud({
      ...defaultHud,
      weaponId: weapon,
      weaponName: initDef.name,
      weaponCategory: initDef.category,
      nextWeaponId: weapon,
      nextWeaponName: initDef.name,
      ammo: initDef.magSize,
      reserve: initDef.reserve,
      magSize: initDef.magSize,
    });
    if (!isTouch) canvas.requestPointerLock?.();
  }, [pushFeed, selectedLoadout, selectedMap]);

  // global input
  useEffect(() => {
    if (screen !== 'playing') return;
    const g = () => gameRef.current;
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        g()?.pushScoreboard();
        setShowBoard(true);
        return;
      }
      if (e.code === 'KeyF') {
        toggleFullscreen();
        return;
      }
      g()?.setKey(e.code, true);
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setShowBoard(false);
        return;
      }
      g()?.setKey(e.code, false);
    };
    const md = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        if (e.button === 0) g()?.setFire(true);
        if (e.button === 2) g()?.setAim(true);
      }
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) g()?.setFire(false);
      if (e.button === 2) g()?.setAim(false);
    };
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement) g()?.onMouseMove(e.movementX, e.movementY);
    };
    const cm = (e: Event) => e.preventDefault();
    const plc = () => {
      if (!isTouch) {
        const locked = !!document.pointerLockElement;
        setPaused(!locked);
        g()?.setPaused(!locked);
      }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('mousemove', mm);
    window.addEventListener('contextmenu', cm);
    document.addEventListener('pointerlockchange', plc);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('mousedown', md);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('contextmenu', cm);
      document.removeEventListener('pointerlockchange', plc);
    };
  }, [screen]);

  const resume = () => {
    canvasRef.current?.requestPointerLock?.();
  };

  const quitToMenu = () => {
    gameRef.current?.dispose();
    gameRef.current = null;
    document.exitPointerLock?.();
    setScreen('menu');
  };

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {screen === 'menu' && (
        <Menu
          onPlay={() => setScreen('map')}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {screen === 'map' && (
        <MapSelect
          selectedMap={selectedMap}
          onSelectMap={setSelectedMap}
          onConfirm={() => setScreen('loadout')}
          onBack={() => setScreen('menu')}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {screen === 'loadout' && (
        <LoadoutSelect
          selectedMap={selectedMap}
          selectedLoadout={selectedLoadout}
          onSelectLoadout={setSelectedLoadout}
          bootStyle={playerBoot}
          onBootChange={setPlayerBoot}
          onDeploy={() => startGame(selectedLoadout, selectedMap)}
          onBack={() => setScreen('map')}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {screen === 'playing' && (
        <HUD
          hud={hud}
          feed={feed}
          rows={rows}
          showBoard={showBoard}
          paused={paused && !isTouch}
          onResume={resume}
          onQuit={quitToMenu}
          gameRef={gameRef}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {screen === 'ended' && result && (
        <EndScreen result={result} onRestart={() => setScreen('map')} onMenu={quitToMenu} />
      )}
    </div>
  );
}

/* ---------------- Menu ---------------- */
interface MenuProps {
  onPlay: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function Menu({ onPlay, isFullscreen, onToggleFullscreen }: MenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') onToggleFullscreen();
      if (e.code === 'Enter' || e.code === 'Space') onPlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleFullscreen, onPlay]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0f16] via-[#0d1520] to-black overflow-y-auto py-8 px-4">
      {/* top right quick fullscreen button */}
      <button
        onClick={onToggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-black/60 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-400 rounded text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
      >
        <span className="text-sm font-bold">{isFullscreen ? '✕' : '⛶'}</span>
        <span>{isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}</span>
      </button>

      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(70,120,180,0.08) 40px, rgba(70,120,180,0.08) 80px)',
      }} />

      <div className="relative text-center px-4 max-w-xl mx-auto z-10 w-full">
        <div className="text-[11px] tracking-[0.5em] text-sky-400/80 mb-2 font-mono">TEAM DEATHMATCH · 4V4</div>
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white" style={{ textShadow: '0 0 45px rgba(80,160,255,0.4)' }}>
          STRIKE<span className="text-sky-400">FORCE</span>
        </h1>
        <p className="mt-3 text-sm md:text-base text-slate-300 max-w-md mx-auto">
          First squad to 40 eliminations wins. Move, aim, shoot.
        </p>

        {/* Action Buttons: DEPLOY + FULLSCREEN */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onPlay}
            className="w-full sm:w-auto px-14 py-4 bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black text-2xl tracking-widest skew-x-[-6deg] transition-all shadow-[0_0_35px_rgba(56,189,248,0.45)] cursor-pointer"
            style={{ minHeight: 56 }}
          >
            DEPLOY
          </button>
          <button
            onClick={onToggleFullscreen}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-sky-400 hover:text-sky-300 border border-slate-700 hover:border-sky-400 font-mono text-sm font-black tracking-widest skew-x-[-6deg] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{ minHeight: 56 }}
            title="Toggle Fullscreen Mode"
          >
            <span className="text-base">{isFullscreen ? '✕ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}</span>
          </button>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-left text-xs text-slate-400 font-mono max-w-lg mx-auto">
          {(isTouch
            ? [['Left stick', 'Move'], ['Right side drag', 'Look'], ['FIRE btn', 'Shoot'], ['ADS btn', 'Aim'], ['JUMP btn', 'Jump'], ['RLD btn', 'Reload']]
            : [['WASD', 'Move'], ['Mouse', 'Look'], ['LMB', 'Fire'], ['RMB', 'Aim down sights'], ['R', 'Reload'], ['Tab', 'Scoreboard'], ['F / F11', 'Fullscreen'], ['Esc', 'Pause']]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-slate-800 pb-1">
              <span className="text-slate-300">{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Loadout Select Screen (After Deploy is clicked) ---------------- */
interface LoadoutSelectProps {
  selectedMap: MapId;
  selectedLoadout: WeaponId;
  onSelectLoadout: (w: WeaponId) => void;
  bootStyle: BootStyle;
  onBootChange: (b: BootStyle) => void;
  onDeploy: () => void;
  onBack: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function LoadoutSelect({
  selectedMap,
  selectedLoadout,
  onSelectLoadout,
  bootStyle,
  onBootChange,
  onDeploy,
  onBack,
  isFullscreen,
  onToggleFullscreen,
}: LoadoutSelectProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') onToggleFullscreen();
      if (e.code === 'Digit1') onSelectLoadout('assault');
      if (e.code === 'Digit2') onSelectLoadout('smg');
      if (e.code === 'Digit3') onSelectLoadout('sniper');
      if (e.code === 'Digit4') onSelectLoadout('shotgun');
      if (e.code === 'Digit5') onSelectLoadout('lmg');
      if (e.code === 'Enter' || e.code === 'Space') onDeploy();
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleFullscreen, onSelectLoadout, onDeploy, onBack]);

  const activeDef = WEAPONS[selectedLoadout];

  const handleRandomBoot = () => {
    const bootPool: BootStyle[] = ['stomper', 'tactical', 'patrol', 'stealth'];
    const otherBoots = bootPool.filter((b) => b !== bootStyle);
    onBootChange(otherBoots[Math.floor(Math.random() * otherBoots.length)]);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center bg-gradient-to-b from-[#0a0f16] via-[#0d1520] to-black overflow-y-auto py-6 px-4">
      {/* top right quick fullscreen button */}
      <button
        onClick={onToggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-black/60 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-400 rounded text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
      >
        <span className="text-sm font-bold">{isFullscreen ? '✕' : '⛶'}</span>
        <span>{isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}</span>
      </button>

      <div className="relative text-center max-w-5xl mx-auto z-10 w-full space-y-4">
        {/* Navigation Breadcrumb Flow: menu -> map selection -> loadout -> playground */}
        <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs font-mono tracking-widest text-slate-500 uppercase">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-sky-400 transition-colors cursor-pointer"
          >
            1. MENU
          </button>
          <span>──▶</span>
          <button
            onClick={onBack}
            className="hover:text-sky-400 transition-colors cursor-pointer text-slate-400 font-bold"
          >
            2. MAP: {MAPS[selectedMap]?.name || selectedMap.toUpperCase()}
          </button>
          <span>──▶</span>
          <span className="text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            3. LOADOUT
          </span>
          <span>──▶</span>
          <span className="text-slate-600">4. PLAYGROUND</span>
        </div>

        <div>
          <div className="text-[11px] tracking-[0.5em] text-sky-400/80 mb-1 font-mono">TACTICAL ARMORY</div>
          <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white" style={{ textShadow: '0 0 35px rgba(80,160,255,0.3)' }}>
            SELECT SPAWN <span className="text-sky-400">LOADOUT</span>
          </h2>
          <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-md mx-auto">
            Choose your combat operator & firearm for initial spawn. (Loadout only switches upon respawn).
          </p>
        </div>

        {/* 3D Operator Model Preview Showcase */}
        <OperatorPreview
          operatorClass={selectedLoadout as OperatorClass}
          weaponId={selectedLoadout}
          bootStyle={bootStyle}
          onBootChange={onBootChange}
          onRandomBoot={handleRandomBoot}
        />

        {/* 5 Weapon Loadout Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-left">
          {WEAPON_LIST.map((w) => {
            const isSelected = selectedLoadout === w.id;
            return (
              <button
                key={w.id}
                onClick={() => onSelectLoadout(w.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] scale-[1.02]'
                    : 'bg-[#090d14]/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-sky-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                    [{w.hotkey}]
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">{w.category.split(' ')[0]}</span>
                </div>
                <div className={`font-mono text-sm font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {w.name}
                </div>
                <p className="text-[10px] text-slate-400 font-sans line-clamp-2 mt-1 leading-snug">
                  {w.description}
                </p>

                {/* Stat bars */}
                <div className="mt-3 space-y-1 text-[9px] font-mono text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>DMG</span>
                    <div className="w-14 h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-red-400" style={{ width: `${w.damageRating}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>ROF</span>
                    <div className="w-14 h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${w.fireRateRating}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>RNG</span>
                    <div className="w-14 h-1.5 bg-slate-800 rounded overflow-hidden">
                      <div className="h-full bg-sky-400" style={{ width: `${w.rangeRating}%` }} />
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2.5 text-center text-[9px] font-mono font-bold tracking-widest text-sky-400 bg-sky-950/60 py-0.5 border border-sky-500/40 rounded">
                    EQUIPPED
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: CONFIRM DEPLOY INTO PLAYGROUND + BACK TO MAP */}
        <div className="pt-2 pb-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 font-mono text-sm font-bold tracking-widest skew-x-[-6deg] transition-all cursor-pointer"
            style={{ minHeight: 52 }}
          >
            ← BACK TO MAP
          </button>
          <button
            onClick={onDeploy}
            className="w-full sm:w-auto px-12 py-3.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black text-xl tracking-widest skew-x-[-6deg] transition-all shadow-[0_0_30px_rgba(56,189,248,0.4)] cursor-pointer flex items-center justify-center gap-2"
            style={{ minHeight: 52 }}
          >
            <span>DEPLOY INTO PLAYGROUND ({activeDef.name})</span>
            <span className="text-2xl font-black">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HUD ---------------- */
interface HudProps {
  hud: HudState;
  feed: KillEvent[];
  rows: PlayerRow[];
  showBoard: boolean;
  paused: boolean;
  onResume: () => void;
  onQuit: () => void;
  gameRef: React.MutableRefObject<Game | null>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function HUD({ hud, feed, rows, showBoard, paused, onResume, onQuit, gameRef, isFullscreen, onToggleFullscreen }: HudProps) {
  const lowHp = hud.hp <= 35;
  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* sniper scope overlay */}
      {hud.isSniperScope && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle 320px at center, transparent 96%, rgba(0,0,0,0.98) 100%)',
              boxShadow: 'inset 0 0 100px rgba(0,0,0,0.95)',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-black/85" />
            <div className="h-full w-[1.5px] bg-black/85 absolute" />
            <div className="absolute w-[480px] flex justify-between px-6">
              {[-3, -2, -1, 1, 2, 3].map((n) => (
                <div key={n} className="w-[1.5px] h-3.5 bg-black/80" />
              ))}
            </div>
            <div className="absolute h-[480px] flex flex-col justify-between py-6">
              {[-3, -2, -1, 1, 2, 3].map((n) => (
                <div key={n} className="h-[1.5px] w-3.5 bg-black/80" />
              ))}
            </div>
            <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,40,40,1)]" />
            <div className="absolute top-[28%] text-[10px] font-mono tracking-widest text-emerald-400/80 font-bold bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
              REAPER-50 OPTIC · 12X BALLISTIC
            </div>
            <div className="absolute bottom-[28%] text-[10px] font-mono tracking-widest text-emerald-400/80 font-bold bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
              ELEV: +0.0 · WIND: 0.0 M/S
            </div>
          </div>
        </div>
      )}

      {/* damage vignette */}
      <DamageFlash key={hud.damageFlash} active={hud.damageFlash > 0} dir={hud.damageDir} />
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: lowHp && hud.alive ? 0.55 : 0, background: 'radial-gradient(ellipse at center, transparent 45%, rgba(160,0,0,0.7) 100%)' }}
      />

      {/* top center: score + timer */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-5 font-mono safe-top">
        <div className="text-center">
          <div className="text-[10px] text-sky-300 tracking-widest">ALPHA</div>
          <div className="text-2xl md:text-3xl font-black text-sky-400">{hud.scoreAlpha}</div>
        </div>
        <div className="text-center px-3 md:px-4 py-1 bg-black/50 border border-slate-700 rounded">
          <div className="text-base md:text-lg font-bold text-white">{fmtTime(hud.timeLeft)}</div>
          <div className="text-[9px] text-slate-400 tracking-widest">FIRST TO {hud.killTarget}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-red-300 tracking-widest">BRAVO</div>
          <div className="text-2xl md:text-3xl font-black text-red-400">{hud.scoreBravo}</div>
        </div>
      </div>

      {/* kill feed */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 safe-top">
        {feed.map((k) => (
          <div key={k.id} className="px-2 py-1 bg-black/60 border border-slate-700/60 rounded text-[11px] md:text-xs font-mono flex items-center gap-1.5">
            <span className={k.killerTeam === 'alpha' ? 'text-sky-400 font-bold' : 'text-red-400 font-bold'}>{k.killer}</span>
            <span className="text-slate-400">{k.headshot ? '⌖☠' : '→'}</span>
            <span className={k.victimTeam === 'alpha' ? 'text-sky-300' : 'text-red-300'}>{k.victim}</span>
          </div>
        ))}
      </div>

      {/* hit & elimination markers - always mounted, triggers strictly on increase */}
      <HitMarker count={hud.hitMarker} />
      <KillMarker count={hud.killMarker} />

      {/* crosshair */}
      {hud.alive && !hud.isSniperScope && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {!hud.ads && (
            <div className="relative w-8 h-8">
              <div className="absolute left-1/2 top-0 w-[2px] h-2 bg-white/90 -translate-x-1/2" />
              <div className="absolute left-1/2 bottom-0 w-[2px] h-2 bg-white/90 -translate-x-1/2" />
              <div className="absolute top-1/2 left-0 h-[2px] w-2 bg-white/90 -translate-y-1/2" />
              <div className="absolute top-1/2 right-0 h-[2px] w-2 bg-white/90 -translate-y-1/2" />
              <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-white -translate-x-1/2 -translate-y-1/2 rounded-full" />
            </div>
          )}
          {hud.ads && <div className="w-1.5 h-1.5 bg-red-400 rounded-full shadow-[0_0_6px_rgba(255,60,60,0.9)]" />}
        </div>
      )}

      {/* bottom-left: health */}
      <div className="absolute bottom-4 left-4 safe-bottom" style={{ left: 'max(1rem, env(safe-area-inset-left))' }}>
        <div className="text-[10px] font-mono tracking-widest text-slate-400 mb-1">INTEGRITY</div>
        <div className="w-44 md:w-56 h-3 bg-black/60 border border-slate-700 skew-x-[-8deg] overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${lowHp ? 'bg-red-500' : 'bg-gradient-to-r from-sky-500 to-sky-300'}`}
            style={{ width: `${hud.hp}%` }}
          />
        </div>
        <div className={`mt-1 text-2xl font-black font-mono ${lowHp ? 'text-red-400 animate-pulse' : 'text-white'}`}>{hud.hp}</div>
      </div>

      {/* bottom-right: ammo & weapon loadout */}
      <div className="absolute bottom-4 right-4 text-right safe-bottom pointer-events-auto" style={{ right: 'max(1rem, env(safe-area-inset-right))' }}>
        {hud.reloading && <div className="text-amber-400 text-xs font-mono tracking-widest animate-pulse mb-1">RELOADING…</div>}
        <div className="font-mono font-black text-white leading-none">
          <span className="text-4xl md:text-5xl">{hud.ammo}</span>
          <span className="text-lg text-slate-500"> / {hud.reserve}</span>
        </div>
        <div className="text-sm font-black font-mono tracking-wider text-sky-400 mt-1">{hud.weaponName}</div>
        <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">{hud.weaponCategory}</div>
      </div>

      {/* respawn overlay with interactive loadout switcher */}
      {!hud.alive && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
          <div className="text-red-500 text-5xl md:text-7xl font-black italic tracking-tight drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]">
            K.I.A.
          </div>
          <div className="text-slate-300 font-mono mt-3 text-base md:text-lg tracking-widest">
            REDEPLOYING IN <span className="text-sky-400 font-black text-2xl">{Math.ceil(hud.respawnIn)}</span>S
          </div>

          {/* Interactive Respawn Loadout Switcher */}
          <div className="mt-6 w-full max-w-2xl bg-[#0b1220]/95 border border-slate-700 rounded-xl p-4 md:p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-mono tracking-widest text-sky-400 font-black flex items-center gap-2">
                <span>⚡</span> SELECT RESPAWN LOADOUT (SWITCHES ON RESPAWN)
              </span>
              <span className="text-[10px] font-mono text-slate-400">HOTKEYS [1 - 5]</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {WEAPON_LIST.map((w) => {
                const isSelected = hud.nextWeaponId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => gameRef.current?.setNextWeapon(w.id, true)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.4)] scale-[1.03]'
                        : 'bg-black/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-sky-400 text-black' : 'bg-slate-800 text-slate-300'}`}>
                        [{w.hotkey}]
                      </span>
                      {isSelected && (
                        <span className="text-[9px] font-mono text-sky-300 font-bold uppercase tracking-wider">NEXT</span>
                      )}
                    </div>
                    <div className={`font-mono text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {w.name}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate">
                      {w.category}
                    </div>
                    <div className="mt-2 text-[8px] font-mono text-slate-400 flex justify-between">
                      <span>DMG {w.damageRating}</span>
                      <span>RPM {w.rpm}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-center text-xs font-mono text-slate-400">
              Spawning with: <span className="text-sky-400 font-bold">{hud.nextWeaponName}</span>
            </div>
          </div>
        </div>
      )}

      {/* scoreboard */}
      {showBoard && <Scoreboard rows={rows} />}

      {/* pause */}
      {paused && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4">
          <div className="text-3xl font-black italic text-white tracking-tight mb-6">PAUSED</div>

          <button onClick={onResume} className="w-64 py-3 bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black tracking-widest mb-3 cursor-pointer transition-all" style={{ minHeight: 48 }}>
            RESUME
          </button>
          <button onClick={onToggleFullscreen} className="w-64 py-3 bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-sky-400 hover:text-sky-300 border border-slate-700 hover:border-sky-400 font-mono text-sm font-bold tracking-widest mb-3 cursor-pointer transition-all" style={{ minHeight: 48 }}>
            {isFullscreen ? '✕ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}
          </button>
          <button onClick={onQuit} className="w-64 py-3 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold tracking-widest cursor-pointer transition-all" style={{ minHeight: 48 }}>
            ABANDON MATCH
          </button>
        </div>
      )}

      {/* touch controls */}
      {isTouch && !paused && <TouchControls gameRef={gameRef} />}
    </div>
  );
}

function DamageFlash({ active, dir }: { active: boolean; dir: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 450);
    return () => clearTimeout(t);
  }, [active]);
  if (!active) return null;
  return (
    <>
      <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: on ? 0.5 : 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.55) 100%)' }} />
      <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${dir}rad)` }}>
        <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-red-500/80" style={{ transform: 'translateY(-90px)' }} />
      </div>
    </>
  );
}

function HitMarker({ count }: { count: number }) {
  const [on, setOn] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setOn(true);
      const t = setTimeout(() => setOn(false), 130);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  if (!on) return null;
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 pointer-events-none z-30">
      {[45, 135, 225, 315].map((a) => (
        <div key={a} className="absolute left-1/2 top-1/2 w-[2px] h-2.5 bg-red-400" style={{ transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-9px)` }} />
      ))}
    </div>
  );
}

function KillMarker({ count }: { count: number }) {
  const [on, setOn] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setOn(true);
      const t = setTimeout(() => setOn(false), 950);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  if (!on) return null;
  return (
    <div className="absolute left-1/2 top-[58%] -translate-x-1/2 text-center pointer-events-none z-30">
      <div className="text-red-500 font-black text-xl font-mono tracking-widest drop-shadow-[0_0_12px_rgba(255,30,30,0.85)] animate-pulse">
        ELIMINATED
      </div>
    </div>
  );
}

function Scoreboard({ rows }: { rows: PlayerRow[] }) {
  const alpha = rows.filter((r) => r.team === 'alpha');
  const bravo = rows.filter((r) => r.team === 'bravo');
  const TeamTable = ({ title, list, color }: { title: string; list: PlayerRow[]; color: string }) => (
    <div className="flex-1 min-w-0">
      <div className={`text-xs font-mono tracking-widest mb-2 ${color}`}>{title}</div>
      {list.map((r) => (
        <div key={r.name} className={`flex justify-between px-3 py-1.5 text-sm font-mono ${r.isPlayer ? 'bg-white/10 border border-white/20' : 'border-b border-slate-800'}`}>
          <span className={r.isPlayer ? 'text-white font-bold' : 'text-slate-300'}>{r.name}</span>
          <span className="text-slate-400">{r.kills} / {r.deaths}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-[#0b1220]/95 border border-slate-700 rounded-lg p-4 md:p-6">
        <div className="text-center text-slate-400 text-xs font-mono tracking-widest mb-4">SCOREBOARD — K / D</div>
        <div className="flex gap-4 md:gap-8">
          <TeamTable title="ALPHA (YOU)" list={alpha} color="text-sky-400" />
          <TeamTable title="BRAVO" list={bravo} color="text-red-400" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Touch controls ---------------- */
function TouchControls({ gameRef }: { gameRef: React.MutableRefObject<Game | null> }) {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const lookId = useRef<number | null>(null);
  const stickId = useRef<number | null>(null);
  const lastLook = useRef({ x: 0, y: 0 });
  const [adsOn, setAdsOn] = useState(false);

  const btn = 'pointer-events-auto flex items-center justify-center rounded-full bg-black/50 border-2 border-slate-500/70 text-white font-black font-mono active:bg-sky-500/60 active:border-sky-300';

  return (
    <>
      {/* look area */}
      <div
        className="absolute right-0 top-0 w-1/2 h-full pointer-events-auto"
        onPointerDown={(e) => {
          lookId.current = e.pointerId;
          lastLook.current = { x: e.clientX, y: e.clientY };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          gameRef.current?.addLook(e.clientX - lastLook.current.x, e.clientY - lastLook.current.y);
          lastLook.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => { if (lookId.current === e.pointerId) lookId.current = null; }}
      />
      {/* move stick */}
      <div
        ref={stickRef}
        className="absolute pointer-events-auto"
        style={{ left: 'max(1.5rem, env(safe-area-inset-left))', bottom: 'max(6.5rem, env(safe-area-inset-bottom))', width: 128, height: 128 }}
        onPointerDown={(e) => {
          stickId.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (stickId.current !== e.pointerId || !stickRef.current) return;
          const rect = stickRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = (e.clientX - cx) / (rect.width / 2);
          let dy = (e.clientY - cy) / (rect.height / 2);
          const len = Math.hypot(dx, dy);
          if (len > 1) { dx /= len; dy /= len; }
          gameRef.current?.setTouchMove(dx, dy);
          if (knobRef.current) knobRef.current.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
        }}
        onPointerUp={(e) => {
          if (stickId.current !== e.pointerId) return;
          stickId.current = null;
          gameRef.current?.setTouchMove(0, 0);
          if (knobRef.current) knobRef.current.style.transform = 'translate(0,0)';
        }}
      >
        <div className="absolute inset-0 rounded-full bg-black/40 border-2 border-slate-500/60" />
        <div ref={knobRef} className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-full bg-slate-300/50 border border-slate-200/70" />
      </div>

      {/* fire button */}
      <div
        className={`${btn} absolute`}
        style={{ right: 'max(1.5rem, env(safe-area-inset-right))', bottom: 'max(7rem, env(safe-area-inset-bottom))', width: 92, height: 92 }}
        onPointerDown={(e) => { e.preventDefault(); gameRef.current?.setFire(true); }}
        onPointerUp={() => gameRef.current?.setFire(false)}
        onPointerLeave={() => gameRef.current?.setFire(false)}
        onPointerCancel={() => gameRef.current?.setFire(false)}
      >
        <span className="text-sm">FIRE</span>
      </div>
      {/* ads */}
      <div
        className={`${btn} ${adsOn ? '!bg-sky-500/60 !border-sky-300' : ''} absolute`}
        style={{ right: 'calc(max(1.5rem, env(safe-area-inset-right)) + 104px)', bottom: 'max(5.5rem, env(safe-area-inset-bottom))', width: 60, height: 60 }}
        onPointerDown={() => {
          setAdsOn((v) => {
            gameRef.current?.setAim(!v);
            return !v;
          });
        }}
      >
        <span className="text-[10px]">ADS</span>
      </div>
      {/* jump */}
      <div
        className={`${btn} absolute`}
        style={{ right: 'calc(max(1.5rem, env(safe-area-inset-right)) + 20px)', bottom: 'calc(max(7rem, env(safe-area-inset-bottom)) + 104px)', width: 60, height: 60 }}
        onPointerDown={() => gameRef.current?.triggerJump()}
      >
        <span className="text-[10px]">JUMP</span>
      </div>
      {/* reload */}
      <div
        className={`${btn} absolute`}
        style={{ right: 'calc(max(1.5rem, env(safe-area-inset-right)) + 104px)', bottom: 'calc(max(7rem, env(safe-area-inset-bottom)) + 76px)', width: 52, height: 52 }}
        onPointerDown={() => gameRef.current?.startReload()}
      >
        <span className="text-[9px]">RLD</span>
      </div>
    </>
  );
}

/* ---------------- End screen ---------------- */
function EndScreen({ result, onRestart, onMenu }: { result: MatchResult; onRestart: () => void; onMenu: () => void }) {
  const you = result.rows.find((r) => r.isPlayer);
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 p-4">
      <div className={`text-5xl md:text-7xl font-black italic tracking-tighter ${result.draw ? 'text-amber-400' : result.win ? 'text-sky-400' : 'text-red-500'}`}>
        {result.draw ? 'DRAW' : result.win ? 'VICTORY' : 'DEFEAT'}
      </div>
      <div className="mt-4 font-mono text-xl md:text-2xl text-white">
        <span className="text-sky-400 font-black">{result.scoreAlpha}</span>
        <span className="text-slate-500 mx-3">—</span>
        <span className="text-red-400 font-black">{result.scoreBravo}</span>
      </div>
      {you && (
        <div className="mt-2 text-slate-400 font-mono text-sm">YOUR K/D: {you.kills} / {you.deaths}</div>
      )}
      <div className="mt-6 w-full max-w-lg bg-[#0b1220]/90 border border-slate-700 rounded-lg p-4">
        {result.rows.map((r) => (
          <div key={r.name} className={`flex justify-between px-3 py-1.5 text-sm font-mono ${r.isPlayer ? 'bg-white/10' : ''}`}>
            <span className={r.team === 'alpha' ? 'text-sky-400' : 'text-red-400'}>{r.name}</span>
            <span className="text-slate-400">{r.kills} / {r.deaths}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-4">
        <button onClick={onRestart} className="px-8 py-3 bg-sky-500 hover:bg-sky-400 text-black font-black tracking-widest" style={{ minHeight: 48 }}>PLAY AGAIN</button>
        <button onClick={onMenu} className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold tracking-widest" style={{ minHeight: 48 }}>MAIN MENU</button>
      </div>
    </div>
  );
}
