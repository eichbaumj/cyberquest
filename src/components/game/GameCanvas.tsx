'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Vector3 } from '@babylonjs/core';
import { GameEngine } from '@/engine/core/Engine';
import { LocalPlayer } from '@/engine/player/LocalPlayer';
import { RemotePlayer, RemotePlayerData } from '@/engine/player/RemotePlayer';
import { AnimationState } from '@/engine/player/VoxelCharacter';
import { DFIRLabZone } from '@/engine/world/zones/DFIRLabZone';
import { InteractionManager } from '@/engine/objects/InteractionManager';
import { InteractiveObject, Question } from '@/engine/objects/InteractiveObject';

interface GameCanvasProps {
  onReady?: () => void;
  onPlayerMove?: (position: { x: number; y: number; z: number }, rotation: number, animState: string) => void;
  remotePlayers?: RemotePlayerData[];
  questions?: Question[];
  onInteraction?: (object: InteractiveObject) => void;
  onCorrectAnswer?: (count: number) => void;
}

export function GameCanvas({
  onReady,
  onPlayerMove,
  remotePlayers = [],
  questions = [],
  onInteraction,
  onCorrectAnswer,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const localPlayerRef = useRef<LocalPlayer | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const zoneRef = useRef<DFIRLabZone | null>(null);
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Create engine
      engineRef.current = new GameEngine({
        canvas: canvasRef.current,
        onReady: () => {
          setIsLoading(false);
          onReady?.();
        },
        onError: (err) => {
          setError(err.message);
          setIsLoading(false);
        },
      });

      const engine = engineRef.current;
      const scene = engine.getScene();

      // Hide default ground - zone will create its own
      engine.hideDefaultGround();

      // Create interaction manager
      interactionManagerRef.current = new InteractionManager(
        scene,
        () => localPlayerRef.current?.getPosition() || Vector3.Zero()
      );

      // Listen for proximity changes to show/hide interaction prompt
      interactionManagerRef.current.onProximityChange.add(({ prompt }) => {
        setInteractionPrompt(prompt);
      });

      // Listen for interactions
      interactionManagerRef.current.onInteraction.add((object) => {
        onInteraction?.(object);
      });

      // Create DFIR Lab zone
      zoneRef.current = new DFIRLabZone(scene, interactionManagerRef.current, {
        requiredCorrectForUnlock: 3,
        evidenceRoomCode: '7734',
      });

      // Get spawn point and bounds from zone
      const spawnPoint = zoneRef.current.getSpawnPoint();
      const zoneBounds = zoneRef.current.getBounds();

      // Create local player at zone spawn point with world bounds from zone
      localPlayerRef.current = new LocalPlayer({
        scene: scene,
        camera: engine.getCamera(),
        startPosition: spawnPoint,
        worldBounds: zoneBounds,
        onMove: (position: Vector3, rotation: number, animState: AnimationState) => {
          onPlayerMove?.(
            { x: position.x, y: position.y, z: position.z },
            rotation,
            animState
          );
        },
      });

      // Add player to shadow generator
      const shadowGen = engine.getShadowGenerator();
      if (shadowGen) {
        shadowGen.addShadowCaster(localPlayerRef.current.getMesh());
      }

      // Start rendering
      engine.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      zoneRef.current?.dispose();
      interactionManagerRef.current?.dispose();
      localPlayerRef.current?.dispose();
      engineRef.current?.dispose();
      remotePlayersRef.current.forEach((player) => player.dispose());
      remotePlayersRef.current.clear();
    };
  }, []);

  // Spawn terminals when questions change
  useEffect(() => {
    if (zoneRef.current && questions.length > 0) {
      zoneRef.current.spawnTerminalsForQuestions(questions);
    }
  }, [questions]);

  // Check unlock when correct count changes
  useEffect(() => {
    if (zoneRef.current && correctCount > 0) {
      const unlocked = zoneRef.current.checkUnlock(correctCount);
      if (unlocked) {
        onCorrectAnswer?.(correctCount);
      }
    }
  }, [correctCount, onCorrectAnswer]);

  // Expose method to mark answer correct (can be called from parent)
  const handleCorrectAnswer = useCallback(() => {
    setCorrectCount((prev) => prev + 1);
  }, []);

  // Sync remote players
  useEffect(() => {
    if (!engineRef.current) return;

    const scene = engineRef.current.getScene();
    const currentIds = new Set(remotePlayers.map((p) => p.id));

    // Remove players that are no longer in the list
    remotePlayersRef.current.forEach((player, id) => {
      if (!currentIds.has(id)) {
        player.dispose();
        remotePlayersRef.current.delete(id);
      }
    });

    // Add or update players
    remotePlayers.forEach((playerData) => {
      const existingPlayer = remotePlayersRef.current.get(playerData.id);

      if (existingPlayer) {
        // Update existing player with animation state
        existingPlayer.updateState(playerData.position, playerData.rotation, playerData.animState);
      } else {
        // Create new player
        const newPlayer = new RemotePlayer(scene, playerData);
        remotePlayersRef.current.set(playerData.id, newPlayer);
      }
    });
  }, [remotePlayers]);

  return (
    <div className="game-canvas-container relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-darker z-20">
          <div className="text-center space-y-4">
            <div className="text-4xl animate-pulse">🎮</div>
            <p className="text-cyber-blue cyber-glow">Loading game...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyber-darker z-20">
          <div className="text-center space-y-4 p-8">
            <div className="text-4xl">⚠️</div>
            <p className="text-cyber-red">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue rounded-lg hover:bg-cyber-blue/20"
            >
              Reload
            </button>
          </div>
        </div>
      )}

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full focus:outline-none"
        tabIndex={0}
      />

      {/* Interaction prompt */}
      {!isLoading && !error && interactionPrompt && (
        <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-cyber-dark/90 border border-cyber-blue rounded-lg px-4 py-2 text-center">
            <p className="text-cyber-blue cyber-glow text-lg">{interactionPrompt}</p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 left-4 text-sm text-muted-foreground bg-cyber-dark/80 rounded-lg px-3 py-2 z-10">
          <p><span className="text-cyber-blue">WASD</span> - Move</p>
          <p><span className="text-cyber-blue">ARROWS</span> - Look around</p>
          <p><span className="text-cyber-blue">SHIFT</span> - Run</p>
          <p><span className="text-cyber-blue">SPACE</span> - Jump</p>
          <p><span className="text-cyber-blue">SCROLL</span> - Zoom</p>
          <p><span className="text-cyber-blue">E</span> - Interact</p>
        </div>
      )}
    </div>
  );
}
