/**
 * AI Bot System
 * Intelligent bots that play Mafia like humans
 * 
 * Bots are designed to:
 * - Follow game rules perfectly
 * - Make believable decisions based on their role
 * - Participate naturally in discussions
 * - Never leak hidden information
 * - Scale in difficulty
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Role, 
  Team, 
  GamePhase, 
  PlayerStatus,
  IPlayer,
  ActionType
} from '../types';
import logger from '../utils/logger';

// Bot personality types affect behavior style
export type BotPersonality = 'AGGRESSIVE' | 'PASSIVE' | 'DECEPTIVE' | 'ANALYTICAL' | 'RANDOM';

// Bot difficulty affects decision quality
export enum BotDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT'
}

// Bot state for tracking game context
export interface BotState {
  oderId: string;
  username: string;
  personality: BotPersonality;
  difficulty: BotDifficulty;
  role?: Role;
  team?: Team;
  
  // Knowledge (what the bot knows or suspects)
  suspicions: Map<string, number>; // playerId -> suspicion level (0-100)
  confirmedMafia: Set<string>;
  confirmedTown: Set<string>;
  confirmedRoles: Map<string, Role>;
  
  // Behavior tracking
  hasSpoken: boolean;
  lastActionTarget?: string;
  votingHistory: Map<string, string[]>; // day -> targets voted for
  defenseAttempts: number;
  
  // Timing
  actionDelay: number; // ms to wait before acting (human-like)
  chatFrequency: number; // how often to chat (0-1)
}

// Export the IBot interface for external use
export interface IBot {
  odId: string;
  oderId: string;
  username: string;
  socketId: string;
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  consecutiveSelfSaves: number;
  vigilanteKillUsed: boolean;
}

// Chat message templates by context
interface ChatTemplates {
  greeting: string[];
  accusation: string[];
  defense: string[];
  agreement: string[];
  disagreement: string[];
  confusion: string[];
  suspicion: string[];
  townConfirm: string[];
  mafiaChat: string[];
  votingIntent: string[];
  nightAction: string[];
  death: string[];
  generic: string[];
}

// Extensive chat templates for natural conversation
const CHAT_TEMPLATES: ChatTemplates = {
  greeting: [
    "Hey everyone",
    "Let's figure this out",
    "Alright, who's suspicious?",
    "Good morning town",
    "Another day, let's be smart about this",
    "We need to find the mafia today"
  ],
  accusation: [
    "I think {player} is suspicious",
    "{player} has been too quiet",
    "Has anyone noticed {player}'s behavior?",
    "I'm getting mafia vibes from {player}",
    "{player} seems off to me",
    "We should look at {player}",
    "Something about {player} doesn't sit right",
    "{player}'s vote pattern is suspicious"
  ],
  defense: [
    "I'm town, trust me",
    "I've been helping the town all game",
    "Why would I do that if I was mafia?",
    "Check my voting history",
    "That doesn't make sense, I'm innocent",
    "You're barking up the wrong tree",
    "I've been contributing to discussion",
    "Voting me out would be a mistake"
  ],
  agreement: [
    "I agree with that",
    "Good point",
    "Yeah, I was thinking the same",
    "That makes sense",
    "I can get behind that",
    "True"
  ],
  disagreement: [
    "I don't think so",
    "That seems like a stretch",
    "I'm not convinced",
    "We need more evidence",
    "Let's not rush this",
    "I disagree"
  ],
  confusion: [
    "I'm not sure what to think",
    "This is confusing",
    "Need more info",
    "Hard to tell at this point",
    "Could go either way"
  ],
  suspicion: [
    "That's suspicious",
    "Interesting...",
    "Hmm, noted",
    "I'll keep an eye on that",
    "That raises some flags"
  ],
  townConfirm: [
    "I know {player} is town",
    "Can confirm {player} is safe",
    "{player} has been cleared in my book",
    "We can trust {player}"
  ],
  mafiaChat: [
    "Who should we target?",
    "Let's go for {player}",
    "We need to eliminate the detective",
    "Be careful not to seem suspicious tomorrow",
    "Stay calm in discussion",
    "Let's coordinate our votes",
    "Don't vote together, it looks suspicious",
    "{player} is getting too close to us"
  ],
  votingIntent: [
    "I'm voting {player}",
    "My vote goes to {player}",
    "{player} for me",
    "Casting my vote for {player}",
    "I think we should eliminate {player}"
  ],
  nightAction: [
    "Made my choice",
    "Done",
    "Action submitted",
    "Let's see how this goes"
  ],
  death: [
    "Well played everyone",
    "GG",
    "Should have seen that coming",
    "Interesting game"
  ],
  generic: [
    "Let's think about this",
    "We need to be careful",
    "Don't want to make a mistake",
    "Trust your gut",
    "Anyone have any reads?",
    "What do you all think?"
  ]
};

// Bot name pools
const BOT_NAMES = [
  // Classic names
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Charlie', 'Sam', 'Max', 'Jamie', 'Drew', 'Reese', 'Blair', 'Skyler',
  // Gaming-style names
  'Phoenix', 'Shadow', 'Storm', 'Blaze', 'Frost', 'Hawk', 'Viper', 'Wolf',
  'Raven', 'Ghost', 'Ace', 'Nova', 'Cipher', 'Echo', 'Drift', 'Pulse',
  // Playful names
  'Lucky', 'Scout', 'Sparky', 'Dash', 'Flash', 'Zoom', 'Bolt', 'Turbo'
];

class BotService {
  private static instance: BotService;
  private activeBots: Map<string, BotState> = new Map();
  private usedNames: Set<string> = new Set();

  private constructor() {}

  static getInstance(): BotService {
    if (!BotService.instance) {
      BotService.instance = new BotService();
    }
    return BotService.instance;
  }

  /**
   * Create a new bot with unique identity
   */
  createBot(difficulty: BotDifficulty = BotDifficulty.MEDIUM, personality?: BotPersonality): IPlayer {
    const oderId = `bot_${uuidv4()}`;
    const username = this.generateUniqueName();
    
    // Select personality based on difficulty if not specified
    const selectedPersonality = personality || this.selectPersonality(difficulty);
    
    const botState: BotState = {
      oderId,
      username,
      personality: selectedPersonality,
      difficulty,
      suspicions: new Map(),
      confirmedMafia: new Set(),
      confirmedTown: new Set(),
      confirmedRoles: new Map(),
      hasSpoken: false,
      votingHistory: new Map(),
      defenseAttempts: 0,
      actionDelay: this.calculateActionDelay(difficulty),
      chatFrequency: this.calculateChatFrequency(personality || selectedPersonality)
    };

    this.activeBots.set(oderId, botState);
    
    logger.info(`Bot created: ${username} (${selectedPersonality}, ${difficulty})`);

    return {
      odId: uuidv4(),
      oderId,
      username,
      socketId: `bot_socket_${oderId}`,
      status: PlayerStatus.ALIVE,
      isHost: false,
      isConnected: true,
      consecutiveSelfSaves: 0,
      vigilanteKillUsed: false
    };
  }

  /**
   * Generate a unique bot name
   */
  private generateUniqueName(): string {
    const availableNames = BOT_NAMES.filter(n => !this.usedNames.has(n));
    
    if (availableNames.length === 0) {
      // All names used, add numbers
      const baseName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const suffix = Math.floor(Math.random() * 1000);
      return `${baseName}${suffix}`;
    }

    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    this.usedNames.add(name);
    return name;
  }

  /**
   * Select personality based on difficulty
   */
  private selectPersonality(difficulty: BotDifficulty): BotPersonality {
    const personalities: BotPersonality[] = ['AGGRESSIVE', 'PASSIVE', 'DECEPTIVE', 'ANALYTICAL', 'RANDOM'];
    
    switch (difficulty) {
      case 'EASY':
        return 'RANDOM';
      case 'MEDIUM':
        return personalities[Math.floor(Math.random() * 3)]; // First 3
      case 'HARD':
      case 'EXPERT':
        return personalities[Math.floor(Math.random() * personalities.length)];
      default:
        return 'RANDOM';
    }
  }

  /**
   * Calculate action delay for human-like timing
   */
  private calculateActionDelay(difficulty: BotDifficulty): number {
    const baseDelay = {
      'EASY': 3000,
      'MEDIUM': 2000,
      'HARD': 1500,
      'EXPERT': 1000
    }[difficulty];

    // Add random variance (-30% to +50%)
    const variance = baseDelay * (0.7 + Math.random() * 0.8);
    return Math.floor(variance);
  }

  /**
   * Calculate chat frequency based on personality
   */
  private calculateChatFrequency(personality: BotPersonality): number {
    switch (personality) {
      case 'AGGRESSIVE': return 0.7;
      case 'PASSIVE': return 0.3;
      case 'DECEPTIVE': return 0.5;
      case 'ANALYTICAL': return 0.6;
      case 'RANDOM': return 0.4;
      default: return 0.4;
    }
  }

  /**
   * Initialize bot with assigned role
   */
  assignRole(oderId: string, role: Role, team: Team, teammates?: string[]): void {
    const bot = this.activeBots.get(oderId);
    if (!bot) return;

    bot.role = role;
    bot.team = team;

    // Mafia bots know their teammates
    if (team === Team.MAFIA && teammates) {
      teammates.forEach(id => {
        if (id !== oderId) {
          bot.confirmedMafia.add(id);
        }
      });
    }

    logger.debug(`Bot ${bot.username} assigned role: ${role} (${team})`);
  }

  /**
   * Get bot's decision for night action
   */
  async decideNightAction(
    oderId: string,
    phase: GamePhase,
    validTargets: string[],
    gameContext: GameContext
  ): Promise<{ targetId: string | null; delay: number }> {
    const bot = this.activeBots.get(oderId);
    if (!bot || !bot.role) {
      return { targetId: null, delay: 0 };
    }

    // Calculate thinking delay
    const delay = bot.actionDelay + Math.random() * 2000;

    let targetId: string | null = null;

    switch (bot.role) {
      case Role.MAFIA:
      case Role.DON_MAFIA:
      case Role.GODFATHER:
      case Role.MAFIOSO:
        targetId = this.decideMafiaKill(bot, validTargets, gameContext);
        break;

      case Role.DETECTIVE:
      case Role.DEPUTY_DETECTIVE:
        targetId = this.decideDetectiveInvestigation(bot, validTargets, gameContext);
        break;

      case Role.DOCTOR:
      case Role.NURSE:
        targetId = this.decideDoctorSave(bot, validTargets, gameContext);
        break;

      case Role.DON_MAFIA:
        if (phase === GamePhase.DON_ACTION) {
          targetId = this.decideDonInvestigation(bot, validTargets, gameContext);
        }
        break;

      case Role.VIGILANTE:
        targetId = this.decideVigilanteKill(bot, validTargets, gameContext);
        break;

      default:
        // Roles without night actions
        break;
    }

    if (targetId) {
      bot.lastActionTarget = targetId;
    }

    return { targetId, delay };
  }

  /**
   * Mafia kill decision logic
   */
  private decideMafiaKill(bot: BotState, targets: string[], ctx: GameContext): string | null {
    if (targets.length === 0) return null;

    // Priority targets based on suspected roles
    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of targets) {
      let priority = 50; // Base priority

      // High priority: suspected power roles
      if (bot.confirmedRoles.has(targetId)) {
        const role = bot.confirmedRoles.get(targetId)!;
        if (role === Role.DETECTIVE) priority = 100;
        else if (role === Role.DOCTOR) priority = 90;
        else if (role === Role.VIGILANTE) priority = 85;
        else if (role === Role.MAYOR) priority = 80;
      }

      // Increase priority for players who accused mafia
      const accuserScore = ctx.recentAccusations?.get(targetId) || 0;
      if (accuserScore > 0) {
        priority += Math.min(accuserScore * 10, 30);
      }

      // Decrease priority for confirmed town (don't waste kill on confirmed)
      if (bot.confirmedTown.has(targetId)) {
        priority -= 20;
      }

      // Difficulty affects targeting decisions
      if (bot.difficulty === 'EASY') {
        priority = 50 + Math.random() * 30; // More random
      }

      priorityTargets.push({ id: targetId, priority });
    }

    // Sort by priority and select
    priorityTargets.sort((a, b) => b.priority - a.priority);
    
    // Top difficulty picks best target, lower difficulties have variance
    const selectionPool = bot.difficulty === 'EXPERT' ? 1 : 
                         bot.difficulty === 'HARD' ? 2 : 
                         bot.difficulty === 'MEDIUM' ? 3 : 5;
    
    const pool = priorityTargets.slice(0, Math.min(selectionPool, priorityTargets.length));
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  /**
   * Detective investigation decision
   */
  private decideDetectiveInvestigation(bot: BotState, targets: string[], ctx: GameContext): string | null {
    if (targets.length === 0) return null;

    // Prioritize: suspicious players > active speakers > random
    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of targets) {
      let priority = 50;

      // Skip already confirmed players
      if (bot.confirmedMafia.has(targetId) || bot.confirmedTown.has(targetId)) {
        continue;
      }

      // Prioritize suspicious players
      const suspicion = bot.suspicions.get(targetId) || 50;
      priority = suspicion;

      // Boost priority for active players (more info to gain)
      if (ctx.activeSpeakers?.has(targetId)) {
        priority += 15;
      }

      // Recent accusers might be mafia trying to frame
      const accuserScore = ctx.recentAccusations?.get(targetId) || 0;
      if (accuserScore > 2) {
        priority += 10;
      }

      priorityTargets.push({ id: targetId, priority });
    }

    if (priorityTargets.length === 0) {
      return targets[Math.floor(Math.random() * targets.length)];
    }

    priorityTargets.sort((a, b) => b.priority - a.priority);
    
    // Some randomness for lower difficulties
    const topN = bot.difficulty === 'EXPERT' ? 1 : bot.difficulty === 'HARD' ? 2 : 3;
    const pool = priorityTargets.slice(0, Math.min(topN, priorityTargets.length));
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  /**
   * Doctor save decision
   */
  private decideDoctorSave(bot: BotState, targets: string[], ctx: GameContext): string | null {
    if (targets.length === 0) return null;

    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of targets) {
      let priority = 50;

      // High priority: confirmed important roles
      if (bot.confirmedRoles.has(targetId)) {
        const role = bot.confirmedRoles.get(targetId)!;
        if (role === Role.DETECTIVE) priority = 95;
        else if (role === Role.MAYOR) priority = 85;
        else if (role === Role.VIGILANTE) priority = 80;
      }

      // Protect confirmed town over unknown
      if (bot.confirmedTown.has(targetId)) {
        priority += 20;
      }

      // Don't protect confirmed mafia
      if (bot.confirmedMafia.has(targetId)) {
        priority = 0;
      }

      // Protect vocal town players (targets for mafia)
      if (ctx.activeSpeakers?.has(targetId)) {
        priority += 10;
      }

      // Self-protection occasionally
      if (targetId === bot.oderId) {
        priority = 60; // Moderate self-protection
      }

      priorityTargets.push({ id: targetId, priority });
    }

    priorityTargets.sort((a, b) => b.priority - a.priority);
    
    // Doctors tend to protect important targets
    const pool = priorityTargets.slice(0, 2);
    return pool[Math.floor(Math.random() * pool.length)]?.id || null;
  }

  /**
   * Don investigation decision (looking for detective)
   */
  private decideDonInvestigation(bot: BotState, targets: string[], ctx: GameContext): string | null {
    if (targets.length === 0) return null;

    // Prioritize players who seem too confident/accurate
    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of targets) {
      // Skip known players
      if (bot.confirmedMafia.has(targetId) || bot.confirmedRoles.has(targetId)) {
        continue;
      }

      let priority = 50;

      // Players who correctly identified mafia are suspicious
      const accusationScore = ctx.recentAccusations?.get(targetId) || 0;
      priority += accusationScore * 15;

      // Active investigators are sometimes detectives
      if (ctx.activeSpeakers?.has(targetId)) {
        priority += 10;
      }

      priorityTargets.push({ id: targetId, priority });
    }

    if (priorityTargets.length === 0) {
      return targets[Math.floor(Math.random() * targets.length)];
    }

    priorityTargets.sort((a, b) => b.priority - a.priority);
    return priorityTargets[0].id;
  }

  /**
   * Vigilante kill decision
   */
  private decideVigilanteKill(bot: BotState, targets: string[], ctx: GameContext): string | null {
    if (targets.length === 0) return null;

    // Vigilantes should be careful - only kill if confident
    const threshold = bot.difficulty === 'EXPERT' ? 70 : 
                     bot.difficulty === 'HARD' ? 60 : 50;

    // Find most suspicious player
    let bestTarget: { id: string; suspicion: number } | null = null;

    for (const targetId of targets) {
      // Never kill confirmed town
      if (bot.confirmedTown.has(targetId)) continue;
      
      // Prioritize confirmed mafia
      if (bot.confirmedMafia.has(targetId)) {
        return targetId;
      }

      const suspicion = bot.suspicions.get(targetId) || 50;
      if (!bestTarget || suspicion > bestTarget.suspicion) {
        bestTarget = { id: targetId, suspicion };
      }
    }

    // Only shoot if suspicion is above threshold
    if (bestTarget && bestTarget.suspicion >= threshold) {
      return bestTarget.id;
    }

    // Easy/Medium bots might skip if unsure
    if (bot.difficulty === 'EASY' || bot.difficulty === 'MEDIUM') {
      return null;
    }

    return bestTarget?.id || null;
  }

  /**
   * Get bot's voting decision
   */
  async decideVote(
    oderId: string,
    candidates: string[],
    currentVotes: Map<string, number>,
    gameContext: GameContext
  ): Promise<{ targetId: string | null; delay: number }> {
    const bot = this.activeBots.get(oderId);
    if (!bot || !bot.role) {
      return { targetId: null, delay: 0 };
    }

    const delay = bot.actionDelay + Math.random() * 3000;

    // Mafia bots coordinate (but not too obviously)
    if (bot.team === Team.MAFIA) {
      return { 
        targetId: this.decideMafiaVote(bot, candidates, currentVotes, gameContext), 
        delay 
      };
    }

    // Town/Neutral voting logic
    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of candidates) {
      // Never vote for self
      if (targetId === bot.oderId) continue;

      let priority = 50;

      // Confirmed mafia = very high priority
      if (bot.confirmedMafia.has(targetId)) {
        priority = 100;
      }
      // Confirmed town = very low priority
      else if (bot.confirmedTown.has(targetId)) {
        priority = 10;
      }
      // Use suspicion levels
      else {
        priority = bot.suspicions.get(targetId) || 50;
      }

      // Bandwagon effect - follow existing votes somewhat
      const existingVotes = currentVotes.get(targetId) || 0;
      if (existingVotes > 0 && bot.difficulty !== 'EXPERT') {
        priority += existingVotes * 5;
      }

      priorityTargets.push({ id: targetId, priority });
    }

    if (priorityTargets.length === 0) {
      return { targetId: null, delay }; // Skip vote
    }

    priorityTargets.sort((a, b) => b.priority - a.priority);

    // Easy bots have more randomness
    const selectionPool = bot.difficulty === 'EASY' ? 4 : 
                         bot.difficulty === 'MEDIUM' ? 2 : 1;
    
    const pool = priorityTargets.slice(0, Math.min(selectionPool, priorityTargets.length));
    const targetId = pool[Math.floor(Math.random() * pool.length)].id;

    // Record voting history
    const dayStr = gameContext.dayNumber?.toString() || '1';
    if (!bot.votingHistory.has(dayStr)) {
      bot.votingHistory.set(dayStr, []);
    }
    bot.votingHistory.get(dayStr)!.push(targetId);

    return { targetId, delay };
  }

  /**
   * Mafia-specific voting logic
   */
  private decideMafiaVote(
    bot: BotState,
    candidates: string[],
    currentVotes: Map<string, number>,
    ctx: GameContext
  ): string | null {
    const townCandidates = candidates.filter(id => 
      id !== bot.oderId && !bot.confirmedMafia.has(id)
    );

    if (townCandidates.length === 0) return null;

    // Try to vote for town, prioritizing power roles
    const priorityTargets: { id: string; priority: number }[] = [];

    for (const targetId of townCandidates) {
      let priority = 50;

      // Prioritize eliminating power roles
      if (bot.confirmedRoles.has(targetId)) {
        const role = bot.confirmedRoles.get(targetId)!;
        if (role === Role.DETECTIVE) priority = 100;
        else if (role === Role.DOCTOR) priority = 90;
        else if (role === Role.VIGILANTE) priority = 85;
      }

      // Follow town's lead to blend in (but not always)
      const existingVotes = currentVotes.get(targetId) || 0;
      if (existingVotes > 1) {
        priority += existingVotes * 8;
      }

      // Avoid voting same as other mafia (looks suspicious)
      // This requires coordination through ctx

      priorityTargets.push({ id: targetId, priority });
    }

    priorityTargets.sort((a, b) => b.priority - a.priority);
    return priorityTargets[0]?.id || null;
  }

  /**
   * Generate a chat message for bot
   */
  generateChatMessage(
    oderId: string,
    phase: GamePhase,
    isMafiaChat: boolean,
    gameContext: GameContext
  ): { message: string | null; delay: number } {
    const bot = this.activeBots.get(oderId);
    if (!bot) {
      return { message: null, delay: 0 };
    }

    // Check if bot should chat based on frequency
    if (Math.random() > bot.chatFrequency) {
      return { message: null, delay: 0 };
    }

    const delay = 1000 + Math.random() * 3000;

    let templates: string[];

    if (isMafiaChat && bot.team === Team.MAFIA) {
      templates = CHAT_TEMPLATES.mafiaChat;
    } else if (phase === GamePhase.DAY_DISCUSSION) {
      // Variety of discussion messages
      const messageTypes = ['accusation', 'suspicion', 'generic', 'agreement'];
      const type = messageTypes[Math.floor(Math.random() * messageTypes.length)] as keyof ChatTemplates;
      templates = CHAT_TEMPLATES[type];
    } else if (phase === GamePhase.VOTING) {
      templates = CHAT_TEMPLATES.votingIntent;
    } else {
      return { message: null, delay: 0 };
    }

    let message = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    if (message.includes('{player}') && gameContext.alivePlayers) {
      const otherPlayers = gameContext.alivePlayers.filter(p => p !== bot.oderId);
      if (otherPlayers.length > 0) {
        const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const playerName = gameContext.playerNames?.get(targetPlayer) || 'someone';
        message = message.replace('{player}', playerName);
      } else {
        return { message: null, delay: 0 };
      }
    }

    bot.hasSpoken = true;
    return { message, delay };
  }

  /**
   * Update bot's knowledge based on game events
   */
  updateKnowledge(
    oderId: string,
    event: BotKnowledgeEvent
  ): void {
    const bot = this.activeBots.get(oderId);
    if (!bot) return;

    switch (event.type) {
      case 'INVESTIGATION_RESULT':
        if (event.isGuilty) {
          bot.confirmedMafia.add(event.targetId!);
          bot.suspicions.set(event.targetId!, 100);
        } else {
          bot.confirmedTown.add(event.targetId!);
          bot.suspicions.set(event.targetId!, 0);
        }
        break;

      case 'PLAYER_ELIMINATED':
        if (event.roleRevealed) {
          bot.confirmedRoles.set(event.targetId!, event.roleRevealed);
        }
        break;

      case 'PLAYER_ACCUSATION':
        // Increase suspicion of accuser if they seem wrong
        const currentSuspicion = bot.suspicions.get(event.playerId!) || 50;
        bot.suspicions.set(event.playerId!, Math.min(100, currentSuspicion + 5));
        break;

      case 'VOTE_CAST':
        // Track voting patterns
        break;

      case 'NIGHT_KILL':
        // Deduction: if bot is doctor and saved someone who didn't die
        break;
    }
  }

  /**
   * Remove a bot from tracking
   */
  removeBot(oderId: string): void {
    const bot = this.activeBots.get(oderId);
    if (bot) {
      this.usedNames.delete(bot.username);
      this.activeBots.delete(oderId);
      logger.debug(`Bot removed: ${bot.username}`);
    }
  }

  /**
   * Check if a player ID is a bot
   */
  isBot(oderId: string): boolean {
    return this.activeBots.has(oderId) || oderId.startsWith('bot_');
  }

  /**
   * Get bot state (for debugging)
   */
  getBotState(oderId: string): BotState | undefined {
    return this.activeBots.get(oderId);
  }

  /**
   * Clean up all bots for a room
   */
  cleanupRoomBots(botIds: string[]): void {
    botIds.forEach(id => this.removeBot(id));
  }
}

// Game context passed to bot decision functions
export interface GameContext {
  dayNumber?: number;
  alivePlayers?: string[];
  deadPlayers?: string[];
  playerNames?: Map<string, string>;
  recentAccusations?: Map<string, number>; // playerId -> accusation count
  activeSpeakers?: Set<string>;
  currentVotes?: Map<string, number>;
  mafiaTarget?: string; // For mafia coordination
}

// Knowledge events that update bot state
export interface BotKnowledgeEvent {
  type: 'INVESTIGATION_RESULT' | 'PLAYER_ELIMINATED' | 'PLAYER_ACCUSATION' | 'VOTE_CAST' | 'NIGHT_KILL';
  targetId?: string;
  playerId?: string;
  isGuilty?: boolean;
  roleRevealed?: Role;
  data?: any;
}

export const botService = BotService.getInstance();
export default botService;
