// Uniforms compartilhados pelos shaders do cenário (vento, máscara do chão, esmaecer o que tapa o herói).
import * as THREE from "three";

export const U = {
  uTime: { value: 0 },
  /** centro da área de grama (segue a câmera) */
  uCenter: { value: new THREE.Vector2() },
  uHero: { value: new THREE.Vector3() },
  uMask: { value: null as THREE.Texture | null },
  uMapSize: { value: 240 },
  /** posição do herói na tela (px do buffer), raio (px) e profundidade, para abrir um "buraco" no que estiver na frente */
  uFadePos: { value: new THREE.Vector2(-9999, -9999) },
  uFadeRadius: { value: 90 },
  uFadeDepth: { value: 0 },
};

export const NOISE_GLSL = `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}`;

interface PatchOptions {
  /** balanço com o vento, proporcional à altura do vértice acima de `windFrom` */
  wind?: number;
  windFrom?: number;
  /** some (pontilhado) quando fica entre a câmera e o herói */
  fade?: boolean;
}

/** Acrescenta vento e/ou esmaecimento a um material padrão do three, mantendo luz e sombra. */
export function patchMaterial<T extends THREE.Material>(mat: T, o: PatchOptions): T {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    if (o.wind) {
      shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 wp = instanceMatrix[3].xz;
        #else
          vec2 wp = vec2(0.0);
        #endif
        float wk = max(0.0, position.y - ${(o.windFrom ?? 1).toFixed(2)}) * ${o.wind.toFixed(3)};
        transformed.x += (sin(uTime * 1.3 + wp.x * 0.45 + wp.y * 0.3 + position.y) + 0.4 * sin(uTime * 3.1 + position.x * 2.0)) * wk;
        transformed.z += cos(uTime * 1.1 + wp.x * 0.3 + wp.y * 0.5) * wk * 0.7;`,
      );
    }
    if (o.fade) {
      shader.fragmentShader = "uniform vec2 uFadePos;\nuniform float uFadeRadius;\nuniform float uFadeDepth;\n" + shader.fragmentShader.replace(
        "void main() {",
        `void main() {
        if (gl_FragCoord.z < uFadeDepth) {
          vec2 fd = (gl_FragCoord.xy - uFadePos) / uFadeRadius;
          float fr = dot(fd, fd);
          if (fr < 1.0) {
            float dth = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
            if (dth > fr * fr + 0.08) discard;
          }
        }`,
      );
    }
  };
  mat.customProgramCacheKey = () => `patch:${o.wind ?? 0}:${o.windFrom ?? 1}:${o.fade ? 1 : 0}`;
  return mat;
}
