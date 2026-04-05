'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function NewQuestionBankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general' as 'dfir' | 'malware' | 'forensics' | 'network' | 'general',
    isPublic: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('question_banks')
      .insert({
        owner_id: user.id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        is_public: formData.isPublic,
      } as any)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/questions/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/questions"
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Back to Question Banks
        </Link>
        <h1 className="text-2xl font-bold">Create Question Bank</h1>
        <p className="text-muted-foreground">
          A question bank is a collection of questions organized by topic
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-6">
          {error && (
            <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Title <span className="text-cyber-red">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none"
              placeholder="e.g., DFIR Fundamentals"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none resize-none"
              placeholder="What topics does this bank cover?"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: 'dfir', label: 'DFIR', color: 'blue' },
                { value: 'malware', label: 'Malware', color: 'red' },
                { value: 'forensics', label: 'Forensics', color: 'purple' },
                { value: 'network', label: 'Network', color: 'green' },
                { value: 'general', label: 'General', color: 'gray' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, category: cat.value as any }))}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    formData.category === cat.value
                      ? cat.color === 'blue'
                        ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue'
                        : cat.color === 'red'
                        ? 'border-cyber-red bg-cyber-red/10 text-cyber-red'
                        : cat.color === 'purple'
                        ? 'border-cyber-purple bg-cyber-purple/10 text-cyber-purple'
                        : cat.color === 'green'
                        ? 'border-cyber-green bg-cyber-green/10 text-cyber-green'
                        : 'border-muted bg-muted/10 text-muted-foreground'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData((p) => ({ ...p, isPublic: e.target.checked }))}
              className="w-4 h-4 rounded border-border bg-cyber-darker"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make this question bank public (other instructors can use it)
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/dashboard/questions"
            className="px-6 py-2 bg-cyber-dark border border-border rounded-lg hover:bg-cyber-dark/80"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.title.trim()}
            className="flex-1 px-6 py-2 bg-cyber-green/10 border border-cyber-green text-cyber-green font-medium rounded-lg hover:bg-cyber-green/20 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Question Bank'}
          </button>
        </div>
      </form>
    </div>
  );
}
