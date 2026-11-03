// Procedural WebAudio sound effects — no external assets needed.
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noiseBuffer(sec: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startAmbient() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.value = 0.03;
    src.connect(filt).connect(g).connect(this.master!);
    src.start();
    // slow LFO on wind
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.015;
    lfo.connect(lfoG).connect(g.gain);
    lfo.start();
  }

  private spatial(vol: number, pan: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = vol;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(this.master!);
    return g;
  }

  gunshot(vol = 1, pan = 0, distant = false, weaponId: 'assault' | 'smg' | 'sniper' | 'shotgun' | 'lmg' = 'assault') {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.spatial(vol, pan);

    if (weaponId === 'smg') {
      // Rapid, higher pitch crack + tight mechanical burst
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.18);
      const f = ctx.createBiquadFilter();
      f.type = distant ? 'lowpass' : 'bandpass';
      f.frequency.value = distant ? 700 : 2200;
      f.Q.value = 1.0;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(distant ? 0.4 : 0.85, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      n.connect(f).connect(ng).connect(out);
      n.start(t);

      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(distant ? 140 : 260, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.6, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(og).connect(out);
      o.start(t);
      o.stop(t + 0.1);

    } else if (weaponId === 'sniper') {
      // Massive thunderous boom with deep sub-bass and long echo
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.7);
      const f = ctx.createBiquadFilter();
      f.type = distant ? 'lowpass' : 'bandpass';
      f.frequency.value = distant ? 400 : 1200;
      f.Q.value = 0.5;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(distant ? 0.9 : 1.6, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (distant ? 0.5 : 0.45));
      n.connect(f).connect(ng).connect(out);
      n.start(t);

      // Deep sub thump
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 0.28);
      const og = ctx.createGain();
      og.gain.setValueAtTime(1.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      o.connect(og).connect(out);
      o.start(t);
      o.stop(t + 0.35);

    } else if (weaponId === 'shotgun') {
      // Roaring buckshot burst + metallic slap
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.4);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = distant ? 550 : 2600;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(1.4, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      n.connect(f).connect(ng).connect(out);
      n.start(t);

      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
      const og = ctx.createGain();
      og.gain.setValueAtTime(1.2, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(og).connect(out);
      o.start(t);
      o.stop(t + 0.2);

    } else if (weaponId === 'lmg') {
      // Heavy chugging machine gun punch
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.28);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = distant ? 550 : 1400;
      f.Q.value = 0.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(1.1, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      n.connect(f).connect(ng).connect(out);
      n.start(t);

      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const og = ctx.createGain();
      og.gain.setValueAtTime(1.0, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(og).connect(out);
      o.start(t);
      o.stop(t + 0.16);

    } else {
      // Default assault rifle
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.3);
      const f = ctx.createBiquadFilter();
      f.type = distant ? 'lowpass' : 'bandpass';
      f.frequency.value = distant ? 500 : 1600;
      f.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(distant ? 0.5 : 1.0, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (distant ? 0.35 : 0.16));
      n.connect(f).connect(ng).connect(out);
      n.start(t);

      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(distant ? 90 : 150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const og = ctx.createGain();
      og.gain.setValueAtTime(distant ? 0.4 : 0.9, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(og).connect(out);
      o.start(t);
      o.stop(t + 0.16);
    }
  }

  pumpRack() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    // Slide back
    const n1 = ctx.createBufferSource();
    n1.buffer = this.noiseBuffer(0.06);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 2400;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n1.connect(f1).connect(g1).connect(this.master!);
    n1.start(t);

    // Slide forward
    const n2 = ctx.createBufferSource();
    n2.buffer = this.noiseBuffer(0.08);
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 3200;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.35, t + 0.18);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    n2.connect(f2).connect(g2).connect(this.master!);
    n2.start(t + 0.18);
  }

  boltCycle() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [0, 0.22, 0.48].forEach((dt, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(i === 1 ? 1400 : (i === 2 ? 800 : 1800), t + dt);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.06);
      o.connect(g).connect(this.master!);
      o.start(t + dt);
      o.stop(t + dt + 0.08);
    });
  }

  hitMarker() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.06);
  }

  killConfirm() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [880, 1320].forEach((fq, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      o.connect(g).connect(this.master!);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.14);
    });
  }

  hurt() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f).connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.22);
  }

  reload() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [0, 0.35, 0.9].forEach((dt, i) => {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuffer(0.06);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = i === 2 ? 3000 : 2000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t + dt);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.06);
      n.connect(f).connect(g).connect(this.master!);
      n.start(t + dt);
    });
  }

  dryFire() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.05);
  }

  footstep() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(0.07);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.connect(f).connect(g).connect(this.master!);
    n.start(t);
  }
}
