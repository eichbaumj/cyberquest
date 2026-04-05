import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';

export interface RemotePlayerData {
  id: string;
  nickname: string;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
}

export class RemotePlayer {
  private scene: Scene;
  private mesh: Mesh;
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

    // Create player mesh
    this.mesh = this.createPlayerMesh();
    this.mesh.position = new Vector3(data.position.x, data.position.y, data.position.z);
    this.mesh.rotation.y = data.rotation.y;

    // Create name plate
    this.namePlate = this.createNamePlate();

    // Set initial targets
    this.targetPosition = this.mesh.position.clone();
    this.targetRotation = data.rotation.y;

    // Register update for interpolation
    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private createPlayerMesh(): Mesh {
    // Create a simple capsule-like player mesh (different color from local player)
    const body = MeshBuilder.CreateCylinder(
      `remotePlayer_${this.id}`,
      { height: 1.5, diameter: 0.8, tessellation: 16 },
      this.scene
    );

    // Head
    const head = MeshBuilder.CreateSphere(
      `remotePlayerHead_${this.id}`,
      { diameter: 0.5 },
      this.scene
    );
    head.position.y = 1;
    head.parent = body;

    // Material - different color for remote players
    const material = new StandardMaterial(`remotePlayerMat_${this.id}`, this.scene);
    material.diffuseColor = new Color3(0.75, 0, 1); // cyber-purple
    material.emissiveColor = new Color3(0.15, 0, 0.2);
    material.specularColor = new Color3(0.5, 0.5, 0.5);
    body.material = material;

    const headMat = new StandardMaterial(`remoteHeadMat_${this.id}`, this.scene);
    headMat.diffuseColor = new Color3(1, 0.8, 0); // cyber-yellow
    headMat.emissiveColor = new Color3(0.2, 0.15, 0);
    head.material = headMat;

    return body;
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
    ctx.font = 'bold 32px monospace';
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
    namePlate.position.y = 2;
    namePlate.parent = this.mesh;
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
    this.mesh.position = Vector3.Lerp(this.mesh.position, this.targetPosition, t);

    // Interpolate rotation
    this.mesh.rotation.y = this.lerpAngle(this.mesh.rotation.y, this.targetRotation, t);
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * Math.min(t, 1);
  }

  public updateState(position: { x: number; y: number; z: number }, rotation: { y: number }): void {
    this.targetPosition = new Vector3(position.x, position.y, position.z);
    this.targetRotation = rotation.y;
  }

  public getPosition(): Vector3 {
    return this.mesh.position.clone();
  }

  public dispose(): void {
    this.namePlate.dispose();
    this.mesh.dispose();
  }
}
