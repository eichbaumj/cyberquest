'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RemotePlayerData } from '@/engine/player/RemotePlayer';
import { Question, InteractiveObject } from '@/engine/objects/InteractiveObject';
import { QuestionModal } from '@/components/game/QuestionModal';
import { shuffleWithSeed } from '@/lib/utils/shuffle';
import { validateAnswer } from '@/lib/utils/validation';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with Babylon.js
const GameCanvas = dynamic(
  () => import('@/components/game/GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎮</div>
          <p className="text-cyber-blue cyber-glow">Initializing CyberQuest...</p>
        </div>
      </div>
    ),
  }
);

function GameContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerData[]>([]);
  const [playerCount, setPlayerCount] = useState(1);

  // Question system state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<InteractiveObject | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const supabaseRef = useRef(createClient());
  const lastUpdateRef = useRef(0);
  const positionChannelRef = useRef<any>(null);
  const nicknameRef = useRef<string>('Player');

  // Get current user and set up realtime
  useEffect(() => {
    const supabase = supabaseRef.current;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Get user's nickname
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single() as { data: any };

      const nickname = profile?.display_name || profile?.username || 'Player';
      nicknameRef.current = nickname;

      // Create a presence channel for player positions
      const channel = supabase.channel(`game-${sessionId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      const syncPresence = () => {
        const state = channel.presenceState();
        const players: RemotePlayerData[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence && presence.user_id !== user.id) {
            players.push({
              id: presence.user_id,
              nickname: presence.nickname || 'Player',
              position: presence.position || { x: 0, y: 1, z: 0 },
              rotation: presence.rotation || 0,
            });
          }
        });

        setRemotePlayers(players);
        setPlayerCount(Object.keys(state).length);
      };

      channel
        .on('presence', { event: 'sync' }, syncPresence)
        .on('presence', { event: 'join' }, syncPresence)
        .on('presence', { event: 'leave' }, syncPresence)
        .on('broadcast', { event: 'move' }, ({ payload }) => {
          // Update remote player position from broadcast
          if (payload.user_id !== user.id) {
            setRemotePlayers(prev => {
              const existing = prev.find(p => p.id === payload.user_id);
              if (existing) {
                return prev.map(p =>
                  p.id === payload.user_id
                    ? { ...p, position: payload.position, rotation: payload.rotation, animState: payload.animState }
                    : p
                );
              } else {
                return [...prev, {
                  id: payload.user_id,
                  nickname: payload.nickname || 'Player',
                  position: payload.position,
                  rotation: payload.rotation,
                  animState: payload.animState,
                }];
              }
            });
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track our presence with initial position
            await channel.track({
              user_id: user.id,
              nickname: nickname,
              position: { x: 0, y: 1, z: 0 },
              rotation: 0,
              online_at: new Date().toISOString(),
            });
          }
        });

      positionChannelRef.current = channel;
    };

    if (sessionId) {
      setup();
    }

    return () => {
      if (positionChannelRef.current) {
        supabaseRef.current.removeChannel(positionChannelRef.current);
      }
    };
  }, [sessionId]);

  // Fetch questions when userId and sessionId are available
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!sessionId || !userId) return;

      const supabase = supabaseRef.current;

      // Get session with question bank
      const { data: session } = await supabase
        .from('game_sessions')
        .select('question_bank_id')
        .eq('id', sessionId)
        .single();

      if (!session?.question_bank_id) {
        console.log('No question bank linked to session');
        return;
      }

      // Fetch questions from bank
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .eq('bank_id', session.question_bank_id);

      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }

      if (questionsData && questionsData.length > 0) {
        // Transform to game question format
        const gameQuestions: Question[] = questionsData.map((q) => ({
          id: q.id,
          type: q.type as 'multiple_choice' | 'true_false' | 'terminal_command',
          content: typeof q.content === 'string' ? q.content : (q.content as any)?.text || JSON.stringify(q.content),
          options: q.options as any,
          correct_answer: q.correct_answer as string | string[] | boolean,
          difficulty: q.difficulty || 1,
          time_limit: q.time_limit_seconds || 30,
        }));

        // Shuffle with player ID as seed for consistent order per player
        const shuffled = shuffleWithSeed(gameQuestions, userId);
        setQuestions(shuffled);
        console.log(`Loaded ${shuffled.length} questions for player`);
      }
    };

    fetchQuestions();
  }, [sessionId, userId]);

  // Handle player movement - throttled to ~10 updates per second
  const handlePlayerMove = useCallback((position: { x: number; y: number; z: number }, rotation: number, animState: string) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 100) return; // Throttle to 10 updates/sec
    lastUpdateRef.current = now;

    if (positionChannelRef.current && userId) {
      // Broadcast movement to all other players
      positionChannelRef.current.send({
        type: 'broadcast',
        event: 'move',
        payload: {
          user_id: userId,
          nickname: nicknameRef.current,
          position,
          rotation,
          animState,
        },
      });
    }
  }, [userId]);

  // Handle interaction with terminal
  const handleInteraction = useCallback((object: InteractiveObject) => {
    const question = object.getBoundQuestion();
    if (question && object.getState() !== 'completed') {
      setActiveQuestion(question);
      setActiveTerminal(object);
    }
  }, []);

  // Handle answer submission
  const handleAnswerSubmit = useCallback(
    (answer: string | boolean) => {
      if (!activeQuestion || !activeTerminal) return;

      const isCorrect = validateAnswer(activeQuestion, answer);

      if (isCorrect) {
        // Mark terminal as completed (turns green)
        activeTerminal.markCompleted();

        // Update score and streak
        const newStreak = streak + 1;
        const basePoints = (activeQuestion.difficulty || 1) * 10;
        const streakBonus = Math.min(newStreak - 1, 5) * 5; // Max 25 bonus
        const points = basePoints + streakBonus;

        setCorrectCount((prev) => prev + 1);
        setScore((prev) => prev + points);
        setStreak(newStreak);
      } else {
        // Reset streak on wrong answer
        setStreak(0);
        // Complete interaction but don't mark as solved
        activeTerminal.completeInteraction();
      }

      // Close modal
      setActiveQuestion(null);
      setActiveTerminal(null);
    },
    [activeQuestion, activeTerminal, streak]
  );

  // Handle modal close (skip)
  const handleModalClose = useCallback(() => {
    if (activeTerminal) {
      activeTerminal.completeInteraction();
    }
    setStreak(0); // Reset streak on skip
    setActiveQuestion(null);
    setActiveTerminal(null);
  }, [activeTerminal]);

  return (
    <div className="w-full h-screen bg-cyber-darker">
      {/* HUD Overlay */}
      <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex justify-between items-start p-4">
          {/* Score/Streak */}
          <div className="pointer-events-auto bg-cyber-dark/80 backdrop-blur-sm border border-border rounded-lg p-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-xl font-bold text-cyber-green">{score}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="text-xl font-bold text-cyber-yellow">{streak > 0 ? `${streak}x` : '0'}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xs text-muted-foreground">Solved</p>
                <p className="text-xl font-bold text-cyber-blue">{correctCount}/3</p>
              </div>
            </div>
          </div>

          {/* Game status */}
          <div className="pointer-events-auto bg-cyber-dark/80 backdrop-blur-sm border border-border rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-sm">Players: {playerCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas
        onReady={() => setIsReady(true)}
        onPlayerMove={handlePlayerMove}
        remotePlayers={remotePlayers}
        questions={questions}
        onInteraction={handleInteraction}
        onCorrectAnswer={(count) => {
          console.log(`Correct answers: ${count}`);
        }}
      />

      {/* Question Modal */}
      {activeQuestion && (
        <QuestionModal
          question={activeQuestion}
          onSubmit={handleAnswerSubmit}
          onClose={handleModalClose}
          timeLimit={activeQuestion.time_limit || 30}
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-cyber-darker">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎮</div>
          <p className="text-cyber-blue cyber-glow">Loading...</p>
        </div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
