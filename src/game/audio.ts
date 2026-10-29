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

  gunshot(vol = 1, pan = 0, distant = false) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.spatial(vol, pan);
    // crack
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
    // thump
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
