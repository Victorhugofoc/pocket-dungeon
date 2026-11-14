// Pós-processamento: render em HDR com MSAA, bloom, correção de cor por zona e vinheta.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { ZoneDef } from "../data/zones";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uShadow: { value: new THREE.Color(1, 1, 1) },
    uLight: { value: new THREE.Color(1, 1, 1) },
    uSaturation: { value: 1.02 },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.42 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec3 uShadow; uniform vec3 uLight; uniform float uSaturation; uniform float uContrast; uniform float uVignette;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      // sombras e luzes puxam cada uma para o seu tom (split toning por zona)
      vec3 col = mix(vec3(l), c.rgb, uSaturation);
      col *= mix(uShadow, uLight, smoothstep(0.02, 0.45, l));
      col = (col - 0.18) * uContrast + 0.18;
      vec2 q = vUv - 0.5;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.95, dot(q, q) * 2.2);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

export class Pipeline {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  private grade: ShaderPass;
  bufferSize = new THREE.Vector2(1, 1);

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.7, 0.92);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.bufferSize.set(Math.floor(w * pixelRatio), Math.floor(h * pixelRatio));
  }

  /** correção de cor da zona: tons de sombra e de luz normalizados (não mudam o brilho, só a cor), saturação e contraste */
  setGrade(zone: ZoneDef): void {
    const g = zone.grade;
    const norm = (hex: number, out: THREE.Color) => {
      out.set(hex).lerp(new THREE.Color(1, 1, 1), 0.55); // tom leve: a zona já tem a sua cor, aqui só puxa
      const l = out.r * 0.2126 + out.g * 0.7152 + out.b * 0.0722;
      out.multiplyScalar(1 / Math.max(l, 1e-3));
    };
    norm(g.shadow, this.grade.uniforms.uShadow.value as THREE.Color);
    norm(g.light, this.grade.uniforms.uLight.value as THREE.Color);
    this.grade.uniforms.uSaturation.value = g.saturation;
    this.grade.uniforms.uContrast.value = g.contrast;
  }

  render(): void {
    this.composer.render();
  }
}
