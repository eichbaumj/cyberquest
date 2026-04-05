import {
  Scene,
  Vector3,
  TransformNode,
  HemisphericLight,
  Color3,
  PointLight,
} from '@babylonjs/core';
import { VoxelBuilder } from '../VoxelBuilder';
import { InteractionManager } from '../../objects/InteractionManager';
import { InteractiveObject, Question } from '../../objects/InteractiveObject';
import { ComputerTerminal } from '../../objects/types/ComputerTerminal';
import { LockedDoor } from '../../objects/types/LockedDoor';

export interface DFIRLabConfig {
  width: number;
  depth: number;
  evidenceRoomCode: string;
  requiredCorrectForUnlock: number;
}

const DEFAULT_CONFIG: DFIRLabConfig = {
  width: 40,
  depth: 30,
  evidenceRoomCode: '7734',
  requiredCorrectForUnlock: 3,
};

export class DFIRLabZone {
  private scene: Scene;
  private config: DFIRLabConfig;
  private root: TransformNode;
  private voxelBuilder: VoxelBuilder;
  private interactionManager: InteractionManager;

  // Interactive objects
  private terminals: ComputerTerminal[] = [];
  private evidenceDoor: LockedDoor | null = null;

  // Spawn positions for dynamic objects
  private terminalSpawnPositions: Vector3[] = [
    new Vector3(-8, 0.8, 5),
    new Vector3(0, 0.8, 5),
    new Vector3(8, 0.8, 5),
    new Vector3(-4, 0.8, -3),
    new Vector3(4, 0.8, -3),
  ];

  constructor(
    scene: Scene,
    interactionManager: InteractionManager,
    config: Partial<DFIRLabConfig> = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.interactionManager = interactionManager;
    this.voxelBuilder = new VoxelBuilder(scene);

    this.root = new TransformNode('dfir_lab', scene);

    this.build();
  }

  /**
   * Build the entire lab environment
   */
  private build(): void {
    this.buildFloor();
    this.buildWalls();
    this.buildCeiling();
    this.buildMainLab();
    this.buildEvidenceRoom();
    this.setupLighting();
  }

  /**
   * Build the floor with grid
   */
  private buildFloor(): void {
    const floor = this.voxelBuilder.createFloor(
      'main',
      new Vector3(0, 0, 0),
      this.config.width,
      this.config.depth,
      true
    );
    floor.parent = this.root;
  }

  /**
   * Build outer walls
   */
  private buildWalls(): void {
    const w = this.config.width / 2;
    const d = this.config.depth / 2;
    const wallHeight = 4;

    // North wall (back)
    const northWall = this.voxelBuilder.createWall(
      'north',
      new Vector3(-w, 0, -d),
      new Vector3(w, 0, -d),
      wallHeight
    );
    northWall.parent = this.root;

    // South wall (front) - with gap for entrance
    const southWallLeft = this.voxelBuilder.createWall(
      'south_left',
      new Vector3(-w, 0, d),
      new Vector3(-3, 0, d),
      wallHeight
    );
    southWallLeft.parent = this.root;

    const southWallRight = this.voxelBuilder.createWall(
      'south_right',
      new Vector3(3, 0, d),
      new Vector3(w, 0, d),
      wallHeight
    );
    southWallRight.parent = this.root;

    // West wall (left)
    const westWall = this.voxelBuilder.createWall(
      'west',
      new Vector3(-w, 0, -d),
      new Vector3(-w, 0, d),
      wallHeight
    );
    westWall.parent = this.root;

    // East wall (right) - partial, evidence room has its own walls
    const eastWallMain = this.voxelBuilder.createWall(
      'east_main',
      new Vector3(w, 0, -d),
      new Vector3(w, 0, 0),
      wallHeight
    );
    eastWallMain.parent = this.root;
  }

  /**
   * Build ceiling with lights
   */
  private buildCeiling(): void {
    const ceiling = this.voxelBuilder.createCeiling(
      'main',
      new Vector3(0, 0, 0),
      this.config.width - 10, // Slightly smaller than floor
      this.config.depth - 5
    );
    ceiling.parent = this.root;
  }

  /**
   * Build main lab area with workbenches
   */
  private buildMainLab(): void {
    // Workbenches with computers
    const workbenchPositions = [
      { pos: new Vector3(-8, 0, 5), rot: 0 },
      { pos: new Vector3(0, 0, 5), rot: 0 },
      { pos: new Vector3(8, 0, 5), rot: 0 },
    ];

    workbenchPositions.forEach((wb, i) => {
      const workbench = this.voxelBuilder.createWorkbench(
        `wb_${i}`,
        wb.pos,
        wb.rot
      );
      workbench.parent = this.root;

      // Add computer on workbench
      const computer = this.voxelBuilder.createComputer(
        `computer_${i}`,
        wb.pos.add(new Vector3(0, 0.8, 0)),
        wb.rot
      );
      computer.parent = this.root;
    });

    // Additional workbenches for phones/evidence
    const sideWorkbenches = [
      { pos: new Vector3(-4, 0, -3), rot: Math.PI },
      { pos: new Vector3(4, 0, -3), rot: Math.PI },
    ];

    sideWorkbenches.forEach((wb, i) => {
      const workbench = this.voxelBuilder.createWorkbench(
        `side_wb_${i}`,
        wb.pos,
        wb.rot
      );
      workbench.parent = this.root;
    });

    // Whiteboard on north wall
    const whiteboard = this.voxelBuilder.createWhiteboard(
      'main',
      new Vector3(0, 1.8, -this.config.depth / 2 + 0.3),
      0
    );
    whiteboard.parent = this.root;
  }

  /**
   * Build evidence room with locked door
   */
  private buildEvidenceRoom(): void {
    const w = this.config.width / 2;
    const roomWidth = 10;
    const roomDepth = 10;
    const wallHeight = 4;

    // Evidence room is in the bottom-right corner
    const roomX = w - roomWidth / 2;
    const roomZ = this.config.depth / 2 - roomDepth / 2;

    // Evidence room walls
    // West wall (separating from main lab)
    const erWestWall = this.voxelBuilder.createWall(
      'er_west',
      new Vector3(w - roomWidth, 0, roomZ - roomDepth / 2),
      new Vector3(w - roomWidth, 0, roomZ + roomDepth / 2 - 2),
      wallHeight
    );
    erWestWall.parent = this.root;

    // Door position on west wall
    const doorPos = new Vector3(w - roomWidth, 0, roomZ + roomDepth / 2 - 3);

    // Continue wall after door
    const erWestWall2 = this.voxelBuilder.createWall(
      'er_west2',
      new Vector3(w - roomWidth, 0, roomZ + roomDepth / 2),
      new Vector3(w - roomWidth, 0, this.config.depth / 2),
      wallHeight
    );
    erWestWall2.parent = this.root;

    // South wall of evidence room
    const erSouthWall = this.voxelBuilder.createWall(
      'er_south',
      new Vector3(w - roomWidth, 0, this.config.depth / 2),
      new Vector3(w, 0, this.config.depth / 2),
      wallHeight
    );
    erSouthWall.parent = this.root;

    // East wall of evidence room
    const erEastWall = this.voxelBuilder.createWall(
      'er_east',
      new Vector3(w, 0, roomZ - roomDepth / 2),
      new Vector3(w, 0, this.config.depth / 2),
      wallHeight
    );
    erEastWall.parent = this.root;

    // North wall of evidence room
    const erNorthWall = this.voxelBuilder.createWall(
      'er_north',
      new Vector3(w - roomWidth, 0, roomZ - roomDepth / 2),
      new Vector3(w, 0, roomZ - roomDepth / 2),
      wallHeight
    );
    erNorthWall.parent = this.root;

    // Create locked door
    this.evidenceDoor = new LockedDoor({
      id: 'evidence_door',
      scene: this.scene,
      position: doorPos,
      rotation: Math.PI / 2, // Facing into main lab
      unlockCode: this.config.evidenceRoomCode,
      requiredCorrect: this.config.requiredCorrectForUnlock,
    });
    this.interactionManager.registerObject(this.evidenceDoor);

    // Evidence room contents - safe/locker
    const safeMat = this.voxelBuilder.getMaterial('metal');
    // We could add a safe mesh here for visual interest
  }

  /**
   * Setup additional lighting for the lab
   */
  private setupLighting(): void {
    // Main lab ambient boost
    const labAmbient = new HemisphericLight(
      'labAmbient',
      new Vector3(0, 1, 0),
      this.scene
    );
    labAmbient.intensity = 0.3;
    labAmbient.diffuse = new Color3(0.8, 0.85, 1);
    labAmbient.groundColor = new Color3(0.1, 0.15, 0.2);

    // Accent lights near workbenches
    const accentPositions = [
      new Vector3(-8, 3, 5),
      new Vector3(0, 3, 5),
      new Vector3(8, 3, 5),
    ];

    accentPositions.forEach((pos, i) => {
      const light = new PointLight(`accent_${i}`, pos, this.scene);
      light.intensity = 0.3;
      light.diffuse = new Color3(0, 0.8, 1);
      light.range = 8;
    });

    // Evidence room red accent (when locked)
    const erLight = new PointLight(
      'er_accent',
      new Vector3(this.config.width / 2 - 5, 3, this.config.depth / 2 - 5),
      this.scene
    );
    erLight.intensity = 0.2;
    erLight.diffuse = new Color3(1, 0.2, 0.3);
    erLight.range = 10;
  }

  /**
   * Spawn interactive terminal objects based on questions
   */
  public spawnTerminalsForQuestions(questions: Question[]): void {
    // Filter for terminal-appropriate questions
    const terminalQuestions = questions.filter(
      (q) => q.type === 'terminal_command' || q.type === 'multiple_choice'
    );

    // Spawn up to available positions
    const count = Math.min(terminalQuestions.length, this.terminalSpawnPositions.length);

    for (let i = 0; i < count; i++) {
      const terminal = new ComputerTerminal({
        id: `terminal_${i}`,
        scene: this.scene,
        position: this.terminalSpawnPositions[i],
        rotation: 0,
      });

      terminal.bindQuestion(terminalQuestions[i]);
      terminal.setScreenText(`> CHALLENGE ${i + 1}\n> TYPE: ${terminalQuestions[i].type.toUpperCase()}\n\nPress E to begin`);

      this.terminals.push(terminal);
      this.interactionManager.registerObject(terminal);
    }
  }

  /**
   * Get all terminals
   */
  public getTerminals(): ComputerTerminal[] {
    return this.terminals;
  }

  /**
   * Get the evidence door
   */
  public getEvidenceDoor(): LockedDoor | null {
    return this.evidenceDoor;
  }

  /**
   * Check and unlock evidence room if enough correct answers
   */
  public checkUnlock(correctCount: number): boolean {
    if (this.evidenceDoor && correctCount >= this.config.requiredCorrectForUnlock) {
      this.evidenceDoor.unlock();
      return true;
    }
    return false;
  }

  /**
   * Get spawn point for players
   */
  public getSpawnPoint(): Vector3 {
    return new Vector3(0, 1, this.config.depth / 2 - 3);
  }

  /**
   * Cleanup
   */
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
