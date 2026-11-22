// Desempenho no registro de partidas (M16-01, pedido do usuário em 2026-11-22): fps e stuttering de cada onda e da partida,
// para ler no `logs/runs.jsonl` sem o usuário precisar abrir o F3. Só contas: o jogo (game/perf.ts) junta os tempos.

/** Resumo dos quadros de um trecho (uma onda ou a partida). Tempos em ms. */
export interface FrameStats {
  frames: number;
  /** segundos jogados no trecho (soma dos quadros) */
  seconds: number;
  /** fps médio: quadros / segundos */
  fps: number;
  median: number;
  p95: number;
  p99: number;
  worst: number;
  /** quadros acima de 2× a mediana e de mediana + 4 ms: um quadro perdido que dá para sentir */
  hitches: number;
  /** quadros acima de 33 ms (abaixo de 30 fps) */
  long: number;
  /** quadros acima de 100 ms (travada) */
  freezes: number;
  /** travadinhas por minuto: (hitches) / minutos */
  hitchesPerMin: number;
  /** CPU do quadro (atualização + render): mediana e p99 */
  cpuMedian: number;
  cpuP99: number;
  /** tempo médio de GPU por quadro (-1 = sem medida) */
  gpuMs: number;
}

/** Um pico guardado: onde, quanto e o que mudou no quadro (shader+N, geo+N, tex+N, zone, resize...). */
export interface PerfSpike {
  wave: number;
  /** segundos de combate da partida */
  at: number;
  ms: number;
  cpu: number;
  tags: string[];
}

/** Desempenho da partida inteira, no fim do resumo. */
export interface RunPerf {
  /** placa e tela de quem jogou */
  env: { gpu: string; width: number; height: number; dpr: number; quality: number };
  total: FrameStats;
  /** escala da resolução adaptativa: menor valor visto e o do fim */
  minScale: number;
  /** os piores picos da partida (até PERF_SPIKES), do pior para o menor */
  spikes: PerfSpike[];
  /** quantas vezes cada marca apareceu num pico (aponta a causa mais comum) */
  spikeTags: Record<string, number>;
}

export const PERF_SPIKES = 20;

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

function pct(sorted: ArrayLike<number>, p: number): number {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] : 0;
}

/** Resumo de uma lista de tempos de quadro e de CPU (mesmo tamanho); `gpuSum`/`gpuN` dão a média de GPU. */
export function frameStats(times: ArrayLike<number>, cpu: ArrayLike<number>, gpuSum = 0, gpuN = 0): FrameStats {
  const n = times.length;
  const t = Float64Array.from(times).sort();
  const c = Float64Array.from(cpu).sort();
  let sum = 0;
  for (let i = 0; i < n; i++) sum += t[i];
  const med = pct(t, 0.5);
  const hitchAt = Math.max(med * 2, med + 4);
  let hitches = 0, long = 0, freezes = 0;
  for (let i = 0; i < n; i++) {
    if (t[i] > hitchAt) hitches++;
    if (t[i] > 33.4) long++;
    if (t[i] > 100) freezes++;
  }
  const seconds = sum / 1000;
  return {
    frames: n, seconds: r1(seconds), fps: seconds > 0 ? r1(n / seconds) : 0,
    median: r2(med), p95: r2(pct(t, 0.95)), p99: r2(pct(t, 0.99)), worst: r1(n ? t[n - 1] : 0),
    hitches, long, freezes, hitchesPerMin: seconds > 0 ? r1(hitches / (seconds / 60)) : 0,
    cpuMedian: r2(pct(c, 0.5)), cpuP99: r2(pct(c, 0.99)), gpuMs: gpuN ? r2(gpuSum / gpuN) : -1,
  };
}

/** Guarda o pico se ele está entre os PERF_SPIKES piores (lista do pior para o menor). */
export function keepSpike(list: PerfSpike[], s: PerfSpike, max = PERF_SPIKES): void {
  if (list.length >= max && s.ms <= list[list.length - 1].ms) return;
  let i = list.findIndex((x) => s.ms > x.ms);
  if (i < 0) i = list.length;
  list.splice(i, 0, s);
  if (list.length > max) list.length = max;
}

/** Uma linha legível para o console: "143 fps · median 6.9 ms · p99 14 ms · worst 52 ms · 3 hitches/min". */
export function perfLine(s: FrameStats): string {
  return `${s.fps} fps · median ${s.median} ms · p99 ${s.p99} ms · worst ${s.worst} ms · ${s.hitchesPerMin} hitches/min (${s.hitches}, ${s.long} >33ms, ${s.freezes} >100ms)`;
}
