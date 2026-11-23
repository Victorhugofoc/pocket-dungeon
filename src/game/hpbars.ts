// Barra de vida sobre os inimigos feridos, como no Dungeon Reign (entity_renderer.lua "HP bar when damaged"):
// só aparece depois do primeiro dano, nunca em chefe (o chefe tem a barra do HUD). Fundo escuro e preenchimento vermelho,
// dois sprites; o preenchimento cresce a partir da borda esquerda (`center.x = 0`).
import * as THREE from "three";
import type { Enemy } from "./enemy";
import { TUNING } from "../data/tuning";

const B = TUNING.enemy.hpBar;

export class EnemyBars {
  private back = new THREE.SpriteMaterial({ color: B.back, opacity: B.backOpacity, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  private fill = new THREE.SpriteMaterial({ color: B.fill, depthTest: false, depthWrite: false, toneMapped: false });
  /** M9-06: o Arcane Shield, por cima da vida, na proporção do escudo sobre a vida máxima */
  private shieldMat = new THREE.SpriteMaterial({ color: B.shield, depthTest: false, depthWrite: false, toneMapped: false });
  private pool: { back: THREE.Sprite; fill: THREE.Sprite; shield: THREE.Sprite }[] = [];
  private right = new THREE.Vector3();

  constructor(private scene: THREE.Scene) {}

  private bar(i: number): { back: THREE.Sprite; fill: THREE.Sprite; shield: THREE.Sprite } {
    let b = this.pool[i];
    if (!b) {
      b = { back: new THREE.Sprite(this.back), fill: new THREE.Sprite(this.fill), shield: new THREE.Sprite(this.shieldMat) };
      b.back.renderOrder = 18;
      b.fill.renderOrder = 19;
      b.shield.renderOrder = 20;
      b.fill.center.set(0, 0.5);
      b.shield.center.set(0, 0.5);
      this.scene.add(b.back, b.fill, b.shield);
      this.pool.push(b);
    }
    b.back.visible = b.fill.visible = true;
    return b;
  }

  update(enemies: readonly Enemy[], camera: THREE.Camera): void {
    this.right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    let used = 0;
    for (const e of enemies) {
      if (e.dead || e.isBoss || (e.hp >= e.maxHp && e.shield >= e.shieldMax)) continue;
      const b = this.bar(used++);
      const w = Math.max(B.minWidth, e.radius * B.radiusMult);
      const y = e.rig.root.position.y + e.rig.height + B.lift;
      b.back.position.set(e.x, y, e.z);
      b.back.scale.set(w + B.border * 2, B.height + B.border * 2, 1);
      // a borda esquerda da barra, no plano da câmera
      b.fill.position.set(e.x - this.right.x * (w / 2), y, e.z - this.right.z * (w / 2));
      b.fill.scale.set(Math.max(0.001, w * Math.max(0, e.hp / e.maxHp)), B.height, 1);
      b.shield.visible = e.shield > 0;
      if (b.shield.visible) {
        b.shield.position.copy(b.fill.position).setY(y + B.height * 0.25);
        b.shield.scale.set(w * Math.min(1, e.shield / e.maxHp), B.height * 0.5, 1);
      }
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i].back.visible = this.pool[i].fill.visible = this.pool[i].shield.visible = false;
  }

  clear(): void {
    for (const b of this.pool) b.back.visible = b.fill.visible = b.shield.visible = false;
  }
}
