import {
  Scene,
  Vector3,
  ArcRotateCamera,
  KeyboardEventTypes,
} from '@babylonjs/core';
import { VoxelCharacter, AnimationState, CYBER_COLORS } from './VoxelCharacter';

export interface PlayerState {
  position: Vector3;
  rotation: number;
  velocity: Vector3;
  animState: AnimationState;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlayerOptions {
  scene: Scene;
  camera: ArcRotateCamera;
  startPosition?: Vector3;
  colorIndex?: number;
  worldBounds?: WorldBounds;
  onMove?: (position: Vector3, rotation: number, animState: AnimationState) => void;
}

export class LocalPlayer {
  private scene: Scene;
  private camera: ArcRotateCamera;
  private character: VoxelCharacter;
  private onMove?: (position: Vector3, rotation: number, animState: AnimationState) => void;
  private worldBounds: WorldBounds;

  // Movement state
  private keys: Map<string, boolean> = new Map();
  private velocity: Vector3 = Vector3.Zero();
  private isGrounded: boolean = true;
  private currentAnimState: AnimationState = AnimationState.IDLE;

  // Movement settings
  private readonly WALK_SPEED = 5;
  private readonly RUN_SPEED = 10;
  private readonly JUMP_FORCE = 8;
  private readonly GRAVITY = -20;
  private readonly FRICTION = 10;
  private readonly PLAYER_RADIUS = 0.5; // Collision radius

  // Camera rotation settings
  private readonly ROTATION_SPEED = 2;

  constructor(options: PlayerOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.onMove = options.onMove;
    // Default world bounds (DFIR Lab is 30x20)
    this.worldBounds = options.worldBounds || {
      minX: -14,
      maxX: 14,
      minZ: -9,
      maxZ: 9,
    };

    // Create voxel character with specified or first color
    const colors = options.colorIndex !== undefined
      ? CYBER_COLORS[options.colorIndex % CYBER_COLORS.length]
      : CYBER_COLORS[0]; // Local player gets cyan

    this.character = new VoxelCharacter(this.scene, 'local', colors);
    this.character.setPosition(options.startPosition || new Vector3(0, 1, 0));

    // Setup input handling
    this.setupInput();

    // Register update loop
    this.scene.onBeforeRenderObservable.add(() => this.update());
  }

  private setupInput(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.code;

      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          this.keys.set(key, true);
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

    // Determine speed and animation state
    const isRunning = this.isKeyPressed('ShiftLeft');
    const speed = isRunning ? this.RUN_SPEED : this.WALK_SPEED;
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
    const position = this.character.getPosition();
    position.addInPlace(this.velocity.scale(deltaTime));
    this.character.setPosition(position);

    // Simple ground collision (character feet are at position.y - 0.75)
    if (position.y < 0.5) {
      position.y = 0.5;
      this.character.setPosition(position);
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // World boundary collision
    const r = this.PLAYER_RADIUS;
    let clamped = false;
    if (position.x < this.worldBounds.minX + r) {
      position.x = this.worldBounds.minX + r;
      this.velocity.x = 0;
      clamped = true;
    } else if (position.x > this.worldBounds.maxX - r) {
      position.x = this.worldBounds.maxX - r;
      this.velocity.x = 0;
      clamped = true;
    }
    if (position.z < this.worldBounds.minZ + r) {
      position.z = this.worldBounds.minZ + r;
      this.velocity.z = 0;
      clamped = true;
    } else if (position.z > this.worldBounds.maxZ - r) {
      position.z = this.worldBounds.maxZ - r;
      this.velocity.z = 0;
      clamped = true;
    }
    if (clamped) {
      this.character.setPosition(position);
    }

    // Rotate character to face movement direction
    if (moveDirection.length() > 0.1) {
      const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
      const currentRotation = this.character.getRotation();
      this.character.setRotation(this.lerpAngle(currentRotation, targetRotation, 10 * deltaTime));
    }

    // Update animation state
    const newAnimState = this.determineAnimationState(moveDirection);
    if (newAnimState !== this.currentAnimState) {
      this.currentAnimState = newAnimState;
      this.character.setAnimationState(newAnimState);
    }

    // Update camera to follow player
    this.camera.target = position.add(new Vector3(0, 1, 0));

    // Arrow key camera rotation
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

    // Emit movement event (always emit to keep remote players updated)
    if (this.onMove) {
      this.onMove(position.clone(), this.character.getRotation(), this.currentAnimState);
    }
  }

  private determineAnimationState(moveDirection: Vector3): AnimationState {
    if (!this.isGrounded) {
      return AnimationState.JUMP;
    }

    if (moveDirection.length() > 0.1) {
      return this.isKeyPressed('ShiftLeft') ? AnimationState.RUN : AnimationState.WALK;
    }

    return AnimationState.IDLE;
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
    return this.character.getPosition();
  }

  public getRotation(): number {
    return this.character.getRotation();
  }

  public setPosition(position: Vector3): void {
    this.character.setPosition(position);
  }

  public getMesh() {
    return this.character.getMesh();
  }

  public getCharacter(): VoxelCharacter {
    return this.character;
  }

  public dispose(): void {
    this.character.dispose();
  }
}
