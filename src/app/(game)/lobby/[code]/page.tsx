'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Player {
  id: string;
  nickname: string;
  isReady: boolean;
  isHost: boolean;
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const joinCode = params.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Load session data and subscribe to realtime updates
  useEffect(() => {
    const supabase = createClient();
    let sessionId: string | null = null;

    const loadSession = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?redirect=/lobby/${joinCode}`);
        return;
      }

      // Get profile for nickname
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single() as { data: any };

      if (profile) {
        setNickname(profile.display_name || profile.username);
      }

      // Get session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(`
          *,
          host:profiles!game_sessions_host_id_fkey(username, display_name)
        `)
        .eq('join_code', joinCode.toUpperCase())
        .single() as { data: any; error: any };

      if (sessionError || !sessionData) {
        setError('Game session not found');
        setLoading(false);
        return;
      }

      sessionId = sessionData.id;
      setSession(sessionData);
      setIsHost(sessionData.host_id === user.id);

      // Get current players
      const { data: playersData } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', sessionData.id) as { data: any[] | null };

      if (playersData) {
        setPlayers(
          playersData.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            isReady: true,
            isHost: p.user_id === sessionData.host_id,
          }))
        );

        // Check if user already joined
        const alreadyJoined = playersData.some((p) => p.user_id === user.id);
        setHasJoined(alreadyJoined);
      }

      setLoading(false);

      // Subscribe to player changes
      const playersChannel = supabase
        .channel(`lobby-${sessionData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_players',
            filter: `session_id=eq.${sessionData.id}`,
          },
          (payload) => {
            const newPlayer = payload.new as any;
            setPlayers((prev) => {
              // Don't add duplicates
              if (prev.some((p) => p.id === newPlayer.id)) return prev;
              return [
                ...prev,
                {
                  id: newPlayer.id,
                  nickname: newPlayer.nickname,
                  isReady: true,
                  isHost: newPlayer.user_id === sessionData.host_id,
                },
              ];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'game_players',
            filter: `session_id=eq.${sessionData.id}`,
          },
          (payload) => {
            const deletedPlayer = payload.old as any;
            setPlayers((prev) => prev.filter((p) => p.id !== deletedPlayer.id));
          }
        )
        .subscribe();

      // Subscribe to session status changes (for when host starts game)
      const sessionChannel = supabase
        .channel(`session-${sessionData.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${sessionData.id}`,
          },
          (payload) => {
            const updatedSession = payload.new as any;
            setSession((prev: any) => ({ ...prev, ...updatedSession }));

            // If game started, redirect all players to game
            if (updatedSession.status === 'starting' || updatedSession.status === 'active') {
              router.push(`/play?session=${sessionData.id}`);
            }
          }
        )
        .subscribe();

      // Cleanup function
      return () => {
        supabase.removeChannel(playersChannel);
        supabase.removeChannel(sessionChannel);
      };
    };

    loadSession();
  }, [joinCode, router]);

  const handleJoinSession = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !session) return;

    const { error } = await supabase
      .from('game_players')
      .insert({
        session_id: session.id,
        user_id: user.id,
        nickname: nickname,
      } as any);

    if (error) {
      setError('Failed to join game');
      return;
    }

    setHasJoined(true);
    setPlayers((prev) => [
      ...prev,
      { id: user.id, nickname, isReady: true, isHost: false },
    ]);
  };

  const handleStartGame = async () => {
    if (!isHost || !session) return;

    const supabase = createClient();

    // Update session status
    await supabase
      .from('game_sessions')
      .update({ status: 'starting', started_at: new Date().toISOString() } as any)
      .eq('id', session.id);

    // Redirect to game
    router.push(`/play?session=${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-darker flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎮</div>
          <p className="text-cyber-blue cyber-glow">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-darker flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-cyber-red">{error}</p>
          <Link href="/dashboard" className="text-cyber-blue hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cyber-darker p-8">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cyber-blue cyber-glow">
            {session?.title || 'Game Lobby'}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="px-4 py-2 bg-cyber-dark border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Game Code</p>
              <p className="text-2xl font-mono font-bold text-cyber-green tracking-widest">
                {joinCode}
              </p>
            </div>
            <div className="px-4 py-2 bg-cyber-dark border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Host</p>
              <p className="font-medium">
                {session?.host?.display_name || session?.host?.username}
              </p>
            </div>
          </div>
        </div>

        {/* Join section (if not joined yet) */}
        {!hasJoined && (
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Join the Game</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                className="flex-1 px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
              />
              <button
                onClick={handleJoinSession}
                disabled={!nickname.trim()}
                className="px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        )}

        {/* Players list */}
        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Players ({players.length}/{session?.settings?.max_players || 15})
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
              Waiting for players...
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border ${
                  player.isHost
                    ? 'bg-cyber-purple/10 border-cyber-purple'
                    : 'bg-cyber-dark border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      player.isHost ? 'bg-cyber-purple/20' : 'bg-cyber-blue/20'
                    }`}
                  >
                    {player.isHost ? '👑' : '🎮'}
                  </div>
                  <div>
                    <p className="font-medium truncate">{player.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.isHost ? 'Host' : 'Ready'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-4 rounded-lg border border-dashed border-border/50 flex items-center justify-center"
              >
                <span className="text-muted-foreground text-sm">Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game settings (visible to host) */}
        {isHost && (
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Game Settings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Questions</p>
                <p className="font-medium">{session?.settings?.question_count || 10}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Time per Question</p>
                <p className="font-medium">{session?.settings?.time_per_question || 30}s</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mode</p>
                <p className="font-medium capitalize">{session?.game_mode || 'Race'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Late Join</p>
                <p className="font-medium">
                  {session?.settings?.allow_late_join ? 'Allowed' : 'Not Allowed'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-cyber-dark border border-border text-foreground font-semibold rounded-lg hover:bg-cyber-dark/80"
          >
            Leave Lobby
          </Link>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="px-8 py-3 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Start Game
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
