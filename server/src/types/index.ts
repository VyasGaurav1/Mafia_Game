/**
 * Mafia Game - Type Definitions
 * Core types used throughout the application
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
  
  // Legacy (kept for backward compatibility)
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
  DAY = 'DAY',
  DAY_DISCUSSION = 'DAY_DISCUSSION',
  VOTING = 'VOTING',
  RESOLUTION = 'RESOLUTION',
  GAME_OVER = 'GAME_OVER',
  
  // Mafia Phases
  MAFIA_ACTION = 'MAFIA_ACTION',
  DON_ACTION = 'DON_ACTION',
  MAFIA_HEALER_ACTION = 'MAFIA_HEALER_ACTION',
  SILENCER_ACTION = 'SILENCER_ACTION',
  
  // Town Phases
  DETECTIVE_ACTION = 'DETECTIVE_ACTION',
  DOCTOR_ACTION = 'DOCTOR_ACTION',
  BODYGUARD_ACTION = 'BODYGUARD_ACTION',
  JAILOR_ACTION = 'JAILOR_ACTION',
  VIGILANTE_ACTION = 'VIGILANTE_ACTION',
  SPY_ACTION = 'SPY_ACTION',
  
  // Neutral Phases
  SERIAL_KILLER_ACTION = 'SERIAL_KILLER_ACTION',
  CULT_LEADER_ACTION = 'CULT_LEADER_ACTION',
  ARSONIST_ACTION = 'ARSONIST_ACTION',
  
  // Legacy
  DON_INVESTIGATE = 'DON_INVESTIGATE'
}

export enum RoomVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export enum PlayerStatus {
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
  SPECTATING = 'SPECTATING'
}

export enum ActionType {
  // Mafia Actions
  MAFIA_KILL = 'MAFIA_KILL',
  MAFIA_HEAL = 'MAFIA_HEAL',
  SILENCE = 'SILENCE',
  
  // Town Actions
  DETECTIVE_INVESTIGATE = 'DETECTIVE_INVESTIGATE',
  DOCTOR_SAVE = 'DOCTOR_SAVE',
  BODYGUARD_PROTECT = 'BODYGUARD_PROTECT',
  JAIL = 'JAIL',
  VIGILANTE_KILL = 'VIGILANTE_KILL',
  SPY = 'SPY',
  
  // Neutral Actions
  SERIAL_KILL = 'SERIAL_KILL',
  CULT_CONVERT = 'CULT_CONVERT',
  ARSON_DOUSE = 'ARSON_DOUSE',
  ARSON_IGNITE = 'ARSON_IGNITE',
  
  // Voting
  VOTE = 'VOTE',
  
  // Legacy
  DON_INVESTIGATE = 'DON_INVESTIGATE'
}

export enum WinCondition {
  MAFIA_WINS = 'MAFIA_WINS',
  TOWN_WINS = 'TOWN_WINS',
  JESTER_WINS = 'JESTER_WINS',
  SERIAL_KILLER_WINS = 'SERIAL_KILLER_WINS',
  CULT_WINS = 'CULT_WINS',
  ARSONIST_WINS = 'ARSONIST_WINS',
  DRAW = 'DRAW'
}

// ============================================
// INTERFACES
// ============================================

export interface IUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  stats: IUserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesAsMafia: number;
  gamesAsTown: number;
  detectiveSuccessRate: number;
  doctorSaves: number;
}

export interface IPlayer {
  odId: string;
  oderId: string;
  username: string;
  odAvatar?: string;
  socketId: string;
  role?: Role;
  team?: Team;
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  lastAction?: Date;
  votedFor?: string;
  actionTarget?: string;
  consecutiveSelfSaves: number;
  vigilanteKillUsed: boolean;
}

export interface IRoom {
  id: string;
  code: string;
  name: string;
  visibility: RoomVisibility;
  hostId: string;
  players: Map<string, IPlayer>;
  maxPlayers: number;
  minPlayers: number;
  gameState?: IGameState;
  settings: IRoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomSettings {
  enableDonMafia: boolean;
  enableGodfather: boolean;
  enableJester: boolean;
  enableVigilante: boolean;
  enableAdvancedRoles: boolean;
  enableNeutralRoles: boolean;
  timers: ITimerSettings;
  allowSpectators: boolean;
  revealRolesOnDeath: boolean;
  tieBreaker: 'no_elimination' | 'revote' | 'random';
}

export interface ITimerSettings {
  roleReveal: number;      // 10 seconds
  mafiaAction: number;     // 40 seconds
  detectiveAction: number; // 25 seconds
  doctorAction: number;    // 25 seconds
  donAction: number;       // 25 seconds
  vigilanteAction: number; // 20 seconds
  nightTotal: number;      // 90 seconds
  dayDiscussion: number;   // 120 seconds
  voting: number;          // 45 seconds
  resolution: number;      // 10 seconds
}

export interface IGameState {
  roomId: string;
  phase: GamePhase;
  dayNumber: number;
  currentTimer: number;
  phaseStartTime: Date;
  nightActions: INightActions;
  votes: Map<string, string>;  // voterId -> targetId
  lastNightResult?: INightResult;
  eliminatedToday?: string;
  winner?: WinCondition;
  winningTeam?: Team;
  winningPlayers?: string[];
}

export interface INightActions {
  mafiaVotes: Map<string, string>;  // mafiaPlayerId -> targetId
  mafiaTarget?: string;
  detectiveTarget?: string;
  detectiveResult?: { isGuilty: boolean };
  doctorTarget?: string;
  donTarget?: string;
  donResult?: { isDetective: boolean };
  vigilanteTarget?: string;
  savedPlayerId?: string;
}

export interface INightResult {
  killedPlayerId?: string;
  killedPlayerRole?: Role;
  wasSaved: boolean;
  savedPlayerId?: string;
  deaths?: Array<{ playerId: string; role?: Role; cause?: string }>;
  saves?: Array<{ playerId: string }>;
}

export interface IActionLog {
  id: string;
  roomId: string;
  gameId: string;
  dayNumber: number;
  phase: GamePhase;
  playerId: string;
  playerRole: Role;
  actionType: ActionType;
  targetId?: string;
  result?: any;
  timestamp: Date;
}

export interface IVoteLog {
  id: string;
  roomId: string;
  gameId: string;
  dayNumber: number;
  voterId: string;
  targetId: string;
  timestamp: Date;
}

export interface IChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: 'player' | 'system' | 'mafia';
  timestamp: Date;
}

// ============================================
// SOCKET EVENT PAYLOADS
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
// SERVER TO CLIENT EVENTS
// ============================================

export interface ServerToClientEvents {
  'room:created': (room: IRoomPublic) => void;
  'room:joined': (data: { room: IRoomPublic; player: IPlayerPublic }) => void;
  'room:updated': (room: IRoomPublic) => void;
  'room:playerJoined': (player: IPlayerPublic) => void;
  'room:playerLeft': (playerId: string) => void;
  'room:playerKicked': (playerId: string) => void;
  'room:error': (error: { message: string; code: string }) => void;
  
  'game:started': (gameState: IGameStatePublic) => void;
  'game:phaseChange': (data: { phase: GamePhase; timer: number; dayNumber: number }) => void;
  'game:roleReveal': (data: { role: Role; team: Team; teammates?: string[] }) => void;
  'game:stateUpdate': (state: IGameStatePublic) => void;
  'game:end': (data: { winner: WinCondition; winningTeam: Team; winningPlayers: IPlayerPublic[] }) => void;
  
  'timer:update': (data: { remaining: number; phase: GamePhase }) => void;
  'timer:roleSpecific': (data: { remaining: number; forRole: Role }) => void;
  
  'night:actionRequired': (data: { role: Role; timer: number; validTargets: string[] }) => void;
  'night:actionConfirmed': (data: { actionType: ActionType }) => void;
  'night:result': (result: INightResult) => void;
  'night:detectiveResult': (data: { targetId: string; isGuilty: boolean }) => void;
  'night:donResult': (data: { targetId: string; isDetective: boolean }) => void;
  
  'day:start': (data: { nightResult: INightResult; dayNumber: number }) => void;
  'day:chat': (message: IChatMessage) => void;
  
  'vote:started': (data: { timer: number; candidates: string[] }) => void;
  'vote:update': (data: { votes: Record<string, number>; hasVoted: string[] }) => void;
  'vote:result': (data: { eliminatedId?: string; eliminatedRole?: Role; voteCounts: Record<string, number> }) => void;
  
  'player:eliminated': (data: { playerId: string; role: Role; reason: 'vote' | 'kill' }) => void;
  'player:disconnected': (playerId: string) => void;
  'player:reconnected': (playerId: string) => void;
  
  'mafia:chat': (message: IChatMessage) => void;
  'mafia:voteUpdate': (votes: Record<string, string>) => void;
  
  'error': (error: { message: string; code: string }) => void;
}

// ============================================
// CLIENT TO SERVER EVENTS
// ============================================

export interface ClientToServerEvents {
  'room:create': (payload: RoomCreatePayload, callback: (response: { success: boolean; room?: IRoomPublic; error?: string }) => void) => void;
  'room:join': (payload: RoomJoinPayload, callback: (response: { success: boolean; room?: IRoomPublic; error?: string }) => void) => void;
  'room:list': (callback: (response: { success: boolean; rooms: IRoomPublic[]; error?: string }) => void) => void;
  'room:leave': (roomId: string) => void;
  'room:kick': (data: { roomId: string; targetId: string }) => void;
  'room:updateSettings': (data: { roomId: string; settings: Partial<IRoomSettings> }) => void;
  
  'game:start': (roomId: string, callback: (response: { success: boolean; error?: string }) => void) => void;
  'game:ready': (roomId: string) => void;
  
  'night:action': (payload: GameActionPayload) => void;
  'mafia:vote': (payload: GameActionPayload) => void;
  
  'day:chat': (payload: ChatPayload) => void;
  'mafia:chat': (payload: ChatPayload) => void;
  
  'vote:cast': (payload: VotePayload) => void;
  'vote:requestRemoval': (data: { roomId: string; targetId: string }) => void;
  
  'player:reconnect': (data: { roomId: string; oderId: string }) => void;
}

// ============================================
// PUBLIC INTERFACES (Safe for client)
// ============================================

export interface IPlayerPublic {
  odId: string;
  oderId: string;
  username: string;
  avatar?: string;
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  role?: Role;        // Only revealed when appropriate
  hasVoted?: boolean;
  hasActed?: boolean;
}

export interface IRoomPublic {
  id: string;
  code: string;
  name: string;
  visibility: RoomVisibility;
  hostId: string;
  players: IPlayerPublic[];
  maxPlayers: number;
  minPlayers: number;
  settings: IRoomSettings;
  isGameActive: boolean;
  currentPhase?: GamePhase;
}

export interface IGameStatePublic {
  phase: GamePhase;
  dayNumber: number;
  currentTimer: number;
  alivePlayers: string[];
  deadPlayers: IPlayerPublic[];
  votes?: Record<string, number>;
}

// ============================================
// ROLE CONFIGURATION
// ============================================

export interface IRoleConfig {
  role: Role;
  team: Team;
  priority: number;  // Action resolution order
  isRequired: boolean;
  minPlayers: number;
  description: string;
}

export const ROLE_CONFIGS: Record<Role, IRoleConfig> = {
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    team: Team.TOWN,
    priority: 0,
    isRequired: true,
    minPlayers: 3,
    description: 'A regular townsperson with no special abilities. Use your wits to identify the Mafia.'
  },
  [Role.MAFIA]: {
    role: Role.MAFIA,
    team: Team.MAFIA,
    priority: 1,
    isRequired: true,
    minPlayers: 3,
    description: 'Work with your fellow Mafia members to eliminate the town. Vote each night to kill.'
  },
  [Role.GODFATHER]: {
    role: Role.GODFATHER,
    team: Team.MAFIA,
    priority: 2,
    isRequired: false,
    minPlayers: 9,
    description: 'Mafia leader who appears innocent to Detective. Lead your team to victory.'
  },
  [Role.MAFIOSO]: {
    role: Role.MAFIOSO,
    team: Team.MAFIA,
    priority: 1,
    isRequired: false,
    minPlayers: 9,
    description: 'Backup killer for the Mafia. Steps up if the Godfather is eliminated.'
  },
  [Role.MAFIA_GOON]: {
    role: Role.MAFIA_GOON,
    team: Team.MAFIA,
    priority: 1,
    isRequired: false,
    minPlayers: 9,
    description: 'Regular Mafia member. Work with your team to eliminate townspeople.'
  },
  [Role.MAFIA_HEALER]: {
    role: Role.MAFIA_HEALER,
    team: Team.MAFIA,
    priority: 3,
    isRequired: false,
    minPlayers: 17,
    description: 'Protect one Mafia member from death each night.'
  },
  [Role.SILENCER]: {
    role: Role.SILENCER,
    team: Team.MAFIA,
    priority: 4,
    isRequired: false,
    minPlayers: 17,
    description: 'Prevent one player from speaking during the day phase.'
  },
  [Role.DETECTIVE]: {
    role: Role.DETECTIVE,
    team: Team.TOWN,
    priority: 3,
    isRequired: true,
    minPlayers: 4,
    description: 'Investigate one player per night to determine if they are Mafia.'
  },
  [Role.DEPUTY_DETECTIVE]: {
    role: Role.DEPUTY_DETECTIVE,
    team: Team.TOWN,
    priority: 3,
    isRequired: false,
    minPlayers: 14,
    description: 'Inherits Detective power if the Detective is eliminated.'
  },
  [Role.DOCTOR]: {
    role: Role.DOCTOR,
    team: Team.TOWN,
    priority: 4,
    isRequired: true,
    minPlayers: 5,
    description: 'Save one player per night from being killed. Cannot save yourself twice in a row.'
  },
  [Role.NURSE]: {
    role: Role.NURSE,
    team: Team.TOWN,
    priority: 4,
    isRequired: false,
    minPlayers: 18,
    description: 'Inherits Doctor power if the Doctor is eliminated.'
  },
  [Role.BODYGUARD]: {
    role: Role.BODYGUARD,
    team: Team.TOWN,
    priority: 5,
    isRequired: false,
    minPlayers: 16,
    description: 'Protect one player each night. You die if they are attacked.'
  },
  [Role.JAILOR]: {
    role: Role.JAILOR,
    team: Team.TOWN,
    priority: 6,
    isRequired: false,
    minPlayers: 17,
    description: 'Jail one player each night, blocking all their actions.'
  },
  [Role.VIGILANTE]: {
    role: Role.VIGILANTE,
    team: Team.TOWN,
    priority: 7,
    isRequired: false,
    minPlayers: 14,
    description: 'Kill one player during the night. Use wisely - you only get one shot.'
  },
  [Role.MAYOR]: {
    role: Role.MAYOR,
    team: Team.TOWN,
    priority: 8,
    isRequired: false,
    minPlayers: 20,
    description: 'Your vote counts as 2 during town voting.'
  },
  [Role.SPY]: {
    role: Role.SPY,
    team: Team.TOWN,
    priority: 9,
    isRequired: false,
    minPlayers: 21,
    description: 'Receive partial information about Mafia actions each night.'
  },
  [Role.JESTER]: {
    role: Role.JESTER,
    team: Team.NEUTRAL,
    priority: 0,
    isRequired: false,
    minPlayers: 13,
    description: 'Win by getting yourself voted out during the day. Act suspicious!'
  },
  [Role.SERIAL_KILLER]: {
    role: Role.SERIAL_KILLER,
    team: Team.NEUTRAL,
    priority: 1,
    isRequired: false,
    minPlayers: 13,
    description: 'Kill one player each night. Win by being the last one standing.'
  },
  [Role.CULT_LEADER]: {
    role: Role.CULT_LEADER,
    team: Team.NEUTRAL,
    priority: 2,
    isRequired: false,
    minPlayers: 26,
    description: 'Convert one townsperson to your cult each night.'
  },
  [Role.ARSONIST]: {
    role: Role.ARSONIST,
    team: Team.NEUTRAL,
    priority: 3,
    isRequired: false,
    minPlayers: 30,
    description: 'Douse players with gasoline and ignite them all at once.'
  },
  [Role.DON_MAFIA]: {
    role: Role.DON_MAFIA,
    team: Team.MAFIA,
    priority: 2,
    isRequired: false,
    minPlayers: 8,
    description: 'The leader of the Mafia. Can investigate one player per night to find the Detective.'
  }
};

// ============================================
// DEFAULT SETTINGS
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
  enableAdvancedRoles: false,
  enableNeutralRoles: false,
  timers: DEFAULT_TIMER_SETTINGS,
  allowSpectators: true,
  revealRolesOnDeath: true,
  tieBreaker: 'no_elimination'
};
