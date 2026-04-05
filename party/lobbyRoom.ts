import type * as Party from 'partykit/server';

// Simple lobby room for listing active games
// This is a global room that tracks all active game sessions

interface ActiveGame {
  id: string;
  joinCode: string;
  title: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'active';
  createdAt: number;
}

type ClientMessage =
  | { type: 'REGISTER_GAME'; game: Omit<ActiveGame, 'createdAt'> }
  | { type: 'UPDATE_GAME'; gameId: string; playerCount: number; status: 'lobby' | 'active' }
  | { type: 'REMOVE_GAME'; gameId: string }
  | { type: 'GET_GAMES' };

type ServerMessage =
  | { type: 'GAMES_LIST'; games: ActiveGame[] }
  | { type: 'GAME_ADDED'; game: ActiveGame }
  | { type: 'GAME_UPDATED'; gameId: string; playerCount: number; status: 'lobby' | 'active' }
  | { type: 'GAME_REMOVED'; gameId: string };

export default class LobbyRoom implements Party.Server {
  readonly room: Party.Room;
  games: Map<string, ActiveGame> = new Map();

  constructor(room: Party.Room) {
    this.room = room;
  }

  onConnect(connection: Party.Connection) {
    // Send current games list to new connection
    this.sendToConnection(connection, {
      type: 'GAMES_LIST',
      games: Array.from(this.games.values()),
    });
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;

      switch (data.type) {
        case 'REGISTER_GAME': {
          const game: ActiveGame = {
            ...data.game,
            createdAt: Date.now(),
          };
          this.games.set(game.id, game);
          this.broadcast({ type: 'GAME_ADDED', game });
          break;
        }

        case 'UPDATE_GAME': {
          const game = this.games.get(data.gameId);
          if (game) {
            game.playerCount = data.playerCount;
            game.status = data.status;
            this.broadcast({
              type: 'GAME_UPDATED',
              gameId: data.gameId,
              playerCount: data.playerCount,
              status: data.status,
            });
          }
          break;
        }

        case 'REMOVE_GAME': {
          this.games.delete(data.gameId);
          this.broadcast({ type: 'GAME_REMOVED', gameId: data.gameId });
          break;
        }

        case 'GET_GAMES': {
          this.sendToConnection(sender, {
            type: 'GAMES_LIST',
            games: Array.from(this.games.values()),
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error handling lobby message:', error);
    }
  }

  // Clean up stale games periodically
  async onAlarm() {
    const staleThreshold = Date.now() - 3600000; // 1 hour
    const idsToDelete: string[] = [];
    this.games.forEach((game, id) => {
      if (game.createdAt < staleThreshold) {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach((id) => {
      this.games.delete(id);
      this.broadcast({ type: 'GAME_REMOVED', gameId: id });
    });

    // Schedule next cleanup
    this.room.storage.setAlarm(Date.now() + 300000); // 5 minutes
  }

  private broadcast(message: ServerMessage) {
    const messageStr = JSON.stringify(message);
    const connections = Array.from(this.room.getConnections());
    connections.forEach((connection) => {
      connection.send(messageStr);
    });
  }

  private sendToConnection(connection: Party.Connection, message: ServerMessage) {
    connection.send(JSON.stringify(message));
  }
}
