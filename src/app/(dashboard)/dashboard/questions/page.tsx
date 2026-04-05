import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function QuestionsPage() {
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

  // Get question banks
  const { data: banks } = await supabase
    .from('question_banks')
    .select(`
      *,
      questions:questions(count)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Question Banks</h1>
          <p className="text-muted-foreground">
            Manage your questions for game sessions
          </p>
        </div>
        <Link
          href="/dashboard/questions/new"
          className="px-4 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20 transition-all"
        >
          + New Question Bank
        </Link>
      </div>

      {/* Question banks grid */}
      {banks && banks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank: any) => (
            <Link
              key={bank.id}
              href={`/dashboard/questions/${bank.id}`}
              className="block p-6 bg-cyber-dark/50 border border-border rounded-lg hover:border-cyber-blue/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    bank.category === 'dfir'
                      ? 'bg-cyber-blue/10 text-cyber-blue'
                      : bank.category === 'malware'
                      ? 'bg-cyber-red/10 text-cyber-red'
                      : bank.category === 'forensics'
                      ? 'bg-cyber-purple/10 text-cyber-purple'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {bank.category || 'General'}
                </div>
                {bank.is_public && (
                  <span className="text-xs text-muted-foreground">Public</span>
                )}
              </div>

              <h3 className="font-semibold text-lg mb-2 group-hover:text-cyber-blue transition-colors">
                {bank.title}
              </h3>

              {bank.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {bank.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bank.questions?.[0]?.count || 0} questions
                </span>
                <span className="text-muted-foreground">
                  {new Date(bank.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-cyber-dark/50 border border-border rounded-lg">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No Question Banks Yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first question bank to start building challenges for your students.
          </p>
          <Link
            href="/dashboard/questions/new"
            className="inline-flex items-center px-4 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20"
          >
            + Create Question Bank
          </Link>
        </div>
      )}
    </div>
  );
}
