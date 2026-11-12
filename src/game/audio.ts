// Efeitos sonoros sintetizados (WebAudio), sem arquivos.

type Sfx = "shoot" | "swing" | "hit" | "crit" | "kill" | "hurt" | "level" | "pickup" | "rare" | "tech" | "dash" | "boss" | "potion" | "warn";

const SPEC: Record<Sfx, { type: OscillatorType; f0: number; f1: number; dur: number; vol: number; noise?: number }> = {
  shoot: { type: "square", f0: 720, f1: 260, dur: 0.07, vol: 0.05 },
  swing: { type: "sawtooth", f0: 220, f1: 90, dur: 0.12, vol: 0.07, noise: 0.5 },
  hit: { type: "triangle", f0: 260, f1: 120, dur: 0.06, vol: 0.09, noise: 0.6 },
  crit: { type: "square", f0: 900, f1: 300, dur: 0.12, vol: 0.09, noise: 0.4 },
  kill: { type: "triangle", f0: 180, f1: 50, dur: 0.18, vol: 0.12, noise: 0.7 },
  hurt: { type: "sawtooth", f0: 160, f1: 70, dur: 0.2, vol: 0.14, noise: 0.5 },
  level: { type: "triangle", f0: 440, f1: 1320, dur: 0.5, vol: 0.14 },
  pickup: { type: "sine", f0: 660, f1: 990, dur: 0.09, vol: 0.08 },
  rare: { type: "sine", f0: 520, f1: 1560, dur: 0.4, vol: 0.12 },
  tech: { type: "sawtooth", f0: 140, f1: 620, dur: 0.25, vol: 0.1, noise: 0.3 },
  dash: { type: "sine", f0: 500, f1: 200, dur: 0.12, vol: 0.06, noise: 0.8 },
  boss: { type: "sawtooth", f0: 90, f1: 45, dur: 0.9, vol: 0.18, noise: 0.3 },
  potion: { type: "sine", f0: 330, f1: 660, dur: 0.3, vol: 0.1 },
  warn: { type: "square", f0: 300, f1: 300, dur: 0.08, vol: 0.04 },
};

export class Audio {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last: Partial<Record<Sfx, number>> = {};
  muted = false;

  /** precisa de um gesto do usuário antes */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate * 0.3;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    if (now - (this.last[name] ?? -1) < 0.035) return;
    this.last[name] = now;
    const s = SPEC[name];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(s.vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + s.dur);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = s.type;
    osc.frequency.setValueAtTime(s.f0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, s.f1), now + s.dur);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + s.dur + 0.02);
    if (s.noise && this.noiseBuf) {
      const n = ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(s.vol * s.noise, now);
      ng.gain.exponentialRampToValueAtTime(0.0008, now + s.dur);
      n.connect(ng).connect(ctx.destination);
      n.start(now);
      n.stop(now + s.dur + 0.02);
    }
  }
}
