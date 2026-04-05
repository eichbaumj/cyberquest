import {
  Scene,
  Vector3,
  Mesh,
  TransformNode,
  Observable,
  StandardMaterial,
  Color3,
  GlowLayer,
} from '@babylonjs/core';

export enum InteractionState {
  IDLE = 'idle',
  NEARBY = 'nearby',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  LOCKED = 'locked',
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'terminal_command';
  content: string;
  options?: string[];
  correct_answer: string | string[];
  difficulty: number;
  time_limit?: number;
}

export interface InteractiveObjectOptions {
  id: string;
  scene: Scene;
  position: Vector3;
  rotation?: number;
  interactionRadius?: number;
  glowLayer?: GlowLayer;
}

export abstract class InteractiveObject {
  protected id: string;
  protected scene: Scene;
  protected root: TransformNode;
  protected meshes: Mesh[] = [];
  protected glowLayer: GlowLayer | null = null;
  protected state: InteractionState = InteractionState.IDLE;
  protected boundQuestion: Question | null = null;
  protected interactionRadius: number;
  protected position: Vector3;

  // Events
  public onInteract: Observable<InteractiveObject> = new Observable();
  public onStateChange: Observable<InteractionState> = new Observable();

  constructor(options: InteractiveObjectOptions) {
    this.id = options.id;
    this.scene = options.scene;
    this.position = options.position.clone();
    this.interactionRadius = options.interactionRadius || 2.5;
    this.glowLayer = options.glowLayer || null;

    // Create root transform node
    this.root = new TransformNode(`interactive_${this.id}`, this.scene);
    this.root.position = this.position;
    if (options.rotation) {
      this.root.rotation.y = options.rotation;
    }

    // Build the mesh (implemented by subclasses)
    this.buildMesh();
  }

  /**
   * Subclasses implement this to create their visual representation
   */
  protected abstract buildMesh(): void;

  /**
   * Get the interaction prompt text to display
   */
  public abstract getInteractionPrompt(): string;

  /**
   * Get object type for categorization
   */
  public abstract getObjectType(): string;

  /**
   * Called when player enters proximity
   */
  public setNearby(isNear: boolean): void {
    const prevState = this.state;

    if (this.state === InteractionState.LOCKED) {
      return; // Locked objects don't change state
    }

    if (this.state === InteractionState.COMPLETED) {
      // Completed objects can still show nearby but differently
      if (isNear) {
        this.updateGlow(true, true);
      } else {
        this.updateGlow(false, true);
      }
      return;
    }

    if (isNear && this.state === InteractionState.IDLE) {
      this.state = InteractionState.NEARBY;
      this.updateGlow(true, false);
    } else if (!isNear && this.state === InteractionState.NEARBY) {
      this.state = InteractionState.IDLE;
      this.updateGlow(false, false);
    }

    if (prevState !== this.state) {
      this.onStateChange.notifyObservers(this.state);
    }
  }

  /**
   * Called when player presses E while nearby
   */
  public interact(): boolean {
    if (this.state === InteractionState.NEARBY && this.boundQuestion) {
      this.state = InteractionState.ACTIVE;
      this.onInteract.notifyObservers(this);
      return true;
    }
    return false;
  }

  /**
   * Called when interaction is complete (question answered)
   */
  public completeInteraction(): void {
    this.state = InteractionState.IDLE;
    this.updateGlow(false, false);
  }

  /**
   * Mark this object as completed (question answered correctly)
   */
  public markCompleted(): void {
    this.state = InteractionState.COMPLETED;
    this.updateGlow(false, true);
    this.onStateChange.notifyObservers(this.state);
  }

  /**
   * Bind a question to this object
   */
  public bindQuestion(question: Question): void {
    this.boundQuestion = question;
  }

  /**
   * Get the bound question
   */
  public getBoundQuestion(): Question | null {
    return this.boundQuestion;
  }

  /**
   * Update the glow effect on meshes
   */
  protected updateGlow(isNear: boolean, isCompleted: boolean): void {
    this.meshes.forEach((mesh) => {
      if (mesh.material instanceof StandardMaterial) {
        if (isCompleted) {
          // Green glow for completed
          mesh.material.emissiveColor = isNear
            ? new Color3(0, 0.5, 0.3)
            : new Color3(0, 0.2, 0.1);
        } else if (isNear) {
          // Cyan glow for nearby
          mesh.material.emissiveColor = new Color3(0, 0.3, 0.35);
        } else {
          // Reset to default
          mesh.material.emissiveColor = this.getDefaultEmissive(mesh);
        }
      }
    });
  }

  /**
   * Get default emissive color for a mesh (override in subclasses)
   */
  protected getDefaultEmissive(mesh: Mesh): Color3 {
    return Color3.Black();
  }

  /**
   * Getters
   */
  public getId(): string {
    return this.id;
  }

  public getPosition(): Vector3 {
    return this.root.position.clone();
  }

  public getState(): InteractionState {
    return this.state;
  }

  public getInteractionRadius(): number {
    return this.interactionRadius;
  }

  public getRoot(): TransformNode {
    return this.root;
  }

  public hasQuestion(): boolean {
    return this.boundQuestion !== null;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.meshes.forEach((mesh) => mesh.dispose());
    this.root.dispose();
    this.onInteract.clear();
    this.onStateChange.clear();
  }
}
