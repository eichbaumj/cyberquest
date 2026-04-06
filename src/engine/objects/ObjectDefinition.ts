import { Scene, Mesh, TransformNode, Vector3 } from '@babylonjs/core';

export type ObjectCategory = 'furniture' | 'electronics' | 'evidence';

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlacedObject {
  id: string;
  type: string;
  gridX: number;
  gridZ: number;
  rotation: 0 | 90 | 180 | 270;
  onSurface?: boolean; // True if placed on a desk/table
  properties?: Record<string, unknown>;
}

export interface MapData {
  objects: PlacedObject[];
}

export type RoomSize = 'small' | 'medium' | 'large';

export interface RoomDimensions {
  width: number;
  depth: number;
}

export const ROOM_SIZES: Record<RoomSize, RoomDimensions> = {
  small: { width: 20, depth: 15 },
  medium: { width: 30, depth: 20 },
  large: { width: 40, depth: 30 },
};

export interface ObjectDefinition {
  type: string;
  displayName: string;
  category: ObjectCategory;
  gridWidth: number;
  gridDepth: number;
  canPlaceOnFloor: boolean;
  canPlaceOnSurface: boolean;
  isInteractive: boolean;
  collisionEnabled: boolean;
  icon: string;
  create: (
    scene: Scene,
    position: Vector3,
    rotation: number
  ) => Mesh | TransformNode;
  getCollisionBox?: (position: Vector3, rotation: number) => AABB;
}
