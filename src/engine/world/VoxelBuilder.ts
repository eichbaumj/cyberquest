import {
  Scene,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';

// Cyber color palette for world building
export const WORLD_COLORS = {
  wallDark: new Color3(0.08, 0.1, 0.14),
  wallAccent: new Color3(0, 0.94, 1), // Cyan
  floor: new Color3(0.03, 0.05, 0.08),
  floorGrid: new Color3(0, 0.6, 0.8),
  workbench: new Color3(0.15, 0.12, 0.1),
  metal: new Color3(0.2, 0.22, 0.25),
  doorLocked: new Color3(1, 0, 0.3),
  doorUnlocked: new Color3(0, 1, 0.5),
  screenGlow: new Color3(0, 0.94, 1),
};

export class VoxelBuilder {
  private scene: Scene;
  private materials: Map<string, StandardMaterial> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.createMaterials();
  }

  private createMaterials(): void {
    // Wall material
    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = WORLD_COLORS.wallDark;
    wallMat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.materials.set('wall', wallMat);

    // Wall accent material (glowing trim)
    const accentMat = new StandardMaterial('accentMat', this.scene);
    accentMat.diffuseColor = WORLD_COLORS.wallAccent;
    accentMat.emissiveColor = WORLD_COLORS.wallAccent.scale(0.3);
    this.materials.set('accent', accentMat);

    // Floor material
    const floorMat = new StandardMaterial('floorMat', this.scene);
    floorMat.diffuseColor = WORLD_COLORS.floor;
    floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
    this.materials.set('floor', floorMat);

    // Workbench material
    const benchMat = new StandardMaterial('benchMat', this.scene);
    benchMat.diffuseColor = WORLD_COLORS.workbench;
    benchMat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.materials.set('workbench', benchMat);

    // Metal material
    const metalMat = new StandardMaterial('metalMat', this.scene);
    metalMat.diffuseColor = WORLD_COLORS.metal;
    metalMat.specularColor = new Color3(0.3, 0.3, 0.3);
    this.materials.set('metal', metalMat);

    // Locked door material
    const lockedMat = new StandardMaterial('lockedMat', this.scene);
    lockedMat.diffuseColor = WORLD_COLORS.metal;
    lockedMat.emissiveColor = WORLD_COLORS.doorLocked.scale(0.2);
    this.materials.set('locked', lockedMat);

    // Screen glow material
    const screenMat = new StandardMaterial('screenMat', this.scene);
    screenMat.diffuseColor = new Color3(0.05, 0.1, 0.15);
    screenMat.emissiveColor = WORLD_COLORS.screenGlow.scale(0.5);
    this.materials.set('screen', screenMat);
  }

  getMaterial(name: string): StandardMaterial {
    return this.materials.get(name) || this.materials.get('wall')!;
  }

  /**
   * Create a wall segment from start to end position
   */
  createWall(
    name: string,
    start: Vector3,
    end: Vector3,
    height: number = 4,
    thickness: number = 0.5,
    withAccent: boolean = true
  ): TransformNode {
    const parent = new TransformNode(`wall_${name}`, this.scene);

    // Calculate wall dimensions
    const direction = end.subtract(start);
    const length = direction.length();
    const center = start.add(direction.scale(0.5));
    const angle = Math.atan2(direction.x, direction.z);

    // Main wall
    const wall = MeshBuilder.CreateBox(
      `wall_${name}_main`,
      { width: length, height: height, depth: thickness },
      this.scene
    );
    wall.position = center.add(new Vector3(0, height / 2, 0));
    wall.rotation.y = angle;
    wall.material = this.getMaterial('wall');
    wall.parent = parent;
    wall.checkCollisions = true;

    // Accent strip at top
    if (withAccent) {
      const accent = MeshBuilder.CreateBox(
        `wall_${name}_accent`,
        { width: length + 0.1, height: 0.2, depth: thickness + 0.1 },
        this.scene
      );
      accent.position = center.add(new Vector3(0, height - 0.1, 0));
      accent.rotation.y = angle;
      accent.material = this.getMaterial('accent');
      accent.parent = parent;
    }

    return parent;
  }

  /**
   * Create a floor with optional grid lines
   */
  createFloor(
    name: string,
    position: Vector3,
    width: number,
    depth: number,
    withGrid: boolean = true
  ): TransformNode {
    const parent = new TransformNode(`floor_${name}`, this.scene);
    parent.position = position;

    // Main floor
    const floor = MeshBuilder.CreateGround(
      `floor_${name}_main`,
      { width, height: depth, subdivisions: 1 },
      this.scene
    );
    floor.material = this.getMaterial('floor');
    floor.parent = parent;
    floor.receiveShadows = true;

    // Grid lines
    if (withGrid) {
      this.createGridLines(name, width, depth, parent);
    }

    return parent;
  }

  private createGridLines(
    name: string,
    width: number,
    depth: number,
    parent: TransformNode
  ): void {
    const gridSpacing = 2;
    const gridMat = new StandardMaterial(`gridMat_${name}`, this.scene);
    gridMat.diffuseColor = WORLD_COLORS.floorGrid;
    gridMat.emissiveColor = WORLD_COLORS.floorGrid.scale(0.15);
    gridMat.alpha = 0.3;

    // X-axis lines
    for (let x = -width / 2; x <= width / 2; x += gridSpacing) {
      const line = MeshBuilder.CreateBox(
        `grid_x_${x}`,
        { width: 0.02, height: 0.01, depth: depth },
        this.scene
      );
      line.position = new Vector3(x, 0.01, 0);
      line.material = gridMat;
      line.parent = parent;
    }

    // Z-axis lines
    for (let z = -depth / 2; z <= depth / 2; z += gridSpacing) {
      const line = MeshBuilder.CreateBox(
        `grid_z_${z}`,
        { width: width, height: 0.01, depth: 0.02 },
        this.scene
      );
      line.position = new Vector3(0, 0.01, z);
      line.material = gridMat;
      line.parent = parent;
    }
  }

  /**
   * Create a workbench/desk
   */
  createWorkbench(name: string, position: Vector3, rotation: number = 0): TransformNode {
    const parent = new TransformNode(`workbench_${name}`, this.scene);
    parent.position = position;
    parent.rotation.y = rotation;

    const benchMat = this.getMaterial('workbench');
    const metalMat = this.getMaterial('metal');

    // Desktop surface
    const desktop = MeshBuilder.CreateBox(
      `${name}_desktop`,
      { width: 2, height: 0.1, depth: 1 },
      this.scene
    );
    desktop.position = new Vector3(0, 0.75, 0);
    desktop.material = benchMat;
    desktop.parent = parent;

    // Legs
    const legPositions = [
      new Vector3(-0.9, 0.375, 0.4),
      new Vector3(0.9, 0.375, 0.4),
      new Vector3(-0.9, 0.375, -0.4),
      new Vector3(0.9, 0.375, -0.4),
    ];

    legPositions.forEach((pos, i) => {
      const leg = MeshBuilder.CreateBox(
        `${name}_leg_${i}`,
        { width: 0.1, height: 0.75, depth: 0.1 },
        this.scene
      );
      leg.position = pos;
      leg.material = metalMat;
      leg.parent = parent;
    });

    return parent;
  }

  /**
   * Create a computer setup (monitor, keyboard, tower)
   */
  createComputer(name: string, position: Vector3, rotation: number = 0): TransformNode {
    const parent = new TransformNode(`computer_${name}`, this.scene);
    parent.position = position;
    parent.rotation.y = rotation;

    const metalMat = this.getMaterial('metal');
    const screenMat = this.getMaterial('screen');

    // Monitor frame
    const monitorFrame = MeshBuilder.CreateBox(
      `${name}_frame`,
      { width: 0.6, height: 0.4, depth: 0.05 },
      this.scene
    );
    monitorFrame.position = new Vector3(0, 0.3, 0);
    monitorFrame.material = metalMat;
    monitorFrame.parent = parent;

    // Monitor screen (front face)
    const screen = MeshBuilder.CreateBox(
      `${name}_screen`,
      { width: 0.55, height: 0.35, depth: 0.01 },
      this.scene
    );
    screen.position = new Vector3(0, 0.3, 0.03);
    screen.material = screenMat;
    screen.parent = parent;

    // Monitor stand
    const stand = MeshBuilder.CreateBox(
      `${name}_stand`,
      { width: 0.15, height: 0.15, depth: 0.1 },
      this.scene
    );
    stand.position = new Vector3(0, 0.075, 0);
    stand.material = metalMat;
    stand.parent = parent;

    // Keyboard
    const keyboard = MeshBuilder.CreateBox(
      `${name}_keyboard`,
      { width: 0.4, height: 0.02, depth: 0.15 },
      this.scene
    );
    keyboard.position = new Vector3(0, 0.01, 0.35);
    keyboard.material = metalMat;
    keyboard.parent = parent;

    // Tower (side)
    const tower = MeshBuilder.CreateBox(
      `${name}_tower`,
      { width: 0.15, height: 0.35, depth: 0.35 },
      this.scene
    );
    tower.position = new Vector3(-0.5, 0.175, 0);
    tower.material = metalMat;
    tower.parent = parent;

    // Tower power LED
    const led = MeshBuilder.CreateBox(
      `${name}_led`,
      { width: 0.02, height: 0.02, depth: 0.01 },
      this.scene
    );
    led.position = new Vector3(-0.5, 0.25, 0.18);
    const ledMat = new StandardMaterial(`${name}_ledMat`, this.scene);
    ledMat.emissiveColor = new Color3(0, 1, 0.5);
    led.material = ledMat;
    led.parent = parent;

    return parent;
  }

  /**
   * Create a door frame with door
   */
  createDoor(
    name: string,
    position: Vector3,
    rotation: number = 0,
    isLocked: boolean = true
  ): { parent: TransformNode; door: Mesh } {
    const parent = new TransformNode(`door_${name}`, this.scene);
    parent.position = position;
    parent.rotation.y = rotation;

    const metalMat = this.getMaterial('metal');
    const accentMat = isLocked ? this.getMaterial('locked') : this.getMaterial('accent');

    // Door frame
    const frameTop = MeshBuilder.CreateBox(
      `${name}_frameTop`,
      { width: 2.2, height: 0.2, depth: 0.3 },
      this.scene
    );
    frameTop.position = new Vector3(0, 2.9, 0);
    frameTop.material = metalMat;
    frameTop.parent = parent;

    const frameLeft = MeshBuilder.CreateBox(
      `${name}_frameLeft`,
      { width: 0.2, height: 3, depth: 0.3 },
      this.scene
    );
    frameLeft.position = new Vector3(-1.1, 1.4, 0);
    frameLeft.material = metalMat;
    frameLeft.parent = parent;

    const frameRight = MeshBuilder.CreateBox(
      `${name}_frameRight`,
      { width: 0.2, height: 3, depth: 0.3 },
      this.scene
    );
    frameRight.position = new Vector3(1.1, 1.4, 0);
    frameRight.material = metalMat;
    frameRight.parent = parent;

    // Door itself
    const door = MeshBuilder.CreateBox(
      `${name}_door`,
      { width: 1.8, height: 2.7, depth: 0.15 },
      this.scene
    );
    door.position = new Vector3(0, 1.35, 0);
    door.material = accentMat;
    door.parent = parent;
    door.checkCollisions = true;

    // Keypad
    const keypad = MeshBuilder.CreateBox(
      `${name}_keypad`,
      { width: 0.2, height: 0.3, depth: 0.05 },
      this.scene
    );
    keypad.position = new Vector3(1.3, 1.2, 0.15);
    keypad.material = metalMat;
    keypad.parent = parent;

    // Keypad screen
    const keypadScreen = MeshBuilder.CreateBox(
      `${name}_keypadScreen`,
      { width: 0.15, height: 0.1, depth: 0.01 },
      this.scene
    );
    keypadScreen.position = new Vector3(1.3, 1.3, 0.18);
    const keypadMat = new StandardMaterial(`${name}_keypadMat`, this.scene);
    keypadMat.emissiveColor = isLocked
      ? WORLD_COLORS.doorLocked.scale(0.5)
      : WORLD_COLORS.doorUnlocked.scale(0.5);
    keypadScreen.material = keypadMat;
    keypadScreen.parent = parent;

    return { parent, door };
  }

  /**
   * Create a whiteboard on wall
   */
  createWhiteboard(name: string, position: Vector3, rotation: number = 0): TransformNode {
    const parent = new TransformNode(`whiteboard_${name}`, this.scene);
    parent.position = position;
    parent.rotation.y = rotation;

    // Frame
    const frame = MeshBuilder.CreateBox(
      `${name}_frame`,
      { width: 3.2, height: 2.2, depth: 0.1 },
      this.scene
    );
    frame.material = this.getMaterial('metal');
    frame.parent = parent;

    // White surface
    const surface = MeshBuilder.CreateBox(
      `${name}_surface`,
      { width: 3, height: 2, depth: 0.05 },
      this.scene
    );
    surface.position.z = 0.05;
    const whiteMat = new StandardMaterial(`${name}_whiteMat`, this.scene);
    whiteMat.diffuseColor = new Color3(0.9, 0.9, 0.95);
    whiteMat.emissiveColor = new Color3(0.1, 0.1, 0.12);
    surface.material = whiteMat;
    surface.parent = parent;

    return parent;
  }

  /**
   * Create ceiling with lights
   */
  createCeiling(
    name: string,
    position: Vector3,
    width: number,
    depth: number
  ): TransformNode {
    const parent = new TransformNode(`ceiling_${name}`, this.scene);
    parent.position = position;

    // Ceiling plane
    const ceiling = MeshBuilder.CreateGround(
      `${name}_ceiling`,
      { width, height: depth },
      this.scene
    );
    ceiling.rotation.x = Math.PI;
    ceiling.position.y = 4;
    ceiling.material = this.getMaterial('wall');
    ceiling.parent = parent;

    // Light panels
    const lightSpacing = 5;
    for (let x = -width / 2 + lightSpacing / 2; x < width / 2; x += lightSpacing) {
      for (let z = -depth / 2 + lightSpacing / 2; z < depth / 2; z += lightSpacing) {
        const light = MeshBuilder.CreateBox(
          `${name}_light_${x}_${z}`,
          { width: 1.5, height: 0.1, depth: 0.5 },
          this.scene
        );
        light.position = new Vector3(x, 3.9, z);
        const lightMat = new StandardMaterial(`${name}_lightMat_${x}_${z}`, this.scene);
        lightMat.diffuseColor = new Color3(0.8, 0.85, 0.9);
        lightMat.emissiveColor = new Color3(0.3, 0.35, 0.4);
        light.material = lightMat;
        light.parent = parent;
      }
    }

    return parent;
  }
}
