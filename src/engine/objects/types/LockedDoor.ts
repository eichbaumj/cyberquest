import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
  Animation,
  Observable,
} from '@babylonjs/core';
import { InteractiveObject, InteractiveObjectOptions, InteractionState } from '../InteractiveObject';

export interface LockedDoorOptions extends InteractiveObjectOptions {
  unlockCode: string;
  requiredCorrect?: number;
}

export class LockedDoor extends InteractiveObject {
  private door: Mesh | null = null;
  private keypadScreen: Mesh | null = null;
  private keypadTexture: DynamicTexture | null = null;
  private doorMaterial: StandardMaterial | null = null;
  private keypadMaterial: StandardMaterial | null = null;
  private unlockCode: string;
  private requiredCorrect: number;
  private isUnlocked: boolean = false;
  private isOpen: boolean = false;

  public onUnlock: Observable<string> = new Observable();

  constructor(options: LockedDoorOptions) {
    super({ ...options, interactionRadius: options.interactionRadius || 3 });
    this.unlockCode = options.unlockCode;
    this.requiredCorrect = options.requiredCorrect || 3;
    this.state = InteractionState.LOCKED;
    this.updateKeypadDisplay('LOCKED');
  }

  protected buildMesh(): void {
    // Door frame material
    const frameMat = new StandardMaterial(`${this.id}_frameMat`, this.scene);
    frameMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
    frameMat.specularColor = new Color3(0.3, 0.3, 0.3);

    // Door material (changes color based on lock state)
    this.doorMaterial = new StandardMaterial(`${this.id}_doorMat`, this.scene);
    this.doorMaterial.diffuseColor = new Color3(0.2, 0.2, 0.22);
    this.doorMaterial.emissiveColor = new Color3(0.3, 0, 0.1); // Red glow when locked

    // Frame - top
    const frameTop = MeshBuilder.CreateBox(
      `${this.id}_frameTop`,
      { width: 2.4, height: 0.2, depth: 0.4 },
      this.scene
    );
    frameTop.position = new Vector3(0, 3.1, 0);
    frameTop.material = frameMat;
    frameTop.parent = this.root;
    this.meshes.push(frameTop);

    // Frame - left
    const frameLeft = MeshBuilder.CreateBox(
      `${this.id}_frameLeft`,
      { width: 0.2, height: 3, depth: 0.4 },
      this.scene
    );
    frameLeft.position = new Vector3(-1.2, 1.5, 0);
    frameLeft.material = frameMat;
    frameLeft.parent = this.root;
    frameLeft.checkCollisions = true;
    this.meshes.push(frameLeft);

    // Frame - right
    const frameRight = MeshBuilder.CreateBox(
      `${this.id}_frameRight`,
      { width: 0.2, height: 3, depth: 0.4 },
      this.scene
    );
    frameRight.position = new Vector3(1.2, 1.5, 0);
    frameRight.material = frameMat;
    frameRight.parent = this.root;
    frameRight.checkCollisions = true;
    this.meshes.push(frameRight);

    // Door
    this.door = MeshBuilder.CreateBox(
      `${this.id}_door`,
      { width: 2, height: 2.8, depth: 0.15 },
      this.scene
    );
    this.door.position = new Vector3(0, 1.4, 0);
    this.door.material = this.doorMaterial;
    this.door.parent = this.root;
    this.door.checkCollisions = true;
    this.meshes.push(this.door);

    // Door handle
    const handleMat = new StandardMaterial(`${this.id}_handleMat`, this.scene);
    handleMat.diffuseColor = new Color3(0.3, 0.3, 0.32);
    handleMat.specularColor = new Color3(0.5, 0.5, 0.5);

    const handle = MeshBuilder.CreateBox(
      `${this.id}_handle`,
      { width: 0.15, height: 0.05, depth: 0.1 },
      this.scene
    );
    handle.position = new Vector3(0.7, 1.2, 0.1);
    handle.material = handleMat;
    handle.parent = this.root;
    this.meshes.push(handle);

    // Keypad housing
    const keypadHousing = MeshBuilder.CreateBox(
      `${this.id}_keypadHousing`,
      { width: 0.25, height: 0.35, depth: 0.08 },
      this.scene
    );
    keypadHousing.position = new Vector3(1.5, 1.3, 0.1);
    keypadHousing.material = frameMat;
    keypadHousing.parent = this.root;
    this.meshes.push(keypadHousing);

    // Keypad screen with dynamic texture
    this.keypadTexture = new DynamicTexture(
      `${this.id}_keypadTex`,
      { width: 128, height: 64 },
      this.scene,
      false
    );

    this.keypadMaterial = new StandardMaterial(`${this.id}_keypadMat`, this.scene);
    this.keypadMaterial.diffuseTexture = this.keypadTexture;
    this.keypadMaterial.emissiveTexture = this.keypadTexture;
    this.keypadMaterial.emissiveColor = new Color3(0.3, 0, 0.1);

    this.keypadScreen = MeshBuilder.CreateBox(
      `${this.id}_keypadScreen`,
      { width: 0.18, height: 0.12, depth: 0.01 },
      this.scene
    );
    this.keypadScreen.position = new Vector3(1.5, 1.4, 0.15);
    this.keypadScreen.material = this.keypadMaterial;
    this.keypadScreen.parent = this.root;
    this.meshes.push(this.keypadScreen);

    // Warning stripe on door
    const stripeMat = new StandardMaterial(`${this.id}_stripeMat`, this.scene);
    stripeMat.diffuseColor = new Color3(0.8, 0.6, 0);
    stripeMat.emissiveColor = new Color3(0.2, 0.15, 0);

    for (let i = 0; i < 4; i++) {
      const stripe = MeshBuilder.CreateBox(
        `${this.id}_stripe_${i}`,
        { width: 0.3, height: 0.08, depth: 0.01 },
        this.scene
      );
      stripe.position = new Vector3(-0.5 + i * 0.35, 2.5, 0.08);
      stripe.rotation.z = Math.PI / 4;
      stripe.material = stripeMat;
      stripe.parent = this.root;
      this.meshes.push(stripe);
    }
  }

  /**
   * Update the keypad display text
   */
  private updateKeypadDisplay(text: string): void {
    if (!this.keypadTexture) return;

    const ctx = this.keypadTexture.getContext() as CanvasRenderingContext2D;
    const width = 128;
    const height = 64;

    // Background
    ctx.fillStyle = this.isUnlocked ? '#003320' : '#200010';
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = this.isUnlocked ? '#00ff88' : '#ff0055';
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, height / 2 + 6);

    this.keypadTexture.update();
  }

  /**
   * Unlock the door (called when player has enough correct answers)
   */
  public unlock(): void {
    if (this.isUnlocked) return;

    this.isUnlocked = true;
    this.state = InteractionState.IDLE;

    // Update visual appearance
    if (this.doorMaterial) {
      this.doorMaterial.emissiveColor = new Color3(0, 0.2, 0.1); // Green glow
    }
    if (this.keypadMaterial) {
      this.keypadMaterial.emissiveColor = new Color3(0, 0.2, 0.1);
    }

    this.updateKeypadDisplay(this.unlockCode);
    this.onUnlock.notifyObservers(this.unlockCode);
  }

  /**
   * Open the door (animate)
   */
  public open(): void {
    if (!this.door || this.isOpen || !this.isUnlocked) return;

    this.isOpen = true;

    // Create door swing animation
    const frameRate = 30;
    const doorSwing = new Animation(
      'doorSwing',
      'rotation.y',
      frameRate,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keyFrames = [
      { frame: 0, value: 0 },
      { frame: frameRate, value: -Math.PI / 2 }, // 90 degree swing
    ];

    doorSwing.setKeys(keyFrames);
    this.door.animations = [doorSwing];
    this.scene.beginAnimation(this.door, 0, frameRate, false);

    // Disable collision when open
    this.door.checkCollisions = false;
  }

  /**
   * Check if door can be opened
   */
  public canOpen(): boolean {
    return this.isUnlocked && !this.isOpen;
  }

  /**
   * Override interact to open door if unlocked
   */
  public interact(): boolean {
    if (this.isUnlocked && !this.isOpen) {
      this.open();
      return true;
    }
    return false;
  }

  /**
   * Override setNearby to work even when locked (for UI prompt)
   */
  public setNearby(isNear: boolean): void {
    if (this.isUnlocked) {
      super.setNearby(isNear);
    }
    // When locked, we still want to show the "LOCKED" prompt
    // but don't change state
  }

  public getInteractionPrompt(): string {
    if (this.isOpen) {
      return 'Door is open';
    }
    if (this.isUnlocked) {
      return 'Press [E] to enter Evidence Room';
    }
    return `LOCKED - Solve ${this.requiredCorrect} challenges to unlock`;
  }

  public getObjectType(): string {
    return 'door';
  }

  public isLocked(): boolean {
    return !this.isUnlocked;
  }

  public getUnlockCode(): string {
    return this.unlockCode;
  }

  public getRequiredCorrect(): number {
    return this.requiredCorrect;
  }

  public dispose(): void {
    this.onUnlock.clear();
    super.dispose();
  }
}
