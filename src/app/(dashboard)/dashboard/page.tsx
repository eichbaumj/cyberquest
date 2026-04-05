import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single() as { data: any };

  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', user!.id)
    .single() as { data: any };

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, <span className="text-cyber-blue">{profile?.display_name || profile?.username}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {isInstructor
            ? 'Manage your courses and game sessions'
            : 'Ready to continue your training?'}
        </p>
      </div>

      {isInstructor ? (
        <InstructorDashboard />
      ) : (
        <StudentDashboard profile={profile!} stats={stats} />
      )}
    </div>
  );
}

function InstructorDashboard() {
  return (
    <div className="space-y-8">
      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          href="/dashboard/sessions/new"
          icon="🎮"
          title="Start Game"
          description="Launch a new game session"
          color="green"
        />
        <QuickActionCard
          href="/dashboard/questions/new"
          icon="❓"
          title="Add Questions"
          description="Create new questions"
          color="blue"
        />
        <QuickActionCard
          href="/dashboard/courses"
          icon="📚"
          title="Manage Courses"
          description="View and edit courses"
          color="purple"
        />
        <QuickActionCard
          href="/dashboard/analytics"
          icon="📊"
          title="View Analytics"
          description="Student performance data"
          color="yellow"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Game Sessions</h2>
          <div className="text-muted-foreground text-center py-8">
            <p>No recent sessions</p>
            <Link href="/dashboard/sessions/new" className="text-cyber-green hover:underline mt-2 inline-block">
              Start your first game →
            </Link>
          </div>
        </div>

        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Question Banks</h2>
          <div className="text-muted-foreground text-center py-8">
            <p>No question banks yet</p>
            <Link href="/dashboard/questions/new" className="text-cyber-blue hover:underline mt-2 inline-block">
              Create your first bank →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StudentDashboardProps {
  profile: {
    username: string;
    display_name: string | null;
    total_xp: number;
    level: number;
  };
  stats: {
    games_played: number;
    games_won: number;
    total_correct: number;
    total_questions: number;
    best_streak: number;
  } | null;
}

function StudentDashboard({ profile, stats }: StudentDashboardProps) {
  const accuracy = stats && stats.total_questions > 0
    ? Math.round((stats.total_correct / stats.total_questions) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon="⚡"
          label="Total XP"
          value={profile.total_xp.toLocaleString()}
          color="yellow"
        />
        <StatCard
          icon="🎮"
          label="Games Played"
          value={stats?.games_played || 0}
          color="blue"
        />
        <StatCard
          icon="🎯"
          label="Accuracy"
          value={`${accuracy}%`}
          color="green"
        />
        <StatCard
          icon="🔥"
          label="Best Streak"
          value={stats?.best_streak || 0}
          color="red"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionCard
          href="/join"
          icon="🎮"
          title="Join Game"
          description="Enter a game code to join"
          color="green"
        />
        <QuickActionCard
          href="/dashboard/progress"
          icon="📊"
          title="View Progress"
          description="Track your learning journey"
          color="blue"
        />
        <QuickActionCard
          href="/dashboard/leaderboard"
          icon="🏆"
          title="Leaderboard"
          description="See how you rank"
          color="purple"
        />
      </div>

      {/* Recent activity */}
      <div className="bg-cyber-dark/50 border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Games</h2>
        <div className="text-muted-foreground text-center py-8">
          <p>No games played yet</p>
          <p className="text-sm mt-2">Ask your instructor for a game code to get started!</p>
        </div>
      </div>
    </div>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
}

function QuickActionCard({ href, icon, title, description, color }: QuickActionCardProps) {
  const colorClasses = {
    green: 'border-cyber-green/30 hover:border-cyber-green hover:bg-cyber-green/10',
    blue: 'border-cyber-blue/30 hover:border-cyber-blue hover:bg-cyber-blue/10',
    purple: 'border-cyber-purple/30 hover:border-cyber-purple hover:bg-cyber-purple/10',
    yellow: 'border-cyber-yellow/30 hover:border-cyber-yellow hover:bg-cyber-yellow/10',
    red: 'border-cyber-red/30 hover:border-cyber-red hover:bg-cyber-red/10',
  };

  return (
    <Link
      href={href}
      className={`block p-6 bg-cyber-dark/50 border rounded-lg transition-all ${colorClasses[color]}`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    green: 'text-cyber-green',
    blue: 'text-cyber-blue',
    purple: 'text-cyber-purple',
    yellow: 'text-cyber-yellow',
    red: 'text-cyber-red',
  };

  return (
    <div className="bg-cyber-dark/50 border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        <span>{icon}</span>
        {label}
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
    </div>
  );
}
