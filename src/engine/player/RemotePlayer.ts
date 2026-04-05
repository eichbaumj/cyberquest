import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';
import { VoxelCharacter, AnimationState, CYBER_COLORS } from './VoxelCharacter';

export interface RemotePlayerData {
  id: string;
  nickname: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  animState?: string;
  colorIndex?: number;
}

export class RemotePlayer {
  private scene: Scene;
  private character: VoxelCharacter;
  private namePlate: Mesh;
  public id: string;
  public nickname: string;

  // Interpolation
  private targetPosition: Vector3;
  private targetRotation: number;
  private readonly INTERPOLATION_SPEED = 10;

  constructor(scene: Scene, data: RemotePlayerData) {
    this.scene = scene;
    this.id = data.id;
    this.nickname = data.nickname;

    // Create character with color based on player index or random
    const colorIndex = data.colorIndex !== undefined
      ? data.colorIndex
      : Math.floor(Math.random() * CYBER_COLORS.length);
    const colors = CYBER_COLORS[colorIndex % CYBER_COLORS.length];

    this.character = new VoxelCharacter(scene, data.id, colors);
    this.character.setPosition(new Vector3(data.position.x, data.position.y, data.position.z));
    this.character.setRotation(data.rotation);

    // Set initial animation state
    if (data.animState) {
      this.character.setAnimationState(data.animState as AnimationState);
    }

    // Create name plate
    this.namePlate = this.createNamePlate();

    // Set initial targets
    this.targetPosition = this.character.getPosition();
    this.targetRotation = data.rotation;

    // Register update for interpolation
    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private createNamePlate(): Mesh {
    // Create dynamic texture for name
    const textureSize = 256;
    const texture = new DynamicTexture(
      `nameTexture_${this.id}`,
      { width: textureSize, height: 64 },
      this.scene,
      false
    );

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText(this.nickname, textureSize / 2, 40);
    texture.update();

    // Create plane for name plate
    const namePlate = MeshBuilder.CreatePlane(
      `namePlate_${this.id}`,
      { width: 2, height: 0.5 },
      this.scene
    );
    namePlate.position.y = 2.2; // Above head
    namePlate.parent = this.character.getRoot();
    namePlate.billboardMode = Mesh.BILLBOARDMODE_ALL;

    const nameMat = new StandardMaterial(`namePlateMat_${this.id}`, this.scene);
    nameMat.diffuseTexture = texture;
    nameMat.emissiveTexture = texture;
    nameMat.useAlphaFromDiffuseTexture = true;
    nameMat.backFaceCulling = false;
    namePlate.material = nameMat;

    return namePlate;
  }

  private update(): void {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;
    const t = Math.min(this.INTERPOLATION_SPEED * deltaTime, 1);

    // Interpolate position
    const currentPos = this.character.getPosition();
    const newPos = Vector3.Lerp(currentPos, this.targetPosition, t);
    this.character.setPosition(newPos);

    // Interpolate rotation
    const currentRot = this.character.getRotation();
    this.character.setRotation(this.lerpAngle(currentRot, this.targetRotation, t));
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * Math.min(t, 1);
  }

  public updateState(
    position: { x: number; y: number; z: number },
    rotation: number,
    animState?: string
  ): void {
    this.targetPosition = new Vector3(position.x, position.y, position.z);
    this.targetRotation = rotation;

    if (animState) {
      this.character.setAnimationState(animState as AnimationState);
    }
  }

  public getPosition(): Vector3 {
    return this.character.getPosition();
  }

  public dispose(): void {
    this.namePlate.dispose();
    this.character.dispose();
  }
}
