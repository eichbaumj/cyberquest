import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function SessionsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if instructor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: any };

  if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Get game sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select(`
      *,
      question_bank:question_banks(id, title),
      players:game_players(count)
    `)
    .eq('host_id', user.id)
    .order('created_at', { ascending: false }) as { data: any[] | null };

  const activeSessions = sessions?.filter(s => s.status === 'lobby' || s.status === 'active') || [];
  const pastSessions = sessions?.filter(s => s.status === 'finished') || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Game Sessions</h1>
          <p className="text-muted-foreground">
            Create and manage game sessions for your students
          </p>
        </div>
        <Link
          href="/dashboard/sessions/new"
          className="px-4 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20 transition-all"
        >
          + New Game Session
        </Link>
      </div>

      {/* Active Sessions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-cyber-green rounded-full animate-pulse"></span>
          Active Sessions
        </h2>
        {activeSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSessions.map((session: any) => (
              <SessionCard key={session.id} session={session} isActive />
            ))}
          </div>
        ) : (
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">No active sessions</p>
            <Link
              href="/dashboard/sessions/new"
              className="text-cyber-green hover:underline mt-2 inline-block"
            >
              Start a new game →
            </Link>
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Past Sessions</h2>
        {pastSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastSessions.map((session: any) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">No past sessions</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    join_code: string;
    status: string;
    game_mode: string;
    question_bank?: { id: string; title: string } | null;
    players?: { count: number }[];
    created_at: string;
    started_at?: string;
    finished_at?: string;
  };
  isActive?: boolean;
}

function SessionCard({ session, isActive }: SessionCardProps) {
  const playerCount = session.players?.[0]?.count || 0;

  const statusColors: Record<string, string> = {
    lobby: 'bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/30',
    active: 'bg-cyber-green/10 text-cyber-green border-cyber-green/30',
    paused: 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/30',
    finished: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Link
      href={isActive ? `/lobby/${session.join_code}` : `/dashboard/sessions/${session.id}`}
      className={`block p-6 bg-cyber-dark/50 border rounded-lg hover:border-cyber-blue/50 transition-colors ${
        isActive ? 'border-cyber-green/30' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColors[session.status]}`}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </span>
        {isActive && (
          <span className="font-mono text-lg text-cyber-green">{session.join_code}</span>
        )}
      </div>

      <h3 className="font-semibold text-lg mb-2">{session.title}</h3>

      {session.question_bank && (
        <p className="text-sm text-muted-foreground mb-3">
          {session.question_bank.title}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{playerCount} players</span>
        <span>{new Date(session.created_at).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
