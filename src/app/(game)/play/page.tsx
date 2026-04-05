'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RemotePlayerData } from '@/engine/player/RemotePlayer';
import { Suspense } from 'react';

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

function GameContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerData[]>([]);
  const [playerCount, setPlayerCount] = useState(1);

  const supabaseRef = useRef(createClient());
  const lastUpdateRef = useRef(0);
  const positionChannelRef = useRef<any>(null);
  const nicknameRef = useRef<string>('Player');

  // Get current user and set up realtime
  useEffect(() => {
    const supabase = supabaseRef.current;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Get user's nickname
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single() as { data: any };

      const nickname = profile?.display_name || profile?.username || 'Player';
      nicknameRef.current = nickname;

      // Create a presence channel for player positions
      const channel = supabase.channel(`game-${sessionId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      const syncPresence = () => {
        const state = channel.presenceState();
        const players: RemotePlayerData[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence && presence.user_id !== user.id) {
            players.push({
              id: presence.user_id,
              nickname: presence.nickname || 'Player',
              position: presence.position || { x: 0, y: 1, z: 0 },
              rotation: presence.rotation || 0,
            });
          }
        });

        setRemotePlayers(players);
        setPlayerCount(Object.keys(state).length);
      };

      channel
        .on('presence', { event: 'sync' }, syncPresence)
        .on('presence', { event: 'join' }, syncPresence)
        .on('presence', { event: 'leave' }, syncPresence)
        .on('broadcast', { event: 'move' }, ({ payload }) => {
          // Update remote player position from broadcast
          if (payload.user_id !== user.id) {
            setRemotePlayers(prev => {
              const existing = prev.find(p => p.id === payload.user_id);
              if (existing) {
                return prev.map(p =>
                  p.id === payload.user_id
                    ? { ...p, position: payload.position, rotation: payload.rotation }
                    : p
                );
              } else {
                return [...prev, {
                  id: payload.user_id,
                  nickname: payload.nickname || 'Player',
                  position: payload.position,
                  rotation: payload.rotation,
                }];
              }
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track our presence with initial position
            await channel.track({
              user_id: user.id,
              nickname: nickname,
              position: { x: 0, y: 1, z: 0 },
              rotation: 0,
              online_at: new Date().toISOString(),
            });
          }
        });

      positionChannelRef.current = channel;
    };

    if (sessionId) {
      setup();
    }

    return () => {
      if (positionChannelRef.current) {
        supabaseRef.current.removeChannel(positionChannelRef.current);
      }
    };
  }, [sessionId]);

  // Handle player movement - throttled to ~10 updates per second
  const handlePlayerMove = useCallback((position: { x: number; y: number; z: number }, rotation: number) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return; // Throttle to 10 updates/sec
    lastUpdateRef.current = now;

    if (positionChannelRef.current && userId) {
      // Broadcast movement to all other players
      positionChannelRef.current.send({
        type: 'broadcast',
        event: 'move',
        payload: {
          user_id: userId,
          nickname: nicknameRef.current,
          position,
          rotation,
        },
      });
    }
  }, [userId]);

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
              <span className="text-sm">Players: {playerCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas
        onReady={() => setIsReady(true)}
        onPlayerMove={handlePlayerMove}
        remotePlayers={remotePlayers}
      />
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎮</div>
          <p className="text-cyber-blue cyber-glow">Loading...</p>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
