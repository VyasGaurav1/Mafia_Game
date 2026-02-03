/**
 * Socket.IO Event Handlers
 * Main socket event processing for the game
 */

import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { roomManager } from '../services/RoomManager';
import { chatService } from '../services/ChatService';
import { GameStateMachine } from '../services/GameStateMachine';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomVisibility,
  GamePhase,
  Role,
  Team,
  ActionType,
  PlayerStatus,
  WinCondition,
  IPlayerPublic
} from '../types';
import logger, { gameLogger } from '../utils/logger';

// Extended socket with user data
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  oderId?: string;
  username?: string;
  currentRoom?: string;
}

/**
 * Setup all socket event handlers
 */
export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Handle authentication (simple version - extend with JWT for production)
    socket.oderId = socket.handshake.auth.oderId || uuidv4();
    socket.username = socket.handshake.auth.username || `Player_${socket.id.slice(0, 4)}`;

    // ==========================================
    // ROOM EVENTS
    // ==========================================

    /**
     * Create a new room
     */
    socket.on('room:create', async (payload, callback) => {
      try {
        const room = await roomManager.createRoom(
          socket.oderId!,
          socket.username!,
          socket.id,
          payload.name,
          payload.visibility,
          payload.settings
        );

        socket.currentRoom = room.code;
        socket.join(room.code);

        const publicRoom = roomManager.toPublicRoom(room);
        
        callback({ success: true, room: publicRoom });
        
        logger.info(`Room created: ${room.code} by ${socket.username}`);
      } catch (error: any) {
        logger.error('Error creating room:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Join an existing room
     */
    socket.on('room:join', async (payload, callback) => {
      try {
        const { room, isReconnect } = await roomManager.joinRoom(
          payload.roomCode,
          payload.userId || socket.oderId!,
          payload.username || socket.username!,
          socket.id
        );

        socket.oderId = payload.userId || socket.oderId;
        socket.username = payload.username || socket.username;
        socket.currentRoom = room.code;
        socket.join(room.code);

        const publicRoom = roomManager.toPublicRoom(room);
        const player = room.players.find(p => p.oderId === socket.oderId);

        callback({ 
          success: true, 
          room: publicRoom 
        });

        if (isReconnect) {
          // Notify others of reconnection
          socket.to(room.code).emit('player:reconnected', socket.oderId!);
          
          // Send current game state if game is active
          const gameEngine = roomManager.getGameEngine(room.code);
          if (gameEngine) {
            const state = gameEngine.getState();
            if (state) {
              // Send role to reconnecting player
              const role = state.roleAssignments.get(socket.oderId!) as Role;
              const team = state.teamAssignments.get(socket.oderId!) as Team;
              
              socket.emit('game:roleReveal', {
                role,
                team,
                teammates: team === Team.MAFIA ? getMafiaTeammates(state, socket.oderId!) : undefined
              });
            }
          }
        } else {
          // Notify others of new player
          socket.to(room.code).emit('room:playerJoined', {
            odId: player!.odId,
            oderId: player!.oderId,
            username: player!.username,
            avatar: player!.avatar,
            status: player!.status as PlayerStatus,
            isHost: player!.isHost,
            isConnected: true
          });
        }

        // Send chat history
        const history = chatService.getHistory(room.code);
        history.forEach(msg => socket.emit('day:chat', msg));

      } catch (error: any) {
        logger.error('Error joining room:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Leave current room
     */
    socket.on('room:leave', async (roomId) => {
      try {
        const roomCode = roomId || socket.currentRoom;
        if (!roomCode) return;

        const room = roomManager.getRoom(roomCode);
        const gameEngine = roomManager.getGameEngine(roomCode);
        const leavingPlayer = room?.players.find(p => p.oderId === socket.oderId);

        await roomManager.leaveRoom(roomCode, socket.oderId!);
        
        socket.leave(roomCode);
        socket.to(roomCode).emit('room:playerLeft', socket.oderId!);

        // If game is in progress, check win conditions
        if (gameEngine && leavingPlayer) {
          const winner = await gameEngine.handlePlayerLeave(socket.oderId!);
          
          if (winner) {
            // Game ended due to player leaving
            const msg = chatService.createSystemMessage(
              roomCode,
              `${leavingPlayer.username} has left the game. Checking win conditions...`
            );
            io.to(roomCode).emit('day:chat', msg);
          } else {
            // Just notify about the leave
            const msg = chatService.createSystemMessage(
              roomCode,
              `${leavingPlayer.username} has left the game.`
            );
            io.to(roomCode).emit('day:chat', msg);
          }
        }
        
        socket.currentRoom = undefined;
      } catch (error: any) {
        logger.error('Error leaving room:', error);
      }
    });

    /**
     * Kick a player (host only)
     */
    socket.on('room:kick', async ({ roomId, targetId }) => {
      try {
        await roomManager.kickPlayer(roomId, socket.oderId!, targetId);
        
        io.to(roomId).emit('room:playerKicked', targetId);
        
        // Notify the kicked player
        const room = roomManager.getRoom(roomId);
        if (room) {
          // Find socket of kicked player and force them to leave
          const kickedPlayer = room.players.find(p => p.oderId === targetId);
          if (kickedPlayer) {
            io.sockets.sockets.forEach((s: any) => {
              if (s.oderId === targetId) {
                s.leave(roomId);
                s.emit('room:error', { message: 'You have been kicked from the room', code: 'KICKED' });
              }
            });
          }
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'KICK_FAILED' });
      }
    });

    /**
     * Update room settings (host only)
     */
    socket.on('room:updateSettings', async ({ roomId, settings }) => {
      try {
        const room = await roomManager.updateSettings(roomId, socket.oderId!, settings);
        const publicRoom = roomManager.toPublicRoom(room);
        
        io.to(roomId).emit('room:updated', publicRoom);
      } catch (error: any) {
        socket.emit('error', { message: error.message, code: 'SETTINGS_UPDATE_FAILED' });
      }
    });

    // ==========================================
    // GAME EVENTS
    // ==========================================

    /**
     * Start the game (host only)
     */
    socket.on('game:start', async (roomId, callback) => {
      try {
        const gameEngine = await roomManager.startGame(roomId, socket.oderId!);
        const room = roomManager.getRoom(roomId)!;
        const gameState = gameEngine.getState()!;

        // Setup game event listeners
        setupGameEventListeners(io, roomId, gameEngine);

        // Notify all players
        io.to(roomId).emit('game:started', {
          phase: gameState.phase as GamePhase,
          dayNumber: gameState.dayNumber,
          currentTimer: gameState.currentTimer,
          alivePlayers: gameState.alivePlayers,
          deadPlayers: []
        });

        // Send individual role reveals
        room.players.forEach(player => {
          const role = gameState.roleAssignments.get(player.oderId) as Role;
          const team = gameState.teamAssignments.get(player.oderId) as Team;
          
          // Find player's socket
          io.sockets.sockets.forEach((s: any) => {
            if (s.oderId === player.oderId) {
              s.emit('game:roleReveal', {
                role,
                team,
                teammates: team === Team.MAFIA ? getMafiaTeammates(gameState, player.oderId) : undefined
              });
            }
          });
        });

        // Start the game
        await gameEngine.startGame();

        callback({ success: true });
      } catch (error: any) {
        logger.error('Error starting game:', error);
        callback({ success: false, error: error.message });
      }
    });

    /**
     * Night action (role-specific)
     */
    socket.on('night:action', async ({ roomId, targetId }) => {
      try {
        const gameEngine = roomManager.getGameEngine(roomId);
        if (!gameEngine) return;

        const gameState = gameEngine.getState();
        if (!gameState) return;

        const playerRole = gameState.roleAssignments.get(socket.oderId!) as Role;
        const currentPhase = gameState.phase as GamePhase;

        // Determine action type based on role and phase
        let actionType: ActionType;
        
        switch (currentPhase) {
          case GamePhase.MAFIA_ACTION:
            if (playerRole !== Role.MAFIA && playerRole !== Role.DON_MAFIA) return;
            actionType = ActionType.MAFIA_KILL;
            break;
          case GamePhase.DON_ACTION:
            if (playerRole !== Role.DON_MAFIA) return;
            actionType = ActionType.DON_INVESTIGATE;
            break;
          case GamePhase.DETECTIVE_ACTION:
            if (playerRole !== Role.DETECTIVE) return;
            actionType = ActionType.DETECTIVE_INVESTIGATE;
            break;
          case GamePhase.DOCTOR_ACTION:
            if (playerRole !== Role.DOCTOR) return;
            actionType = ActionType.DOCTOR_SAVE;
            break;
          case GamePhase.VIGILANTE_ACTION:
            if (playerRole !== Role.VIGILANTE) return;
            actionType = ActionType.VIGILANTE_KILL;
            break;
          default:
            return;
        }

        const success = await gameEngine.processNightAction(
          socket.oderId!,
          targetId!,
          actionType
        );

        if (success) {
          socket.emit('night:actionConfirmed', { actionType });

          // Send investigation results
          if (actionType === ActionType.DETECTIVE_INVESTIGATE) {
            const result = gameState.nightActions.detectiveResult;
            socket.emit('night:detectiveResult', {
              targetId: targetId!,
              isGuilty: result || false
            });
          } else if (actionType === ActionType.DON_INVESTIGATE) {
            const result = gameState.nightActions.donResult;
            socket.emit('night:donResult', {
              targetId: targetId!,
              isDetective: result || false
            });
          }

          // Update mafia vote display for mafia members
          if (actionType === ActionType.MAFIA_KILL) {
            const mafiaVotes: Record<string, string> = {};
            gameState.nightActions.mafiaVotes.forEach((target, voter) => {
              mafiaVotes[voter] = target;
            });
            
            // Send to all mafia
            io.sockets.sockets.forEach((s: any) => {
              if (s.currentRoom === roomId) {
                const sRole = gameState.roleAssignments.get(s.oderId) as Role;
                if (sRole === Role.MAFIA || sRole === Role.DON_MAFIA) {
                  s.emit('mafia:voteUpdate', mafiaVotes);
                }
              }
            });
          }
        }
      } catch (error: any) {
        logger.error('Error processing night action:', error);
        socket.emit('error', { message: 'Action failed', code: 'ACTION_FAILED' });
      }
    });

    /**
     * Mafia night chat
     */
    socket.on('mafia:chat', ({ roomId, content }) => {
      const gameEngine = roomManager.getGameEngine(roomId);
      if (!gameEngine) return;

      const gameState = gameEngine.getState();
      if (!gameState) return;

      const playerRole = gameState.roleAssignments.get(socket.oderId!) as Role;
      const playerStatus = gameState.alivePlayers.includes(socket.oderId!) 
        ? PlayerStatus.ALIVE 
        : PlayerStatus.DEAD;

      // Only alive mafia can chat during night
      if (playerRole !== Role.MAFIA && playerRole !== Role.DON_MAFIA) return;
      if (playerStatus !== PlayerStatus.ALIVE) return;

      const currentPhase = gameState.phase as GamePhase;
      if (currentPhase !== GamePhase.MAFIA_ACTION && 
          currentPhase !== GamePhase.NIGHT) return;

      const message = chatService.processMessage(
        roomId,
        socket.oderId!,
        socket.username!,
        content,
        'mafia'
      );

      if (message) {
        // Send only to mafia members
        io.sockets.sockets.forEach((s: any) => {
          if (s.currentRoom === roomId) {
            const sRole = gameState.roleAssignments.get(s.oderId) as Role;
            if (sRole === Role.MAFIA || sRole === Role.DON_MAFIA) {
              s.emit('mafia:chat', message);
            }
          }
        });
      }
    });

    /**
     * Day chat
     */
    socket.on('day:chat', ({ roomId, content }) => {
      const gameEngine = roomManager.getGameEngine(roomId);
      const room = roomManager.getRoom(roomId);
      
      if (!room) return;

      // Check if game is active
      if (gameEngine) {
        const gameState = gameEngine.getState();
        if (!gameState) return;

        const currentPhase = gameState.phase as GamePhase;
        
        // Only allow chat during day phases
        if (currentPhase !== GamePhase.DAY_DISCUSSION && 
            currentPhase !== GamePhase.VOTING &&
            currentPhase !== GamePhase.LOBBY) {
          return;
        }

        // Dead players cannot chat
        if (gameState.deadPlayers.includes(socket.oderId!)) {
          return;
        }
      }

      const message = chatService.processMessage(
        roomId,
        socket.oderId!,
        socket.username!,
        content,
        'player'
      );

      if (message) {
        io.to(roomId).emit('day:chat', message);
      }
    });

    /**
     * Request a removal vote
     */
    socket.on('vote:requestRemoval', async ({ roomId, targetId }) => {
      try {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        const gameEngine = roomManager.getGameEngine(roomId);
        const gameState = gameEngine?.getState();
        
        const requester = room.players.find(p => p.oderId === socket.oderId);
        const target = room.players.find(p => p.oderId === targetId);
        
        if (!requester || !target) return;
        
        // Can't request removal during night
        if (gameState) {
          const currentPhase = gameState.phase as GamePhase;
          const isNightPhase = [
            GamePhase.NIGHT,
            GamePhase.MAFIA_ACTION,
            GamePhase.DETECTIVE_ACTION,
            GamePhase.DOCTOR_ACTION,
            GamePhase.DON_ACTION,
            GamePhase.VIGILANTE_ACTION
          ].includes(currentPhase);
          
          if (isNightPhase) {
            socket.emit('error', { message: 'Cannot request removal during night', code: 'INVALID_PHASE' });
            return;
          }
        }
        
        // Broadcast the removal request to all players
        const msg = chatService.createSystemMessage(
          roomId,
          `${requester.username} has requested a vote to remove ${target.username}. Use the voting phase to decide.`
        );
        io.to(roomId).emit('day:chat', msg);
        
        // If game is in progress and it's day discussion, start an immediate vote
        if (gameState && gameState.phase === GamePhase.DAY_DISCUSSION && gameEngine) {
          const voteMsg = chatService.createSystemMessage(
            roomId,
            `Operator: A removal vote has been called for ${target.username}. Transitioning to voting phase...`
          );
          io.to(roomId).emit('day:chat', voteMsg);
          
          // Transition to voting phase
          setTimeout(async () => {
            try {
              await gameEngine.forceTransitionToVoting();
            } catch (e) {
              logger.error('Error transitioning to voting:', e);
            }
          }, 2000);
        }
      } catch (error: any) {
        logger.error('Error processing removal request:', error);
        socket.emit('error', { message: 'Removal request failed', code: 'REMOVAL_FAILED' });
      }
    });

    /**
     * Cast a vote
     */
    socket.on('vote:cast', async ({ roomId, targetId }) => {
      try {
        const gameEngine = roomManager.getGameEngine(roomId);
        if (!gameEngine) return;

        const gameState = gameEngine.getState();
        if (!gameState) return;

        // Validate phase
        if (gameState.phase !== GamePhase.VOTING) {
          socket.emit('error', { message: 'Not in voting phase', code: 'INVALID_PHASE' });
          return;
        }

        const success = await gameEngine.processVote(socket.oderId!, targetId);

        if (success) {
          gameLogger.actionPerformed(roomId, socket.oderId!, 'VOTE', targetId);
        }
      } catch (error: any) {
        logger.error('Error processing vote:', error);
        socket.emit('error', { message: 'Vote failed', code: 'VOTE_FAILED' });
      }
    });

    /**
     * Handle reconnection
     */
    socket.on('player:reconnect', async ({ roomId, oderId }) => {
      try {
        socket.oderId = oderId;
        const result = await roomManager.joinRoom(roomId, oderId, socket.username!, socket.id);
        
        if (result.isReconnect) {
          socket.currentRoom = roomId;
          socket.join(roomId);
          
          const room = result.room;
          const player = room.players.find(p => p.oderId === oderId);
          socket.username = player?.username || socket.username;
          
          // Send current state
          const gameEngine = roomManager.getGameEngine(roomId);
          if (gameEngine) {
            const state = gameEngine.getState();
            if (state) {
              const role = state.roleAssignments.get(oderId) as Role;
              const team = state.teamAssignments.get(oderId) as Team;
              
              socket.emit('game:roleReveal', {
                role,
                team,
                teammates: team === Team.MAFIA ? getMafiaTeammates(state, oderId) : undefined
              });

              socket.emit('game:stateUpdate', {
                phase: state.phase as GamePhase,
                dayNumber: state.dayNumber,
                currentTimer: state.currentTimer,
                alivePlayers: state.alivePlayers,
                deadPlayers: state.deadPlayers.map(id => {
                  const p = room.players.find(pl => pl.oderId === id);
                  return {
                    odId: p?.odId || '',
                    oderId: id,
                    username: p?.username || '',
                    status: PlayerStatus.DEAD,
                    isHost: p?.isHost || false,
                    isConnected: p?.isConnected || false,
                    role: state.roleAssignments.get(id) as Role
                  };
                })
              });
            }
          }

          socket.to(roomId).emit('player:reconnected', oderId);
        }
      } catch (error: any) {
        logger.error('Error during reconnection:', error);
      }
    });

    // ==========================================
    // DISCONNECT HANDLING
    // ==========================================

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      if (socket.currentRoom) {
        const result = await roomManager.handleDisconnect(socket.id);
        
        if (result) {
          io.to(result.roomCode).emit('player:disconnected', result.oderId);
        }
      }
    });
  });
}

/**
 * Setup event listeners for game engine events
 */
function setupGameEventListeners(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
  gameEngine: GameStateMachine
): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  // Remove any existing listeners to prevent duplicates
  gameEngine.removeAllListeners();

  // Phase change
  gameEngine.on('phase:change', (phase: GamePhase, data: any) => {
    io.to(roomCode).emit('game:phaseChange', {
      phase,
      timer: data.timer || 0,
      dayNumber: data.dayNumber || 0
    });

    // Send system message for phase change
    const phaseMessages: Record<GamePhase, string> = {
      [GamePhase.LOBBY]: 'Waiting for players...',
      [GamePhase.ROLE_REVEAL]: 'Roles have been assigned. Check your role!',
      [GamePhase.NIGHT]: 'Night falls on the town...',
      [GamePhase.DAY]: 'Dawn breaks over the town...',
      [GamePhase.MAFIA_ACTION]: 'The Mafia awakens to choose their victim.',
      [GamePhase.DON_ACTION]: 'The Don investigates...',
      [GamePhase.MAFIA_HEALER_ACTION]: 'The Mafia Healer protects their ally...',
      [GamePhase.SILENCER_ACTION]: 'The Silencer chooses their target...',
      [GamePhase.DETECTIVE_ACTION]: 'The Detective investigates a suspect.',
      [GamePhase.DOCTOR_ACTION]: 'The Doctor prepares to save a life.',
      [GamePhase.BODYGUARD_ACTION]: 'The Bodyguard stands watch...',
      [GamePhase.JAILOR_ACTION]: 'The Jailor locks someone away...',
      [GamePhase.VIGILANTE_ACTION]: 'The Vigilante takes aim...',
      [GamePhase.SPY_ACTION]: 'The Spy gathers intelligence...',
      [GamePhase.SERIAL_KILLER_ACTION]: 'The Serial Killer stalks...',
      [GamePhase.CULT_LEADER_ACTION]: 'The Cult Leader seeks converts...',
      [GamePhase.ARSONIST_ACTION]: 'The Arsonist spreads gasoline...',
      [GamePhase.DAY_DISCUSSION]: 'The sun rises. Discuss among yourselves.',
      [GamePhase.VOTING]: 'Time to vote! Choose who to eliminate.',
      [GamePhase.RESOLUTION]: 'The votes have been counted...',
      [GamePhase.GAME_OVER]: 'Game Over!',
      [GamePhase.DON_INVESTIGATE]: 'The Don investigates...' // Legacy
    };

    if (phaseMessages[phase]) {
      const msg = chatService.createSystemMessage(roomCode, phaseMessages[phase]);
      io.to(roomCode).emit('day:chat', msg);
    }
  });

  // Timer tick
  gameEngine.on('timer:tick', (remaining: number, phase: GamePhase) => {
    io.to(roomCode).emit('timer:update', { remaining, phase });
  });

  // Role-specific timer
  gameEngine.on('timer:roleSpecific', (remaining: number, role: Role) => {
    const gameState = gameEngine.getState();
    if (!gameState) return;

    // Send to players with this role
    io.sockets.sockets.forEach((s: any) => {
      if (s.currentRoom === roomCode) {
        const sRole = gameState.roleAssignments.get(s.oderId) as Role;
        if (sRole === role || 
            (role === Role.MAFIA && (sRole === Role.MAFIA || sRole === Role.DON_MAFIA))) {
          s.emit('timer:roleSpecific', { remaining, forRole: role });
        }
      }
    });
  });

  // Night action required
  gameEngine.on('action:required', (role: Role, timer: number, validTargets: string[]) => {
    const gameState = gameEngine.getState();
    if (!gameState) {
      console.log('[Handlers] action:required - No game state!');
      return;
    }

    console.log('[Handlers] action:required for role:', role, 'timer:', timer, 'targets:', validTargets);
    console.log('[Handlers] roleAssignments:', Array.from(gameState.roleAssignments.entries()));

    // Send to players with this role
    let matchedCount = 0;
    io.sockets.sockets.forEach((s: any) => {
      if (s.currentRoom === roomCode) {
        const sRole = gameState.roleAssignments.get(s.oderId) as Role;
        console.log('[Handlers] Checking socket', s.oderId, 'has role:', sRole);
        if (sRole === role || 
            (role === Role.MAFIA && (sRole === Role.MAFIA || sRole === Role.DON_MAFIA))) {
          console.log('[Handlers] MATCHED! Sending night:actionRequired to socket', s.oderId);
          s.emit('night:actionRequired', { role, timer, validTargets });
          matchedCount++;
        }
      }
    });
    console.log('[Handlers] Total matched sockets:', matchedCount);
  });

  // Night result
  gameEngine.on('night:result', (result: any) => {
    let message = 'The sun rises.';
    
    if (result.killedPlayerId) {
      const player = room.players.find(p => p.oderId === result.killedPlayerId);
      message = `The sun rises. ${player?.username || 'Someone'} was found dead.`;
    } else if (result.wasSaved) {
      message = 'The sun rises. Someone was attacked but survived the night!';
    } else {
      message = 'The sun rises. It was a peaceful night.';
    }

    const msg = chatService.createSystemMessage(roomCode, message);
    io.to(roomCode).emit('day:chat', msg);
    io.to(roomCode).emit('night:result', result);
  });

  // Player eliminated
  gameEngine.on('player:eliminated', (playerId: string, role: Role, reason: 'vote' | 'kill') => {
    const player = room.players.find(p => p.oderId === playerId);
    
    io.to(roomCode).emit('player:eliminated', {
      playerId,
      role,
      reason
    });

    const reasonText = reason === 'vote' ? 'has been eliminated by vote' : 'was killed';
    const msg = chatService.createSystemMessage(
      roomCode,
      `${player?.username || 'A player'} ${reasonText}. They were a ${role}.`
    );
    io.to(roomCode).emit('day:chat', msg);
  });

  // Vote update
  gameEngine.on('vote:update', (votes: Record<string, number>) => {
    const gameState = gameEngine.getState();
    if (!gameState) return;

    const hasVoted: string[] = [];
    gameState.votes.forEach((_, oderId) => hasVoted.push(oderId));

    io.to(roomCode).emit('vote:update', {
      votes,
      hasVoted
    });
  });

  // Game end
  gameEngine.on('game:end', (winner: WinCondition, winningTeam: Team, winningPlayers: string[]) => {
    const gameState = gameEngine.getState();
    
    const winnerPlayers: IPlayerPublic[] = winningPlayers.map(id => {
      const player = room.players.find(p => p.oderId === id);
      return {
        odId: player?.odId || '',
        oderId: id,
        username: player?.username || '',
        status: gameState?.alivePlayers.includes(id) ? PlayerStatus.ALIVE : PlayerStatus.DEAD,
        isHost: player?.isHost || false,
        isConnected: player?.isConnected || false,
        role: gameState?.roleAssignments.get(id) as Role
      };
    });

    io.to(roomCode).emit('game:end', {
      winner,
      winningTeam,
      winningPlayers: winnerPlayers
    });

    const winnerText = winner === WinCondition.MAFIA_WINS 
      ? 'The Mafia has taken over the town!' 
      : winner === WinCondition.TOWN_WINS 
        ? 'The Town has eliminated all Mafia members!'
        : 'The Jester wins by fooling everyone!';

    const msg = chatService.createSystemMessage(roomCode, winnerText);
    io.to(roomCode).emit('day:chat', msg);
  });
}

/**
 * Get mafia teammates for a player
 */
function getMafiaTeammates(gameState: any, oderId: string): string[] {
  const teammates: string[] = [];
  
  gameState.teamAssignments.forEach((team: Team, odId: string) => {
    if (team === Team.MAFIA && odId !== oderId) {
      teammates.push(odId);
    }
  });

  return teammates;
}
