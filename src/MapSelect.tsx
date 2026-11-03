import { useEffect } from 'react';
import type { MapId } from './game/types';
import { MAP_LIST, MAPS } from './game/map';

interface MapSelectProps {
  selectedMap: MapId;
  onSelectMap: (m: MapId) => void;
  onConfirm: () => void;
  onBack: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function MapSelect({
  selectedMap,
  onSelectMap,
  onConfirm,
  onBack,
  isFullscreen,
  onToggleFullscreen,
}: MapSelectProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') onToggleFullscreen();
      if (e.code === 'Digit1') onSelectMap('sandstorm');
      if (e.code === 'Digit2') onSelectMap('nuketown');
      if (e.code === 'Digit3') onSelectMap('oasis');
      if (e.code === 'Digit4') onSelectMap('dust_yard');
      if (e.code === 'Digit5') onSelectMap('railyard');
      if (e.code === 'ArrowLeft') {
        const curIdx = MAP_LIST.findIndex((m) => m.id === selectedMap);
        const prevIdx = (curIdx - 1 + MAP_LIST.length) % MAP_LIST.length;
        onSelectMap(MAP_LIST[prevIdx].id);
      }
      if (e.code === 'ArrowRight') {
        const curIdx = MAP_LIST.findIndex((m) => m.id === selectedMap);
        const nextIdx = (curIdx + 1) % MAP_LIST.length;
        onSelectMap(MAP_LIST[nextIdx].id);
      }
      if (e.code === 'Enter' || e.code === 'Space') onConfirm();
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleFullscreen, onSelectMap, onConfirm, onBack, selectedMap]);

  const activeDef = MAPS[selectedMap] || MAPS.sandstorm;

  const getTheme = (id: MapId) => {
    switch (id) {
      case 'nuketown':
        return {
          border: 'border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.22)]',
          dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
          title: 'text-amber-400',
          accent: 'text-amber-300',
          sub: 'text-amber-400',
          icon: '☢',
          btn: 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.45)] text-black',
        };
      case 'oasis':
        return {
          border: 'border-orange-500/60 shadow-[0_0_40px_rgba(249,115,22,0.25)]',
          dot: 'bg-orange-400 shadow-[0_0_8px_#fb923c]',
          title: 'text-orange-400',
          accent: 'text-orange-300',
          sub: 'text-orange-400',
          icon: '🌴',
          btn: 'bg-orange-500 hover:bg-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.45)] text-black',
        };
      case 'dust_yard':
        return {
          border: 'border-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,0.25)]',
          dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
          title: 'text-amber-300',
          accent: 'text-amber-200',
          sub: 'text-amber-400',
          icon: '⛲',
          btn: 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.45)] text-black',
        };
      case 'railyard':
        return {
          border: 'border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.25)]',
          dot: 'bg-yellow-400 shadow-[0_0_8px_#eab308]',
          title: 'text-yellow-400',
          accent: 'text-yellow-300',
          sub: 'text-yellow-400',
          icon: '🚂',
          btn: 'bg-yellow-500 hover:bg-yellow-400 shadow-[0_0_35px_rgba(234,179,8,0.45)] text-black',
        };
      case 'sandstorm':
      default:
        return {
          border: 'border-sky-500/60 shadow-[0_0_35px_rgba(56,189,248,0.2)]',
          dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
          title: 'text-emerald-400',
          accent: 'text-sky-300',
          sub: 'text-sky-400',
          icon: '🎯',
          btn: 'bg-sky-500 hover:bg-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.4)] text-black',
        };
    }
  };

  const theme = getTheme(selectedMap);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-gradient-to-b from-[#0a0f16] via-[#0d1520] to-black overflow-y-auto py-5 px-4">
      {/* Top right quick fullscreen button */}
      <button
        onClick={onToggleFullscreen}
        aria-label="Toggle Fullscreen"
        className="absolute top-4 right-4 z-40 px-3 py-1.5 bg-black/60 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-400 rounded text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
      >
        <span className="text-sm font-bold">{isFullscreen ? '✕' : '⛶'}</span>
        <span>{isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}</span>
      </button>

      {/* Main Container */}
      <div className="relative max-w-5xl w-full mx-auto z-10 flex flex-col items-center space-y-3.5 my-auto">
        {/* Navigation Breadcrumb Flow */}
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono tracking-widest text-slate-500 uppercase">
          <button
            onClick={onBack}
            className="hover:text-sky-400 transition-colors cursor-pointer"
          >
            1. MENU
          </button>
          <span>──▶</span>
          <span className="text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            2. MAP SELECTION
          </span>
          <span>──▶</span>
          <span className="text-slate-600">3. LOADOUT</span>
          <span>──▶</span>
          <span className="text-slate-600">4. PLAYGROUND</span>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="text-[11px] tracking-[0.45em] text-sky-400/80 mb-0.5 font-mono uppercase">
            THEATRE OF OPERATIONS
          </div>
          <h2
            className="text-3xl md:text-5xl font-black italic tracking-tighter text-white"
            style={{ textShadow: '0 0 35px rgba(80,160,255,0.3)' }}
          >
            SELECT COMBAT <span className="text-sky-400">ZONE</span>
          </h2>
          <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
            Choose your combat arena. Review tactical satellite telemetry and confirm map assignment.
          </p>
        </div>

        {/* Map Selection Switcher Tabs (All 5 Maps) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 w-full">
          {MAP_LIST.map((m, idx) => {
            const isSelected = selectedMap === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMap(m.id)}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] scale-[1.02]'
                    : 'bg-[#090e17]/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                      isSelected ? 'bg-sky-400 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    [{idx + 1}]
                  </span>
                  {m.id === 'nuketown' && (
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold">
                      COD
                    </span>
                  )}
                  {m.id === 'oasis' && (
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/50 font-bold">
                      OASIS
                    </span>
                  )}
                  {m.id === 'dust_yard' && (
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/50 font-bold">
                      CS:DUST
                    </span>
                  )}
                  {m.id === 'railyard' && (
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 font-bold">
                      DEPOT
                    </span>
                  )}
                </div>
                <div className={`font-mono text-xs font-black tracking-tight leading-snug line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {m.name}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                  {m.sizeStr}
                </div>
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Map Showcase Card */}
        <div
          className={`w-full bg-[#090e17]/90 border-2 rounded-2xl p-5 md:p-6 relative overflow-hidden transition-all ${theme.border}`}
        >
          {/* Active selection banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${theme.dot}`} />
              <span className={`text-xs font-mono font-bold tracking-wider ${theme.title}`}>
                ACTIVE THEATRE · {activeDef.subtitle}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-700">
              {activeDef.location}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: Tactical Satellite Minimap / Radar Blueprint */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div
                className="w-full aspect-square max-w-[280px] bg-[#070b12] rounded-xl border border-slate-700/60 p-3 relative flex flex-col justify-between overflow-hidden shadow-inner"
              >
                {/* Radar sweep lines & grid */}
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(56,189,248,0.2) 1px, transparent 1px), linear-gradient(to right, rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.08) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Radar concentric range rings */}
                <div className="absolute inset-4 rounded-full border border-sky-500/20 pointer-events-none" />
                <div className="absolute inset-12 rounded-full border border-sky-500/15 pointer-events-none" />

                {/* Top Blueprint Header */}
                <div className={`relative z-10 flex justify-between text-[9px] font-mono font-bold ${theme.title}`}>
                  <span>{activeDef.name}</span>
                  <span>{activeDef.sizeStr}</span>
                </div>

                {/* Tactical Top-down Visual Layout */}
                <div className="relative z-10 my-auto w-full h-42 border border-slate-700/60 rounded bg-black/50 flex flex-col items-center justify-between p-2">
                  {/* North Sector */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono border bg-red-950/80 border-red-500/50 text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>{activeDef.radarLabels.north}</span>
                  </div>

                  {/* Mid CQB Center Crossfire */}
                  <div className="w-full flex items-center justify-between px-1 text-[8px] font-mono text-slate-300 gap-1">
                    <div className="bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 text-center leading-tight">
                      {activeDef.radarLabels.midWest}
                    </div>
                    <div className="px-2 py-1 rounded border font-bold flex items-center gap-1 text-center leading-tight bg-slate-900/90 border-sky-500/40 text-sky-200">
                      <span>{theme.icon}</span>
                      <span>{activeDef.radarLabels.midCenter}</span>
                    </div>
                    <div className="bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 text-center leading-tight">
                      {activeDef.radarLabels.midEast}
                    </div>
                  </div>

                  {/* South Sector */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono border bg-sky-950/80 border-sky-400/60 text-sky-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    <span>{activeDef.radarLabels.south}</span>
                  </div>
                </div>

                {/* Bottom Blueprint Footer */}
                <div className="relative z-10 flex justify-between text-[9px] font-mono text-slate-400">
                  <span className="text-emerald-400">● LIVE SATELLITE FEED</span>
                  <span>COMPASS: 360° N</span>
                </div>
              </div>
            </div>

            {/* Right: Map Intel & Match Telemetry */}
            <div className="md:col-span-7 flex flex-col justify-center text-left space-y-3">
              <div>
                <div className={`text-[11px] font-mono font-bold tracking-widest uppercase ${theme.sub}`}>
                  {activeDef.subtitle}
                </div>
                <h3 className="text-2xl md:text-3xl font-black italic text-white tracking-tight flex items-center gap-2">
                  <span>{activeDef.name}</span>
                  <span className="text-xl">{theme.icon}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {activeDef.description}
                </p>
              </div>

              {/* Match telemetry spec badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">GAME MODE</span>
                  <span className="text-white font-bold">TEAM DEATHMATCH</span>
                </div>
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">SQUAD SIZE</span>
                  <span className="text-sky-400 font-bold">4V4 COMBAT</span>
                </div>
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">SCORE LIMIT</span>
                  <span className="text-amber-400 font-bold">FIRST TO 40</span>
                </div>
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">ARENA SIZE</span>
                  <span className="text-white font-bold">{activeDef.sizeStr}</span>
                </div>
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">ATMOSPHERE</span>
                  <span className="text-emerald-400 font-bold">{activeDef.atmosphere}</span>
                </div>
                <div className="bg-black/40 border border-slate-800 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[9px]">TIME LIMIT</span>
                  <span className="text-white font-bold">8:00 MIN</span>
                </div>
              </div>

              {/* Tactical Combat Rating */}
              <div className="bg-black/30 border border-slate-800/80 p-2.5 rounded-lg space-y-1.5 text-[10px] font-mono">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">CQB / ROOM CLEARING:</span>
                  <span className="text-sky-400 font-bold">{activeDef.cqbRating}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">MID-RANGE FLANKS:</span>
                  <span className="text-sky-400 font-bold">{activeDef.midRating}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">LONG-RANGE SIGHTLINES:</span>
                  <span className="text-sky-400 font-bold">{activeDef.longRating}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls: BACK TO MENU & CONFIRM MAP */}
        <div className="w-full pt-1 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-600 font-mono text-sm font-bold tracking-widest skew-x-[-6deg] transition-all cursor-pointer"
            style={{ minHeight: 52 }}
          >
            ← BACK TO MENU
          </button>
          <button
            onClick={onConfirm}
            className={`w-full sm:w-auto px-12 py-3.5 active:scale-95 font-black text-xl tracking-widest skew-x-[-6deg] transition-all cursor-pointer flex items-center justify-center gap-2 ${theme.btn}`}
            style={{ minHeight: 52 }}
          >
            <span>CONFIRM {activeDef.name} & LOADOUT</span>
            <span className="text-2xl font-black">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
