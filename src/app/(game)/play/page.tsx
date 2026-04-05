'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamic import to avoid SSR issues with Babylon.js
const GameCanvas = dynamic(
  () => import('@/components/game/GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎮</div>
          <p className="text-cyber-blue cyber-glow">Initializing CyberQuest...</p>
        </div>
      </div>
    ),
  }
);

export default function PlayPage() {
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="w-full h-screen bg-cyber-darker">
      {/* HUD Overlay */}
      <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex justify-between items-start p-4">
          {/* Score/Timer */}
          <div className="pointer-events-auto bg-cyber-dark/80 backdrop-blur-sm border border-border rounded-lg p-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-xl font-bold text-cyber-green">0</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-xl font-bold text-cyber-yellow">0</p>
              </div>
            </div>
          </div>

          {/* Game status */}
          <div className="pointer-events-auto bg-cyber-dark/80 backdrop-blur-sm border border-border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-sm">Practice Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas
        onReady={() => setIsReady(true)}
        onPlayerMove={(position, rotation) => {
          // Will be connected to PartyKit for multiplayer
          console.log('Player moved:', position, rotation);
        }}
      />

      {/* Pause menu would go here */}
    </div>
  );
}
