'use client';

import { useEffect, useRef, useState } from 'react';
import { Vector3 } from '@babylonjs/core';
import { GameEngine } from '@/engine/core/Engine';
import { LocalPlayer } from '@/engine/player/LocalPlayer';
import { RemotePlayer, RemotePlayerData } from '@/engine/player/RemotePlayer';
import { AnimationState } from '@/engine/player/VoxelCharacter';

interface GameCanvasProps {
  onReady?: () => void;
  onPlayerMove?: (position: { x: number; y: number; z: number }, rotation: number, animState: string) => void;
  remotePlayers?: RemotePlayerData[];
}

export function GameCanvas({ onReady, onPlayerMove, remotePlayers = [] }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const localPlayerRef = useRef<LocalPlayer | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Create local player
      const engine = engineRef.current;
      localPlayerRef.current = new LocalPlayer({
        scene: engine.getScene(),
        camera: engine.getCamera(),
        startPosition: new Vector3(0, 1, 0),
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
      localPlayerRef.current?.dispose();
      engineRef.current?.dispose();
      remotePlayersRef.current.forEach((player) => player.dispose());
      remotePlayersRef.current.clear();
    };
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

      {/* Controls hint */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 left-4 text-sm text-muted-foreground bg-cyber-dark/80 rounded-lg px-3 py-2 z-10">
          <p><span className="text-cyber-blue">WASD</span> - Move</p>
          <p><span className="text-cyber-blue">ARROWS</span> - Look around</p>
          <p><span className="text-cyber-blue">SHIFT</span> - Run</p>
          <p><span className="text-cyber-blue">SPACE</span> - Jump</p>
          <p><span className="text-cyber-blue">SCROLL</span> - Zoom</p>
        </div>
      )}
    </div>
  );
}
