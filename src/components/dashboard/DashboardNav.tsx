'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/database.types';

interface DashboardNavProps {
  profile: Profile;
}

export function DashboardNav({ profile }: DashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isInstructor = profile.role === 'instructor' || profile.role === 'admin';

  const navItems = isInstructor
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: '📊' },
        { href: '/dashboard/questions', label: 'Questions', icon: '❓' },
        { href: '/dashboard/sessions', label: 'Game Sessions', icon: '🎮' },
        { href: '/dashboard/courses', label: 'Courses', icon: '📚' },
        { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { href: '/dashboard/progress', label: 'My Progress', icon: '📊' },
        { href: '/dashboard/achievements', label: 'Achievements', icon: '🏆' },
        { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: '🥇' },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cyber-dark/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-cyber-blue cyber-glow">CYBERQUEST</span>
          </Link>

          {/* Navigation items */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-cyber-blue/10 text-cyber-blue'
                    : 'text-muted-foreground hover:text-foreground hover:bg-cyber-dark'
                }`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Quick join */}
            <Link
              href="/join"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyber-green/10 border border-cyber-green text-cyber-green text-sm font-medium rounded-lg hover:bg-cyber-green/20 transition-all"
            >
              <span>🎮</span>
              Join Game
            </Link>

            {/* XP display */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg">
              <span className="text-cyber-yellow">⚡</span>
              <span className="text-sm font-medium text-cyber-purple">
                {profile.total_xp.toLocaleString()} XP
              </span>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-cyber-dark transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center text-sm">
                  {profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {profile.display_name || profile.username}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-cyber-dark border border-border rounded-lg shadow-lg py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium">{profile.display_name || profile.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm hover:bg-cyber-blue/10 transition-colors"
                  >
                    ⚙️ Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-cyber-red hover:bg-cyber-red/10 transition-colors"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t border-border">
        <div className="flex overflow-x-auto px-2 py-2 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-cyber-blue/10 text-cyber-blue'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
