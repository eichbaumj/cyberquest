'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-4">
        {error && (
          <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
            placeholder="agent@cyberacademy.edu"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue font-semibold rounded-lg hover:bg-cyber-blue/20 transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Authenticating...' : 'Login'}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
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
          <p className="text-muted-foreground mt-2">Welcome back, agent</p>
        </div>

        {/* Login form */}
        <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="text-center text-muted-foreground mt-6">
          New to CyberQuest?{' '}
          <Link href="/signup" className="text-cyber-green hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
