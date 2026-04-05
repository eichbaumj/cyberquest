import {
  Scene,
  Vector3,
  KeyboardEventTypes,
  Observable,
} from '@babylonjs/core';
import { InteractiveObject, InteractionState } from './InteractiveObject';

export interface InteractionEvent {
  object: InteractiveObject;
  type: 'enter' | 'exit' | 'interact';
}

export class InteractionManager {
  private scene: Scene;
  private objects: Map<string, InteractiveObject> = new Map();
  private currentNearbyObject: InteractiveObject | null = null;
  private playerPositionGetter: () => Vector3;
  private isEnabled: boolean = true;

  // Events
  public onProximityChange: Observable<{ object: InteractiveObject | null; prompt: string | null }> = new Observable();
  public onInteraction: Observable<InteractiveObject> = new Observable();

  constructor(scene: Scene, playerPositionGetter: () => Vector3) {
    this.scene = scene;
    this.playerPositionGetter = playerPositionGetter;

    this.setupKeyboardListener();
    this.setupUpdateLoop();
  }

  /**
   * Register an interactive object
   */
  public registerObject(object: InteractiveObject): void {
    this.objects.set(object.getId(), object);

    // Listen for interaction events
    object.onInteract.add(() => {
      this.onInteraction.notifyObservers(object);
    });
  }

  /**
   * Unregister an interactive object
   */
  public unregisterObject(id: string): void {
    const object = this.objects.get(id);
    if (object) {
      if (this.currentNearbyObject === object) {
        this.currentNearbyObject = null;
        this.onProximityChange.notifyObservers({ object: null, prompt: null });
      }
      this.objects.delete(id);
    }
  }

  /**
   * Get all registered objects
   */
  public getObjects(): Map<string, InteractiveObject> {
    return this.objects;
  }

  /**
   * Get object by ID
   */
  public getObject(id: string): InteractiveObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Enable/disable interaction system
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.currentNearbyObject) {
      this.currentNearbyObject.setNearby(false);
      this.currentNearbyObject = null;
      this.onProximityChange.notifyObservers({ object: null, prompt: null });
    }
  }

  /**
   * Check proximity to all objects each frame
   */
  private setupUpdateLoop(): void {
    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.isEnabled) return;
      this.checkProximity();
    });
  }

  /**
   * Find the closest interactive object within range
   */
  private checkProximity(): void {
    const playerPos = this.playerPositionGetter();
    let closestObject: InteractiveObject | null = null;
    let closestDistance = Infinity;

    this.objects.forEach((obj) => {
      // Skip completed or active objects for proximity
      const state = obj.getState();
      if (state === InteractionState.ACTIVE || state === InteractionState.LOCKED) {
        return;
      }

      const objPos = obj.getPosition();
      const distance = Vector3.Distance(
        new Vector3(playerPos.x, 0, playerPos.z),
        new Vector3(objPos.x, 0, objPos.z)
      );

      if (distance < obj.getInteractionRadius() && distance < closestDistance) {
        closestDistance = distance;
        closestObject = obj;
      }
    });

    // Update nearby states
    const newNearby = closestObject;

    if (newNearby !== this.currentNearbyObject) {
      // Exit previous
      if (this.currentNearbyObject) {
        this.currentNearbyObject.setNearby(false);
      }

      // Enter new
      if (newNearby !== null) {
        newNearby.setNearby(true);
        this.onProximityChange.notifyObservers({
          object: newNearby,
          prompt: newNearby.getInteractionPrompt(),
        });
      } else {
        this.onProximityChange.notifyObservers({ object: null, prompt: null });
      }

      this.currentNearbyObject = newNearby;
    }
  }

  /**
   * Setup E key listener for interaction
   */
  private setupKeyboardListener(): void {
    this.scene.onKeyboardObservable.add((kbInfo) => {
      if (!this.isEnabled) return;

      if (
        kbInfo.type === KeyboardEventTypes.KEYDOWN &&
        kbInfo.event.code === 'KeyE'
      ) {
        this.tryInteract();
        kbInfo.event.preventDefault();
      }
    });
  }

  /**
   * Attempt to interact with the current nearby object
   */
  public tryInteract(): boolean {
    if (this.currentNearbyObject && this.currentNearbyObject.hasQuestion()) {
      return this.currentNearbyObject.interact();
    }
    return false;
  }

  /**
   * Get the currently nearby object
   */
  public getCurrentNearbyObject(): InteractiveObject | null {
    return this.currentNearbyObject;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.objects.forEach((obj) => obj.dispose());
    this.objects.clear();
    this.onProximityChange.clear();
    this.onInteraction.clear();
  }
}
