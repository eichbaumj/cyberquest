import {
  Scene,
  Vector3,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  HemisphericLight,
  Mesh,
} from '@babylonjs/core';
import { InteractionManager } from '../../objects/InteractionManager';
import { Question } from '../../objects/InteractiveObject';
import { ComputerTerminal } from '../../objects/types/ComputerTerminal';
import { LockedDoor } from '../../objects/types/LockedDoor';

export interface DFIRLabConfig {
  width: number;
  depth: number;
  wallHeight: number;
  evidenceRoomCode: string;
  requiredCorrectForUnlock: number;
}

const DEFAULT_CONFIG: DFIRLabConfig = {
  width: 30,
  depth: 20,
  wallHeight: 5,
  evidenceRoomCode: '7734',
  requiredCorrectForUnlock: 3,
};

export class DFIRLabZone {
  private scene: Scene;
  private config: DFIRLabConfig;
  private root: TransformNode;
  private interactionManager: InteractionManager;

  // Interactive objects
  private terminals: ComputerTerminal[] = [];
  private evidenceDoor: LockedDoor | null = null;

  // World bounds for collision
  public readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(
    scene: Scene,
    interactionManager: InteractionManager,
    config: Partial<DFIRLabConfig> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.interactionManager = interactionManager;
    this.root = new TransformNode('dfir_lab', scene);

    // Set bounds based on config (walls are on the inside of these bounds)
    const halfW = this.config.width / 2;
    const halfD = this.config.depth / 2;
    this.bounds = {
      minX: -halfW + 1,  // +1 to keep player away from wall
      maxX: halfW - 1,
      minZ: -halfD + 1,
      maxZ: halfD - 1,
    };

    this.build();
  }

  private build(): void {
    this.buildFloor();
    this.buildWalls();
    this.buildFurniture();
    this.setupLighting();
  }

  /**
   * Simple floor with cyber grid - light gray color
   */
  private buildFloor(): void {
    const { width, depth } = this.config;

    // Main floor - light gray
    const floor = MeshBuilder.CreateGround(
      'floor',
      { width, height: depth, subdivisions: 1 },
      this.scene
    );
    floor.parent = this.root;

    const floorMat = new StandardMaterial('floorMat', this.scene);
    floorMat.diffuseColor = new Color3(0.25, 0.27, 0.3); // Light gray
    floorMat.specularColor = new Color3(0.1, 0.1, 0.1);
    floor.material = floorMat;
    floor.receiveShadows = true;

    // Grid lines
    this.createGridLines(width, depth);
  }

  private createGridLines(width: number, depth: number): void {
    const gridMat = new StandardMaterial('gridMat', this.scene);
    gridMat.diffuseColor = new Color3(0, 0.6, 0.8);
    gridMat.emissiveColor = new Color3(0, 0.15, 0.2);
    gridMat.alpha = 0.5;

    const spacing = 2;
    const halfW = width / 2;
    const halfD = depth / 2;

    // X lines
    for (let x = -halfW; x <= halfW; x += spacing) {
      const line = MeshBuilder.CreateBox(
        `gridX_${x}`,
        { width: 0.02, height: 0.01, depth: depth },
        this.scene
      );
      line.position = new Vector3(x, 0.01, 0);
      line.material = gridMat;
      line.parent = this.root;
    }

    // Z lines
    for (let z = -halfD; z <= halfD; z += spacing) {
      const line = MeshBuilder.CreateBox(
        `gridZ_${z}`,
        { width: width, height: 0.01, depth: 0.02 },
        this.scene
      );
      line.position = new Vector3(0, 0.01, z);
      line.material = gridMat;
      line.parent = this.root;
    }
  }

  /**
   * Four simple walls around the floor
   */
  private buildWalls(): void {
    const { width, depth, wallHeight } = this.config;
    const halfW = width / 2;
    const halfD = depth / 2;
    const thickness = 0.5;

    const wallMat = new StandardMaterial('wallMat', this.scene);
    wallMat.diffuseColor = new Color3(0.06, 0.08, 0.1);
    wallMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const accentMat = new StandardMaterial('accentMat', this.scene);
    accentMat.diffuseColor = new Color3(0, 0.9, 1);
    accentMat.emissiveColor = new Color3(0, 0.3, 0.35);

    // North wall (back, -Z)
    this.createWall('north', new Vector3(0, wallHeight / 2, -halfD), width, wallHeight, thickness, wallMat, accentMat);

    // South wall (front, +Z)
    this.createWall('south', new Vector3(0, wallHeight / 2, halfD), width, wallHeight, thickness, wallMat, accentMat);

    // West wall (left, -X)
    this.createWall('west', new Vector3(-halfW, wallHeight / 2, 0), thickness, wallHeight, depth, wallMat, accentMat);

    // East wall (right, +X)
    this.createWall('east', new Vector3(halfW, wallHeight / 2, 0), thickness, wallHeight, depth, wallMat, accentMat);
  }

  private createWall(
    name: string,
    position: Vector3,
    width: number,
    height: number,
    depth: number,
    wallMat: StandardMaterial,
    accentMat: StandardMaterial
  ): Mesh {
    // Main wall
    const wall = MeshBuilder.CreateBox(
      `wall_${name}`,
      { width, height, depth },
      this.scene
    );
    wall.position = position;
    wall.material = wallMat;
    wall.parent = this.root;

    // Accent strip at top
    const accent = MeshBuilder.CreateBox(
      `accent_${name}`,
      { width: width + 0.1, height: 0.15, depth: depth + 0.1 },
      this.scene
    );
    accent.position = position.add(new Vector3(0, height / 2 - 0.1, 0));
    accent.material = accentMat;
    accent.parent = this.root;

    return wall;
  }

  /**
   * Add workbenches with computers
   */
  private buildFurniture(): void {
    const benchPositions = [
      new Vector3(-6, 0, 4),
      new Vector3(0, 0, 4),
      new Vector3(6, 0, 4),
    ];

    // Materials
    const benchMat = new StandardMaterial('benchMat', this.scene);
    benchMat.diffuseColor = new Color3(0.15, 0.12, 0.1); // Dark wood

    const legMat = new StandardMaterial('legMat', this.scene);
    legMat.diffuseColor = new Color3(0.1, 0.1, 0.1);

    const monitorMat = new StandardMaterial('monitorMat', this.scene);
    monitorMat.diffuseColor = new Color3(0.08, 0.08, 0.1);

    const screenMat = new StandardMaterial('screenMat', this.scene);
    screenMat.diffuseColor = new Color3(0.05, 0.1, 0.15);
    screenMat.emissiveColor = new Color3(0, 0.15, 0.2);

    const towerMat = new StandardMaterial('towerMat', this.scene);
    towerMat.diffuseColor = new Color3(0.05, 0.05, 0.07);

    const kbMat = new StandardMaterial('kbMat', this.scene);
    kbMat.diffuseColor = new Color3(0.06, 0.06, 0.08);

    const mouseMat = new StandardMaterial('mouseMat', this.scene);
    mouseMat.diffuseColor = new Color3(0.05, 0.05, 0.05);

    const laptopMat = new StandardMaterial('laptopMat', this.scene);
    laptopMat.diffuseColor = new Color3(0.12, 0.12, 0.14);

    benchPositions.forEach((pos, i) => {
      const deskY = 0.75;

      // Desktop surface
      const desk = MeshBuilder.CreateBox(
        `desk_${i}`,
        { width: 2.2, height: 0.08, depth: 1.1 },
        this.scene
      );
      desk.position = pos.add(new Vector3(0, deskY, 0));
      desk.material = benchMat;
      desk.parent = this.root;

      // Legs
      [[-0.95, 0.45], [0.95, 0.45], [-0.95, -0.45], [0.95, -0.45]].forEach(([lx, lz], li) => {
        const leg = MeshBuilder.CreateBox(
          `leg_${i}_${li}`,
          { width: 0.06, height: 0.7, depth: 0.06 },
          this.scene
        );
        leg.position = pos.add(new Vector3(lx, 0.35, lz));
        leg.material = legMat;
        leg.parent = this.root;
      });

      // Computer equipment based on desk position
      if (i === 1) {
        // Middle desk: Laptop
        this.createLaptop(pos.add(new Vector3(0, deskY + 0.04, 0)), laptopMat, screenMat, i);
      } else {
        // Left and right desks: Monitor + Desktop + Keyboard + Mouse
        this.createDesktopComputer(pos.add(new Vector3(0, deskY + 0.04, 0)), monitorMat, screenMat, towerMat, kbMat, mouseMat, i);
      }
    });

    // Locked door (for evidence room concept - place it on back wall)
    this.evidenceDoor = new LockedDoor({
      id: 'evidence_door',
      scene: this.scene,
      position: new Vector3(8, 0, -this.config.depth / 2 + 0.5),
      rotation: 0,
      unlockCode: this.config.evidenceRoomCode,
      requiredCorrect: this.config.requiredCorrectForUnlock,
    });
    this.interactionManager.registerObject(this.evidenceDoor);
  }

  private createDesktopComputer(
    basePos: Vector3,
    monitorMat: StandardMaterial,
    screenMat: StandardMaterial,
    towerMat: StandardMaterial,
    kbMat: StandardMaterial,
    mouseMat: StandardMaterial,
    index: number
  ): void {
    // Monitor stand
    const stand = MeshBuilder.CreateBox(
      `stand_${index}`,
      { width: 0.15, height: 0.08, depth: 0.12 },
      this.scene
    );
    stand.position = basePos.add(new Vector3(0, 0.04, -0.25));
    stand.material = monitorMat;
    stand.parent = this.root;

    // Monitor neck
    const neck = MeshBuilder.CreateBox(
      `neck_${index}`,
      { width: 0.06, height: 0.12, depth: 0.06 },
      this.scene
    );
    neck.position = basePos.add(new Vector3(0, 0.14, -0.25));
    neck.material = monitorMat;
    neck.parent = this.root;

    // Monitor frame
    const monitor = MeshBuilder.CreateBox(
      `monitor_${index}`,
      { width: 0.6, height: 0.4, depth: 0.04 },
      this.scene
    );
    monitor.position = basePos.add(new Vector3(0, 0.4, -0.28));
    monitor.material = monitorMat;
    monitor.parent = this.root;

    // Screen
    const screen = MeshBuilder.CreateBox(
      `screen_${index}`,
      { width: 0.54, height: 0.34, depth: 0.01 },
      this.scene
    );
    screen.position = basePos.add(new Vector3(0, 0.4, -0.255));
    screen.material = screenMat;
    screen.parent = this.root;

    // Desktop tower (to the left)
    const tower = MeshBuilder.CreateBox(
      `tower_${index}`,
      { width: 0.18, height: 0.4, depth: 0.4 },
      this.scene
    );
    tower.position = basePos.add(new Vector3(-0.7, 0.2, -0.1));
    tower.material = towerMat;
    tower.parent = this.root;

    // Tower power LED
    const ledMat = new StandardMaterial(`ledMat_${index}`, this.scene);
    ledMat.emissiveColor = new Color3(0, 0.8, 0.4);
    const led = MeshBuilder.CreateBox(
      `led_${index}`,
      { width: 0.02, height: 0.02, depth: 0.01 },
      this.scene
    );
    led.position = basePos.add(new Vector3(-0.7, 0.32, 0.105));
    led.material = ledMat;
    led.parent = this.root;

    // Keyboard
    const keyboard = MeshBuilder.CreateBox(
      `keyboard_${index}`,
      { width: 0.4, height: 0.02, depth: 0.15 },
      this.scene
    );
    keyboard.position = basePos.add(new Vector3(0, 0.01, 0.2));
    keyboard.material = kbMat;
    keyboard.parent = this.root;

    // Mouse (to the right of keyboard)
    const mouse = MeshBuilder.CreateBox(
      `mouse_${index}`,
      { width: 0.06, height: 0.02, depth: 0.1 },
      this.scene
    );
    mouse.position = basePos.add(new Vector3(0.35, 0.01, 0.2));
    mouse.material = mouseMat;
    mouse.parent = this.root;
  }

  private createLaptop(
    basePos: Vector3,
    laptopMat: StandardMaterial,
    screenMat: StandardMaterial,
    index: number
  ): void {
    // Laptop base (keyboard part)
    const base = MeshBuilder.CreateBox(
      `laptopBase_${index}`,
      { width: 0.35, height: 0.02, depth: 0.25 },
      this.scene
    );
    base.position = basePos.add(new Vector3(0, 0.01, 0.1));
    base.material = laptopMat;
    base.parent = this.root;

    // Laptop screen (tilted back)
    const screenFrame = MeshBuilder.CreateBox(
      `laptopScreen_${index}`,
      { width: 0.35, height: 0.24, depth: 0.015 },
      this.scene
    );
    screenFrame.position = basePos.add(new Vector3(0, 0.13, -0.04));
    screenFrame.rotation.x = -0.3; // Tilt back ~17 degrees
    screenFrame.material = laptopMat;
    screenFrame.parent = this.root;

    // Laptop screen display
    const screenDisplay = MeshBuilder.CreateBox(
      `laptopDisplay_${index}`,
      { width: 0.31, height: 0.2, depth: 0.005 },
      this.scene
    );
    screenDisplay.position = basePos.add(new Vector3(0, 0.13, -0.03));
    screenDisplay.rotation.x = -0.3;
    screenDisplay.material = screenMat;
    screenDisplay.parent = this.root;
  }

  private setupLighting(): void {
    const ambient = new HemisphericLight('labLight', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.4;
    ambient.diffuse = new Color3(0.7, 0.8, 1);
    ambient.groundColor = new Color3(0.1, 0.1, 0.15);
  }

  /**
   * Spawn terminals based on questions
   */
  public spawnTerminalsForQuestions(questions: Question[]): void {
    console.log('DFIRLabZone.spawnTerminalsForQuestions called with', questions.length, 'questions');

    // Don't spawn if terminals already exist
    if (this.terminals.length > 0) {
      console.log('Terminals already spawned, skipping');
      return;
    }

    const positions = [
      new Vector3(-6, 0.85, 4),
      new Vector3(0, 0.85, 4),
      new Vector3(6, 0.85, 4),
    ];

    const count = Math.min(questions.length, positions.length);
    console.log('Spawning', count, 'terminals');

    for (let i = 0; i < count; i++) {
      const terminal = new ComputerTerminal({
        id: `terminal_${i}`,
        scene: this.scene,
        position: positions[i],
        rotation: 0,
      });

      terminal.bindQuestion(questions[i]);
      terminal.setScreenText(`> CHALLENGE ${i + 1}\n> READY`);

      this.terminals.push(terminal);
      this.interactionManager.registerObject(terminal);
      console.log(`Terminal ${i} spawned at`, positions[i].toString(), 'with question:', questions[i].id);
    }
  }

  public getTerminals(): ComputerTerminal[] {
    return this.terminals;
  }

  public getEvidenceDoor(): LockedDoor | null {
    return this.evidenceDoor;
  }

  public checkUnlock(correctCount: number): boolean {
    if (this.evidenceDoor && correctCount >= this.config.requiredCorrectForUnlock) {
      this.evidenceDoor.unlock();
      return true;
    }
    return false;
  }

  public getSpawnPoint(): Vector3 {
    return new Vector3(0, 0.5, 5);
  }

  public getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    return this.bounds;
  }

  public dispose(): void {
    this.terminals.forEach((t) => {
      this.interactionManager.unregisterObject(t.getId());
      t.dispose();
    });
    if (this.evidenceDoor) {
      this.interactionManager.unregisterObject(this.evidenceDoor.getId());
      this.evidenceDoor.dispose();
    }
    this.root.dispose();
  }
}
