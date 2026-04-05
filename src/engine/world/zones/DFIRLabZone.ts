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
   * Simple floor with cyber grid
   */
  private buildFloor(): void {
    const { width, depth } = this.config;

    // Main floor
    const floor = MeshBuilder.CreateGround(
      'floor',
      { width, height: depth, subdivisions: 1 },
      this.scene
    );
    floor.parent = this.root;

    const floorMat = new StandardMaterial('floorMat', this.scene);
    floorMat.diffuseColor = new Color3(0.02, 0.04, 0.06);
    floorMat.specularColor = new Color3(0.05, 0.05, 0.05);
    floor.material = floorMat;
    floor.receiveShadows = true;

    // Grid lines
    this.createGridLines(width, depth);
  }

  private createGridLines(width: number, depth: number): void {
    const gridMat = new StandardMaterial('gridMat', this.scene);
    gridMat.diffuseColor = new Color3(0, 0.6, 0.8);
    gridMat.emissiveColor = new Color3(0, 0.2, 0.25);
    gridMat.alpha = 0.4;

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
   * Add workbenches and computers
   */
  private buildFurniture(): void {
    // Just a few workbenches for now
    const benchPositions = [
      new Vector3(-6, 0, 4),
      new Vector3(0, 0, 4),
      new Vector3(6, 0, 4),
    ];

    const benchMat = new StandardMaterial('benchMat', this.scene);
    benchMat.diffuseColor = new Color3(0.12, 0.1, 0.08);

    benchPositions.forEach((pos, i) => {
      // Desktop
      const desk = MeshBuilder.CreateBox(
        `desk_${i}`,
        { width: 2, height: 0.1, depth: 1 },
        this.scene
      );
      desk.position = pos.add(new Vector3(0, 0.75, 0));
      desk.material = benchMat;
      desk.parent = this.root;

      // Legs
      const legMat = new StandardMaterial(`legMat_${i}`, this.scene);
      legMat.diffuseColor = new Color3(0.15, 0.15, 0.15);

      [[-0.8, 0.4], [0.8, 0.4], [-0.8, -0.4], [0.8, -0.4]].forEach(([lx, lz], li) => {
        const leg = MeshBuilder.CreateBox(
          `leg_${i}_${li}`,
          { width: 0.08, height: 0.7, depth: 0.08 },
          this.scene
        );
        leg.position = pos.add(new Vector3(lx, 0.35, lz));
        leg.material = legMat;
        leg.parent = this.root;
      });
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
    const positions = [
      new Vector3(-6, 0.85, 4),
      new Vector3(0, 0.85, 4),
      new Vector3(6, 0.85, 4),
    ];

    const count = Math.min(questions.length, positions.length);

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
    return new Vector3(0, 1, 5);
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
