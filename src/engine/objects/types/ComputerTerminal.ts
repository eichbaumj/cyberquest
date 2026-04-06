import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';
import { InteractiveObject, InteractiveObjectOptions } from '../InteractiveObject';

export interface ComputerTerminalOptions extends InteractiveObjectOptions {
  screenText?: string;
}

export class ComputerTerminal extends InteractiveObject {
  private monitor: Mesh | null = null;
  private screen: Mesh | null = null;
  private screenTexture: DynamicTexture | null = null;
  private screenMaterial: StandardMaterial | null = null;
  private defaultScreenText: string = '> READY_';

  constructor(options: ComputerTerminalOptions) {
    super({ ...options, interactionRadius: options.interactionRadius || 2.5 });
    if (options.screenText) {
      this.setScreenText(options.screenText);
    }
  }

  protected buildMesh(): void {
    const s = 1; // Scale factor

    // Materials
    const frameMat = new StandardMaterial(`${this.id}_frameMat`, this.scene);
    frameMat.diffuseColor = new Color3(0.1, 0.1, 0.12);
    frameMat.specularColor = new Color3(0.2, 0.2, 0.2);

    // Screen material with dynamic texture
    this.screenTexture = new DynamicTexture(
      `${this.id}_screenTex`,
      { width: 512, height: 256 },
      this.scene,
      false
    );
    this.screenMaterial = new StandardMaterial(`${this.id}_screenMat`, this.scene);
    this.screenMaterial.diffuseTexture = this.screenTexture;
    this.screenMaterial.emissiveTexture = this.screenTexture;
    this.screenMaterial.emissiveColor = new Color3(0.2, 0.25, 0.3);
    this.setScreenText(this.defaultScreenText);

    // Monitor frame
    this.monitor = MeshBuilder.CreateBox(
      `${this.id}_monitor`,
      { width: 0.7 * s, height: 0.5 * s, depth: 0.08 * s },
      this.scene
    );
    this.monitor.position = new Vector3(0, 0.35 * s, 0);
    this.monitor.material = frameMat;
    this.monitor.parent = this.root;
    this.meshes.push(this.monitor);

    // Screen (front face)
    this.screen = MeshBuilder.CreateBox(
      `${this.id}_screen`,
      { width: 0.6 * s, height: 0.4 * s, depth: 0.01 * s },
      this.scene
    );
    this.screen.position = new Vector3(0, 0.35 * s, 0.045 * s);
    this.screen.material = this.screenMaterial;
    this.screen.parent = this.root;
    this.meshes.push(this.screen);

    // Monitor stand
    const stand = MeshBuilder.CreateBox(
      `${this.id}_stand`,
      { width: 0.2 * s, height: 0.12 * s, depth: 0.12 * s },
      this.scene
    );
    stand.position = new Vector3(0, 0.06 * s, 0);
    stand.material = frameMat;
    stand.parent = this.root;
    this.meshes.push(stand);

    // Stand neck
    const neck = MeshBuilder.CreateBox(
      `${this.id}_neck`,
      { width: 0.08 * s, height: 0.1 * s, depth: 0.08 * s },
      this.scene
    );
    neck.position = new Vector3(0, 0.16 * s, 0);
    neck.material = frameMat;
    neck.parent = this.root;
    this.meshes.push(neck);

    // Keyboard
    const keyboardMat = new StandardMaterial(`${this.id}_kbMat`, this.scene);
    keyboardMat.diffuseColor = new Color3(0.08, 0.08, 0.1);

    const keyboard = MeshBuilder.CreateBox(
      `${this.id}_keyboard`,
      { width: 0.45 * s, height: 0.025 * s, depth: 0.18 * s },
      this.scene
    );
    keyboard.position = new Vector3(0, 0.015 * s, 0.4 * s);
    keyboard.material = keyboardMat;
    keyboard.parent = this.root;
    this.meshes.push(keyboard);

    // Tower/CPU
    const tower = MeshBuilder.CreateBox(
      `${this.id}_tower`,
      { width: 0.18 * s, height: 0.4 * s, depth: 0.4 * s },
      this.scene
    );
    tower.position = new Vector3(-0.55 * s, 0.2 * s, 0);
    tower.material = frameMat;
    tower.parent = this.root;
    this.meshes.push(tower);

    // Power LED
    const ledMat = new StandardMaterial(`${this.id}_ledMat`, this.scene);
    ledMat.emissiveColor = new Color3(0, 0.8, 0.4);

    const led = MeshBuilder.CreateBox(
      `${this.id}_led`,
      { width: 0.02 * s, height: 0.02 * s, depth: 0.01 * s },
      this.scene
    );
    led.position = new Vector3(-0.55 * s, 0.32 * s, 0.205 * s);
    led.material = ledMat;
    led.parent = this.root;
    this.meshes.push(led);
  }

  /**
   * Update the screen text
   */
  public setScreenText(text: string): void {
    if (!this.screenTexture) return;

    const ctx = this.screenTexture.getContext() as CanvasRenderingContext2D;
    const width = 512;
    const height = 256;

    // Clear with dark background
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(0, 0, width, height);

    // Draw terminal-style text
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#00f0ff';

    // Split text into lines
    const lines = text.split('\n');
    const lineHeight = 24;
    const startY = 30;

    lines.forEach((line, i) => {
      ctx.fillText(line, 15, startY + i * lineHeight);
    });

    this.screenTexture.update();
  }

  /**
   * Show interaction state on screen
   */
  public showActiveState(): void {
    this.setScreenText('> ACCESSING TERMINAL...\n> LOADING CHALLENGE...');
  }

  /**
   * Show completed state with green styling
   */
  public showCompletedState(): void {
    if (!this.screenTexture) return;

    const ctx = this.screenTexture.getContext() as CanvasRenderingContext2D;
    const width = 512;
    const height = 256;

    // Clear with dark green background
    ctx.fillStyle = '#0a2015';
    ctx.fillRect(0, 0, width, height);

    // Draw completion text in bright green
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('> CHALLENGE COMPLETE', 15, 35);
    ctx.fillText('> ACCESS GRANTED', 15, 65);

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#00ff44';
    ctx.fillText('[SOLVED]', 15, 120);

    // Add a checkmark
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('\u2713', 420, 140);

    this.screenTexture.update();

    // Change screen emissive to green
    if (this.screenMaterial) {
      this.screenMaterial.emissiveColor = new Color3(0, 0.4, 0.2);
    }
  }

  /**
   * Reset screen
   */
  public resetScreen(): void {
    this.setScreenText(this.defaultScreenText);
  }

  public getInteractionPrompt(): string {
    if (this.state === 'completed') {
      return 'Terminal completed';
    }
    return 'Press [E] to access terminal';
  }

  public getObjectType(): string {
    return 'terminal';
  }

  protected getDefaultEmissive(mesh: Mesh): Color3 {
    if (mesh === this.screen) {
      return new Color3(0.2, 0.25, 0.3);
    }
    return Color3.Black();
  }

  public markCompleted(): void {
    super.markCompleted();
    this.showCompletedState();
  }
}
