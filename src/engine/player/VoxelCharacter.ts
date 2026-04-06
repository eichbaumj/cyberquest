import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';

export enum AnimationState {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  INTERACT = 'interact',
}

export interface CharacterColors {
  body: Color3;
  accent: Color3;
  eyes: Color3;
}

// Cyber color palette for player variation
export const CYBER_COLORS: CharacterColors[] = [
  { body: new Color3(0.1, 0.1, 0.15), accent: new Color3(0, 0.94, 1), eyes: new Color3(0, 1, 1) },      // Cyan
  { body: new Color3(0.1, 0.12, 0.1), accent: new Color3(0, 1, 0.53), eyes: new Color3(0, 1, 0.5) },    // Green
  { body: new Color3(0.12, 0.1, 0.15), accent: new Color3(0.75, 0, 1), eyes: new Color3(0.8, 0, 1) },   // Purple
  { body: new Color3(0.15, 0.15, 0.1), accent: new Color3(1, 1, 0), eyes: new Color3(1, 1, 0) },        // Yellow
  { body: new Color3(0.15, 0.1, 0.1), accent: new Color3(1, 0, 0.33), eyes: new Color3(1, 0, 0.3) },    // Red
];

export class VoxelCharacter {
  private scene: Scene;
  private root: TransformNode;

  // Body parts
  private head!: Mesh;
  private torso!: Mesh;
  private leftArm!: Mesh;
  private rightArm!: Mesh;
  private leftLeg!: Mesh;
  private rightLeg!: Mesh;

  // Pivot points for animation
  private leftArmPivot!: TransformNode;
  private rightArmPivot!: TransformNode;
  private leftLegPivot!: TransformNode;
  private rightLegPivot!: TransformNode;

  // Animation state
  private animState: AnimationState = AnimationState.IDLE;
  private animTime: number = 0;
  private targetAnimState: AnimationState = AnimationState.IDLE;

  // Character colors
  private colors: CharacterColors;

  // Scale factor (Minecraft units to world units)
  private readonly SCALE = 0.0625; // 1/16 - makes 16 units = 1 world unit

  constructor(scene: Scene, id: string, colors?: CharacterColors) {
    this.scene = scene;
    this.colors = colors || CYBER_COLORS[Math.floor(Math.random() * CYBER_COLORS.length)];

    // Create root transform node
    this.root = new TransformNode(`character_${id}`, scene);

    // Build the character
    this.createBody(id);

    // Register animation update
    this.scene.onBeforeRenderObservable.add(() => this.updateAnimation());
  }

  private createBody(id: string): void {
    const s = this.SCALE;

    // Materials
    const bodyMat = this.createMaterial(`bodyMat_${id}`, this.colors.body, 0.02);
    const accentMat = this.createMaterial(`accentMat_${id}`, this.colors.accent, 0.15);
    const eyeMat = this.createMaterial(`eyeMat_${id}`, this.colors.eyes, 0.5);

    // HEAD (8x8x8) - positioned at top
    this.head = MeshBuilder.CreateBox(`head_${id}`, { width: 8 * s, height: 8 * s, depth: 8 * s }, this.scene);
    this.head.position.y = 24 * s; // On top of torso
    this.head.parent = this.root;
    this.head.material = bodyMat;
    this.disableGlow(this.head);

    // Eyes (glowing rectangles on front of head)
    const leftEye = MeshBuilder.CreateBox(`leftEye_${id}`, { width: 2 * s, height: 1 * s, depth: 0.5 * s }, this.scene);
    leftEye.position = new Vector3(-1.5 * s, 1 * s, 4.1 * s);
    leftEye.parent = this.head;
    leftEye.material = eyeMat;
    this.disableGlow(leftEye);

    const rightEye = MeshBuilder.CreateBox(`rightEye_${id}`, { width: 2 * s, height: 1 * s, depth: 0.5 * s }, this.scene);
    rightEye.position = new Vector3(1.5 * s, 1 * s, 4.1 * s);
    rightEye.parent = this.head;
    rightEye.material = eyeMat;
    this.disableGlow(rightEye);

    // Hood accent (on top and sides of head)
    const hoodTop = MeshBuilder.CreateBox(`hoodTop_${id}`, { width: 8.2 * s, height: 1 * s, depth: 8.2 * s }, this.scene);
    hoodTop.position.y = 4 * s;
    hoodTop.parent = this.head;
    hoodTop.material = accentMat;
    this.disableGlow(hoodTop);

    // TORSO (8x12x4) - center of body
    this.torso = MeshBuilder.CreateBox(`torso_${id}`, { width: 8 * s, height: 12 * s, depth: 4 * s }, this.scene);
    this.torso.position.y = 14 * s; // Above legs
    this.torso.parent = this.root;
    this.torso.material = bodyMat;
    this.disableGlow(this.torso);

    // Hoodie accent stripes on torso
    const stripe1 = MeshBuilder.CreateBox(`stripe1_${id}`, { width: 0.5 * s, height: 12 * s, depth: 4.2 * s }, this.scene);
    stripe1.position.x = -3 * s;
    stripe1.parent = this.torso;
    stripe1.material = accentMat;
    this.disableGlow(stripe1);

    const stripe2 = MeshBuilder.CreateBox(`stripe2_${id}`, { width: 0.5 * s, height: 12 * s, depth: 4.2 * s }, this.scene);
    stripe2.position.x = 3 * s;
    stripe2.parent = this.torso;
    stripe2.material = accentMat;
    this.disableGlow(stripe2);

    // LEFT ARM with pivot at shoulder
    this.leftArmPivot = new TransformNode(`leftArmPivot_${id}`, this.scene);
    this.leftArmPivot.position = new Vector3(-6 * s, 19 * s, 0);
    this.leftArmPivot.parent = this.root;

    this.leftArm = MeshBuilder.CreateBox(`leftArm_${id}`, { width: 4 * s, height: 12 * s, depth: 4 * s }, this.scene);
    this.leftArm.position.y = -6 * s; // Offset from pivot
    this.leftArm.parent = this.leftArmPivot;
    this.leftArm.material = bodyMat;
    this.disableGlow(this.leftArm);

    // Arm accent
    const leftArmAccent = MeshBuilder.CreateBox(`leftArmAccent_${id}`, { width: 4.2 * s, height: 1 * s, depth: 4.2 * s }, this.scene);
    leftArmAccent.position.y = -5.5 * s;
    leftArmAccent.parent = this.leftArm;
    leftArmAccent.material = accentMat;
    this.disableGlow(leftArmAccent);

    // RIGHT ARM with pivot at shoulder
    this.rightArmPivot = new TransformNode(`rightArmPivot_${id}`, this.scene);
    this.rightArmPivot.position = new Vector3(6 * s, 19 * s, 0);
    this.rightArmPivot.parent = this.root;

    this.rightArm = MeshBuilder.CreateBox(`rightArm_${id}`, { width: 4 * s, height: 12 * s, depth: 4 * s }, this.scene);
    this.rightArm.position.y = -6 * s;
    this.rightArm.parent = this.rightArmPivot;
    this.rightArm.material = bodyMat;
    this.disableGlow(this.rightArm);

    // Arm accent
    const rightArmAccent = MeshBuilder.CreateBox(`rightArmAccent_${id}`, { width: 4.2 * s, height: 1 * s, depth: 4.2 * s }, this.scene);
    rightArmAccent.position.y = -5.5 * s;
    rightArmAccent.parent = this.rightArm;
    rightArmAccent.material = accentMat;
    this.disableGlow(rightArmAccent);

    // LEFT LEG with pivot at hip
    this.leftLegPivot = new TransformNode(`leftLegPivot_${id}`, this.scene);
    this.leftLegPivot.position = new Vector3(-2 * s, 8 * s, 0);
    this.leftLegPivot.parent = this.root;

    this.leftLeg = MeshBuilder.CreateBox(`leftLeg_${id}`, { width: 4 * s, height: 12 * s, depth: 4 * s }, this.scene);
    this.leftLeg.position.y = -6 * s;
    this.leftLeg.parent = this.leftLegPivot;
    this.leftLeg.material = bodyMat;
    this.disableGlow(this.leftLeg);

    // Leg accent (shoe/boot glow)
    const leftShoe = MeshBuilder.CreateBox(`leftShoe_${id}`, { width: 4.2 * s, height: 2 * s, depth: 4.2 * s }, this.scene);
    leftShoe.position.y = -5 * s;
    leftShoe.parent = this.leftLeg;
    leftShoe.material = accentMat;
    this.disableGlow(leftShoe);

    // RIGHT LEG with pivot at hip
    this.rightLegPivot = new TransformNode(`rightLegPivot_${id}`, this.scene);
    this.rightLegPivot.position = new Vector3(2 * s, 8 * s, 0);
    this.rightLegPivot.parent = this.root;

    this.rightLeg = MeshBuilder.CreateBox(`rightLeg_${id}`, { width: 4 * s, height: 12 * s, depth: 4 * s }, this.scene);
    this.rightLeg.position.y = -6 * s;
    this.rightLeg.parent = this.rightLegPivot;
    this.rightLeg.material = bodyMat;
    this.disableGlow(this.rightLeg);

    // Leg accent (shoe/boot glow)
    const rightShoe = MeshBuilder.CreateBox(`rightShoe_${id}`, { width: 4.2 * s, height: 2 * s, depth: 4.2 * s }, this.scene);
    rightShoe.position.y = -5 * s;
    rightShoe.parent = this.rightLeg;
    rightShoe.material = accentMat;
    this.disableGlow(rightShoe);
  }

  private createMaterial(name: string, color: Color3, emissiveIntensity: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(emissiveIntensity);
    mat.specularColor = new Color3(0.2, 0.2, 0.2);
    return mat;
  }

  private disableGlow(mesh: Mesh): void {
    // Explicitly disable GlowLayer rendering for this mesh
    mesh.metadata = { ...mesh.metadata, enableGlow: false };
  }

  private updateAnimation(): void {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    this.animTime += deltaTime;

    // Blend to target state
    if (this.animState !== this.targetAnimState) {
      this.animState = this.targetAnimState;
      // Don't reset animTime for smooth blending
    }

    switch (this.animState) {
      case AnimationState.IDLE:
        this.animateIdle();
        break;
      case AnimationState.WALK:
        this.animateWalk(5, 0.4);
        break;
      case AnimationState.RUN:
        this.animateWalk(8, 0.7);
        break;
      case AnimationState.JUMP:
        this.animateJump();
        break;
      case AnimationState.INTERACT:
        this.animateInteract();
        break;
    }
  }

  private animateIdle(): void {
    // Subtle breathing - torso slight scale pulse
    const breathe = Math.sin(this.animTime * 2) * 0.01;
    this.torso.scaling.y = 1 + breathe;

    // Reset limbs to neutral
    this.leftArmPivot.rotation.x = this.lerp(this.leftArmPivot.rotation.x, 0, 0.1);
    this.rightArmPivot.rotation.x = this.lerp(this.rightArmPivot.rotation.x, 0, 0.1);
    this.leftLegPivot.rotation.x = this.lerp(this.leftLegPivot.rotation.x, 0, 0.1);
    this.rightLegPivot.rotation.x = this.lerp(this.rightLegPivot.rotation.x, 0, 0.1);

    // Slight arm sway
    this.leftArmPivot.rotation.z = Math.sin(this.animTime * 1.5) * 0.05;
    this.rightArmPivot.rotation.z = -Math.sin(this.animTime * 1.5) * 0.05;
  }

  private animateWalk(speed: number, swingAngle: number): void {
    // Arms swing opposite to legs
    this.leftArmPivot.rotation.x = Math.sin(this.animTime * speed) * swingAngle;
    this.rightArmPivot.rotation.x = -Math.sin(this.animTime * speed) * swingAngle;

    // Legs swing
    this.leftLegPivot.rotation.x = -Math.sin(this.animTime * speed) * swingAngle;
    this.rightLegPivot.rotation.x = Math.sin(this.animTime * speed) * swingAngle;

    // Reset torso
    this.torso.scaling.y = 1;

    // Slight body bob
    const bob = Math.abs(Math.sin(this.animTime * speed * 2)) * 0.02;
    this.root.position.y = bob;
  }

  private animateJump(): void {
    // Arms up
    this.leftArmPivot.rotation.x = this.lerp(this.leftArmPivot.rotation.x, -2.5, 0.2);
    this.rightArmPivot.rotation.x = this.lerp(this.rightArmPivot.rotation.x, -2.5, 0.2);
    this.leftArmPivot.rotation.z = this.lerp(this.leftArmPivot.rotation.z, -0.3, 0.2);
    this.rightArmPivot.rotation.z = this.lerp(this.rightArmPivot.rotation.z, 0.3, 0.2);

    // Legs slightly tucked
    this.leftLegPivot.rotation.x = this.lerp(this.leftLegPivot.rotation.x, 0.3, 0.2);
    this.rightLegPivot.rotation.x = this.lerp(this.rightLegPivot.rotation.x, 0.3, 0.2);
  }

  private animateInteract(): void {
    // Right arm extends forward
    this.rightArmPivot.rotation.x = this.lerp(this.rightArmPivot.rotation.x, -1.4, 0.15);

    // Left arm stays down
    this.leftArmPivot.rotation.x = this.lerp(this.leftArmPivot.rotation.x, 0, 0.1);

    // Legs neutral
    this.leftLegPivot.rotation.x = this.lerp(this.leftLegPivot.rotation.x, 0, 0.1);
    this.rightLegPivot.rotation.x = this.lerp(this.rightLegPivot.rotation.x, 0, 0.1);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(t, 1);
  }

  // Public API

  public setAnimationState(state: AnimationState): void {
    this.targetAnimState = state;
  }

  public getAnimationState(): AnimationState {
    return this.animState;
  }

  public setPosition(position: Vector3): void {
    this.root.position = position;
  }

  public getPosition(): Vector3 {
    return this.root.position.clone();
  }

  public setRotation(y: number): void {
    this.root.rotation.y = y;
  }

  public getRotation(): number {
    return this.root.rotation.y;
  }

  public getRoot(): TransformNode {
    return this.root;
  }

  public getMesh(): Mesh {
    // Return torso as the main mesh for collision/shadow purposes
    return this.torso;
  }

  public dispose(): void {
    this.root.dispose();
  }
}
