/**
 * Game State Machine
 * Finite state machine implementation for game phase management
 * Server-authoritative - all state transitions happen here
 */

import { EventEmitter } from 'events';
import { 
  GamePhase, 
  Role, 
  Team, 
  PlayerStatus,
  WinCondition,
  ActionType,
  ITimerSettings,
  DEFAULT_TIMER_SETTINGS,
  ROLE_CONFIGS
} from '../types';
import { GameState, IGameStateDocument } from '../models/GameState';
import { Room, IRoomDocument } from '../models/Room';
import { ActionLog } from '../models/ActionLog';
import logger, { gameLogger } from '../utils/logger';
import { RoleDistributionService, RoleConfig } from './RoleDistribution';

// Phase transition map - defines valid state transitions
const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.LOBBY]: [GamePhase.ROLE_REVEAL],
  [GamePhase.ROLE_REVEAL]: [GamePhase.NIGHT, GamePhase.GAME_OVER],
  [GamePhase.NIGHT]: [GamePhase.MAFIA_ACTION, GamePhase.GAME_OVER],
  // Updated to allow MAFIA -> DOCTOR (our new night order)
  [GamePhase.MAFIA_ACTION]: [GamePhase.DOCTOR_ACTION, GamePhase.DON_ACTION, GamePhase.DETECTIVE_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.DOCTOR_ACTION]: [GamePhase.DON_ACTION, GamePhase.DETECTIVE_ACTION, GamePhase.VIGILANTE_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.DON_ACTION]: [GamePhase.DETECTIVE_ACTION, GamePhase.VIGILANTE_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.DETECTIVE_ACTION]: [GamePhase.VIGILANTE_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.VIGILANTE_ACTION]: [GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.MAFIA_HEALER_ACTION]: [GamePhase.SILENCER_ACTION, GamePhase.DETECTIVE_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.SILENCER_ACTION]: [GamePhase.DETECTIVE_ACTION, GamePhase.SERIAL_KILLER_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.BODYGUARD_ACTION]: [GamePhase.JAILOR_ACTION, GamePhase.VIGILANTE_ACTION, GamePhase.SPY_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.JAILOR_ACTION]: [GamePhase.VIGILANTE_ACTION, GamePhase.SPY_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.SPY_ACTION]: [GamePhase.SERIAL_KILLER_ACTION, GamePhase.CULT_LEADER_ACTION, GamePhase.ARSONIST_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.SERIAL_KILLER_ACTION]: [GamePhase.CULT_LEADER_ACTION, GamePhase.ARSONIST_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.CULT_LEADER_ACTION]: [GamePhase.ARSONIST_ACTION, GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.ARSONIST_ACTION]: [GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.DAY]: [GamePhase.DAY_DISCUSSION, GamePhase.GAME_OVER],
  [GamePhase.DAY_DISCUSSION]: [GamePhase.VOTING, GamePhase.GAME_OVER],
  [GamePhase.VOTING]: [GamePhase.RESOLUTION, GamePhase.GAME_OVER],
  [GamePhase.RESOLUTION]: [GamePhase.NIGHT, GamePhase.GAME_OVER],
  [GamePhase.GAME_OVER]: [],
  [GamePhase.DON_INVESTIGATE]: [] // Legacy
};

export interface GameEvents {
  'phase:change': (phase: GamePhase, data: any) => void;
  'timer:tick': (remaining: number, phase: GamePhase) => void;
  'timer:roleSpecific': (remaining: number, role: Role) => void;
  'night:result': (result: any) => void;
  'player:eliminated': (playerId: string, role: Role, reason: 'vote' | 'kill') => void;
  'game:end': (winner: WinCondition, winningTeam: Team, winningPlayers: string[]) => void;
  'action:required': (role: Role, timer: number, validTargets: string[]) => void;
  'vote:update': (votes: Record<string, number>) => void;
}

export class GameStateMachine extends EventEmitter {
  private gameState: IGameStateDocument | null = null;
  private room: IRoomDocument | null = null;
  private timers: ITimerSettings;
  private phaseTimer: NodeJS.Timeout | null = null;
  private roleTimer: NodeJS.Timeout | null = null;
  private currentRoleTimerRole: Role | null = null;
  private nightPhaseIndex: number = 0;
  private nightPhaseOrder: GamePhase[] = [];

  constructor() {
    super();
    this.timers = DEFAULT_TIMER_SETTINGS;
  }

  /**
   * Initialize a new game
   */
  async initializeGame(room: any): Promise<IGameStateDocument> {
    this.room = room;
    this.timers = room.settings.timers;

    // Assign roles
    const roleAssignments = this.assignRoles(room);
    const teamAssignments = new Map<string, string>();
    
    roleAssignments.forEach((role, oderId) => {
      const config = ROLE_CONFIGS[role as Role];
      teamAssignments.set(oderId, config.team);
    });

    // Create game state
    const gameState = new GameState({
      roomId: room._id,
      roomCode: room.code,
      phase: GamePhase.LOBBY,
      dayNumber: 0,
      currentTimer: 0,
      phaseStartTime: new Date(),
      roleAssignments,
      teamAssignments,
      alivePlayers: room.players.map(p => p.oderId),
      deadPlayers: [],
      nightActions: {
        mafiaVotes: new Map()
      },
      votes: new Map(),
      lastDoctorSave: new Map(),
      vigilanteKillUsed: new Map(),
      winningPlayers: [],
      startedAt: new Date()
    });

    await gameState.save();
    this.gameState = gameState;

    // Update room with game reference
    room.gameId = gameState._id;
    await room.save();

    gameLogger.gameStarted(room.code, room.players.length);

    return gameState;
  }

  /**
   * Assign roles based on player count and settings using RoleDistributionService
   */
  private assignRoles(room: IRoomDocument): Map<string, string> {
    const playerCount = room.players.length;
    const settings = room.settings;
    const roleAssignments = new Map<string, string>();
    
    // Build role config from room settings
    const roleConfig: RoleConfig = {
      enableAdvancedRoles: false, // Keep it simple for now
      enableNeutralRoles: settings.enableJester,
      enableChaosRoles: false,
      enableGodfather: settings.enableDonMafia,
      enableJester: settings.enableJester,
      enableVigilante: settings.enableVigilante,
      enableDoctor: true, // Always enabled
      enableDetective: true, // Always enabled
    };
    
    // Get role distribution from service
    const roleDistribution = RoleDistributionService.assignRoles(playerCount, roleConfig);
    
    // Convert role distribution to flat array
    const roles: Role[] = [];
    roleDistribution.roles.forEach(roleAssignment => {
      roles.push(roleAssignment.role);
    });
    
    // Shuffle roles using Fisher-Yates
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign to players
    room.players.forEach((player, index) => {
      roleAssignments.set(player.oderId, roles[index]);
      // Also update the room player object
      player.role = roles[index];
      player.team = ROLE_CONFIGS[roles[index]].team;
    });

    return roleAssignments;
  }

  /**
   * Start the game - transition from LOBBY to ROLE_REVEAL
   */
  async startGame(): Promise<void> {
    if (!this.gameState || !this.room) {
      throw new Error('Game not initialized');
    }

    await this.transitionTo(GamePhase.ROLE_REVEAL);
  }

  /**
   * Force transition to voting phase (for removal requests)
   */
  async forceTransitionToVoting(): Promise<void> {
    if (!this.gameState || !this.room) {
      throw new Error('Game not initialized');
    }

    // Clear existing timers
    this.clearTimers();

    // Update state directly to VOTING
    this.gameState.phase = GamePhase.VOTING;
    this.gameState.phaseStartTime = new Date();
    this.gameState.votes = new Map();
    this.gameState.currentTimer = this.timers.voting;
    
    this.startPhaseTimer(this.timers.voting, () => this.transitionTo(GamePhase.RESOLUTION));
    
    await this.gameState.save();
    
    gameLogger.phaseChanged(this.room.code, GamePhase.VOTING, this.gameState.dayNumber);
    
    this.emit('phase:change', GamePhase.VOTING, {
      dayNumber: this.gameState.dayNumber,
      timer: this.gameState.currentTimer
    });
  }

  /**
   * Handle player leaving during game - check win conditions
   */
  async handlePlayerLeave(playerId: string): Promise<WinCondition | null> {
    if (!this.gameState || !this.room) return null;

    // Remove from alive players if they were alive
    const aliveIndex = this.gameState.alivePlayers.indexOf(playerId);
    if (aliveIndex > -1) {
      this.gameState.alivePlayers.splice(aliveIndex, 1);
      this.gameState.deadPlayers.push(playerId);
      
      const role = this.gameState.roleAssignments.get(playerId) as Role;
      this.emit('player:eliminated', playerId, role, 'kill');
      
      await this.gameState.save();
    }

    // Check win conditions
    const winner = this.checkWinConditions();
    if (winner) {
      await this.transitionTo(GamePhase.GAME_OVER);
      return winner;
    }

    return null;
  }

  /**
   * Transition to a new phase
   */
  async transitionTo(newPhase: GamePhase): Promise<void> {
    if (!this.gameState || !this.room) {
      throw new Error('Game not initialized');
    }

    const currentPhase = this.gameState.phase as GamePhase;
    
    // Validate transition
    if (!PHASE_TRANSITIONS[currentPhase]?.includes(newPhase)) {
      logger.warn(`Invalid phase transition: ${currentPhase} -> ${newPhase}`);
      return;
    }

    // Clear existing timers
    this.clearTimers();

    // Update state
    this.gameState.phase = newPhase;
    this.gameState.phaseStartTime = new Date();
    
    // Handle phase-specific logic
    await this.handlePhaseEntry(newPhase);
    
    await this.gameState.save();
    
    gameLogger.phaseChanged(this.room.code, newPhase, this.gameState.dayNumber);
    
    this.emit('phase:change', newPhase, {
      dayNumber: this.gameState.dayNumber,
      timer: this.gameState.currentTimer
    });
  }

  /**
   * Handle logic when entering a new phase
   */
  private async handlePhaseEntry(phase: GamePhase): Promise<void> {
    if (!this.gameState || !this.room) return;

    switch (phase) {
      case GamePhase.ROLE_REVEAL:
        this.gameState.currentTimer = this.timers.roleReveal;
        this.startPhaseTimer(this.timers.roleReveal, () => this.transitionTo(GamePhase.NIGHT));
        break;

      case GamePhase.NIGHT:
        this.gameState.dayNumber++;
        this.resetNightActions();
        this.buildNightPhaseOrder();
        this.nightPhaseIndex = 0;
        
        // Save state before transitioning
        await this.gameState.save();
        gameLogger.phaseChanged(this.room.code, GamePhase.NIGHT, this.gameState.dayNumber);
        
        // Emit NIGHT phase briefly, then transition to MAFIA_ACTION
        this.emit('phase:change', GamePhase.NIGHT, {
          dayNumber: this.gameState.dayNumber,
          timer: 0
        });
        
        // Short delay then transition to first night action (MAFIA_ACTION)
        setTimeout(async () => {
          await this.transitionTo(this.nightPhaseOrder[0]);
        }, 100);
        return; // Return early to prevent double emit
        break;

      case GamePhase.MAFIA_ACTION:
        console.log('[GameStateMachine] Entering MAFIA_ACTION phase');
        this.gameState.currentTimer = this.timers.mafiaAction;
        this.startRoleTimer(Role.MAFIA, this.timers.mafiaAction);
        this.startPhaseTimer(this.timers.mafiaAction, () => this.advanceNightPhase());
        console.log('[GameStateMachine] Emitting action required for MAFIA');
        this.emitActionRequired(Role.MAFIA);
        break;

      case GamePhase.DON_ACTION:
        this.gameState.currentTimer = this.timers.donAction;
        this.startRoleTimer(Role.DON_MAFIA, this.timers.donAction);
        this.startPhaseTimer(this.timers.donAction, () => this.advanceNightPhase());
        this.emitActionRequired(Role.DON_MAFIA);
        break;

      case GamePhase.DETECTIVE_ACTION:
        this.gameState.currentTimer = this.timers.detectiveAction;
        this.startRoleTimer(Role.DETECTIVE, this.timers.detectiveAction);
        this.startPhaseTimer(this.timers.detectiveAction, () => this.advanceNightPhase());
        this.emitActionRequired(Role.DETECTIVE);
        break;

      case GamePhase.DOCTOR_ACTION:
        this.gameState.currentTimer = this.timers.doctorAction;
        this.startRoleTimer(Role.DOCTOR, this.timers.doctorAction);
        this.startPhaseTimer(this.timers.doctorAction, () => this.advanceNightPhase());
        this.emitActionRequired(Role.DOCTOR);
        break;

      case GamePhase.VIGILANTE_ACTION:
        this.gameState.currentTimer = this.timers.vigilanteAction;
        this.startRoleTimer(Role.VIGILANTE, this.timers.vigilanteAction);
        this.startPhaseTimer(this.timers.vigilanteAction, () => this.advanceNightPhase());
        this.emitActionRequired(Role.VIGILANTE);
        break;

      case GamePhase.DAY_DISCUSSION:
        // Resolve night actions first
        await this.resolveNightActions();
        this.gameState.currentTimer = this.timers.dayDiscussion;
        this.startPhaseTimer(this.timers.dayDiscussion, () => this.transitionTo(GamePhase.VOTING));
        break;

      case GamePhase.VOTING:
        this.gameState.votes = new Map();
        this.gameState.currentTimer = this.timers.voting;
        this.startPhaseTimer(this.timers.voting, () => this.transitionTo(GamePhase.RESOLUTION));
        break;

      case GamePhase.RESOLUTION:
        await this.resolveVoting();
        this.gameState.currentTimer = this.timers.resolution;
        
        // Check win conditions
        const winner = this.checkWinConditions();
        if (winner) {
          this.startPhaseTimer(this.timers.resolution, () => this.transitionTo(GamePhase.GAME_OVER));
        } else {
          this.startPhaseTimer(this.timers.resolution, () => this.transitionTo(GamePhase.NIGHT));
        }
        break;

      case GamePhase.GAME_OVER:
        await this.endGame();
        break;
    }
  }

  /**
   * Build the order of night phases based on alive roles
   * Order: MAFIA -> DOCTOR -> (other roles) -> DAY_DISCUSSION
   * Doctor acts right after Mafia to ensure Doctor doesn't know who was targeted
   */
  private buildNightPhaseOrder(): void {
    if (!this.gameState || !this.room) return;

    this.nightPhaseOrder = [GamePhase.MAFIA_ACTION];
    
    const aliveRoles = this.getAliveRoles();

    // Doctor acts immediately after Mafia - Doctor doesn't know who was targeted
    if (aliveRoles.has(Role.DOCTOR)) {
      this.nightPhaseOrder.push(GamePhase.DOCTOR_ACTION);
    }

    // Don investigation happens after Doctor
    if (aliveRoles.has(Role.DON_MAFIA)) {
      this.nightPhaseOrder.push(GamePhase.DON_ACTION);
    }

    // Detective investigates
    if (aliveRoles.has(Role.DETECTIVE)) {
      this.nightPhaseOrder.push(GamePhase.DETECTIVE_ACTION);
    }

    // Vigilante (if they haven't used their kill)
    if (aliveRoles.has(Role.VIGILANTE)) {
      const vigilanteId = this.getPlayerIdByRole(Role.VIGILANTE);
      if (vigilanteId && !this.gameState.vigilanteKillUsed.get(vigilanteId)) {
        this.nightPhaseOrder.push(GamePhase.VIGILANTE_ACTION);
      }
    }

    // Add DAY_DISCUSSION as the final phase after all night actions
    this.nightPhaseOrder.push(GamePhase.DAY_DISCUSSION);
  }

  /**
   * Advance to next night phase
   * Finalizes current phase actions before moving to next
   */
  private async advanceNightPhase(): Promise<void> {
    if (!this.gameState) return;

    const currentPhase = this.gameState.phase;
    
    // When leaving MAFIA_ACTION phase, finalize the Mafia target (but don't reveal it)
    if (currentPhase === GamePhase.MAFIA_ACTION) {
      const mafiaTarget = this.calculateMafiaTarget();
      this.gameState.nightActions.mafiaTarget = mafiaTarget;
      await this.gameState.save();
    }

    this.nightPhaseIndex++;
    
    if (this.nightPhaseIndex < this.nightPhaseOrder.length) {
      await this.transitionTo(this.nightPhaseOrder[this.nightPhaseIndex]);
    }
  }

  /**
   * Reset night actions for a new night
   */
  private resetNightActions(): void {
    if (!this.gameState) return;

    this.gameState.nightActions = {
      mafiaVotes: new Map(),
      mafiaTarget: undefined,
      detectiveTarget: undefined,
      detectiveResult: undefined,
      doctorTarget: undefined,
      donTarget: undefined,
      donResult: undefined,
      vigilanteTarget: undefined
    };
  }

  /**
   * Process a night action from a player
   */
  async processNightAction(playerId: string, targetId: string, actionType: ActionType): Promise<boolean> {
    if (!this.gameState || !this.room) return false;

    const playerRole = this.gameState.roleAssignments.get(playerId) as Role;
    if (!playerRole) return false;

    // Validate the action is allowed
    if (!this.validateAction(playerId, targetId, actionType)) {
      return false;
    }

    switch (actionType) {
      case ActionType.MAFIA_KILL:
        this.gameState.nightActions.mafiaVotes.set(playerId, targetId);
        await this.logAction(playerId, actionType, targetId);
        break;

      case ActionType.DETECTIVE_INVESTIGATE:
        if (playerRole === Role.DETECTIVE) {
          this.gameState.nightActions.detectiveTarget = targetId;
          const targetRole = this.gameState.roleAssignments.get(targetId) as Role;
          const isGuilty = ROLE_CONFIGS[targetRole].team === Team.MAFIA;
          this.gameState.nightActions.detectiveResult = isGuilty;
          await this.logAction(playerId, actionType, targetId, { isGuilty });
          return true;
        }
        break;

      case ActionType.DON_INVESTIGATE:
        if (playerRole === Role.DON_MAFIA) {
          this.gameState.nightActions.donTarget = targetId;
          const targetRole = this.gameState.roleAssignments.get(targetId) as Role;
          const isDetective = targetRole === Role.DETECTIVE;
          this.gameState.nightActions.donResult = isDetective;
          await this.logAction(playerId, actionType, targetId, { isDetective });
          return true;
        }
        break;

      case ActionType.DOCTOR_SAVE:
        if (playerRole === Role.DOCTOR) {
          // Check consecutive self-save rule
          const lastSave = this.gameState.lastDoctorSave.get(playerId);
          if (targetId === playerId && lastSave === playerId) {
            return false; // Cannot self-save twice in a row
          }
          this.gameState.nightActions.doctorTarget = targetId;
          this.gameState.lastDoctorSave.set(playerId, targetId);
          await this.logAction(playerId, actionType, targetId);
          return true;
        }
        break;

      case ActionType.VIGILANTE_KILL:
        if (playerRole === Role.VIGILANTE) {
          if (this.gameState.vigilanteKillUsed.get(playerId)) {
            return false; // Already used their kill
          }
          this.gameState.nightActions.vigilanteTarget = targetId;
          this.gameState.vigilanteKillUsed.set(playerId, true);
          await this.logAction(playerId, actionType, targetId);
          return true;
        }
        break;
    }

    await this.gameState.save();
    return true;
  }

  /**
   * Validate if an action is allowed
   */
  private validateAction(playerId: string, targetId: string, actionType: ActionType): boolean {
    if (!this.gameState || !this.room) return false;

    // Check if player is alive
    if (!this.gameState.alivePlayers.includes(playerId)) {
      return false;
    }

    // Check if target is alive (except for some special cases)
    if (!this.gameState.alivePlayers.includes(targetId)) {
      return false;
    }

    const playerRole = this.gameState.roleAssignments.get(playerId) as Role;
    const currentPhase = this.gameState.phase as GamePhase;

    // Validate role-action-phase combinations
    switch (actionType) {
      case ActionType.MAFIA_KILL:
        if (currentPhase !== GamePhase.MAFIA_ACTION) return false;
        if (playerRole !== Role.MAFIA && playerRole !== Role.DON_MAFIA) return false;
        // Cannot target fellow mafia
        const targetTeam = this.gameState.teamAssignments.get(targetId);
        if (targetTeam === Team.MAFIA) return false;
        break;

      case ActionType.DETECTIVE_INVESTIGATE:
        if (currentPhase !== GamePhase.DETECTIVE_ACTION) return false;
        if (playerRole !== Role.DETECTIVE) return false;
        // Cannot investigate self
        if (targetId === playerId) return false;
        break;

      case ActionType.DON_INVESTIGATE:
        if (currentPhase !== GamePhase.DON_ACTION) return false;
        if (playerRole !== Role.DON_MAFIA) return false;
        break;

      case ActionType.DOCTOR_SAVE:
        if (currentPhase !== GamePhase.DOCTOR_ACTION) return false;
        if (playerRole !== Role.DOCTOR) return false;
        break;

      case ActionType.VIGILANTE_KILL:
        if (currentPhase !== GamePhase.VIGILANTE_ACTION) return false;
        if (playerRole !== Role.VIGILANTE) return false;
        // Cannot target self
        if (targetId === playerId) return false;
        break;

      default:
        return false;
    }

    return true;
  }

  /**
   * Resolve all night actions and determine outcomes
   * Called when transitioning to DAY_DISCUSSION
   */
  private async resolveNightActions(): Promise<void> {
    if (!this.gameState || !this.room) return;

    const nightActions = this.gameState.nightActions;
    let killedPlayerId: string | undefined;
    let wasSaved = false;

    // 1. Get Mafia target (already determined when MAFIA_ACTION ended)
    // If not set yet, calculate it now
    const mafiaTarget = nightActions.mafiaTarget || this.calculateMafiaTarget();
    nightActions.mafiaTarget = mafiaTarget;

    // 2. Check if Doctor saved the target
    // Doctor doesn't know who was targeted - they just pick someone to save
    if (mafiaTarget && nightActions.doctorTarget === mafiaTarget) {
      wasSaved = true;
      // Player is saved - not eliminated
    } else if (mafiaTarget) {
      killedPlayerId = mafiaTarget;
    }

    // 3. Process Vigilante kill (if any)
    if (nightActions.vigilanteTarget) {
      // Vigilante kill happens regardless of doctor (unless doctor saved vigilante target)
      if (nightActions.doctorTarget !== nightActions.vigilanteTarget) {
        // If mafia target was saved but vigilante targets same person, they still die
        if (nightActions.vigilanteTarget === mafiaTarget && wasSaved) {
          // Both targeted same person, doctor can only save from one
          killedPlayerId = nightActions.vigilanteTarget;
          wasSaved = false;
        } else if (!killedPlayerId || killedPlayerId !== nightActions.vigilanteTarget) {
          // Vigilante kills a different target
          await this.eliminatePlayer(nightActions.vigilanteTarget, 'kill');
        }
      }
    }

    // 4. Apply Mafia kill
    if (killedPlayerId) {
      await this.eliminatePlayer(killedPlayerId, 'kill');
    }

    // Store result for announcement
    const killedRole = killedPlayerId 
      ? this.gameState.roleAssignments.get(killedPlayerId) as Role 
      : undefined;

    // Build deaths array for client
    const deaths: Array<{ playerId: string; role?: Role; cause?: string }> = [];
    if (killedPlayerId) {
      deaths.push({
        playerId: killedPlayerId,
        role: killedRole,
        cause: 'Killed by Mafia'
      });
    }

    // Build saves array for client
    const saves: Array<{ playerId: string }> = [];
    if (wasSaved && mafiaTarget) {
      saves.push({ playerId: mafiaTarget });
    }

    this.gameState.lastNightResult = {
      killedPlayerId,
      killedPlayerRole: killedRole,
      wasSaved,
      savedPlayerId: wasSaved ? mafiaTarget : undefined,
      deaths,
      saves
    };

    await this.gameState.save();

    this.emit('night:result', this.gameState.lastNightResult);
  }

  /**
   * Calculate Mafia kill target based on votes
   */
  private calculateMafiaTarget(): string | undefined {
    if (!this.gameState) return undefined;

    const votes = this.gameState.nightActions.mafiaVotes;
    if (votes.size === 0) return undefined;

    const voteCounts = new Map<string, number>();
    
    votes.forEach((targetId) => {
      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
    });

    let maxVotes = 0;
    let target: string | undefined;

    voteCounts.forEach((count, targetId) => {
      if (count > maxVotes) {
        maxVotes = count;
        target = targetId;
      }
    });

    return target;
  }

  /**
   * Process a day vote
   */
  async processVote(voterId: string, targetId: string): Promise<boolean> {
    if (!this.gameState || !this.room) return false;

    // Validate voter is alive
    if (!this.gameState.alivePlayers.includes(voterId)) {
      return false;
    }

    // Validate target is alive
    if (!this.gameState.alivePlayers.includes(targetId)) {
      return false;
    }

    // Validate we're in voting phase
    if (this.gameState.phase !== GamePhase.VOTING) {
      return false;
    }

    // Record vote
    this.gameState.votes.set(voterId, targetId);
    await this.gameState.save();

    // Emit vote update
    const voteCounts = this.calculateVoteCounts();
    this.emit('vote:update', voteCounts);

    return true;
  }

  /**
   * Calculate vote counts
   */
  private calculateVoteCounts(): Record<string, number> {
    if (!this.gameState) return {};

    const counts: Record<string, number> = {};
    
    this.gameState.votes.forEach((targetId) => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });

    return counts;
  }

  /**
   * Resolve voting phase
   */
  private async resolveVoting(): Promise<void> {
    if (!this.gameState || !this.room) return;

    const voteCounts = this.calculateVoteCounts();
    const entries = Object.entries(voteCounts);

    if (entries.length === 0) {
      // No votes cast
      this.gameState.eliminatedToday = undefined;
      return;
    }

    // Sort by vote count descending
    entries.sort((a, b) => b[1] - a[1]);

    const [topTargetId, topVotes] = entries[0];
    const [secondTargetId, secondVotes] = entries[1] || [null, 0];

    // Check for tie
    if (topVotes === secondVotes) {
      switch (this.room.settings.tieBreaker) {
        case 'no_elimination':
          this.gameState.eliminatedToday = undefined;
          return;
        case 'random':
          // Randomly pick between tied candidates
          const tiedCandidates = entries.filter(([_, votes]) => votes === topVotes);
          const randomIndex = Math.floor(Math.random() * tiedCandidates.length);
          this.gameState.eliminatedToday = tiedCandidates[randomIndex][0];
          break;
        case 'revote':
          // For simplicity, treat as no elimination
          this.gameState.eliminatedToday = undefined;
          return;
      }
    } else {
      this.gameState.eliminatedToday = topTargetId;
    }

    // Check for Jester win
    if (this.gameState.eliminatedToday) {
      const eliminatedRole = this.gameState.roleAssignments.get(this.gameState.eliminatedToday) as Role;
      
      if (eliminatedRole === Role.JESTER) {
        // Jester wins!
        this.gameState.winner = WinCondition.JESTER_WINS;
        this.gameState.winningTeam = Team.NEUTRAL;
        this.gameState.winningPlayers = [this.gameState.eliminatedToday];
      }

      await this.eliminatePlayer(this.gameState.eliminatedToday, 'vote');
    }

    await this.gameState.save();
  }

  /**
   * Eliminate a player
   */
  private async eliminatePlayer(playerId: string, reason: 'vote' | 'kill'): Promise<void> {
    if (!this.gameState || !this.room) return;

    const playerIndex = this.gameState.alivePlayers.indexOf(playerId);
    if (playerIndex === -1) return;

    // Move from alive to dead
    this.gameState.alivePlayers.splice(playerIndex, 1);
    this.gameState.deadPlayers.push(playerId);

    // Update room player status
    const roomPlayer = this.room.players.find(p => p.oderId === playerId);
    if (roomPlayer) {
      roomPlayer.status = PlayerStatus.DEAD;
    }

    const role = this.gameState.roleAssignments.get(playerId) as Role;

    await this.gameState.save();
    await this.room.save();

    gameLogger.playerEliminated(this.room.code, playerId, role, reason);

    this.emit('player:eliminated', playerId, role, reason);
  }

  /**
   * Check win conditions
   */
  checkWinConditions(): WinCondition | null {
    if (!this.gameState) return null;

    // Already have a winner (Jester)
    if (this.gameState.winner) {
      return this.gameState.winner as WinCondition;
    }

    const alivePlayers = this.gameState.alivePlayers;
    let mafiaCount = 0;
    let townCount = 0;

    alivePlayers.forEach(playerId => {
      const team = this.gameState!.teamAssignments.get(playerId) as Team;
      if (team === Team.MAFIA) {
        mafiaCount++;
      } else if (team === Team.TOWN) {
        townCount++;
      }
      // Neutral players don't affect win conditions directly
    });

    // Mafia wins when they equal or outnumber town
    if (mafiaCount >= townCount) {
      this.gameState.winner = WinCondition.MAFIA_WINS;
      this.gameState.winningTeam = Team.MAFIA;
      this.gameState.winningPlayers = alivePlayers.filter(id => 
        this.gameState!.teamAssignments.get(id) === Team.MAFIA
      );
      return WinCondition.MAFIA_WINS;
    }

    // Town wins when all mafia are eliminated
    if (mafiaCount === 0) {
      this.gameState.winner = WinCondition.TOWN_WINS;
      this.gameState.winningTeam = Team.TOWN;
      this.gameState.winningPlayers = alivePlayers.filter(id => 
        this.gameState!.teamAssignments.get(id) === Team.TOWN
      );
      return WinCondition.TOWN_WINS;
    }

    return null;
  }

  /**
   * End the game
   */
  private async endGame(): Promise<void> {
    if (!this.gameState || !this.room) return;

    this.clearTimers();

    this.gameState.endedAt = new Date();
    await this.gameState.save();

    // Update room
    this.room.isActive = false;
    await this.room.save();

    gameLogger.gameEnded(
      this.room.code, 
      this.gameState.winner || 'unknown', 
      this.gameState.dayNumber
    );

    this.emit('game:end', 
      this.gameState.winner as WinCondition, 
      this.gameState.winningTeam as Team,
      this.gameState.winningPlayers
    );
  }

  /**
   * Start the main phase timer
   */
  private startPhaseTimer(duration: number, onComplete: () => void): void {
    let remaining = duration;
    
    this.phaseTimer = setInterval(() => {
      remaining--;
      
      if (this.gameState) {
        this.gameState.currentTimer = remaining;
        this.emit('timer:tick', remaining, this.gameState.phase as GamePhase);
      }

      if (remaining <= 0) {
        this.clearPhaseTimer();
        onComplete();
      }
    }, 1000);
  }

  /**
   * Start a role-specific timer
   */
  private startRoleTimer(role: Role, duration: number): void {
    let remaining = duration;
    this.currentRoleTimerRole = role;
    
    this.roleTimer = setInterval(() => {
      remaining--;
      this.emit('timer:roleSpecific', remaining, role);

      if (remaining <= 0) {
        this.clearRoleTimer();
      }
    }, 1000);
  }

  /**
   * Emit action required event
   */
  private emitActionRequired(role: Role): void {
    if (!this.gameState) return;

    const validTargets = this.getValidTargets(role);
    const timer = this.getRoleTimer(role);

    this.emit('action:required', role, timer, validTargets);
  }

  /**
   * Get valid targets for a role
   */
  getValidTargets(role: Role): string[] {
    if (!this.gameState) return [];

    const alivePlayers = this.gameState.alivePlayers;

    switch (role) {
      case Role.MAFIA:
      case Role.DON_MAFIA:
        // Cannot target fellow mafia
        return alivePlayers.filter(id => 
          this.gameState!.teamAssignments.get(id) !== Team.MAFIA
        );

      case Role.DETECTIVE:
        // Cannot investigate self
        const detectiveId = this.getPlayerIdByRole(Role.DETECTIVE);
        return alivePlayers.filter(id => id !== detectiveId);

      case Role.DOCTOR:
        // Can target anyone (including self, with restrictions)
        return alivePlayers;

      case Role.VIGILANTE:
        // Cannot target self
        const vigilanteId = this.getPlayerIdByRole(Role.VIGILANTE);
        return alivePlayers.filter(id => id !== vigilanteId);

      default:
        return alivePlayers;
    }
  }

  /**
   * Get player ID by role
   */
  getPlayerIdByRole(role: Role): string | undefined {
    if (!this.gameState) return undefined;

    for (const [oderId, playerRole] of this.gameState.roleAssignments.entries()) {
      if (playerRole === role && this.gameState.alivePlayers.includes(oderId)) {
        return oderId;
      }
    }

    return undefined;
  }

  /**
   * Get alive roles
   */
  private getAliveRoles(): Set<Role> {
    if (!this.gameState) return new Set();

    const roles = new Set<Role>();
    
    this.gameState.alivePlayers.forEach(playerId => {
      const role = this.gameState!.roleAssignments.get(playerId) as Role;
      if (role) roles.add(role);
    });

    return roles;
  }

  /**
   * Get timer for a specific role
   */
  private getRoleTimer(role: Role): number {
    switch (role) {
      case Role.MAFIA:
      case Role.DON_MAFIA:
        return this.timers.mafiaAction;
      case Role.DETECTIVE:
        return this.timers.detectiveAction;
      case Role.DOCTOR:
        return this.timers.doctorAction;
      case Role.VIGILANTE:
        return this.timers.vigilanteAction;
      default:
        return 30;
    }
  }

  /**
   * Log an action
   */
  private async logAction(
    playerId: string, 
    actionType: ActionType, 
    targetId?: string, 
    result?: object
  ): Promise<void> {
    if (!this.gameState || !this.room) return;

    const playerRole = this.gameState.roleAssignments.get(playerId) as Role;

    await ActionLog.create({
      roomId: this.room._id,
      gameId: this.gameState._id,
      dayNumber: this.gameState.dayNumber,
      phase: this.gameState.phase,
      playerId,
      playerRole,
      actionType,
      targetId,
      result,
      timestamp: new Date()
    });

    gameLogger.actionPerformed(this.room.code, playerId, actionType, targetId);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    this.clearPhaseTimer();
    this.clearRoleTimer();
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearInterval(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private clearRoleTimer(): void {
    if (this.roleTimer) {
      clearInterval(this.roleTimer);
      this.roleTimer = null;
    }
    this.currentRoleTimerRole = null;
  }

  /**
   * Get current game state
   */
  getState(): IGameStateDocument | null {
    return this.gameState;
  }

  /**
   * Get current room
   */
  getRoom(): IRoomDocument | null {
    return this.room;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearTimers();
    this.removeAllListeners();
    this.gameState = null;
    this.room = null;
  }
}
