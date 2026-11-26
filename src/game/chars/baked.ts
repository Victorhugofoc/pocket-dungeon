// Malhas modeladas no Blender (tools/blender), gravadas em ./models/<id>.json por osso. Teste do pipeline no M3-01 (revisão 2).
import * as THREE from "three";
import type { Builder } from "./kit";

interface Packed { n: number; position: string; normal: string; color: string; region?: string }
/** dims e forma do esqueleto com que o modelo foi feito (heróis desde o M2-11); tests/models.test.ts confere com a receita */
export interface ModelMeta { dims: Record<string, number>; form: string }
type File = { q: number; meta?: ModelMeta } & Record<string, Packed | number | ModelMeta>;

/** região de cor de cada vértice, marcada no Blender (`region` em kit.py): a skin (M13-06) troca a cor das regiões 1 a 3 */
export const REGION = { fixed: 0, primary: 1, secondary: 2, accent: 3 } as const;
/** troca a cor (linear, no lugar) de um vértice da região dada */
export type Recolor = (region: number, color: THREE.Color) => void;

const FILES = import.meta.glob("./models/*.json", { eager: true, import: "default" }) as Record<string, File>;

function bytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const hasModel = (id: string): boolean => `./models/${id}.json` in FILES;
export const modelMeta = (id: string): ModelMeta | undefined => FILES[`./models/${id}.json`]?.meta;
/** chaves de malha ('osso', 'osso@flat', 'osso@lit') do modelo, sem ler as malhas */
export const modelKeys = (id: string): string[] => Object.keys(FILES[`./models/${id}.json`] ?? {}).filter((k) => k !== "q" && k !== "meta");

/** Geometrias novas por chave ('osso', 'osso@flat' ou 'osso@lit'), no espaço do osso, com normal e cor por vértice (linear). */
export function modelParts(id: string, recolor?: Recolor): Map<string, THREE.BufferGeometry> {
  const file = FILES[`./models/${id}.json`];
  if (!file) throw new Error(`modelo ${id} não encontrado em chars/models`);
  const out = new Map<string, THREE.BufferGeometry>();
  const c = new THREE.Color();
  for (const [key, v] of Object.entries(file)) {
    if (key === "q" || key === "meta") continue;
    const p = v as Packed;
    const qp = new Int16Array(bytes(p.position).buffer), qn = new Int8Array(bytes(p.normal).buffer), qc = bytes(p.color);
    const qr = recolor && p.region ? bytes(p.region) : null;
    const pos = new Float32Array(p.n * 3), nor = new Float32Array(p.n * 3), col = new Float32Array(p.n * 3);
    for (let i = 0; i < p.n * 3; i++) {
      pos[i] = qp[i] / file.q;
      nor[i] = qn[i] / 127;
    }
    for (let i = 0; i < p.n; i++) {
      c.setRGB(qc[i * 3] / 255, qc[i * 3 + 1] / 255, qc[i * 3 + 2] / 255, THREE.SRGBColorSpace);
      if (qr && qr[i]) recolor!(qr[i], c);
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

/** põe no Builder as malhas do modelo, cada uma no osso e na camada da chave */
export function addModel(b: Builder, id: string, recolor?: Recolor): void {
  for (const [key, g] of modelParts(id, recolor)) {
    const [bone, layer] = key.split("@");
    if (layer === "lit") b.lit(bone, g);
    else if (layer === "flat") b.flat(bone, g);
    else b.add(bone, g);
  }
}
