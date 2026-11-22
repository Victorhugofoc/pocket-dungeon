// Registro de tempo por quadro (M16-01): acha os picos (stuttering) e marca o que aconteceu no quadro do pico.
import type * as THREE from "three";
import { frameStats, keepSpike, type FrameStats, type PerfSpike, type RunPerf } from "../core/perflog";

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
  /** marcas do último quadro fechado (para o registro de partidas) */
  lastTags: string[] = [];

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
    this.lastTags = this.pending.slice();
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
      this.spikes.push({ at: +at.toFixed(2), ms: +ms.toFixed(1), cpu: +this.lastCpu.toFixed(1), tags: this.lastTags });
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

/** Float32Array que cresce (milhares de quadros por onda sem lixo de array de números). */
class Series {
  data = new Float32Array(4096);
  n = 0;
  push(x: number): void {
    if (this.n === this.data.length) {
      const d = new Float32Array(this.data.length * 2);
      d.set(this.data);
      this.data = d;
    }
    this.data[this.n++] = x;
  }
  view(): Float32Array { return this.data.subarray(0, this.n); }
  clear(): void { this.n = 0; }
}

/** Junta os quadros jogados para o registro de partidas (core/perflog.ts): um resumo por onda e um da partida. */
export class PerfLog {
  private wTimes = new Series();
  private wCpu = new Series();
  private wGpu = 0;
  private wGpuN = 0;
  private rTimes = new Series();
  private rCpu = new Series();
  private rGpu = 0;
  private rGpuN = 0;
  private spikes: PerfSpike[] = [];
  private tagCount: Record<string, number> = {};
  minScale = 1;
  private med = 16.7;
  /** quadros a ignorar depois de `reset` (o primeiro desenho da partida compila sombra e pós-processamento) */
  private warmup = 0;
  /** marcas do quadro anterior: o tempo de um quadro só aparece no delta do quadro seguinte */
  private prevTags: string[] = [];

  /** partida nova (ou continuada): zera tudo */
  reset(): void {
    this.wTimes.clear(); this.wCpu.clear(); this.rTimes.clear(); this.rCpu.clear();
    this.wGpu = this.wGpuN = this.rGpu = this.rGpuN = 0;
    this.spikes = [];
    this.tagCount = {};
    this.minScale = 1;
    this.warmup = 10;
    this.prevTags = [];
  }

  /** um quadro jogado (fora de pausa); `gpu` < 0 quando não há medida */
  add(ms: number, cpu: number, gpu: number, scale: number, tags: string[], wave: number, at: number): void {
    const prev = this.prevTags;
    this.prevTags = tags;
    if (ms > 1000) return; // aba oculta
    if (this.warmup > 0) { this.warmup--; return; }
    this.wTimes.push(ms); this.wCpu.push(cpu); this.rTimes.push(ms); this.rCpu.push(cpu);
    if (gpu >= 0) { this.wGpu += gpu; this.wGpuN++; this.rGpu += gpu; this.rGpuN++; }
    this.minScale = Math.min(this.minScale, scale);
    const n = this.rTimes.n;
    if (n % 60 === 0) { // mediana dos últimos 600 quadros, de vez em quando
      const tail = Float32Array.from(this.rTimes.data.subarray(Math.max(0, n - 600), n)).sort();
      this.med = tail[tail.length >> 1];
    }
    if (n > 30 && (ms > Math.max(this.med * 2, this.med + 4) || cpu > 12)) {
      tags = [...new Set([...prev, ...tags])];
      for (const t of tags) {
        const k = t.replace(/\+\d+$/, "");
        this.tagCount[k] = (this.tagCount[k] ?? 0) + 1;
      }
      if (!tags.length) this.tagCount.none = (this.tagCount.none ?? 0) + 1;
      keepSpike(this.spikes, { wave, at: +at.toFixed(1), ms: +ms.toFixed(1), cpu: +cpu.toFixed(1), tags });
    }
  }

  /** fecha a onda: devolve o resumo dela e começa a próxima */
  takeWave(): FrameStats {
    const s = frameStats(this.wTimes.view(), this.wCpu.view(), this.wGpu, this.wGpuN);
    this.wTimes.clear(); this.wCpu.clear();
    this.wGpu = this.wGpuN = 0;
    return s;
  }

  /** resumo da onda em andamento, sem fechar */
  peekWave(): FrameStats {
    return frameStats(this.wTimes.view(), this.wCpu.view(), this.wGpu, this.wGpuN);
  }

  run(env: RunPerf["env"]): RunPerf {
    return {
      env, total: frameStats(this.rTimes.view(), this.rCpu.view(), this.rGpu, this.rGpuN), minScale: +this.minScale.toFixed(2),
      spikes: this.spikes.slice(), spikeTags: { ...this.tagCount },
    };
  }
}

/** Nome da placa de vídeo (o navegador pode esconder; aí fica o genérico). */
export function gpuName(renderer: THREE.WebGLRenderer): string {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  } catch {
    return "unknown";
  }
}
