'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface QuestionBank {
  id: string;
  title: string;
  category: string;
  questions: { count: number }[];
}

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    questionBankId: '',
    gameMode: 'race' as 'race' | 'practice',
    maxPlayers: 15,
    questionCount: 10,
    timePerQuestion: 30,
    showAnswersAfter: true,
    randomizeQuestions: true,
    streakBonusEnabled: true,
    timeBonusEnabled: true,
  });

  // Load question banks
  useEffect(() => {
    async function loadBanks() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('question_banks')
        .select('id, title, category, questions(count)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      setQuestionBanks(data || []);
      setLoadingBanks(false);
    }

    loadBanks();
  }, [router]);

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.questionBankId) {
      setError('Please select a question bank');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;

    // Check for collision (rare but possible)
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('join_code', joinCode)
        .single();

      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    // Create the session
    const { data, error: insertError } = await supabase
      .from('game_sessions')
      .insert({
        host_id: user.id,
        question_bank_id: formData.questionBankId,
        title: formData.title || 'Game Session',
        join_code: joinCode,
        status: 'lobby',
        game_mode: formData.gameMode,
        settings: {
          max_players: formData.maxPlayers,
          question_count: formData.questionCount,
          time_per_question: formData.timePerQuestion,
          show_answers_after: formData.showAnswersAfter,
          randomize_questions: formData.randomizeQuestions,
          randomize_options: true,
          allow_late_join: false,
          streak_bonus_enabled: formData.streakBonusEnabled,
          time_bonus_enabled: formData.timeBonusEnabled,
        },
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Get user profile for nickname
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single();

    // Add host as a player
    await supabase
      .from('game_players')
      .insert({
        session_id: data.id,
        user_id: user.id,
        nickname: profile?.display_name || profile?.username || 'Host',
        avatar_seed: Math.random().toString(36).substring(7),
      });

    // Redirect to the lobby
    router.push(`/lobby/${data.join_code}`);
  };

  const selectedBank = questionBanks.find(b => b.id === formData.questionBankId);
  const maxQuestions = selectedBank?.questions?.[0]?.count || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/sessions"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Sessions
        </Link>
        <h1 className="text-2xl font-bold">Start New Game</h1>
        <p className="text-muted-foreground">
          Create a game session for your students to join
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
            {error}
          </div>
        )}

        {/* Question Bank Selection */}
        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">Select Question Bank</h2>

          {loadingBanks ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : questionBanks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-2">No question banks found</p>
              <Link href="/dashboard/questions/new" className="text-cyber-blue hover:underline">
                Create your first question bank →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {questionBanks.map((bank) => (
                <label
                  key={bank.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    formData.questionBankId === bank.id
                      ? 'border-cyber-blue bg-cyber-blue/10'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="questionBank"
                    value={bank.id}
                    checked={formData.questionBankId === bank.id}
                    onChange={(e) => setFormData(p => ({ ...p, questionBankId: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{bank.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {bank.questions?.[0]?.count || 0} questions • {bank.category || 'General'}
                    </div>
                  </div>
                  {formData.questionBankId === bank.id && (
                    <span className="text-cyber-blue">✓</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Game Settings */}
        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-6">
          <h2 className="font-semibold">Game Settings</h2>

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Session Title (optional)
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
              placeholder="e.g., DFIR Quiz - Week 3"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Game Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, gameMode: 'race' }))}
                className={`p-4 border rounded-lg text-left transition-all ${
                  formData.gameMode === 'race'
                    ? 'border-cyber-green bg-cyber-green/10'
                    : 'border-border hover:border-muted'
                }`}
              >
                <div className="font-medium">Race Mode</div>
                <div className="text-sm text-muted-foreground">
                  Compete for fastest answers
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, gameMode: 'practice' }))}
                className={`p-4 border rounded-lg text-left transition-all ${
                  formData.gameMode === 'practice'
                    ? 'border-cyber-blue bg-cyber-blue/10'
                    : 'border-border hover:border-muted'
                }`}
              >
                <div className="font-medium">Practice Mode</div>
                <div className="text-sm text-muted-foreground">
                  No timer, self-paced learning
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="questionCount" className="block text-sm font-medium">
                Questions
              </label>
              <input
                id="questionCount"
                type="number"
                min="1"
                max={maxQuestions || 50}
                value={formData.questionCount}
                onChange={(e) => setFormData(p => ({ ...p, questionCount: parseInt(e.target.value) || 10 }))}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
              />
              {maxQuestions > 0 && (
                <p className="text-xs text-muted-foreground">Max: {maxQuestions}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="timePerQuestion" className="block text-sm font-medium">
                Time per Question (sec)
              </label>
              <input
                id="timePerQuestion"
                type="number"
                min="10"
                max="120"
                value={formData.timePerQuestion}
                onChange={(e) => setFormData(p => ({ ...p, timePerQuestion: parseInt(e.target.value) || 30 }))}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                disabled={formData.gameMode === 'practice'}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.randomizeQuestions}
                onChange={(e) => setFormData(p => ({ ...p, randomizeQuestions: e.target.checked }))}
                className="w-4 h-4 rounded border-border bg-cyber-darker"
              />
              <span className="text-sm">Randomize question order</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.showAnswersAfter}
                onChange={(e) => setFormData(p => ({ ...p, showAnswersAfter: e.target.checked }))}
                className="w-4 h-4 rounded border-border bg-cyber-darker"
              />
              <span className="text-sm">Show correct answers after each question</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.streakBonusEnabled}
                onChange={(e) => setFormData(p => ({ ...p, streakBonusEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-border bg-cyber-darker"
              />
              <span className="text-sm">Enable streak bonus (consecutive correct answers)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.timeBonusEnabled}
                onChange={(e) => setFormData(p => ({ ...p, timeBonusEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-border bg-cyber-darker"
              />
              <span className="text-sm">Enable time bonus (faster answers = more points)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/dashboard/sessions"
            className="px-6 py-2 bg-cyber-dark border border-border rounded-lg hover:bg-cyber-dark/80"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.questionBankId}
            className="flex-1 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create & Start Lobby'}
          </button>
        </div>
      </form>
    </div>
  );
}
