// Luzes de personagem (o lampião do chefe, o orbe na mão): um punhado de luzes fixas na cena, emprestadas a quem precisa.
// M16-01: o three.js recompila TODOS os materiais quando o número de luzes da cena muda; com uma PointLight dentro do
// modelo do chefe, o chefe nascer ou morrer travava o jogo. Aqui o número de luzes nunca muda: o modelo só carrega
// um marcador, e `updateLamps` põe uma luz da reserva na posição dele (ou apaga a luz quando ninguém usa).
import * as THREE from "three";

interface Lamp {
  color: number;
  intensity: number;
  distance: number;
}

let pool: THREE.PointLight[] | null = null;
const anchors: THREE.Object3D[] = [];
const tmp = new THREE.Vector3();

/** cria a reserva na cena do jogo (as prévias não chamam: lá o modelo leva uma luz de verdade) */
export function initLamps(scene: THREE.Scene, count = 2): void {
  pool = [];
  for (let i = 0; i < count; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 12, 1.7);
    scene.add(l);
    pool.push(l);
  }
}

export function addLamp(parent: THREE.Object3D, x: number, y: number, z: number, color: number, intensity: number, distance: number): void {
  if (!pool) {
    const light = new THREE.PointLight(color, intensity, distance, 1.7);
    light.position.set(x, y, z);
    parent.add(light);
    return;
  }
  const a = new THREE.Object3D();
  a.position.set(x, y, z);
  a.userData.lamp = { color, intensity, distance } satisfies Lamp;
  parent.add(a);
  anchors.push(a);
}

/** visível e ainda preso a uma cena (o modelo descartado sai da cena) */
function live(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (!p.visible) return false;
    if ((p as THREE.Scene).isScene) return true;
    p = p.parent;
  }
  return false;
}

/** uma vez por quadro, antes do render */
export function updateLamps(): void {
  if (!pool) return;
  let used = 0;
  for (let i = anchors.length - 1; i >= 0; i--) {
    const a = anchors[i];
    if (!rooted(a)) {
      // fora da cena: descartado, ou ainda não entrou; só limpa a lista quando ela cresce
      if (anchors.length > 16) anchors.splice(i, 1);
      continue;
    }
    if (used >= pool.length || !live(a)) continue;
    const spec = a.userData.lamp as Lamp, l = pool[used++];
    a.getWorldPosition(tmp);
    l.position.copy(tmp);
    l.color.set(spec.color);
    l.intensity = spec.intensity;
    l.distance = spec.distance;
  }
  for (let i = used; i < pool.length; i++) pool[i].intensity = 0;
}

function rooted(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o;
  while (p.parent) p = p.parent;
  return (p as THREE.Scene).isScene === true;
}
