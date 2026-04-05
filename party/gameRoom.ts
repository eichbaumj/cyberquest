import type * as Party from 'partykit/server';

// Types for game state
interface PlayerState {
  id: string;
  odygerId: string; // Supabase user ID
  nickname: string;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  score: number;
  streak: number;
  isConnected: boolean;
  lastActivity: number;
}

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'terminal_command';
  content: {
    text: string;
    scenario?: string;
    instruction?: string;
  };
  options?: { id: string; text: string }[];
  timeLimit: number;
  points: number;
}

interface GameState {
  status: 'lobby' | 'starting' | 'active' | 'paused' | 'finished';
  hostId: string;
  players: Map<string, PlayerState>;
  currentQuestionIndex: number;
  questionStartTime: number | null;
  totalQuestions: number;
}

// Message types
type ClientMessage =
  | { type: 'JOIN'; userId: string; nickname: string }
  | { type: 'MOVE'; position: { x: number; y: number; z: number }; rotation: { y: number } }
  | { type: 'ANSWER'; questionId: string; answer: string | boolean | string[] }
  | { type: 'READY' }
  | { type: 'HOST_START' }
  | { type: 'HOST_NEXT_QUESTION' }
  | { type: 'HOST_PAUSE' }
  | { type: 'HOST_RESUME' }
  | { type: 'HOST_END' };

type ServerMessage =
  | { type: 'GAME_STATE'; state: SerializedGameState }
  | { type: 'PLAYER_JOINED'; player: PlayerState }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_MOVED'; playerId: string; position: { x: number; y: number; z: number }; rotation: { y: number } }
  | { type: 'GAME_STARTING'; countdown: number }
  | { type: 'QUESTION_START'; question: Question; questionIndex: number; serverTime: number }
  | { type: 'QUESTION_END'; correctAnswer: string | boolean | string[]; explanation?: string }
  | { type: 'ANSWER_RESULT'; playerId: string; isCorrect: boolean; points: number; newScore: number; newStreak: number }
  | { type: 'LEADERBOARD_UPDATE'; leaderboard: { id: string; nickname: string; score: number; rank: number }[] }
  | { type: 'GAME_PAUSED' }
  | { type: 'GAME_RESUMED' }
  | { type: 'GAME_FINISHED'; finalLeaderboard: { id: string; nickname: string; score: number; rank: number }[] }
  | { type: 'ERROR'; message: string };

interface SerializedGameState {
  status: GameState['status'];
  hostId: string;
  players: PlayerState[];
  currentQuestionIndex: number;
  totalQuestions: number;
}

export default class GameRoom implements Party.Server {
  readonly room: Party.Room;
  state: GameState;
  questions: Question[] = [];
  answeredPlayers: Set<string> = new Set();

  constructor(room: Party.Room) {
    this.room = room;
    this.state = {
      status: 'lobby',
      hostId: '',
      players: new Map(),
      currentQuestionIndex: 0,
      questionStartTime: null,
      totalQuestions: 0,
    };
  }

  // Handle new WebSocket connections
  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`[GameRoom ${this.room.id}] Connection from ${connection.id}`);

    // Send current game state to new connection
    this.sendToConnection(connection, {
      type: 'GAME_STATE',
      state: this.serializeState(),
    });
  }

  // Handle disconnections
  onClose(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (player) {
      player.isConnected = false;

      // Notify other players
      this.broadcast({
        type: 'PLAYER_LEFT',
        playerId: connection.id,
      }, [connection.id]);

      // Remove player after timeout if they don't reconnect
      setTimeout(() => {
        const p = this.state.players.get(connection.id);
        if (p && !p.isConnected) {
          this.state.players.delete(connection.id);
        }
      }, 30000);
    }
  }

  // Handle incoming messages
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;

      switch (data.type) {
        case 'JOIN':
          this.handleJoin(sender, data.userId, data.nickname);
          break;

        case 'MOVE':
          this.handleMove(sender, data.position, data.rotation);
          break;

        case 'ANSWER':
          this.handleAnswer(sender, data.questionId, data.answer);
          break;

        case 'HOST_START':
          this.handleHostStart(sender);
          break;

        case 'HOST_NEXT_QUESTION':
          this.handleNextQuestion(sender);
          break;

        case 'HOST_PAUSE':
          this.handlePause(sender);
          break;

        case 'HOST_RESUME':
          this.handleResume(sender);
          break;

        case 'HOST_END':
          this.handleEnd(sender);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToConnection(sender, {
        type: 'ERROR',
        message: 'Invalid message format',
      });
    }
  }

  // Handle HTTP requests (for setting up game data)
  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === 'POST') {
      const url = new URL(req.url);

      // Set host and questions
      if (url.pathname.endsWith('/setup')) {
        const body = await req.json() as {
          hostId: string;
          questions: Question[];
        };

        this.state.hostId = body.hostId;
        this.questions = body.questions;
        this.state.totalQuestions = body.questions.length;

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }

  // ============================================
  // Message Handlers
  // ============================================

  private handleJoin(connection: Party.Connection, odygerId: string, nickname: string) {
    // Check if player is already in game (reconnect)
    let existingPlayer: PlayerState | undefined;
    let existingId: string | undefined;
    this.state.players.forEach((player, id) => {
      if (player.odygerId === odygerId) {
        existingPlayer = player;
        existingId = id;
      }
    });
    if (existingId) {
      this.state.players.delete(existingId);
    }

    const player: PlayerState = existingPlayer || {
      id: connection.id,
      odygerId,
      nickname,
      position: { x: 0, y: 1, z: 0 },
      rotation: { y: 0 },
      score: 0,
      streak: 0,
      isConnected: true,
      lastActivity: Date.now(),
    };

    player.id = connection.id;
    player.isConnected = true;
    player.lastActivity = Date.now();

    this.state.players.set(connection.id, player);

    // Notify everyone about new player
    this.broadcast({
      type: 'PLAYER_JOINED',
      player,
    });

    // Send full state to the new player
    this.sendToConnection(connection, {
      type: 'GAME_STATE',
      state: this.serializeState(),
    });
  }

  private handleMove(
    connection: Party.Connection,
    position: { x: number; y: number; z: number },
    rotation: { y: number }
  ) {
    const player = this.state.players.get(connection.id);
    if (!player) return;

    player.position = position;
    player.rotation = rotation;
    player.lastActivity = Date.now();

    // Broadcast to other players (not the sender - they already predicted)
    this.broadcast(
      {
        type: 'PLAYER_MOVED',
        playerId: connection.id,
        position,
        rotation,
      },
      [connection.id]
    );
  }

  private handleAnswer(
    connection: Party.Connection,
    questionId: string,
    answer: string | boolean | string[]
  ) {
    if (this.state.status !== 'active') return;
    if (this.answeredPlayers.has(connection.id)) return;

    const player = this.state.players.get(connection.id);
    if (!player) return;

    const currentQuestion = this.questions[this.state.currentQuestionIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) return;

    this.answeredPlayers.add(connection.id);

    // Validate answer
    const isCorrect = this.validateAnswer(currentQuestion, answer);

    // Calculate points
    const timeElapsed = this.state.questionStartTime
      ? Date.now() - this.state.questionStartTime
      : currentQuestion.timeLimit * 1000;

    const timeRatio = Math.max(0, 1 - timeElapsed / (currentQuestion.timeLimit * 1000));
    const basePoints = isCorrect ? currentQuestion.points : 0;
    const timeBonus = isCorrect ? Math.floor(basePoints * 0.5 * timeRatio) : 0;
    const streakBonus = isCorrect ? Math.min(Math.floor(basePoints * 0.1 * player.streak), basePoints * 0.5) : 0;
    const totalPoints = basePoints + timeBonus + streakBonus;

    // Update player state
    if (isCorrect) {
      player.streak += 1;
    } else {
      player.streak = 0;
    }
    player.score += totalPoints;

    // Send result to answering player
    this.sendToConnection(connection, {
      type: 'ANSWER_RESULT',
      playerId: connection.id,
      isCorrect,
      points: totalPoints,
      newScore: player.score,
      newStreak: player.streak,
    });

    // Update leaderboard for everyone
    this.broadcastLeaderboard();
  }

  private handleHostStart(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (!player || player.odygerId !== this.state.hostId) {
      this.sendToConnection(connection, { type: 'ERROR', message: 'Only host can start the game' });
      return;
    }

    if (this.questions.length === 0) {
      this.sendToConnection(connection, { type: 'ERROR', message: 'No questions loaded' });
      return;
    }

    // Start countdown
    this.state.status = 'starting';
    this.broadcast({ type: 'GAME_STARTING', countdown: 5 });

    // Start game after countdown
    setTimeout(() => {
      this.startQuestion();
    }, 5000);
  }

  private handleNextQuestion(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (!player || player.odygerId !== this.state.hostId) return;

    if (this.state.currentQuestionIndex < this.questions.length - 1) {
      this.state.currentQuestionIndex++;
      this.startQuestion();
    } else {
      this.endGame();
    }
  }

  private handlePause(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (!player || player.odygerId !== this.state.hostId) return;

    this.state.status = 'paused';
    this.broadcast({ type: 'GAME_PAUSED' });
  }

  private handleResume(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (!player || player.odygerId !== this.state.hostId) return;

    this.state.status = 'active';
    this.broadcast({ type: 'GAME_RESUMED' });
  }

  private handleEnd(connection: Party.Connection) {
    const player = this.state.players.get(connection.id);
    if (!player || player.odygerId !== this.state.hostId) return;

    this.endGame();
  }

  // ============================================
  // Game Logic
  // ============================================

  private startQuestion() {
    const question = this.questions[this.state.currentQuestionIndex];
    if (!question) return;

    this.state.status = 'active';
    this.state.questionStartTime = Date.now();
    this.answeredPlayers.clear();

    // Send question to all players (without correct answer)
    this.broadcast({
      type: 'QUESTION_START',
      question: {
        id: question.id,
        type: question.type,
        content: question.content,
        options: question.options,
        timeLimit: question.timeLimit,
        points: question.points,
      },
      questionIndex: this.state.currentQuestionIndex,
      serverTime: Date.now(),
    });

    // Auto-end question after time limit
    setTimeout(() => {
      this.endQuestion();
    }, question.timeLimit * 1000 + 1000); // +1s buffer
  }

  private endQuestion() {
    const question = this.questions[this.state.currentQuestionIndex];
    if (!question) return;

    // Broadcast correct answer
    this.broadcast({
      type: 'QUESTION_END',
      correctAnswer: this.getCorrectAnswer(question),
      explanation: undefined, // Can add explanation from question data
    });

    this.broadcastLeaderboard();
  }

  private endGame() {
    this.state.status = 'finished';

    const leaderboard = this.getLeaderboard();
    this.broadcast({
      type: 'GAME_FINISHED',
      finalLeaderboard: leaderboard,
    });
  }

  private validateAnswer(question: Question, answer: string | boolean | string[]): boolean {
    // This is a simplified validation
    // In production, validation should be done server-side with the actual correct answers
    // For now, we'll mark all answers as pending validation

    // The actual validation will happen via Supabase RPC
    // This is just for real-time feedback
    return true; // Placeholder - real validation via Supabase
  }

  private getCorrectAnswer(question: Question): string | boolean | string[] {
    // This would come from the question data
    // For security, correct answers should only be sent after question ends
    return ''; // Placeholder
  }

  // ============================================
  // Helpers
  // ============================================

  private serializeState(): SerializedGameState {
    return {
      status: this.state.status,
      hostId: this.state.hostId,
      players: Array.from(this.state.players.values()),
      currentQuestionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.totalQuestions,
    };
  }

  private getLeaderboard() {
    const players = Array.from(this.state.players.values())
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        id: player.id,
        nickname: player.nickname,
        score: player.score,
        rank: index + 1,
      }));

    return players;
  }

  private broadcastLeaderboard() {
    this.broadcast({
      type: 'LEADERBOARD_UPDATE',
      leaderboard: this.getLeaderboard(),
    });
  }

  private broadcast(message: ServerMessage, exclude: string[] = []) {
    const messageStr = JSON.stringify(message);
    for (const connection of this.room.getConnections()) {
      if (!exclude.includes(connection.id)) {
        connection.send(messageStr);
      }
    }
  }

  private sendToConnection(connection: Party.Connection, message: ServerMessage) {
    connection.send(JSON.stringify(message));
  }
}
