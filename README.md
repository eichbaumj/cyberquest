# CyberQuest - DFIR Study Game Platform

A Minecraft-style 3D multiplayer educational game for cybersecurity students studying DFIR, malware analysis, and OS forensics.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **3D Engine**: Babylon.js
- **Styling**: Tailwind CSS
- **Auth/Database**: Supabase
- **Realtime**: PartyKit (WebSocket server)
- **Hosting**: Vercel

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18+** installed - [Download here](https://nodejs.org/)
2. **A Supabase account** - [Sign up free](https://supabase.com/)
3. **A PartyKit account** - [Sign up free](https://partykit.io/)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Go to Project Settings > API to find your credentials
3. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

4. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database

Run the database migrations:

1. Go to Supabase Dashboard > SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Run the SQL

### 4. Set Up PartyKit

```bash
# Install PartyKit CLI globally
npm install -g partykit

# Login to PartyKit
npx partykit login

# Deploy the PartyKit server
npx partykit deploy
```

Add your PartyKit host to `.env.local`:

```env
NEXT_PUBLIC_PARTYKIT_HOST=your-project.partykit.dev
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
study_game/
├── party/                    # PartyKit WebSocket server
│   ├── gameRoom.ts          # Main game room logic
│   └── lobbyRoom.ts         # Lobby management
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Login, signup, join pages
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── (game)/         # Game and lobby pages
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   └── game/          # Game UI components
│   ├── engine/             # Babylon.js game engine
│   │   ├── core/          # Engine initialization
│   │   ├── player/        # Player controllers
│   │   └── world/         # World/zone management
│   └── lib/
│       └── supabase/      # Supabase client config
├── supabase/
│   └── migrations/        # Database schema
└── public/
    └── assets/            # Game assets (models, textures)
```

## Features

### For Instructors
- Create question banks with multiple question types
- Start game sessions with unique join codes
- Monitor student progress in real-time
- View analytics and performance data

### For Students
- Join games with 6-character codes
- Compete against classmates in race mode
- Earn XP and track progress
- View achievements and leaderboards

### Question Types
- **Multiple Choice**: Standard 4-option questions
- **True/False**: Quick binary questions
- **Terminal Command**: Type actual commands (e.g., `Get-Process`, `netstat -an`)

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Deploy PartyKit

```bash
npx partykit deploy
```

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Generate Supabase types (requires Supabase CLI)
npm run db:generate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
