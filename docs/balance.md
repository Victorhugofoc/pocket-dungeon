# Balanceamento (bot)

Gerado por `npm run sim -- <partidas> <dificuldade> [herói] [seed]` (`M17-01`). Uma seção por dificuldade; rodar de novo troca só a seção dela. Lido das linhas `bot` de `logs/runs.jsonl`.

## normal

2026-11-25 · build `0fc0e57` · `npm run sim -- 1 normal all` · 9 partidas, 9 vitórias (100%)

| Herói | Partidas | Vitória | Onda média da morte | Mortes por onda | Tempo médio (s) | Técnica / esquiva por partida | Presas ou no limite |
|---|---|---|---|---|---|---|---|
| frostine | 1 | 100% | - | - | 594 | 80.0 / 74.0 | - |
| kaelen | 1 | 100% | - | - | 602 | 49.0 / 82.0 | - |
| aurelius | 1 | 100% | - | - | 821 | 107.0 / 133.0 | - |
| ignis | 1 | 100% | - | - | 567 | 51.0 / 66.0 | - |
| zephyr | 1 | 100% | - | - | 577 | 97.0 / 51.0 | - |
| varok | 1 | 100% | - | - | 702 | 38.0 / 117.0 | - |
| umbra | 1 | 100% | - | - | 774 | 65.0 / 147.0 | - |
| seraph | 1 | 100% | - | - | 590 | 48.0 / 75.0 | - |
| vesper | 1 | 100% | - | - | 463 | 55.0 / 31.0 | - |

### Golpe final

Geral: -


### Dano por fonte (média por partida)

| Herói | Causado (maiores) | Recebido (maiores) |
|---|---|---|
| frostine | iceball 43,101, glacial_wall 18,525, fireball 13,904, auto 10,736 | Gravekeeper 40, projectile 23, Plaguebearer (plague) 20, Explosive Barrel 16 |
| kaelen | lightning_strike 41,347, blade_orbit 16,794, storm_step 13,732, auto 9,208 | Explosive Barrel 19, projectile 13 |
| aurelius | arcane_bolt 52,208, time_rift 17,392, quake_totem 13,645, auto 3,733 | projectile 43, Plaguebearer (plague) 42, Storm Tyrant (storm) 41, Explosive Barrel 32 |
| ignis | fireball 26,351, iceball 21,548, burn 20,925, inferno_charge 9,595 | Explosive Barrel 104, projectile 36, Deathstalker 33, Plaguebearer (plague) 20 |
| zephyr | auto 55,422, fan_the_hammer 14,752, quake_totem 9,406, fireball 8,206 | Explosive Barrel 25, Plaguebearer (plague) 24, Storm Tyrant (storm) 20, projectile 9 |
| varok | prism_beam 66,691, fireball 66,074, execution_leap 63,176, last_rites 50,657 | Storm Tyrant (storm) 220, Explosive Barrel 105, Iron Colossus 103, Berserker 29 |
| umbra | arcane_bolt 29,618, prism_beam 23,271, shadow_step 19,028, auto 14,419 | Explosive Barrel 116, Gravekeeper 88, projectile 86, Iron Colossus (boulder) 50 |
| seraph | auto 37,234, arcane_bolt 23,400, fireball 14,392, burn 9,019 | - |
| vesper | hatchling 29,574, brood 22,606, auto 20,222, venom_nova 10,849 | Plaguebearer (plague) 15, Storm Tyrant (storm) 14 |

### Escolhas do bot

- **frostine** · spells: fireball 1, iceball 1 · relíquias: glacial_shell 3, blood_engine 1, bulwark_core 1, champions_trophy 1, conduit_ring 1 · melhorias: second_wind 2, spellsworn 2, spellweave 2, anchor 1, arcane_power 1
- **kaelen** · spells: blade_orbit 1, chain_lightning→lightning_strike 1 · relíquias: storm_step 2, blood_engine 1, champions_trophy 1, cinder_lens 1, conduit_ring 1 · melhorias: storm_affinity 3, spell_surge 2, arcane_haste 1, arcane_power 1, blood_rite 1
- **aurelius** · spells: arcane_bolt 1, quake_totem 1 · relíquias: aegis_heart 2, aether_focus 1, aether_thread 1, arcane_conductor 1, arcanum_sigil 1 · melhorias: spellsworn 3, arcane_affinity 2, spellweave 2, arcane_focus 1, arcane_haste 1
- **ignis** · spells: fireball 1, iceball 1 · relíquias: glacial_shell 2, blood_engine 1, champions_trophy 1, cinder_lens 1, cinderstorm 1 · melhorias: arcane_power 2, infernal_affinity 2, spellweave 2, cold_precision 1, concussive_rounds 1
- **zephyr** · spells: fireball 1, quake_totem 1 · relíquias: evasion_cloak 2, glacial_shell 2, ambushers_fang 1, battlemage_plate 1, blood_engine 1 · melhorias: champions_bounty 2, rapid_strike 2, wisdom 2, cone_shot 1, deadly_edge 1
- **varok** · spells: fireball 1, prism_beam 1 · relíquias: aether_thread 1, ambushers_fang 1, arcanum_sigil 1, astral_prism 1, battlemage_plate 1 · melhorias: blade_discipline 3, spellsworn 3, arcane_power 1, cone_shot 1, critical_edge 1
- **umbra** · spells: arcane_bolt 1, prism_beam 1 · relíquias: aether_focus 1, ambushers_fang 1, arcane_conductor 1, battlemage_plate 1, bounty_grave 1 · melhorias: rapid_strike 3, blade_discipline 2, iron_skin 2, spellsworn 2, blood_rite 1
- **seraph** · spells: arcane_bolt 1, fireball 1 · relíquias: aether_focus 1, ambushers_fang 1, blood_engine 1, bulwark_core 1, champions_trophy 1 · melhorias: spellweave 3, cone_shot 2, glass_cannon 2, martial_focus 2, blade_discipline 1
- **vesper** · spells: rune_traps 1, venom_nova 1 · relíquias: aether_thread 1, ambushers_fang 1, battlemage_plate 1, blood_engine 1, bulwark_core 1 · melhorias: spellsworn 4, arcane_haste 1, blade_discipline 1, brutality 1, contagion 1

## hard

2026-11-25 · build `0fc0e57` · `npm run sim -- 2 hard all` · 18 partidas, 13 vitórias (72%)

| Herói | Partidas | Vitória | Onda média da morte | Mortes por onda | Tempo médio (s) | Técnica / esquiva por partida | Presas ou no limite |
|---|---|---|---|---|---|---|---|
| frostine | 2 | 50% | 5.0 | 5 | 380 | 48.5 / 50.0 | - |
| kaelen | 2 | 50% | 5.0 | 5 | 370 | 28.0 / 46.5 | - |
| aurelius | 2 | 50% | 20.0 | 20 | 599 | 73.0 / 73.5 | - |
| ignis | 2 | 100% | - | - | 598 | 42.0 / 77.5 | - |
| zephyr | 2 | 100% | - | - | 620 | 105.0 / 60.5 | - |
| varok | 2 | 0% | 10.0 | 5, 15 | 250 | 15.5 / 25.0 | - |
| umbra | 2 | 100% | - | - | 791 | 76.0 / 165.5 | - |
| seraph | 2 | 100% | - | - | 670 | 57.0 / 96.5 | - |
| vesper | 2 | 100% | - | - | 507 | 53.0 / 38.5 | - |

### Golpe final

Geral: Venom Hydra (venom) 3, projectile 1, Storm Tyrant (storm) 1

- frostine: Venom Hydra (venom) 1
- kaelen: Venom Hydra (venom) 1
- aurelius: Storm Tyrant (storm) 1
- varok: projectile 1, Venom Hydra (venom) 1

### Dano por fonte (média por partida)

| Herói | Causado (maiores) | Recebido (maiores) |
|---|---|---|
| frostine | iceball 37,955, fireball 17,224, glacial_wall 15,982, auto 7,760 | Venom Hydra (venom) 75, Explosive Barrel 44, Storm Tyrant (storm) 23, Plaguebearer (plague) 8 |
| kaelen | fireball 21,731, chain_lightning 21,379, lightning_strike 17,887, auto 5,534 | Venom Hydra (venom) 73, Explosive Barrel 25, Storm Tyrant (storm) 20, projectile 11 |
| aurelius | arcane_bolt 56,574, arcane_strike 28,310, fireball 27,709, time_rift 22,897 | Storm Tyrant (storm) 52, Storm Tyrant (venom) 42, Void Reaver 33, Explosive Barrel 27 |
| ignis | firestorm 33,642, burn 27,647, iceball 26,870, firewave 19,890 | projectile 60, Explosive Barrel 50, Shrine 31, Storm Tyrant (venom) 16 |
| zephyr | auto 56,774, burn 21,800, firestorm 15,824, prism_beam 15,458 | Storm Tyrant (venom) 79, Venom Hydra (venom) 71, Shrine 60, Explosive Barrel 30 |
| varok | execution_leap 24,213, prism_beam 14,149, last_rites 12,248, burn 11,571 | Venom Hydra (venom) 154, Explosive Barrel 101, Storm Tyrant (storm) 50, Void Reaver 44 |
| umbra | arcane_strike 39,145, shadow_step 27,048, arcane_bolt 23,356, fireball 21,654 | projectile 143, Venom Hydra (venom) 101, Explosive Barrel 90, Mirage Djinn 57 |
| seraph | auto 56,031, arcane_strike 35,444, arcane_bolt 20,340, aegis 11,959 | Venom Hydra (venom) 46, Explosive Barrel 37, Storm Tyrant (storm) 25, projectile 21 |
| vesper | auto 35,930, hatchling 29,501, brood 25,177, venom_nova 21,998 | Venom Hydra (venom) 123, Explosive Barrel 43, Storm Tyrant (storm) 35, Plaguebearer (plague) 20 |

### Escolhas do bot

- **frostine** · spells: iceball 2, fireball 1 · relíquias: glacial_shell 3, rime_charm 2, ashen_eye 1, battlemage_plate 1, blood_engine 1 · melhorias: spellweave 4, champions_bounty 2, elemental_attunement 2, runic_ward 2, second_wind 2
- **kaelen** · spells: chain_lightning 1, chain_lightning→lightning_strike 1, fireball 1 · relíquias: blood_engine 2, storm_coil 2, aether_thread 1, battlemage_plate 1, champions_trophy 1 · melhorias: spell_surge 4, fleetfoot 3, wisdom 3, arcane_haste 2, elemental_attunement 2
- **aurelius** · spells: fireball 2, arcane_bolt 1, arcane_bolt→arcane_strike 1 · relíquias: ember_spurs 3, aether_focus 2, aether_thread 2, arcane_conductor 2, champions_trophy 2 · melhorias: spell_surge 5, overchannel 4, second_wind 4, arcane_affinity 3, arcane_conversion 3
- **ignis** · spells: iceball 2, fireball→firestorm 1, fireball→firewave 1 · relíquias: blood_engine 2, cinderstorm 2, evasion_circuit 2, fortress_veil 2, glacial_shell 2 · melhorias: infernal_affinity 4, overchannel 4, spellweave 4, arcane_haste 3, kindling 3
- **zephyr** · spells: fireball→firestorm 1, fireball→firewave 1, iceball 1, prism_beam 1 · relíquias: glacial_shell 3, storm_step 3, aegis_heart 2, ambushers_fang 2, blood_engine 2 · melhorias: iron_skin 4, second_wind 4, deadly_edge 3, vitality 3, champions_bounty 2
- **varok** · spells: fireball 1, fireball→firestorm 1, prism_beam 1 · relíquias: ambushers_fang 2, vital_spark 2, arcanum_sigil 1, ashen_eye 1, blood_engine 1 · melhorias: martial_focus 3, heavy_shot 2, long_reach 2, spellweave 2, blade_discipline 1
- **umbra** · spells: arcane_bolt→arcane_strike 2, fireball 1, iceball 1 · relíquias: evasion_circuit 4, aether_focus 3, glacial_shell 3, aether_thread 2, ambushers_fang 2 · melhorias: blood_rite 3, long_reach 3, rapid_strike 3, spellsworn 3, champions_bounty 2
- **seraph** · spells: arcane_bolt→arcane_strike 2, fireball 1, iceball 1 · relíquias: evasion_circuit 5, scavenger_badge 3, aether_focus 2, aether_thread 2, ambushers_fang 2 · melhorias: deadly_edge 3, rapid_strike 3, second_wind 3, boomerang 2, champions_bounty 2
- **vesper** · spells: fireball 1, fireball→firewave 1, venom_nova 1, venom_nova→plague_bloom 1 · relíquias: ember_spurs 3, ambushers_fang 2, champions_trophy 2, evasion_cloak 2, glacial_shell 2 · melhorias: spellsworn 5, brutality 3, iron_skin 3, overchannel 3, runic_ward 3
