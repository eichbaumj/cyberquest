import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  Mesh,
} from '@babylonjs/core';
import { ObjectDefinition, AABB, ObjectCategory } from './ObjectDefinition';

// Helper to create collision box based on grid size and rotation
function createCollisionBox(
  position: Vector3,
  rotation: number,
  gridWidth: number,
  gridDepth: number
): AABB {
  const halfW = gridWidth / 2;
  const halfD = gridDepth / 2;

  // Swap dimensions for 90/270 rotation
  const isRotated = rotation === 90 || rotation === 270;
  const w = isRotated ? halfD : halfW;
  const d = isRotated ? halfW : halfD;

  return {
    minX: position.x - w,
    maxX: position.x + w,
    minZ: position.z - d,
    maxZ: position.z + d,
  };
}

// ============================================
// OBJECT DEFINITIONS
// ============================================

const definitions: ObjectDefinition[] = [
  // FURNITURE
  {
    type: 'desk',
    displayName: 'Desk',
    category: 'furniture',
    gridWidth: 2,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '🪑',
    create: (scene, position, rotation) => {
      const root = new TransformNode('desk', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('deskMat', scene);
      mat.diffuseColor = new Color3(0.3, 0.25, 0.2);

      // Desktop surface
      const top = MeshBuilder.CreateBox('deskTop', { width: 1.8, height: 0.05, depth: 0.9 }, scene);
      top.position.y = 0.75;
      top.material = mat;
      top.parent = root;

      // Legs
      const legMat = new StandardMaterial('legMat', scene);
      legMat.diffuseColor = new Color3(0.15, 0.15, 0.15);

      const legPositions = [
        [-0.8, -0.35],
        [0.8, -0.35],
        [-0.8, 0.35],
        [0.8, 0.35],
      ];
      legPositions.forEach(([x, z], i) => {
        const leg = MeshBuilder.CreateBox(`leg${i}`, { width: 0.05, height: 0.75, depth: 0.05 }, scene);
        leg.position = new Vector3(x, 0.375, z);
        leg.material = legMat;
        leg.parent = root;
      });

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 2, 1),
  },

  {
    type: 'desk_large',
    displayName: 'L-Desk',
    category: 'furniture',
    gridWidth: 3,
    gridDepth: 2,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '🔲',
    create: (scene, position, rotation) => {
      const root = new TransformNode('desk_large', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('deskLargeMat', scene);
      mat.diffuseColor = new Color3(0.3, 0.25, 0.2);

      // Main section
      const main = MeshBuilder.CreateBox('mainTop', { width: 2.5, height: 0.05, depth: 0.9 }, scene);
      main.position = new Vector3(0.25, 0.75, -0.45);
      main.material = mat;
      main.parent = root;

      // Side section
      const side = MeshBuilder.CreateBox('sideTop', { width: 0.9, height: 0.05, depth: 1.5 }, scene);
      side.position = new Vector3(-1.05, 0.75, 0.3);
      side.material = mat;
      side.parent = root;

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 3, 2),
  },

  {
    type: 'table',
    displayName: 'Table',
    category: 'furniture',
    gridWidth: 2,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '🪑',
    create: (scene, position, rotation) => {
      const root = new TransformNode('table', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('tableMat', scene);
      mat.diffuseColor = new Color3(0.4, 0.35, 0.3);

      const top = MeshBuilder.CreateBox('tableTop', { width: 1.8, height: 0.04, depth: 0.8 }, scene);
      top.position.y = 0.72;
      top.material = mat;
      top.parent = root;

      const legMat = new StandardMaterial('tLegMat', scene);
      legMat.diffuseColor = new Color3(0.2, 0.2, 0.2);

      [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]].forEach(([x, z], i) => {
        const leg = MeshBuilder.CreateCylinder(`tleg${i}`, { diameter: 0.05, height: 0.72 }, scene);
        leg.position = new Vector3(x, 0.36, z);
        leg.material = legMat;
        leg.parent = root;
      });

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 2, 1),
  },

  {
    type: 'chair',
    displayName: 'Chair',
    category: 'furniture',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '🪑',
    create: (scene, position, rotation) => {
      const root = new TransformNode('chair', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('chairMat', scene);
      mat.diffuseColor = new Color3(0.15, 0.15, 0.18);

      // Seat
      const seat = MeshBuilder.CreateBox('seat', { width: 0.45, height: 0.08, depth: 0.45 }, scene);
      seat.position.y = 0.45;
      seat.material = mat;
      seat.parent = root;

      // Back
      const back = MeshBuilder.CreateBox('back', { width: 0.45, height: 0.5, depth: 0.05 }, scene);
      back.position = new Vector3(0, 0.75, -0.2);
      back.material = mat;
      back.parent = root;

      // Wheels base
      const base = MeshBuilder.CreateCylinder('base', { diameter: 0.5, height: 0.05 }, scene);
      base.position.y = 0.1;
      base.material = mat;
      base.parent = root;

      // Pole
      const pole = MeshBuilder.CreateCylinder('pole', { diameter: 0.08, height: 0.35 }, scene);
      pole.position.y = 0.275;
      pole.material = mat;
      pole.parent = root;

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 0.6, 0.6),
  },

  {
    type: 'cabinet',
    displayName: 'Cabinet',
    category: 'furniture',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '🗄️',
    create: (scene, position, rotation) => {
      const root = new TransformNode('cabinet', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('cabinetMat', scene);
      mat.diffuseColor = new Color3(0.5, 0.5, 0.52);

      const body = MeshBuilder.CreateBox('cabBody', { width: 0.5, height: 1.2, depth: 0.6 }, scene);
      body.position.y = 0.6;
      body.material = mat;
      body.parent = root;

      // Drawer handles
      const handleMat = new StandardMaterial('handleMat', scene);
      handleMat.diffuseColor = new Color3(0.2, 0.2, 0.2);

      [0.9, 0.6, 0.3].forEach((y, i) => {
        const handle = MeshBuilder.CreateBox(`handle${i}`, { width: 0.15, height: 0.02, depth: 0.02 }, scene);
        handle.position = new Vector3(0, y, 0.31);
        handle.material = handleMat;
        handle.parent = root;
      });

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 0.6, 0.7),
  },

  {
    type: 'shelf',
    displayName: 'Bookshelf',
    category: 'furniture',
    gridWidth: 2,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: true,
    icon: '📚',
    create: (scene, position, rotation) => {
      const root = new TransformNode('shelf', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('shelfMat', scene);
      mat.diffuseColor = new Color3(0.35, 0.25, 0.2);

      // Frame
      const frame = MeshBuilder.CreateBox('frame', { width: 1.5, height: 1.8, depth: 0.35 }, scene);
      frame.position.y = 0.9;
      frame.material = mat;
      frame.parent = root;

      // Shelves
      const shelfMat = new StandardMaterial('innerShelfMat', scene);
      shelfMat.diffuseColor = new Color3(0.4, 0.3, 0.25);

      [0.4, 0.8, 1.2, 1.6].forEach((y, i) => {
        const shelf = MeshBuilder.CreateBox(`shelf${i}`, { width: 1.4, height: 0.03, depth: 0.3 }, scene);
        shelf.position.y = y;
        shelf.material = shelfMat;
        shelf.parent = root;
      });

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 1.6, 0.5),
  },

  {
    type: 'whiteboard',
    displayName: 'Whiteboard',
    category: 'furniture',
    gridWidth: 2,
    gridDepth: 1,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: false,
    collisionEnabled: false,
    icon: '📋',
    create: (scene, position, rotation) => {
      const root = new TransformNode('whiteboard', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      // Board
      const boardMat = new StandardMaterial('boardMat', scene);
      boardMat.diffuseColor = new Color3(0.95, 0.95, 0.95);

      const board = MeshBuilder.CreateBox('board', { width: 1.8, height: 1.2, depth: 0.05 }, scene);
      board.position.y = 1.4;
      board.material = boardMat;
      board.parent = root;

      // Frame
      const frameMat = new StandardMaterial('wbFrameMat', scene);
      frameMat.diffuseColor = new Color3(0.3, 0.3, 0.32);

      const frame = MeshBuilder.CreateBox('wbFrame', { width: 1.9, height: 1.3, depth: 0.03 }, scene);
      frame.position = new Vector3(0, 1.4, -0.02);
      frame.material = frameMat;
      frame.parent = root;

      return root;
    },
  },

  // ELECTRONICS
  {
    type: 'computer',
    displayName: 'Desktop PC',
    category: 'electronics',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: true,
    collisionEnabled: false,
    icon: '🖥️',
    create: (scene, position, rotation) => {
      const root = new TransformNode('computer', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const frameMat = new StandardMaterial('pcFrameMat', scene);
      frameMat.diffuseColor = new Color3(0.1, 0.1, 0.12);

      // Monitor
      const monitor = MeshBuilder.CreateBox('monitor', { width: 0.5, height: 0.35, depth: 0.05 }, scene);
      monitor.position.y = 0.25;
      monitor.material = frameMat;
      monitor.parent = root;

      // Screen
      const screenMat = new StandardMaterial('screenMat', scene);
      screenMat.diffuseColor = new Color3(0.05, 0.1, 0.15);
      screenMat.emissiveColor = new Color3(0.1, 0.15, 0.2);

      const screen = MeshBuilder.CreateBox('screen', { width: 0.45, height: 0.3, depth: 0.01 }, scene);
      screen.position = new Vector3(0, 0.25, 0.03);
      screen.material = screenMat;
      screen.parent = root;

      // Stand
      const stand = MeshBuilder.CreateBox('stand', { width: 0.15, height: 0.08, depth: 0.1 }, scene);
      stand.position.y = 0.04;
      stand.material = frameMat;
      stand.parent = root;

      // Tower
      const tower = MeshBuilder.CreateBox('tower', { width: 0.15, height: 0.35, depth: 0.35 }, scene);
      tower.position = new Vector3(-0.4, 0.175, 0);
      tower.material = frameMat;
      tower.parent = root;

      // Power LED
      const ledMat = new StandardMaterial('ledMat', scene);
      ledMat.emissiveColor = new Color3(0, 0.8, 0.4);
      const led = MeshBuilder.CreateBox('led', { width: 0.02, height: 0.02, depth: 0.01 }, scene);
      led.position = new Vector3(-0.4, 0.28, 0.18);
      led.material = ledMat;
      led.parent = root;

      return root;
    },
  },

  {
    type: 'laptop',
    displayName: 'Laptop',
    category: 'electronics',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: true,
    collisionEnabled: false,
    icon: '💻',
    create: (scene, position, rotation) => {
      const root = new TransformNode('laptop', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('laptopMat', scene);
      mat.diffuseColor = new Color3(0.2, 0.2, 0.22);

      // Base/keyboard
      const base = MeshBuilder.CreateBox('base', { width: 0.35, height: 0.02, depth: 0.25 }, scene);
      base.position.y = 0.01;
      base.material = mat;
      base.parent = root;

      // Screen
      const screenMat = new StandardMaterial('lScreenMat', scene);
      screenMat.diffuseColor = new Color3(0.05, 0.1, 0.15);
      screenMat.emissiveColor = new Color3(0.1, 0.15, 0.2);

      const screen = MeshBuilder.CreateBox('screen', { width: 0.34, height: 0.22, depth: 0.01 }, scene);
      screen.position = new Vector3(0, 0.13, -0.12);
      screen.rotation.x = -0.3;
      screen.material = screenMat;
      screen.parent = root;

      return root;
    },
  },

  {
    type: 'phone',
    displayName: 'Cell Phone',
    category: 'electronics',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: true,
    collisionEnabled: false,
    icon: '📱',
    create: (scene, position, rotation) => {
      const root = new TransformNode('phone', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('phoneMat', scene);
      mat.diffuseColor = new Color3(0.1, 0.1, 0.12);

      const body = MeshBuilder.CreateBox('body', { width: 0.08, height: 0.01, depth: 0.16 }, scene);
      body.position.y = 0.005;
      body.material = mat;
      body.parent = root;

      // Screen
      const screenMat = new StandardMaterial('pScreenMat', scene);
      screenMat.diffuseColor = new Color3(0.1, 0.1, 0.12);
      screenMat.emissiveColor = new Color3(0.05, 0.08, 0.1);

      const screen = MeshBuilder.CreateBox('screen', { width: 0.07, height: 0.005, depth: 0.14 }, scene);
      screen.position.y = 0.012;
      screen.material = screenMat;
      screen.parent = root;

      return root;
    },
  },

  {
    type: 'keyboard',
    displayName: 'Keyboard',
    category: 'electronics',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: false,
    collisionEnabled: false,
    icon: '⌨️',
    create: (scene, position, rotation) => {
      const mat = new StandardMaterial('kbMat', scene);
      mat.diffuseColor = new Color3(0.08, 0.08, 0.1);

      const kb = MeshBuilder.CreateBox('keyboard', { width: 0.4, height: 0.02, depth: 0.15 }, scene);
      kb.position = position.add(new Vector3(0, 0.01, 0));
      kb.rotation.y = (rotation * Math.PI) / 180;
      kb.material = mat;

      return kb;
    },
  },

  {
    type: 'mouse',
    displayName: 'Mouse',
    category: 'electronics',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: false,
    collisionEnabled: false,
    icon: '🖱️',
    create: (scene, position, rotation) => {
      const mat = new StandardMaterial('mouseMat', scene);
      mat.diffuseColor = new Color3(0.1, 0.1, 0.12);

      const mouse = MeshBuilder.CreateBox('mouse', { width: 0.06, height: 0.025, depth: 0.1 }, scene);
      mouse.position = position.add(new Vector3(0, 0.0125, 0));
      mouse.rotation.y = (rotation * Math.PI) / 180;
      mouse.material = mat;

      return mouse;
    },
  },

  // EVIDENCE
  {
    type: 'thumbdrive',
    displayName: 'USB Drive',
    category: 'evidence',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: true,
    collisionEnabled: false,
    icon: '💾',
    create: (scene, position, rotation) => {
      const root = new TransformNode('thumbdrive', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('usbMat', scene);
      mat.diffuseColor = new Color3(0.1, 0.1, 0.8);

      const body = MeshBuilder.CreateBox('body', { width: 0.02, height: 0.008, depth: 0.05 }, scene);
      body.position.y = 0.004;
      body.material = mat;
      body.parent = root;

      // Metal connector
      const metalMat = new StandardMaterial('metalMat', scene);
      metalMat.diffuseColor = new Color3(0.7, 0.7, 0.7);

      const connector = MeshBuilder.CreateBox('connector', { width: 0.015, height: 0.005, depth: 0.015 }, scene);
      connector.position = new Vector3(0, 0.004, 0.03);
      connector.material = metalMat;
      connector.parent = root;

      return root;
    },
  },

  {
    type: 'harddrive',
    displayName: 'Hard Drive',
    category: 'evidence',
    gridWidth: 1,
    gridDepth: 1,
    canPlaceOnFloor: false,
    canPlaceOnSurface: true,
    isInteractive: true,
    collisionEnabled: false,
    icon: '💿',
    create: (scene, position, rotation) => {
      const root = new TransformNode('harddrive', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const mat = new StandardMaterial('hddMat', scene);
      mat.diffuseColor = new Color3(0.15, 0.15, 0.17);

      const body = MeshBuilder.CreateBox('body', { width: 0.12, height: 0.02, depth: 0.08 }, scene);
      body.position.y = 0.01;
      body.material = mat;
      body.parent = root;

      // LED
      const ledMat = new StandardMaterial('hddLed', scene);
      ledMat.emissiveColor = new Color3(0, 0.5, 0.8);

      const led = MeshBuilder.CreateBox('led', { width: 0.01, height: 0.005, depth: 0.005 }, scene);
      led.position = new Vector3(0.05, 0.02, 0.035);
      led.material = ledMat;
      led.parent = root;

      return root;
    },
  },

  {
    type: 'server_rack',
    displayName: 'Server Rack',
    category: 'evidence',
    gridWidth: 1,
    gridDepth: 2,
    canPlaceOnFloor: true,
    canPlaceOnSurface: false,
    isInteractive: true,
    collisionEnabled: true,
    icon: '🖧',
    create: (scene, position, rotation) => {
      const root = new TransformNode('server_rack', scene);
      root.position = position;
      root.rotation.y = (rotation * Math.PI) / 180;

      const frameMat = new StandardMaterial('rackMat', scene);
      frameMat.diffuseColor = new Color3(0.12, 0.12, 0.14);

      // Main frame
      const frame = MeshBuilder.CreateBox('frame', { width: 0.6, height: 1.8, depth: 0.8 }, scene);
      frame.position.y = 0.9;
      frame.material = frameMat;
      frame.parent = root;

      // Server units with LEDs
      const serverMat = new StandardMaterial('serverMat', scene);
      serverMat.diffuseColor = new Color3(0.08, 0.08, 0.1);

      for (let i = 0; i < 6; i++) {
        const server = MeshBuilder.CreateBox(`server${i}`, { width: 0.55, height: 0.2, depth: 0.7 }, scene);
        server.position = new Vector3(0, 0.2 + i * 0.25, 0);
        server.material = serverMat;
        server.parent = root;

        // LEDs
        const colors = [
          new Color3(0, 0.8, 0.2),
          new Color3(0, 0.6, 0.8),
          new Color3(0.8, 0.6, 0),
        ];
        for (let j = 0; j < 3; j++) {
          const ledMat = new StandardMaterial(`led${i}_${j}`, scene);
          ledMat.emissiveColor = colors[j];

          const led = MeshBuilder.CreateBox(`led${i}_${j}`, { width: 0.02, height: 0.02, depth: 0.01 }, scene);
          led.position = new Vector3(-0.2 + j * 0.08, 0.2 + i * 0.25, 0.36);
          led.material = ledMat;
          led.parent = root;
        }
      }

      return root;
    },
    getCollisionBox: (pos, rot) => createCollisionBox(pos, rot, 0.7, 0.9),
  },
];

// ============================================
// REGISTRY SINGLETON
// ============================================

class ObjectRegistryClass {
  private definitions: Map<string, ObjectDefinition> = new Map();

  constructor() {
    definitions.forEach((def) => {
      this.definitions.set(def.type, def);
    });
  }

  get(type: string): ObjectDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): ObjectDefinition[] {
    return Array.from(this.definitions.values());
  }

  getByCategory(category: ObjectCategory): ObjectDefinition[] {
    return this.getAll().filter((def) => def.category === category);
  }

  getFloorPlaceables(): ObjectDefinition[] {
    return this.getAll().filter((def) => def.canPlaceOnFloor);
  }

  getSurfacePlaceables(): ObjectDefinition[] {
    return this.getAll().filter((def) => def.canPlaceOnSurface);
  }

  createObject(
    type: string,
    scene: Scene,
    position: Vector3,
    rotation: number = 0
  ): Mesh | TransformNode | null {
    const def = this.get(type);
    if (!def) {
      console.warn(`Unknown object type: ${type}`);
      return null;
    }
    return def.create(scene, position, rotation);
  }

  getCollisionBox(type: string, position: Vector3, rotation: number): AABB | null {
    const def = this.get(type);
    if (!def || !def.collisionEnabled || !def.getCollisionBox) {
      return null;
    }
    return def.getCollisionBox(position, rotation);
  }
}

export const ObjectRegistry = new ObjectRegistryClass();
