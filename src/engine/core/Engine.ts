import {
  Engine as BabylonEngine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  DirectionalLight,
  ShadowGenerator,
  PointerEventTypes,
  Texture,
  CubeTexture,
  GlowLayer,
  Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders';

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export class GameEngine {
  private engine: BabylonEngine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private shadowGenerator: ShadowGenerator | null = null;
  private glowLayer: GlowLayer | null = null;
  private defaultGround: Mesh | null = null;
  private isRunning: boolean = false;

  constructor(private options: GameEngineOptions) {
    // Create Babylon.js engine
    this.engine = new BabylonEngine(options.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.039, 0.055, 0.090, 1); // cyber-darker

    // Create camera
    this.camera = this.createCamera();

    // Setup lighting
    this.setupLighting();

    // Create sky dome
    this.createSkyDome();

    // Create ground
    this.createGround();

    // Create glow layer for interactive objects
    this.setupGlowLayer();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Notify ready
    this.options.onReady?.();
  }

  private createCamera(): ArcRotateCamera {
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 2,  // Alpha (horizontal rotation)
      Math.PI / 3,  // Beta (vertical angle)
      6,            // Radius (distance from target) - closer to player
      new Vector3(0, 1, 0), // Target position
      this.scene
    );

    // Camera controls - attach with mouse buttons disabled for rotation
    camera.attachControl(this.options.canvas, true);

    // Disable default mouse rotation (we handle it with pointer lock)
    camera.inputs.removeByType('ArcRotateCameraPointersInput');

    // Re-add with much lower sensitivity for smooth control
    camera.inputs.addMouseWheel();

    // Camera limits - keep camera closer and prevent looking straight down
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 12;
    camera.lowerBetaLimit = 0.3;  // Prevent looking too high (would see ceiling lights)
    camera.upperBetaLimit = Math.PI / 2.5;  // Prevent looking straight down
    camera.wheelPrecision = 50;
    camera.panningSensibility = 0; // Disable panning

    // Reduce angular sensitivity for smoother rotation
    camera.angularSensibilityX = 2000; // Higher = slower (default is 1000)
    camera.angularSensibilityY = 2000;

    return camera;
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.4;
    ambientLight.diffuse = new Color3(0.6, 0.7, 0.8);
    ambientLight.groundColor = new Color3(0.1, 0.15, 0.2);

    // Main directional light (sun)
    const sunLight = new DirectionalLight(
      'sunLight',
      new Vector3(-1, -2, -1),
      this.scene
    );
    sunLight.position = new Vector3(20, 40, 20);
    sunLight.intensity = 0.8;
    sunLight.diffuse = new Color3(1, 0.95, 0.9);

    // Shadow generator
    this.shadowGenerator = new ShadowGenerator(1024, sunLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    // Cyber accent lights
    const cyanLight = new HemisphericLight(
      'cyanLight',
      new Vector3(-1, 0.5, 0),
      this.scene
    );
    cyanLight.intensity = 0.15;
    cyanLight.diffuse = new Color3(0, 0.94, 1); // cyber-blue
    cyanLight.groundColor = new Color3(0, 0.3, 0.35);
  }

  private createSkyDome(): void {
    // Create a gradient sky dome
    const skyDome = MeshBuilder.CreateSphere(
      'skyDome',
      { diameter: 200, segments: 32 },
      this.scene
    );

    // Sky material with gradient effect
    const skyMat = new StandardMaterial('skyMat', this.scene);
    skyMat.backFaceCulling = false; // Render inside of sphere
    skyMat.disableLighting = true;

    // Dark cyber sky gradient (top to bottom: dark blue to dark purple)
    skyMat.emissiveColor = new Color3(0.02, 0.03, 0.08);

    skyDome.material = skyMat;
    skyDome.infiniteDistance = true; // Sky stays at infinite distance

    // Add some "stars" (small glowing spheres scattered around)
    for (let i = 0; i < 100; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // Upper hemisphere only
      const radius = 95;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) + 10; // Offset up
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const star = MeshBuilder.CreateSphere(
        `star_${i}`,
        { diameter: 0.2 + Math.random() * 0.3 },
        this.scene
      );
      star.position = new Vector3(x, y, z);

      const starMat = new StandardMaterial(`starMat_${i}`, this.scene);
      starMat.disableLighting = true;

      // Random cyber colors for stars
      const colors = [
        new Color3(0, 0.94, 1),    // cyber-blue
        new Color3(0, 1, 0.53),    // cyber-green
        new Color3(0.74, 0.31, 1), // cyber-purple
        new Color3(1, 1, 1),       // white
      ];
      starMat.emissiveColor = colors[Math.floor(Math.random() * colors.length)];
      star.material = starMat;
      star.infiniteDistance = true;
    }
  }

  private createGround(): void {
    // Create ground plane
    this.defaultGround = MeshBuilder.CreateGround(
      'ground',
      { width: 50, height: 50, subdivisions: 50 },
      this.scene
    );

    // Ground material with grid pattern
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.05, 0.08, 0.12);
    groundMat.specularColor = new Color3(0.1, 0.1, 0.1);
    this.defaultGround.material = groundMat;
    this.defaultGround.receiveShadows = true;

    // Create grid lines
    this.createGridLines();
  }

  private setupGlowLayer(): void {
    this.glowLayer = new GlowLayer('glowLayer', this.scene);
    this.glowLayer.intensity = 0.8;
    this.glowLayer.blurKernelSize = 32;
  }

  private createGridLines(): void {
    const gridSize = 50;
    const gridStep = 2;

    for (let i = -gridSize / 2; i <= gridSize / 2; i += gridStep) {
      // X-axis lines
      const lineX = MeshBuilder.CreateLines(
        `gridLineX_${i}`,
        {
          points: [
            new Vector3(-gridSize / 2, 0.01, i),
            new Vector3(gridSize / 2, 0.01, i),
          ],
        },
        this.scene
      );
      lineX.color = new Color3(0, 0.94, 1); // cyber-blue
      lineX.alpha = 0.1;

      // Z-axis lines
      const lineZ = MeshBuilder.CreateLines(
        `gridLineZ_${i}`,
        {
          points: [
            new Vector3(i, 0.01, -gridSize / 2),
            new Vector3(i, 0.01, gridSize / 2),
          ],
        },
        this.scene
      );
      lineZ.color = new Color3(0, 0.94, 1); // cyber-blue
      lineZ.alpha = 0.1;
    }
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public stop(): void {
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }

  private handleResize = (): void => {
    this.engine.resize();
  };

  public getScene(): Scene {
    return this.scene;
  }

  public getCamera(): ArcRotateCamera {
    return this.camera;
  }

  public getShadowGenerator(): ShadowGenerator | null {
    return this.shadowGenerator;
  }

  public getGlowLayer(): GlowLayer | null {
    return this.glowLayer;
  }

  /**
   * Hide the default ground (when loading a zone with its own floor)
   */
  public hideDefaultGround(): void {
    if (this.defaultGround) {
      this.defaultGround.setEnabled(false);
    }
    // Also hide grid lines
    this.scene.meshes.forEach((mesh) => {
      if (mesh.name.startsWith('gridLine')) {
        mesh.setEnabled(false);
      }
    });
  }

  /**
   * Show the default ground
   */
  public showDefaultGround(): void {
    if (this.defaultGround) {
      this.defaultGround.setEnabled(true);
    }
    this.scene.meshes.forEach((mesh) => {
      if (mesh.name.startsWith('gridLine')) {
        mesh.setEnabled(true);
      }
    });
  }

  public setCameraTarget(target: Vector3): void {
    this.camera.setTarget(target);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.stop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
