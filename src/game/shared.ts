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
  /** sombra de nuvens: força (0 = sem nuvens), escala do ruído (1/m), velocidade (m/s) e cobertura (0..1, fração do chão na sombra); ver `applyAtmosphere` */
  uCloud: { value: new THREE.Vector4(0, 0.03, 1, 0.5) },
  /** névoa: início da névoa de distância (m), densidade (1/m), força da névoa rasteira (0..1) e altura dela (m); ver `applyAtmosphere` */
  uFog: { value: new THREE.Vector4(30, 0.014, 0, 1.5) },
  uFogColor: { value: new THREE.Color() },
  uMistColor: { value: new THREE.Color() },
  /** névoa rasteira: escala do ruído (1/m) e velocidade (m/s) */
  uMistNoise: { value: new THREE.Vector2(0.07, 0.8) },
  /** manchas no chão e na grama: cor e quanto cobre (w), e o tamanho de cada uma (m); ver `STAIN_GLSL` */
  uStain: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  uStainSize: { value: new THREE.Vector3(10, 10, 10) },
};

/** Manchas no chão (terra úmida, musgo, grama seca...): três camadas de ruído em escalas diferentes, cada uma puxando para a sua cor.
 * Precisa de `NOISE_GLSL` antes. */
export const STAIN_GLSL = `
uniform vec4 uStain[3];
uniform vec3 uStainSize;
vec3 stains(vec2 p, vec3 col) {
  for (int i = 0; i < 3; i++) {
    float s = i == 0 ? uStainSize.x : i == 1 ? uStainSize.y : uStainSize.z;
    float n = fbm(p / s + float(i) * 17.3);
    float k = smoothstep(0.58 - uStain[i].w * 0.3, 0.74 - uStain[i].w * 0.3, n);
    col = mix(col, uStain[i].rgb, k * 0.65);
  }
  return col;
}`;

/** Sombra de nuvens e névoa. Nuvens: ruído animado projetado de cima que escurece só a luz do sol (luz direcional), em qualquer material padrão.
 * A posição no mundo sai de `vViewPosition` (a câmera é rígida: p = Rᵀ(v − t)), então serve para qualquer malha, instanciada ou não. */
const CLOUD_GLSL = `
uniform float uTime;
uniform vec4 uCloud;
uniform vec4 uFog;
uniform vec3 uFogColor;
uniform vec3 uMistColor;
uniform vec2 uMistNoise;
float cloudHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float cloudNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cloudHash(i), cloudHash(i + vec2(1, 0)), f.x), mix(cloudHash(i + vec2(0, 1)), cloudHash(i + vec2(1, 1)), f.x), f.y);
}
vec3 cloudShade() {
  if (uCloud.x <= 0.0) return vec3(1.0);
  vec3 wp = transpose(mat3(viewMatrix)) * (-vViewPosition - viewMatrix[3].xyz);
  vec2 p = wp.xz * uCloud.y + vec2(0.8, 0.45) * uTime * uCloud.z * uCloud.y;
  float n = 0.55 * cloudNoise(p) + 0.3 * cloudNoise(p * 2.1 + 7.3) + 0.15 * cloudNoise(p * 4.3 - 2.1);
  // cobertura 0..1 vira o limiar do ruído (o ruído fica quase todo entre 0,25 e 0,75); borda curta para ler como nuvem
  float th = 0.5 + (0.5 - uCloud.w) * 0.55;
  float k = uCloud.x * smoothstep(th - 0.07, th + 0.07, n);
  // sombra fria: o sol perde mais vermelho que azul (o que sobra é a luz do céu)
  return vec3(1.0) - k * vec3(1.0, 0.9, 0.68);
}
/** Névoa: rasteira (camada baixa que anda com o vento, em manchas) e de distância (exponencial ao quadrado, mais rala no alto).
 * Pontilhado de 1/255 no fator para não formar faixas. */
vec3 atmosphere(vec3 col) {
  vec3 wp = transpose(mat3(viewMatrix)) * (-vViewPosition - viewMatrix[3].xyz);
  float dth = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  vec2 mp = wp.xz * uMistNoise.x + vec2(0.6, 0.35) * uTime * uMistNoise.y * uMistNoise.x;
  float mn = 0.6 * cloudNoise(mp) + 0.4 * cloudNoise(mp * 2.3 + 5.1);
  // espessura atravessada: olhando de cima o raio cruza pouca névoa, rente ao chão cruza muita
  float dy = abs(wp.y - cameraPosition.y) / max(length(vViewPosition), 0.001);
  float thick = clamp((1.0 - dy) * 1.7, 0.15, 1.0);
  float mist = uFog.z * thick * exp(-max(wp.y, 0.0) / uFog.w) * (0.3 + 0.7 * smoothstep(0.3, 0.7, mn));
  col = mix(col, uMistColor, clamp(mist + dth, 0.0, 1.0));
  float fx = max(length(vViewPosition) - uFog.x, 0.0) * uFog.y;
  float far = (1.0 - exp(-fx * fx)) * mix(1.0, 0.6, smoothstep(2.0, 14.0, wp.y));
  return mix(col, uFogColor, clamp(far + dth, 0.0, 1.0));
}`;

/** Põe a sombra de nuvens e a névoa (`atmosphere`) em todos os materiais com luz de `root` (uma vez por material). Chamar depois
 * de criar os materiais: ela embrulha o `onBeforeCompile` que já existir. A névoa do three (`scene.fog`) fica só para os materiais
 * sem luz (contorno dos personagens). */
export function applyAtmosphere(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (!(mat instanceof THREE.MeshStandardMaterial) || mat.userData.clouds) continue;
      mat.userData.clouds = true;
      const prev = mat.onBeforeCompile;
      const prevKey = mat.customProgramCacheKey;
      mat.onBeforeCompile = (shader, renderer) => {
        prev.call(mat, shader, renderer);
        shader.uniforms.uTime = U.uTime;
        shader.uniforms.uCloud = U.uCloud;
        shader.uniforms.uFog = U.uFog;
        shader.uniforms.uFogColor = U.uFogColor;
        shader.uniforms.uMistColor = U.uMistColor;
        shader.uniforms.uMistNoise = U.uMistNoise;
        const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
          "getDirectionalLightInfo( directionalLight, directLight );",
          "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= cloudShade();",
        );
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <lights_fragment_begin>", lights)
          .replace("#include <fog_fragment>", "gl_FragColor.rgb = atmosphere(gl_FragColor.rgb);")
          .replace("void main() {", `${shader.fragmentShader.includes("uniform float uTime;") ? CLOUD_GLSL.replace("uniform float uTime;", "") : CLOUD_GLSL}\nvoid main() {`);
      };
      mat.customProgramCacheKey = () => `${prevKey.call(mat)}:clouds`;
      mat.needsUpdate = true;
    }
  });
}

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
