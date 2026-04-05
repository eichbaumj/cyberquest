'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function JoinGamePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (joinCode.length !== 6) {
      setError('Game code must be 6 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/join?code=${joinCode}`);
      return;
    }

    // Look up the game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, status, settings')
      .eq('join_code', joinCode.toUpperCase())
      .single();

    if (sessionError || !session) {
      setError('Game not found. Please check the code and try again.');
      setLoading(false);
      return;
    }

    const sessionData = session as { id: string; status: string; settings: { allow_late_join?: boolean } | null };

    if (sessionData.status === 'finished') {
      setError('This game has already ended.');
      setLoading(false);
      return;
    }

    if (sessionData.status === 'active' && !sessionData.settings?.allow_late_join) {
      setError('This game is in progress and does not allow late joining.');
      setLoading(false);
      return;
    }

    // Get user profile for nickname
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single();

    // Check if already in game
    const { data: existingPlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('session_id', sessionData.id)
      .eq('user_id', user.id)
      .single();

    if (!existingPlayer) {
      // Join the game
      const { error: joinError } = await supabase
        .from('game_players')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          nickname: profile?.display_name || profile?.username || 'Player',
          avatar_seed: Math.random().toString(36).substring(7),
        });

      if (joinError) {
        setError('Failed to join game. Please try again.');
        setLoading(false);
        return;
      }
    }

    // Redirect to lobby
    router.push(`/lobby/${joinCode.toUpperCase()}`);
  };

  return (
    <main className="min-h-screen bg-cyber-darker flex items-center justify-center p-8">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-cyber-blue cyber-glow">CYBERQUEST</h1>
          </Link>
          <p className="text-muted-foreground mt-2">Join a game session</p>
        </div>

        {/* Join form */}
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-6">
            {error && (
              <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-foreground">
                Game Code
              </label>
              <input
                id="code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-6 py-4 bg-cyber-darker border border-border rounded-lg text-center font-mono text-3xl uppercase tracking-[0.5em] focus:border-cyber-green focus:outline-none focus:ring-1 focus:ring-cyber-green transition-colors"
                placeholder="ABC123"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-character code from your instructor
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || joinCode.length !== 6}
              className="w-full py-3 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </form>

        {/* Help text */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Don&apos;t have a code? Ask your instructor to start a game session.
          </p>
          <Link href="/dashboard" className="text-cyber-blue hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
