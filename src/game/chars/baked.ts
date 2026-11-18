// Malhas modeladas no Blender (tools/blender), gravadas em ./models/<id>.json por osso. Teste do pipeline no M3-01 (revisão 2).
import * as THREE from "three";

interface Packed { n: number; position: string; normal: string; color: string }
type File = { q: number } & Record<string, Packed | number>;

const FILES = import.meta.glob("./models/*.json", { eager: true, import: "default" }) as Record<string, File>;

function bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const hasModel = (id: string): boolean => `./models/${id}.json` in FILES;

/** Geometrias novas por chave ('osso', 'osso@flat' ou 'osso@lit'), no espaço do osso, com normal e cor por vértice (linear). */
export function modelParts(id: string): Map<string, THREE.BufferGeometry> {
  const file = FILES[`./models/${id}.json`];
  if (!file) throw new Error(`modelo ${id} não encontrado em chars/models`);
  const out = new Map<string, THREE.BufferGeometry>();
  const c = new THREE.Color();
  for (const [key, v] of Object.entries(file)) {
    if (key === "q") continue;
    const p = v as Packed;
    const qp = new Int16Array(bytes(p.position).buffer), qn = new Int8Array(bytes(p.normal).buffer), qc = bytes(p.color);
    const pos = new Float32Array(p.n * 3), nor = new Float32Array(p.n * 3), col = new Float32Array(p.n * 3);
    for (let i = 0; i < p.n * 3; i++) {
      pos[i] = qp[i] / file.q;
      nor[i] = qn[i] / 127;
    }
    for (let i = 0; i < p.n; i++) {
      c.setRGB(qc[i * 3] / 255, qc[i * 3 + 1] / 255, qc[i * 3 + 2] / 255, THREE.SRGBColorSpace);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    out.set(key, g);
  }
  return out;
}
