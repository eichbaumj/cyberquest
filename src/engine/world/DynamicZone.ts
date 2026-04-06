import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';
import {
  MapData,
  PlacedObject,
  RoomSize,
  ROOM_SIZES,
  AABB,
} from '../objects/ObjectDefinition';
import { ObjectRegistry } from '../objects/ObjectRegistry';
import { InteractionManager } from '../objects/InteractionManager';

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class DynamicZone {
  private scene: Scene;
  private mapData: MapData;
  private roomSize: RoomSize;
  private interactionManager: InteractionManager | null;

  private root: TransformNode;
  private walls: Mesh[] = [];
  private floor: Mesh | null = null;
  private spawnedObjects: (Mesh | TransformNode)[] = [];
  private collisionBoxes: AABB[] = [];

  constructor(
    scene: Scene,
    mapData: MapData,
    roomSize: RoomSize,
    interactionManager?: InteractionManager
  ) {
    this.scene = scene;
    this.mapData = mapData;
    this.roomSize = roomSize;
    this.interactionManager = interactionManager || null;

    this.root = new TransformNode('dynamicZone', scene);

    this.buildRoom();
    this.loadObjects();
  }

  private buildRoom(): void {
    const dims = ROOM_SIZES[this.roomSize];
    const halfW = dims.width / 2;
    const halfD = dims.depth / 2;
    const wallHeight = 3;
    const wallThickness = 0.3;

    // Materials
    const floorMat = new StandardMaterial('floorMat', this.scene);
    floorMat.diffuseColor = new Color3(0.25, 0.27, 0.3);

    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new Color3(0.15, 0.17, 0.2);

    const accentMat = new StandardMaterial('accentMat', this.scene);
    accentMat.diffuseColor = new Color3(0, 0.5, 0.6);
    accentMat.emissiveColor = new Color3(0, 0.2, 0.25);

    // Floor
    this.floor = MeshBuilder.CreateBox(
      'floor',
      { width: dims.width, height: 0.1, depth: dims.depth },
      this.scene
    );
    this.floor.position.y = -0.05;
    this.floor.material = floorMat;
    this.floor.parent = this.root;

    // Create walls
    const createWall = (
      name: string,
      width: number,
      depth: number,
      x: number,
      z: number
    ): void => {
      const wall = MeshBuilder.CreateBox(
        name,
        { width, height: wallHeight, depth },
        this.scene
      );
      wall.position = new Vector3(x, wallHeight / 2, z);
      wall.material = wallMat;
      wall.parent = this.root;
      this.walls.push(wall);

      // Accent strip on top
      const accent = MeshBuilder.CreateBox(
        `${name}_accent`,
        { width: width + 0.02, height: 0.05, depth: depth + 0.02 },
        this.scene
      );
      accent.position = new Vector3(x, wallHeight, z);
      accent.material = accentMat;
      accent.parent = this.root;
      this.walls.push(accent);
    };

    // North wall
    createWall('northWall', dims.width, wallThickness, 0, -halfD);
    // South wall
    createWall('southWall', dims.width, wallThickness, 0, halfD);
    // East wall
    createWall('eastWall', wallThickness, dims.depth, halfW, 0);
    // West wall
    createWall('westWall', wallThickness, dims.depth, -halfW, 0);
  }

  private loadObjects(): void {
    this.mapData.objects.forEach((obj) => {
      this.spawnObject(obj);
    });
  }

  private spawnObject(placedObj: PlacedObject): void {
    const def = ObjectRegistry.get(placedObj.type);
    if (!def) {
      console.warn(`Unknown object type: ${placedObj.type}`);
      return;
    }

    // Convert grid position to world position
    const dims = ROOM_SIZES[this.roomSize];
    const worldX = placedObj.gridX - dims.width / 2 + 0.5;
    const worldZ = placedObj.gridZ - dims.depth / 2 + 0.5;

    // Y position depends on whether it's on a surface or floor
    // onSurface=true means it's on a desk (Y=0.75), otherwise floor (Y=0)
    const worldY = placedObj.onSurface ? 0.75 : 0;

    const position = new Vector3(worldX, worldY, worldZ);
    const mesh = ObjectRegistry.createObject(
      placedObj.type,
      this.scene,
      position,
      placedObj.rotation
    );

    if (mesh) {
      mesh.parent = this.root;
      this.spawnedObjects.push(mesh);

      // Add collision box if applicable (only for floor items)
      if (!placedObj.onSurface) {
        const collisionBox = ObjectRegistry.getCollisionBox(
          placedObj.type,
          position,
          placedObj.rotation
        );
        if (collisionBox) {
          this.collisionBoxes.push(collisionBox);
        }
      }
    }
  }

  public getSpawnPoint(): Vector3 {
    // Spawn near the south wall, center
    const dims = ROOM_SIZES[this.roomSize];
    return new Vector3(0, 0.5, dims.depth / 2 - 2);
  }

  public getBounds(): WorldBounds {
    const dims = ROOM_SIZES[this.roomSize];
    const margin = 0.5;
    return {
      minX: -dims.width / 2 + margin,
      maxX: dims.width / 2 - margin,
      minZ: -dims.depth / 2 + margin,
      maxZ: dims.depth / 2 - margin,
    };
  }

  public getCollisionBoxes(): AABB[] {
    return this.collisionBoxes;
  }

  public getRoomSize(): RoomSize {
    return this.roomSize;
  }

  public getMapData(): MapData {
    return this.mapData;
  }

  public dispose(): void {
    this.spawnedObjects.forEach((obj) => obj.dispose());
    this.walls.forEach((wall) => wall.dispose());
    this.floor?.dispose();
    this.root.dispose();
  }
}
