"""Relatório dos bots a partir do CSV do sim_runner (tools/run_bots.ps1).

Uso: python -I tools/bot_report.py reports/<data>/all.csv
"""
import csv
import math
import sys
from collections import Counter, defaultdict


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def pct(x):
    return f"{100 * x:5.1f}%"


def main(path):
    with open(path, encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r.get("bot")]
    bots = sorted({r["bot"] for r in rows}, key=lambda b: ["random", "generic", "counter"].index(b)
                  if b in ("random", "generic", "counter") else 9)
    by_bot = defaultdict(list)
    for r in rows:
        by_bot[r["bot"]].append(r)

    print("=" * 72)
    print("RESULTADO POR BOT")
    print("=" * 72)
    print(f"{'bot':10} {'runs':>5} {'vitórias':>9} {'IC 95%':>17} {'ondas':>6} {'PV fim':>7} {'ms/run':>7}")
    win_rate = {}
    for b in bots:
        rs = by_bot[b]
        n = len(rs)
        k = sum(r["status"] == "won" for r in rs)
        lo, hi = wilson(k, n)
        win_rate[b] = k / n if n else 0
        waves = sum(int(r["waves_survived"]) for r in rs) / n
        hp = [int(r["heart_hp"]) for r in rs if r["status"] == "won"]
        hp_avg = sum(hp) / len(hp) if hp else 0
        ms = sum(int(r["ms"]) for r in rs) / n
        print(f"{b:10} {n:5} {pct(k / n):>9} {pct(lo)}–{pct(hi).strip():>7} {waves:6.2f} {hp_avg:7.1f} {ms:7.0f}")

    print()
    print("GATE DA FASE 1")
    if "counter" in win_rate and "random" in win_rate:
        d = win_rate["counter"] - win_rate["random"]
        print(f"  counter - random  = {100 * d:+.1f} pp (meta: >= +25 pp) -> {'OK' if d >= 0.25 else 'FALHOU'}")
    if "counter" in win_rate and "generic" in win_rate:
        d = win_rate["counter"] - win_rate["generic"]
        print(f"  counter - generic = {100 * d:+.1f} pp (meta: > 0, ler a onda importa) -> {'OK' if d > 0 else 'FALHOU'}")
        seeds = defaultdict(dict)
        for r in rows:
            seeds[r["seed"]][r["bot"]] = r["status"] == "won"
        only_c = sum(1 for s in seeds.values() if s.get("counter") and s.get("generic") is False)
        only_g = sum(1 for s in seeds.values() if s.get("generic") and s.get("counter") is False)
        print(f"  pareado (mesma semente): só counter vence {only_c}, só generic vence {only_g}")

    print()
    print("ONDA DA DERROTA (distribuição)")
    for b in bots:
        c = Counter(int(r["loss_wave"]) for r in by_bot[b] if r["status"] == "lost")
        print(f"  {b:10} " + "  ".join(f"o{w}:{c.get(w, 0):3}" for w in range(1, 9)))

    print()
    print("VITÓRIAS POR HERÓI-CHEFE")
    bosses = sorted({r["boss"] for r in rows})
    print(f"  {'chefe':10} " + " ".join(f"{b:>10}" for b in bots))
    for boss in bosses:
        cells = []
        for b in bots:
            rs = [r for r in by_bot[b] if r["boss"] == boss]
            k = sum(r["status"] == "won" for r in rs)
            cells.append(f"{k:3}/{len(rs):<3} {pct(k / len(rs)) if rs else '  -  ':>6}"[:10].rjust(10))
        print(f"  {boss:10} " + " ".join(cells))

    if "counter" in by_bot:
        rs = by_bot["counter"]
        winners = [r for r in rs if r["status"] == "won"]
        print()
        print("DOMINÂNCIA (counter): vitória com e sem cada monstro na masmorra final (D-014)")
        print("  alerta se a vitória SEM o monstro cai abaixo de metade da média (peça obrigatória)")
        base = len(winners) / len(rs)
        units = Counter()
        for r in winners:
            for x in r["monsters"].split(";"):
                if x:
                    units[x.split(":")[0]] += 1
        total_units = sum(units.values()) or 1
        ids = sorted({x.split(":")[0] for r in rs for x in r["monsters"].split(";") if x})
        for i in ids:
            has = [r for r in rs if any(x.split(":")[0] == i for x in r["monsters"].split(";") if x)]
            hasnt = [r for r in rs if r not in has]
            w_has = sum(r["status"] == "won" for r in has) / len(has) if has else 0
            w_not = sum(r["status"] == "won" for r in hasnt) / len(hasnt) if hasnt else 0
            flag = "  <-- OBRIGATÓRIO" if hasnt and len(hasnt) >= 10 and w_not < base / 2 else ""
            print(f"  {i:10} com {pct(w_has)} ({len(has):3})  sem {pct(w_not)} ({len(hasnt):3})"
                  f"  fatia das unidades vencedoras {pct(units[i] / total_units)}{flag}")
        digs = [int(r["digs"]) for r in rs]
        print(f"  escavações médias {sum(digs) / len(digs):.2f}; runs que escavaram: {pct(sum(d > 0 for d in digs) / len(digs))}"
              f"; vencedoras que escavaram: {pct(sum(int(r['digs']) > 0 for r in winners) / max(1, len(winners)))}")

    for b in [x for x in ("counter", "generic") if x in by_bot]:
        rs = by_bot[b]
        print()
        print(f"PEÇAS NA MASMORRA FINAL ({b}): presença e vitória quando presente")
        for col, label in (("monsters", "monstro"), ("rooms", "sala"), ("traps", "armadilha")):
            present = defaultdict(int)
            wins = defaultdict(int)
            for r in rs:
                ids = {x.split(":")[0] for x in r[col].split(";") if x}
                for i in ids:
                    present[i] += 1
                    wins[i] += r["status"] == "won"
            items = sorted(present, key=lambda i: -present[i])
            line = "  ".join(f"{i} {pct(present[i] / len(rs)).strip()}/{pct(wins[i] / present[i]).strip()}" for i in items)
            print(f"  {label:9}: {line}")

    print()
    print("DANO MÉDIO AO CORAÇÃO POR TEMA DE ONDA")
    themes = sorted({t for r in rows for t in r["themes"].split(";")})
    print(f"  {'tema':10} " + " ".join(f"{b:>9}" for b in bots))
    for t in themes:
        cells = []
        for b in bots:
            vals = []
            for r in by_bot[b]:
                ths = r["themes"].split(";")
                dmg = [int(x) for x in r["heart_damage"].split(";") if x]
                vals += [dmg[i] for i in range(len(dmg)) if ths[i] == t]
            cells.append(f"{sum(vals) / len(vals):9.2f}" if vals else "        -")
        print(f"  {t:10} " + " ".join(cells))


if __name__ == "__main__":
    main(sys.argv[1])
