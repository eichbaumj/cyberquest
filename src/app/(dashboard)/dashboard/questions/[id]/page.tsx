'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'terminal_command';
  content: { text: string; scenario?: string; instruction?: string };
  options?: { id: string; text: string }[];
  correct_answer: any;
  difficulty: number;
  points: number;
  time_limit_seconds: number;
}

interface QuestionBank {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params.id as string;

  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  useEffect(() => {
    loadData();
  }, [bankId]);

  const loadData = async () => {
    const supabase = createClient();

    // Load bank
    const { data: bankData } = await supabase
      .from('question_banks')
      .select('*')
      .eq('id', bankId)
      .single();

    if (bankData) {
      setBank(bankData);
    }

    // Load questions
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (questionsData) {
      setQuestions(questionsData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Question bank not found</p>
        <Link href="/dashboard/questions" className="text-cyber-blue hover:underline mt-4 inline-block">
          ← Back to Question Banks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/questions"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Question Banks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{bank.title}</h1>
              {bank.category && (
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  bank.category === 'dfir' ? 'bg-cyber-blue/10 text-cyber-blue' :
                  bank.category === 'malware' ? 'bg-cyber-red/10 text-cyber-red' :
                  bank.category === 'forensics' ? 'bg-cyber-purple/10 text-cyber-purple' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {bank.category.toUpperCase()}
                </span>
              )}
            </div>
            {bank.description && (
              <p className="text-muted-foreground">{bank.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowAddQuestion(true)}
            className="px-4 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Questions list */}
      {questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index + 1} onDelete={loadData} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-cyber-dark/50 border border-border rounded-lg">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-semibold mb-2">No Questions Yet</h3>
          <p className="text-muted-foreground mb-6">
            Add questions to this bank to use them in game sessions.
          </p>
          <button
            onClick={() => setShowAddQuestion(true)}
            className="px-4 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20"
          >
            + Add First Question
          </button>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestion && (
        <AddQuestionModal
          bankId={bankId}
          onClose={() => setShowAddQuestion(false)}
          onAdded={() => {
            setShowAddQuestion(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function QuestionCard({ question, index, onDelete }: { question: Question; index: number; onDelete: () => void }) {
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    const supabase = createClient();
    await supabase.from('questions').delete().eq('id', question.id);
    onDelete();
  };

  const typeLabel = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    terminal_command: 'Terminal Command',
  };

  const typeColor = {
    multiple_choice: 'text-cyber-blue',
    true_false: 'text-cyber-yellow',
    terminal_command: 'text-cyber-green',
  };

  return (
    <div className="p-4 bg-cyber-dark/50 border border-border rounded-lg hover:border-cyber-blue/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground">#{index}</span>
            <span className={`text-xs font-medium ${typeColor[question.type]}`}>
              {typeLabel[question.type]}
            </span>
            <span className="text-xs text-muted-foreground">
              {question.points} pts • {question.time_limit_seconds}s
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= question.difficulty ? 'text-cyber-yellow' : 'text-muted'}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <p className="font-medium">{question.content.text}</p>
          {question.content.scenario && (
            <p className="text-sm text-muted-foreground mt-1 italic">
              Scenario: {question.content.scenario}
            </p>
          )}
          {question.type === 'multiple_choice' && question.options && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {question.options.map((opt: any) => (
                <div
                  key={opt.id}
                  className={`text-sm px-2 py-1 rounded ${
                    (Array.isArray(question.correct_answer)
                      ? question.correct_answer.includes(opt.id)
                      : question.correct_answer === opt.id)
                      ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
                      : 'bg-cyber-dark text-muted-foreground'
                  }`}
                >
                  {opt.id.toUpperCase()}. {opt.text}
                </div>
              ))}
            </div>
          )}
          {question.type === 'terminal_command' && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Valid answers:</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer]).map((ans: string, i: number) => (
                  <code key={i} className="px-2 py-1 bg-cyber-dark text-cyber-green text-sm rounded font-mono">
                    {ans}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="text-muted-foreground hover:text-cyber-red transition-colors"
        >
          🗑️
        </button>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="mt-4 p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-lg">
          <p className="text-sm mb-3">Delete this question?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-cyber-red/20 border border-cyber-red text-cyber-red text-sm rounded hover:bg-cyber-red/30"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="px-3 py-1 bg-cyber-dark border border-border text-sm rounded hover:bg-cyber-dark/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddQuestionModal({ bankId, onClose, onAdded }: { bankId: string; onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'multiple_choice' | 'true_false' | 'terminal_command'>('multiple_choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    questionText: '',
    scenario: '',
    instruction: '',
    options: [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
    correctAnswer: 'a',
    correctAnswerBool: true,
    terminalAnswers: '',
    difficulty: 1,
    points: 10,
    timeLimit: 30,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    let content: any = { text: formData.questionText };
    let correctAnswer: any;
    let options: any = null;

    if (type === 'multiple_choice') {
      options = formData.options.filter(o => o.text.trim());
      correctAnswer = formData.correctAnswer;
      if (options.length < 2) {
        setError('Please provide at least 2 options');
        setLoading(false);
        return;
      }
    } else if (type === 'true_false') {
      correctAnswer = formData.correctAnswerBool;
    } else if (type === 'terminal_command') {
      content.scenario = formData.scenario;
      content.instruction = formData.instruction;
      const answers = formData.terminalAnswers.split('\n').map(a => a.trim()).filter(Boolean);
      if (answers.length === 0) {
        setError('Please provide at least one valid answer');
        setLoading(false);
        return;
      }
      correctAnswer = answers;
    }

    const { error: insertError } = await supabase.from('questions').insert({
      bank_id: bankId,
      type,
      content,
      options,
      correct_answer: correctAnswer,
      difficulty: formData.difficulty,
      points: formData.points,
      time_limit_seconds: formData.timeLimit,
    } as any);

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Add Question</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
                {error}
              </div>
            )}

            {/* Question Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Question Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'multiple_choice', label: 'Multiple Choice', icon: '📝' },
                  { value: 'true_false', label: 'True/False', icon: '✓✗' },
                  { value: 'terminal_command', label: 'Terminal', icon: '💻' },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value as any)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      type === t.value
                        ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue'
                        : 'border-border hover:border-muted'
                    }`}
                  >
                    <span className="block text-xl mb-1">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Question</label>
              <textarea
                value={formData.questionText}
                onChange={(e) => setFormData(p => ({ ...p, questionText: e.target.value }))}
                required
                rows={2}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none resize-none"
                placeholder="Enter your question..."
              />
            </div>

            {/* Type-specific fields */}
            {type === 'multiple_choice' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium">Options</label>
                {formData.options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correctAnswer === opt.id}
                      onChange={() => setFormData(p => ({ ...p, correctAnswer: opt.id }))}
                      className="text-cyber-green"
                    />
                    <span className="text-sm font-medium w-6">{opt.id.toUpperCase()}.</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[i].text = e.target.value;
                        setFormData(p => ({ ...p, options: newOptions }));
                      }}
                      className="flex-1 px-3 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                      placeholder={`Option ${opt.id.toUpperCase()}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
              </div>
            )}

            {type === 'true_false' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Correct Answer</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, correctAnswerBool: true }))}
                    className={`flex-1 py-3 rounded-lg border font-medium ${
                      formData.correctAnswerBool
                        ? 'border-cyber-green bg-cyber-green/10 text-cyber-green'
                        : 'border-border'
                    }`}
                  >
                    ✓ True
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, correctAnswerBool: false }))}
                    className={`flex-1 py-3 rounded-lg border font-medium ${
                      !formData.correctAnswerBool
                        ? 'border-cyber-red bg-cyber-red/10 text-cyber-red'
                        : 'border-border'
                    }`}
                  >
                    ✗ False
                  </button>
                </div>
              </div>
            )}

            {type === 'terminal_command' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Scenario (optional)</label>
                  <textarea
                    value={formData.scenario}
                    onChange={(e) => setFormData(p => ({ ...p, scenario: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none resize-none font-mono text-sm"
                    placeholder="e.g., You notice suspicious PowerShell activity in the logs..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Instruction</label>
                  <input
                    type="text"
                    value={formData.instruction}
                    onChange={(e) => setFormData(p => ({ ...p, instruction: e.target.value }))}
                    className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                    placeholder="e.g., Type the command to list running processes"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Valid Answers (one per line)</label>
                  <textarea
                    value={formData.terminalAnswers}
                    onChange={(e) => setFormData(p => ({ ...p, terminalAnswers: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none resize-none font-mono"
                    placeholder={"Get-Process\ntasklist\nps"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter all acceptable answers, one per line. Matching is case-insensitive.
                  </p>
                </div>
              </>
            )}

            {/* Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(p => ({ ...p, difficulty: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                >
                  <option value={1}>★ Easy</option>
                  <option value={2}>★★ Medium</option>
                  <option value={3}>★★★ Hard</option>
                  <option value={4}>★★★★ Expert</option>
                  <option value={5}>★★★★★ Master</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData(p => ({ ...p, points: parseInt(e.target.value) || 10 }))}
                  min={1}
                  className="w-full px-3 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">Time (sec)</label>
                <input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData(p => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))}
                  min={5}
                  className="w-full px-3 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-cyber-dark border border-border rounded-lg hover:bg-cyber-dark/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
