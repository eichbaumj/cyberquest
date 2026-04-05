'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
    role: 'student' as 'student' | 'instructor',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username,
          display_name: formData.displayName || formData.username,
          role: formData.role,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to dashboard after successful signup
    router.push('/dashboard');
    router.refresh();
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
          <p className="text-muted-foreground mt-2">Join the cyber academy</p>
        </div>

        {/* Signup form */}
        <form onSubmit={handleSignup} className="space-y-6">
          <div className="bg-cyber-dark/50 border border-border rounded-lg p-6 space-y-4">
            {error && (
              <div className="p-3 bg-cyber-red/10 border border-cyber-red/50 rounded text-cyber-red text-sm">
                {error}
              </div>
            )}

            {/* Role selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.role === 'student'
                      ? 'border-cyber-green bg-cyber-green/10 text-cyber-green'
                      : 'border-border hover:border-cyber-green/50'
                  }`}
                >
                  <span className="block text-lg">🎓</span>
                  <span className="text-sm font-medium">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'instructor' }))}
                  className={`p-3 rounded-lg border transition-all ${
                    formData.role === 'instructor'
                      ? 'border-cyber-purple bg-cyber-purple/10 text-cyber-purple'
                      : 'border-border hover:border-cyber-purple/50'
                  }`}
                >
                  <span className="block text-lg">👨‍🏫</span>
                  <span className="text-sm font-medium">Instructor</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
                placeholder="agent@cyberacademy.edu"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
                placeholder="cyber_ninja"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                Display Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-cyber-darker border border-border rounded-lg focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-cyber-blue hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
