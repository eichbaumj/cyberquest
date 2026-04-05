import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-cyber-darker flex flex-col items-center justify-center p-8">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-cyber-blue cyber-glow tracking-wider">
            CYBERQUEST
          </h1>
          <p className="text-xl text-cyber-green">
            DFIR Training Platform
          </p>
        </div>

        {/* Tagline */}
        <p className="text-muted-foreground max-w-md mx-auto">
          Master cybersecurity through immersive gameplay.
          Compete with classmates, solve challenges, defeat bosses.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/login"
            className="px-8 py-3 bg-cyber-blue/10 border border-cyber-blue text-cyber-blue font-semibold rounded-lg hover:bg-cyber-blue/20 transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-cyber-green/10 border border-cyber-green text-cyber-green font-semibold rounded-lg hover:bg-cyber-green/20 transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]"
          >
            Sign Up
          </Link>
        </div>

        {/* Quick join */}
        <div className="pt-8 space-y-4">
          <p className="text-muted-foreground text-sm">Have a game code?</p>
          <form className="flex gap-2 justify-center max-w-xs mx-auto">
            <input
              type="text"
              placeholder="Enter code"
              maxLength={6}
              className="flex-1 px-4 py-2 bg-cyber-dark border border-border rounded-lg text-center font-mono text-lg uppercase tracking-widest focus:border-cyber-blue focus:outline-none focus:ring-1 focus:ring-cyber-blue"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyber-purple/10 border border-cyber-purple text-cyber-purple font-semibold rounded-lg hover:bg-cyber-purple/20 transition-all"
            >
              Join
            </button>
          </form>
        </div>

        {/* Features preview */}
        <div className="pt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl">
          <FeatureCard
            icon="🎮"
            title="3D Gameplay"
            description="Explore cyber-themed worlds in Minecraft-style 3D"
          />
          <FeatureCard
            icon="⚔️"
            title="Compete"
            description="Race against classmates to answer questions fastest"
          />
          <FeatureCard
            icon="🏆"
            title="Progress"
            description="Earn XP, unlock zones, defeat bosses"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-cyber-dark/50 border border-border rounded-lg text-center space-y-2 hover:border-cyber-blue/50 transition-colors">
      <div className="text-3xl">{icon}</div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
