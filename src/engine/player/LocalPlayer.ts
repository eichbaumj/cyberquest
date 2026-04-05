import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  ArcRotateCamera,
  KeyboardEventTypes,
  PointerEventTypes,
} from '@babylonjs/core';

export interface PlayerState {
  position: Vector3;
  rotation: number; // Y rotation
  velocity: Vector3;
}

export interface PlayerOptions {
  scene: Scene;
  camera: ArcRotateCamera;
  startPosition?: Vector3;
  onMove?: (position: Vector3, rotation: number) => void;
}

export class LocalPlayer {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private mesh: Mesh;
  private onMove?: (position: Vector3, rotation: number) => void;

  // Movement state
  private keys: Map<string, boolean> = new Map();
  private velocity: Vector3 = Vector3.Zero();
  private isGrounded: boolean = true;

  // Movement settings
  private readonly WALK_SPEED = 5;
  private readonly RUN_SPEED = 10;
  private readonly JUMP_FORCE = 8;
  private readonly GRAVITY = -20;
  private readonly FRICTION = 10;

  // Camera rotation settings
  private readonly ROTATION_SPEED = 2; // Radians per second for arrow key rotation

  constructor(options: PlayerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.onMove = options.onMove;

    // Create player mesh
    this.mesh = this.createPlayerMesh();
    this.mesh.position = options.startPosition || new Vector3(0, 1, 0);

    // Setup input handling
    this.setupInput();

    // Register update loop
    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private createPlayerMesh(): Mesh {
    // Create a simple capsule-like player mesh
    const body = MeshBuilder.CreateCylinder(
      'playerBody',
      { height: 1.5, diameter: 0.8, tessellation: 16 },
      this.scene
    );

    // Head
    const head = MeshBuilder.CreateSphere(
      'playerHead',
      { diameter: 0.5 },
      this.scene
    );
    head.position.y = 1;
    head.parent = body;

    // Material with cyber glow
    const material = new StandardMaterial('playerMat', this.scene);
    material.diffuseColor = new Color3(0, 0.94, 1); // cyber-blue
    material.emissiveColor = new Color3(0, 0.2, 0.25);
    material.specularColor = new Color3(0.5, 0.5, 0.5);
    body.material = material;

    const headMat = new StandardMaterial('headMat', this.scene);
    headMat.diffuseColor = new Color3(0, 1, 0.53); // cyber-green
    headMat.emissiveColor = new Color3(0, 0.15, 0.1);
    head.material = headMat;

    return body;
  }

  private setupInput(): void {
    // Keyboard input
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.code;

      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          this.keys.set(key, true);

          // Prevent default for movement keys
          if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            kbInfo.event.preventDefault();
          }
          break;

        case KeyboardEventTypes.KEYUP:
          this.keys.set(key, false);
          break;
      }
    });

  }

  private update(): void {
    const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

    // Get movement input
    const input = this.getMovementInput();

    // Calculate movement direction relative to camera
    const forward = this.camera.getForwardRay().direction;
    forward.y = 0;
    forward.normalize();

    const right = Vector3.Cross(Vector3.Up(), forward);
    right.normalize();

    // Calculate desired movement
    const moveDirection = forward.scale(input.z).add(right.scale(input.x));
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }

    // Apply speed
    const speed = this.isKeyPressed('ShiftLeft') ? this.RUN_SPEED : this.WALK_SPEED;
    const targetVelocity = moveDirection.scale(speed);

    // Smoothly interpolate velocity
    this.velocity.x = this.lerp(this.velocity.x, targetVelocity.x, this.FRICTION * deltaTime);
    this.velocity.z = this.lerp(this.velocity.z, targetVelocity.z, this.FRICTION * deltaTime);

    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.GRAVITY * deltaTime;
    }

    // Jump
    if (this.isKeyPressed('Space') && this.isGrounded) {
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
    }

    // Apply velocity to position
    this.mesh.position.addInPlace(this.velocity.scale(deltaTime));

    // Simple ground collision
    if (this.mesh.position.y < 0.75) {
      this.mesh.position.y = 0.75;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Rotate player to face movement direction
    if (moveDirection.length() > 0.1) {
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      this.mesh.rotation.y = this.lerpAngle(this.mesh.rotation.y, targetRotation, 10 * deltaTime);
    }

    // Update camera to follow player
    this.camera.target = this.mesh.position.add(new Vector3(0, 0.5, 0));

    // Arrow key camera rotation (swap directions for intuitive feel)
    if (this.isKeyPressed('ArrowLeft')) {
      this.camera.alpha -= this.ROTATION_SPEED * deltaTime;
    }
    if (this.isKeyPressed('ArrowRight')) {
      this.camera.alpha += this.ROTATION_SPEED * deltaTime;
    }
    if (this.isKeyPressed('ArrowUp')) {
      this.camera.beta = Math.max(0.1, this.camera.beta - this.ROTATION_SPEED * deltaTime);
    }
    if (this.isKeyPressed('ArrowDown')) {
      this.camera.beta = Math.min(Math.PI / 2 - 0.1, this.camera.beta + this.ROTATION_SPEED * deltaTime);
    }

    // Emit movement event
    if (this.onMove && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
      this.onMove(this.mesh.position.clone(), this.mesh.rotation.y);
    }
  }

  private getMovementInput(): Vector3 {
    let x = 0;
    let z = 0;

    if (this.isKeyPressed('KeyW')) z += 1;
    if (this.isKeyPressed('KeyS')) z -= 1;
    if (this.isKeyPressed('KeyA')) x -= 1;
    if (this.isKeyPressed('KeyD')) x += 1;

    return new Vector3(x, 0, z);
  }

  private isKeyPressed(code: string): boolean {
    return this.keys.get(code) || false;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.min(t, 1);
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * Math.min(t, 1);
  }

  public getPosition(): Vector3 {
    return this.mesh.position.clone();
  }

  public getRotation(): number {
    return this.mesh.rotation.y;
  }

  public setPosition(position: Vector3): void {
    this.mesh.position = position;
  }

  public getMesh(): Mesh {
    return this.mesh;
  }

  public dispose(): void {
    this.mesh.dispose();
  }
}
