// Registro de tempo por quadro (M16-01): acha os picos (stuttering) e marca o que aconteceu no quadro do pico.
import type * as THREE from "three";

export interface FrameSpike {
  /** tempo do jogo (s) quando aconteceu */
  at: number;
  /** duração do quadro (ms) */
  ms: number;
  /** tempo de CPU gasto dentro do quadro (ms): atualização + render */
  cpu: number;
  /** o que mudou neste quadro: programas de shader novos, geometrias, texturas, resize... */
  tags: string[];
}

const SIZE = 600;

export class FrameProbe {
  /** duração de cada quadro (ms), anel dos últimos SIZE quadros */
  private times = new Float32Array(SIZE);
  private n = 0;
  /** picos guardados (os últimos 40) */
  spikes: FrameSpike[] = [];
  private programs = 0;
  private geometries = 0;
  private textures = 0;
  private pending: string[] = [];
  private cpuStart = 0;
  lastCpu = 0;
  private med = 16.7;

  constructor(private renderer: THREE.WebGLRenderer) {}

  /** marca um evento no quadro atual (ex.: "resize") */
  tag(s: string): void {
    this.pending.push(s);
  }

  begin(): void {
    this.cpuStart = performance.now();
  }

  /** fecha o quadro: `ms` é o tempo desde o quadro anterior */
  end(ms: number, at: number): void {
    this.lastCpu = performance.now() - this.cpuStart;
    const info = this.renderer.info;
    const progs = (info.programs?.length ?? 0), geo = info.memory.geometries, tex = info.memory.textures;
    if (progs > this.programs) this.pending.push(`shader+${progs - this.programs}`);
    if (geo - this.geometries > 4) this.pending.push(`geo+${geo - this.geometries}`);
    if (tex > this.textures) this.pending.push(`tex+${tex - this.textures}`);
    this.programs = progs;
    this.geometries = geo;
    this.textures = tex;
    if (ms > 1000) { // aba oculta ou jogo parado: não é pico de quadro
      this.pending.length = 0;
      return;
    }
    if (this.n % 30 === 0) this.med = this.median(); // ordenar 600 números todo quadro já seria custo
    const med = this.med;
    this.times[this.n % SIZE] = ms;
    this.n++;
    // pico: mais que o dobro da mediana e acima de 12 ms (abaixo disso ninguém sente), ou CPU do quadro acima de 12 ms
    if (this.n > 30 && (ms > Math.max(12, med * 2) || this.lastCpu > 12)) {
      this.spikes.push({ at: +at.toFixed(2), ms: +ms.toFixed(1), cpu: +this.lastCpu.toFixed(1), tags: this.pending.slice() });
      if (this.spikes.length > 40) this.spikes.shift();
    }
    this.pending.length = 0;
  }

  private sorted(): number[] {
    const k = Math.min(this.n, SIZE);
    return Array.from(this.times.subarray(0, k)).sort((a, b) => a - b);
  }

  private median(): number {
    if (this.n < 10) return 16.7;
    const s = this.sorted();
    return s[s.length >> 1];
  }

  /** resumo dos últimos SIZE quadros */
  report(): { frames: number; median: number; p99: number; worst: number; over2x: number; spikes: FrameSpike[] } {
    const s = this.sorted();
    if (!s.length) return { frames: 0, median: 0, p99: 0, worst: 0, over2x: 0, spikes: [] };
    const med = s[s.length >> 1];
    return {
      frames: s.length,
      median: +med.toFixed(2),
      p99: +s[Math.floor(s.length * 0.99)].toFixed(1),
      worst: +s[s.length - 1].toFixed(1),
      over2x: s.filter((v) => v > med * 2).length,
      spikes: this.spikes.slice(-10),
    };
  }
}
