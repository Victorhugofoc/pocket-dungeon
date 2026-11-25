// Teclado e mouse (PC). Guarda o estado e os toques desde o último quadro.

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  lmb = false;
  rmb = false;
  rmbPressed = false;
  private wheel = 0;

  takeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  constructor(private canvas: HTMLElement) {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      const k = e.code;
      if (k === "Tab" || k === "Space") e.preventDefault();
      this.down.add(k);
      this.pressed.add(k);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    window.addEventListener("blur", () => this.reset());
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.lmb = true;
      if (e.button === 2) {
        this.rmb = true;
        this.rmbPressed = true;
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.wheel += e.deltaY;
    }, { passive: false });
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** true uma vez por toque */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** M17-01: direção de movimento do bot (qualquer ângulo); substitui WASD */
  simAxis: { x: number; z: number } | null = null;

  axis(): { x: number; z: number } {
    if (this.simAxis) {
      const l = Math.hypot(this.simAxis.x, this.simAxis.z);
      return l > 1e-6 ? { x: this.simAxis.x / l, z: this.simAxis.z / l } : { x: 0, z: 0 };
    }
    let x = 0;
    let z = 0;
    if (this.down.has("KeyW") || this.down.has("ArrowUp")) z -= 1;
    if (this.down.has("KeyS") || this.down.has("ArrowDown")) z += 1;
    if (this.down.has("KeyA") || this.down.has("ArrowLeft")) x -= 1;
    if (this.down.has("KeyD") || this.down.has("ArrowRight")) x += 1;
    const len = Math.hypot(x, z);
    return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
  }

  /** M17-01: o bot segura ou solta uma tecla */
  simHold(code: string, on: boolean): void {
    if (on) this.down.add(code);
    else this.down.delete(code);
  }

  /** M17-01: o bot toca uma tecla (vale no próximo passo) */
  simTap(code: string): void {
    this.pressed.add(code);
  }

  endFrame(): void {
    this.pressed.clear();
    this.rmbPressed = false;
  }

  reset(): void {
    this.down.clear();
    this.pressed.clear();
    this.lmb = false;
    this.rmb = false;
    this.rmbPressed = false;
  }
}
