/**
 * Shared Types for Frontend
 * Mirrors server types for type safety
 */

// ============================================
// ENUMS
// ============================================

export enum Role {
  // Core Town Roles
  VILLAGER = 'VILLAGER',
  DOCTOR = 'DOCTOR',
  DETECTIVE = 'DETECTIVE',
  DEPUTY_DETECTIVE = 'DEPUTY_DETECTIVE',
  NURSE = 'NURSE',
  
  // Core Mafia Roles
  MAFIA = 'MAFIA',
  GODFATHER = 'GODFATHER',
  MAFIOSO = 'MAFIOSO',
  MAFIA_GOON = 'MAFIA_GOON',
  
  // Advanced Town Roles
  BODYGUARD = 'BODYGUARD',
  JAILOR = 'JAILOR',
  VIGILANTE = 'VIGILANTE',
  MAYOR = 'MAYOR',
  SPY = 'SPY',
  
  // Advanced Mafia Roles
  MAFIA_HEALER = 'MAFIA_HEALER',
  SILENCER = 'SILENCER',
  
  // Neutral Roles
  JESTER = 'JESTER',
  SERIAL_KILLER = 'SERIAL_KILLER',
  CULT_LEADER = 'CULT_LEADER',
  ARSONIST = 'ARSONIST',
  
  // Legacy
  DON_MAFIA = 'DON_MAFIA'
}

export enum Team {
  TOWN = 'TOWN',
  MAFIA = 'MAFIA',
  NEUTRAL = 'NEUTRAL'
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  ROLE_REVEAL = 'ROLE_REVEAL',
  NIGHT = 'NIGHT',
  MAFIA_ACTION = 'MAFIA_ACTION',
  DETECTIVE_ACTION = 'DETECTIVE_ACTION',
  DOCTOR_ACTION = 'DOCTOR_ACTION',
  DON_ACTION = 'DON_ACTION',
  VIGILANTE_ACTION = 'VIGILANTE_ACTION',
  DAY_DISCUSSION = 'DAY_DISCUSSION',
  VOTING = 'VOTING',
  RESOLUTION = 'RESOLUTION',
  GAME_OVER = 'GAME_OVER'
}

export enum PlayerStatus {
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
  SPECTATING = 'SPECTATING'
}

export enum ActionType {
  MAFIA_KILL = 'MAFIA_KILL',
  DETECTIVE_INVESTIGATE = 'DETECTIVE_INVESTIGATE',
  DOCTOR_SAVE = 'DOCTOR_SAVE',
  DON_INVESTIGATE = 'DON_INVESTIGATE',
  VIGILANTE_KILL = 'VIGILANTE_KILL',
  VOTE = 'VOTE'
}

export enum RoomVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export enum WinCondition {
  MAFIA_WINS = 'MAFIA_WINS',
  TOWN_WINS = 'TOWN_WINS',
  JESTER_WINS = 'JESTER_WINS',
  SERIAL_KILLER_WINS = 'SERIAL_KILLER_WINS',
  DRAW = 'DRAW'
}

// ============================================
// INTERFACES
// ============================================

export interface IPlayer {
  odId: string;
  oderId: string;
  username: string;
  avatar?: string;
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  role?: Role;
  team?: Team;
  hasVoted?: boolean;
  hasActed?: boolean;
}

export interface IRoom {
  id: string;
  code: string;
  name: string;
  visibility: RoomVisibility;
  hostId: string;
  players: IPlayer[];
  maxPlayers: number;
  minPlayers: number;
  settings: IRoomSettings;
  isGameActive: boolean;
  currentPhase?: GamePhase;
}

export interface IRoomSettings {
  // Role Configuration
  enableGodfather: boolean;
  enableJester: boolean;
  enableVigilante: boolean;
  enableDoctor: boolean;
  enableDetective: boolean;
  enableAdvancedRoles: boolean;
  enableNeutralRoles: boolean;
  enableChaosRoles: boolean;
  
  // Game Configuration
  timers: ITimerSettings;
  allowSpectators: boolean;
  revealRolesOnDeath: boolean;
  tieBreaker: 'no_elimination' | 'revote' | 'random';
  
  // Additional settings used by SettingsPanel
  maxPlayers?: number;
  minPlayers?: number;
  dayDuration?: number;
  nightDuration?: number;
  votingDuration?: number;
  isPrivate?: boolean;
  
  // Legacy
  enableDonMafia?: boolean;
}

export interface ITimerSettings {
  roleReveal: number;
  mafiaAction: number;
  detectiveAction: number;
  doctorAction: number;
  donAction: number;
  vigilanteAction: number;
  nightTotal: number;
  dayDiscussion: number;
  voting: number;
  resolution: number;
}

export interface IGameState {
  phase: GamePhase;
  dayNumber: number;
  currentTimer: number;
  alivePlayers: string[];
  deadPlayers: IPlayer[];
  votes?: Record<string, number>;
}

export interface INightResult {
  killedPlayerId?: string;
  killedPlayerRole?: Role;
  wasSaved: boolean;
  savedPlayerId?: string;
  deaths?: Array<{ playerId: string; role?: Role; cause?: string }>;
  saves?: Array<{ playerId: string }>;
}

export interface IChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: 'player' | 'system' | 'mafia';
  timestamp: Date;
  isSystem?: boolean;
  sender?: { username: string };
}

// ============================================
// SOCKET EVENT TYPES
// ============================================

export interface RoomCreatePayload {
  name: string;
  visibility: RoomVisibility;
  settings?: Partial<IRoomSettings>;
}

export interface RoomJoinPayload {
  roomCode: string;
  userId: string;
  username: string;
}

export interface GameActionPayload {
  roomId: string;
  targetId?: string;
}

export interface VotePayload {
  roomId: string;
  targetId: string;
}

export interface ChatPayload {
  roomId: string;
  content: string;
}

// ============================================
// ROLE DISPLAY CONFIG
// ============================================

export interface IRoleDisplayConfig {
  name: string;
  description: string;
  team: Team;
  color: string;
  bgColor: string;
  icon: string;
}

export const ROLE_DISPLAY: Record<Role, IRoleDisplayConfig> = {
  // Core Town Roles
  [Role.VILLAGER]: {
    name: 'Villager',
    description: 'A regular townsperson with no special abilities. Use your wits to identify the Mafia.',
    team: Team.TOWN,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: '👤'
  },
  [Role.DOCTOR]: {
    name: 'Doctor',
    description: 'Save one player from death each night. You cannot save yourself.',
    team: Team.TOWN,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: '💉'
  },
  [Role.DETECTIVE]: {
    name: 'Detective',
    description: 'Investigate one player each night to learn their alignment.',
    team: Team.TOWN,
    color: 'text-blue-500',
    bgColor: 'bg-blue-600/20',
    icon: '🔍'
  },
  [Role.DEPUTY_DETECTIVE]: {
    name: 'Deputy Detective',
    description: 'Inherits Detective power if the Detective is eliminated.',
    team: Team.TOWN,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: '🔎'
  },
  
  // Core Mafia Roles
  [Role.MAFIA]: {
    name: 'Mafia',
    description: 'Work with your fellow Mafia members to eliminate the town.',
    team: Team.MAFIA,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: '🔪'
  },
  [Role.GODFATHER]: {
    name: 'Godfather',
    description: 'Mafia leader who appears innocent to Detective. Lead your team to victory.',
    team: Team.MAFIA,
    color: 'text-red-600',
    bgColor: 'bg-red-700/20',
    icon: '👑'
  },
  [Role.MAFIA_GOON]: {
    name: 'Mafia Goon',
    description: 'Regular Mafia member. Work with your team to eliminate townspeople.',
    team: Team.MAFIA,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: '🗡️'
  },
  [Role.MAFIOSO]: {
    name: 'Mafioso',
    description: 'Backup killer for the Mafia. Steps up if Godfather is eliminated.',
    team: Team.MAFIA,
    color: 'text-red-500',
    bgColor: 'bg-red-600/20',
    icon: '🔫'
  },
  
  // Advanced Town Roles
  [Role.BODYGUARD]: {
    name: 'Bodyguard',
    description: 'Protect one player each night. You die if they are attacked.',
    team: Team.TOWN,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    icon: '🛡️'
  },
  [Role.NURSE]: {
    name: 'Nurse',
    description: 'Inherits Doctor power if the Doctor is eliminated.',
    team: Team.TOWN,
    color: 'text-green-300',
    bgColor: 'bg-green-400/20',
    icon: '💊'
  },
  [Role.JAILOR]: {
    name: 'Jailor',
    description: 'Jail one player each night, blocking all their actions.',
    team: Team.TOWN,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    icon: '⛓️'
  },
  [Role.VIGILANTE]: {
    name: 'Vigilante',
    description: 'Kill one player during the night. Use wisely - you only get one shot.',
    team: Team.TOWN,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    icon: '🔫'
  },
  [Role.MAYOR]: {
    name: 'Mayor',
    description: 'Your vote counts as 2 during town voting.',
    team: Team.TOWN,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: '🎖️'
  },
  [Role.SPY]: {
    name: 'Spy',
    description: 'Receive partial information about Mafia actions each night.',
    team: Team.TOWN,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    icon: '🕵️'
  },
  
  // Advanced Mafia Roles
  [Role.MAFIA_HEALER]: {
    name: 'Mafia Healer',
    description: 'Protect one Mafia member from death each night.',
    team: Team.MAFIA,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    icon: '💊'
  },
  [Role.SILENCER]: {
    name: 'Silencer',
    description: 'Prevent one player from speaking during the day phase.',
    team: Team.MAFIA,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: '🤐'
  },
  
  // Neutral Roles
  [Role.JESTER]: {
    name: 'Jester',
    description: 'Get yourself lynched to win. Make the town vote for you!',
    team: Team.NEUTRAL,
    color: 'text-purple-500',
    bgColor: 'bg-purple-600/20',
    icon: '🃏'
  },
  [Role.SERIAL_KILLER]: {
    name: 'Serial Killer',
    description: 'Kill one player each night. Win by being the last one standing.',
    team: Team.NEUTRAL,
    color: 'text-red-500',
    bgColor: 'bg-red-600/20',
    icon: '🔪'
  },
  [Role.CULT_LEADER]: {
    name: 'Cult Leader',
    description: 'Convert one townsperson to your cult each night.',
    team: Team.NEUTRAL,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-600/20',
    icon: '🕯️'
  },
  [Role.ARSONIST]: {
    name: 'Arsonist',
    description: 'Douse players with gasoline and ignite them all at once.',
    team: Team.NEUTRAL,
    color: 'text-orange-500',
    bgColor: 'bg-orange-600/20',
    icon: '🔥'
  },
  
  // Legacy
  [Role.DON_MAFIA]: {
    name: 'Don Mafia',
    description: 'The leader of the Mafia. Can investigate one player per night to find the Detective.',
    team: Team.MAFIA,
    color: 'text-red-500',
    bgColor: 'bg-red-600/20',
    icon: '👔'
  }
};

export const PHASE_DISPLAY: Record<GamePhase, { name: string; isNight: boolean; description: string }> = {
  [GamePhase.LOBBY]: { name: 'Lobby', isNight: false, description: 'Waiting for players' },
  [GamePhase.ROLE_REVEAL]: { name: 'Role Reveal', isNight: true, description: 'Discover your role' },
  [GamePhase.NIGHT]: { name: 'Night', isNight: true, description: 'The town sleeps' },
  [GamePhase.MAFIA_ACTION]: { name: 'Night - Mafia', isNight: true, description: 'Mafia chooses their victim' },
  [GamePhase.DON_ACTION]: { name: 'Night - Don', isNight: true, description: 'Don investigates' },
  [GamePhase.DETECTIVE_ACTION]: { name: 'Night - Detective', isNight: true, description: 'Detective investigates' },
  [GamePhase.DOCTOR_ACTION]: { name: 'Night - Doctor', isNight: true, description: 'Doctor saves someone' },
  [GamePhase.VIGILANTE_ACTION]: { name: 'Night - Vigilante', isNight: true, description: 'Vigilante takes aim' },
  [GamePhase.DAY_DISCUSSION]: { name: 'Day - Discussion', isNight: false, description: 'Discuss and accuse' },
  [GamePhase.VOTING]: { name: 'Day - Voting', isNight: false, description: 'Vote to eliminate' },
  [GamePhase.RESOLUTION]: { name: 'Resolution', isNight: false, description: 'Results revealed' },
  [GamePhase.GAME_OVER]: { name: 'Game Over', isNight: false, description: 'The game has ended' }
};

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_TIMER_SETTINGS: ITimerSettings = {
  roleReveal: 10,
  mafiaAction: 40,
  detectiveAction: 25,
  doctorAction: 25,
  donAction: 25,
  vigilanteAction: 20,
  nightTotal: 90,
  dayDiscussion: 120,
  voting: 45,
  resolution: 10
};

export const DEFAULT_ROOM_SETTINGS: IRoomSettings = {
  enableDonMafia: true,
  enableGodfather: false,
  enableJester: false,
  enableVigilante: false,
  enableDoctor: true,
  enableDetective: true,
  enableAdvancedRoles: false,
  enableNeutralRoles: false,
  enableChaosRoles: false,
  timers: DEFAULT_TIMER_SETTINGS,
  allowSpectators: true,
  revealRolesOnDeath: true,
  tieBreaker: 'no_elimination'
};
