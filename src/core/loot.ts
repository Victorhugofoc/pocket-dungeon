// Orbes de ouro e XP no chão e o banco (combat/loot.lua do Dungeon Reign, D-618 e D-637). Puro: sem three.js.
// O que o inimigo morto vale cai como orbe; o herói puxa ao passar perto. O que sobra no fim da onda vai para o banco
// (`run.lootBank`), e cada inimigo que nasce depois pode levar a promessa de um orbe do banco (moeda sob os pés): ao morrer,
// o orbe dele sai em dobro ("2x"). Um prometido que some sem morrer devolve a promessa, porque a reserva é só a contagem
// dos vivos com a marca.
import { RUN_TUNING } from "../data/run";
import { DR_PX_PER_M } from "../data/techniques";

const L = RUN_TUNING.loot;
const M = 1 / DR_PX_PER_M;

export interface LootOrb {
  x: number;
  z: number;
  gold: number;
  xp: number;
  /** leva um orbe do banco */
  double: boolean;
  /** segundos no chão */
  t: number;
  /** já foi puxado: vai até o herói mesmo que ele se afaste */
  pulled: boolean;
  /** velocidade do puxão, em m/s */
  speed: number;
}

/** `Loot.onSpawn`: o inimigo novo leva a promessa se ainda há orbe no banco sem dono. */
export function promisesBank(bank: readonly unknown[], reserved: number): boolean {
  return bank.length > reserved;
}

export class LootField {
  orbs: LootOrb[] = [];

  /**
   * `Loot.onKill`. `bonus`: o inimigo tinha a promessa (tira o primeiro orbe do banco). `hop` = ângulo e distância do pulo
   * (sorteados fora, para o núcleo não depender de Math.random). Devolve o orbe novo, ou null quando nada caiu ou o chão
   * estava cheio (o mais velho absorveu este).
   */
  drop(x: number, z: number, gold: number, xp: number, bank: [number, number][] | null, hop: { a: number; r: number }): LootOrb | null {
    if (gold <= 0 && xp <= 0) return null;
    const o: LootOrb = { x, z, gold, xp, double: false, t: 0, pulled: false, speed: 0 };
    if (bank && bank.length) {
      const b = bank.shift()!;
      o.gold += b[0] ?? 0;
      o.xp += b[1] ?? 0;
      o.double = true;
    }
    if (this.orbs.length >= L.maxOnFloor) {
      const old = this.orbs[0];
      old.gold += o.gold;
      old.xp += o.xp;
      old.double ||= o.double;
      return null;
    }
    const r = hop.r * M;
    o.x += Math.cos(hop.a) * r;
    o.z += Math.sin(hop.a) * r;
    this.orbs.push(o);
    return o;
  }

  /** `Loot.update`: assenta, puxa e coleta. Devolve os orbes que chegaram ao herói neste quadro (já fora da lista). */
  update(dt: number, hero: { x: number; z: number }, alive: boolean): LootOrb[] {
    const got: LootOrb[] = [];
    const pr = L.heroRadius * M;
    const reach = L.pickup * M + pr;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt;
      const dx = hero.x - o.x, dz = hero.z - o.z;
      const d2 = dx * dx + dz * dz;
      if (!alive || o.t < L.settle || (!o.pulled && d2 > reach * reach)) continue;
      if (!o.pulled) o.speed = L.pullSpeed * M;
      o.pulled = true;
      o.speed += L.pullAccel * M * dt;
      const d = Math.sqrt(d2);
      const step = o.speed * dt;
      if (d <= pr * 0.5 + step) {
        got.push(o);
        this.orbs.splice(i, 1);
      } else {
        o.x += (dx / d) * step;
        o.z += (dz / d) * step;
      }
    }
    return got;
  }

  /** `Loot.bankLeftovers`: o fim da onda guarda o que ficou no chão. Devolve os orbes guardados (para o efeito de voo). */
  bankLeftovers(bank: [number, number][]): LootOrb[] {
    const left = this.orbs;
    for (const o of left) bank.push([o.gold, o.xp]);
    this.orbs = [];
    return left;
  }
}
