// Saco de chefes (bosses/boss_bag.lua, §61, D6): cada chefe uma vez por saco, embaralhado pela seed, tirado do fim;
// saco vazio é refeito, e o primeiro do saco novo nunca é o chefe que acabou de sair. O chefe das ondas de chefe e
// o da emboscada saem daqui. A onda 20 é o rei coroado, com um ataque emprestado de outro chefe
// (wave_system.lua `crownAttack`, D-640).
import type { Rng } from "./rng";

/** O que o saco guarda na partida (vai no checkpoint). */
export interface BossBagState {
  /** chefes que ainda estão no saco; o próximo é o último da lista */
  bossBag: string[];
  lastBoss: string | null;
  bossHistory: string[];
}

const RANK = { easy: 1, normal: 2, hard: 3 } as const;

/**
 * `Bag.allowed`: um chefe com `minDifficulty` só entra no saco dessa dificuldade para cima (o Hollow King e o Mirage
 * Djinn só na Hard). O Depths conta como a Hard (D-322), quando chegar (M13).
 */
export function bossAllowed(minDifficulty: keyof typeof RANK | undefined, difficulty: keyof typeof RANK): boolean {
  return !minDifficulty || RANK[difficulty] >= RANK[minDifficulty];
}

function rebuild(run: BossBagState, rng: Rng, pool: readonly string[]): void {
  const list = rng.shuffle([...pool]);
  // tira do fim: o "primeiro" é list[last]
  const last = list.length - 1;
  if (run.lastBoss && list[last] === run.lastBoss && list.length > 1) [list[last], list[0]] = [list[0], list[last]];
  run.bossBag = list;
}

/**
 * `Bag.draw`: o próximo chefe do saco. `pool` = os chefes que podem sair, na ordem de `bosses.lua` (hoje os 4 que
 * existem aqui; os do `M10` entram quando tiverem luta). `avoid`: chefe que não pode sair agora (fica no saco).
 */
export function drawBoss(run: BossBagState, rng: Rng, pool: readonly string[], avoid?: string): string {
  // um chefe que saiu do jogo (save antigo) não pode sair do saco
  run.bossBag = run.bossBag.filter((id) => pool.includes(id));
  if (run.bossBag.length === 0) rebuild(run, rng, pool);
  let id = run.bossBag.pop()!;
  if (avoid && id === avoid) {
    if (run.bossBag.length === 0) {
      rebuild(run, rng, pool);
      const b = run.bossBag;
      const last = b.length - 1;
      if (b[last] === avoid) [b[last], b[0]] = [b[0], b[last]];
      id = b.pop()!;
    } else {
      const other = run.bossBag.pop()!;
      run.bossBag.unshift(id);
      id = other;
    }
  }
  run.lastBoss = id;
  run.bossHistory.push(id);
  return id;
}

/**
 * `WaveSystem.crownAttack`: um ataque que outro chefe usa e que o rei não tem. `borrow` = os tipos que podem ser
 * emprestados (lá `CROWN.borrow`); `own` = os tipos do rei. Devolve o tipo, ou null se não sobrar nenhum.
 */
export function crownAttack(own: readonly string[], borrow: readonly string[], rng: Rng): string | null {
  const pool = borrow.filter((k) => !own.includes(k));
  return pool.length ? pool[rng.int(0, pool.length - 1)] : null;
}
