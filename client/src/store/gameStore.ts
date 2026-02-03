/**
 * Game Store (Zustand)
 * Central state management for the game
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  IRoom,
  IPlayer,
  IGameState,
  IChatMessage,
  INightResult,
  GamePhase,
  Role,
  Team,
  PlayerStatus,
  WinCondition
} from '@/types';

interface User {
  oderId: string;
  username: string;
  avatar?: string;
}

interface GameStore {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Connection state
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  
  // Room state
  room: IRoom | null;
  setRoom: (room: IRoom | null) => void;
  addPlayer: (player: IPlayer) => void;
  removePlayer: (playerId: string) => void;
  
  // Game state
  gameState: IGameState | null;
  setGameState: (state: IGameState | null) => void;
  
  // Player role
  myRole: Role | null;
  myTeam: Team | null;
  teammates: string[];
  setPlayerRole: (role: Role, team: Team, teammates?: string[]) => void;
  
  // Phase & Timer
  currentPhase: GamePhase;
  dayNumber: number;
  timer: number;
  roleTimer: number | null;
  roleTimerFor: Role | null;
  setPhase: (phase: GamePhase) => void;
  setDayNumber: (day: number) => void;
  setTimer: (time: number) => void;
  setRoleTimer: (time: number, role: Role) => void;
  
  // Actions
  actionRequired: boolean;
  validTargets: string[];
  hasActed: boolean;
  selectedTarget: string | null;
  setActionRequired: (required: boolean, targets: string[]) => void;
  setHasActed: (acted: boolean) => void;
  setSelectedTarget: (target: string | null) => void;
  
  // Night results
  nightResult: INightResult | null;
  investigationResult: { targetId: string; isGuilty: boolean } | null;
  donResult: { targetId: string; isDetective: boolean } | null;
  setNightResult: (result: INightResult | null) => void;
  setInvestigationResult: (targetId: string, isGuilty: boolean) => void;
  setDonResult: (targetId: string, isDetective: boolean) => void;
  
  // Voting
  votes: Record<string, number>;
  hasVoted: string[];
  myVote: string | null;
  isRemovalVote: boolean;
  voteResult: { eliminatedId?: string; eliminatedRole?: Role; voteCounts: Record<string, number> } | null;
  setVotes: (votes: Record<string, number>, hasVoted: string[]) => void;
  setMyVote: (targetId: string | null) => void;
  setIsRemovalVote: (isRemoval: boolean) => void;
  setVoteResult: (eliminatedId?: string, eliminatedRole?: Role, voteCounts?: Record<string, number>) => void;
  clearVotes: () => void;
  
  // Mafia votes
  mafiaVotes: Record<string, string>;
  setMafiaVotes: (votes: Record<string, string>) => void;
  
  // Chat
  chatMessages: IChatMessage[];
  mafiaMessages: IChatMessage[];
  addChatMessage: (message: IChatMessage) => void;
  addMafiaMessage: (message: IChatMessage) => void;
  
  // Game end
  gameEnded: boolean;
  winner: WinCondition | null;
  winningTeam: Team | null;
  winningPlayers: IPlayer[];
  setGameEnd: (winner: WinCondition, team: Team, players: IPlayer[]) => void;
  
  // Player states
  eliminatePlayer: (playerId: string, role: Role, reason: 'vote' | 'kill') => void;
  setPlayerDisconnected: (playerId: string) => void;
  setPlayerReconnected: (playerId: string) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Utility
  clearGame: () => void;
  isAlive: () => boolean;
  isHost: () => boolean;
  getPlayerById: (oderId: string) => IPlayer | undefined;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      setUser: (user) => set({ user }),
      
      // Connection state
      connectionStatus: 'disconnected',
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      
      // Room state
      room: null,
      setRoom: (room) => set({ room }),
      addPlayer: (player) => set((state) => {
        if (!state.room) return {};
        
        // Check if player already exists (prevent duplicates)
        const playerExists = state.room.players.some(p => p.oderId === player.oderId);
        if (playerExists) {
          // Update existing player instead
          return {
            room: {
              ...state.room,
              players: state.room.players.map(p => 
                p.oderId === player.oderId ? player : p
              )
            }
          };
        }
        
        // Add new player
        return {
          room: { ...state.room, players: [...state.room.players, player] }
        };
      }),
      removePlayer: (playerId) => set((state) => ({
        room: state.room
          ? { ...state.room, players: state.room.players.filter(p => p.oderId !== playerId) }
          : null
      })),
      
      // Game state
      gameState: null,
      setGameState: (gameState) => set({ gameState }),
      
      // Player role
      myRole: null,
      myTeam: null,
      teammates: [],
      setPlayerRole: (role, team, teammates = []) => set({ myRole: role, myTeam: team, teammates }),
      
      // Phase & Timer
      currentPhase: GamePhase.LOBBY,
      dayNumber: 0,
      timer: 0,
      roleTimer: null,
      roleTimerFor: null,
      setPhase: (phase) => set({ 
        currentPhase: phase,
        hasActed: false,
        selectedTarget: null,
        actionRequired: false
      }),
      setDayNumber: (day) => set({ dayNumber: day }),
      setTimer: (time) => set({ timer: time }),
      setRoleTimer: (time, role) => set({ roleTimer: time, roleTimerFor: role }),
      
      // Actions
      actionRequired: false,
      validTargets: [],
      hasActed: false,
      selectedTarget: null,
      setActionRequired: (required, targets) => set({ actionRequired: required, validTargets: targets }),
      setHasActed: (acted) => set({ hasActed: acted }),
      setSelectedTarget: (target) => set({ selectedTarget: target }),
      
      // Night results
      nightResult: null,
      investigationResult: null,
      donResult: null,
      setNightResult: (result) => set({ nightResult: result }),
      setInvestigationResult: (targetId, isGuilty) => set({ 
        investigationResult: { targetId, isGuilty } 
      }),
      setDonResult: (targetId, isDetective) => set({ 
        donResult: { targetId, isDetective } 
      }),
      
      // Voting
      votes: {},
      hasVoted: [],
      myVote: null,
      isRemovalVote: false,
      voteResult: null,
      setVotes: (votes, hasVoted) => set({ votes, hasVoted }),
      setMyVote: (targetId) => set({ myVote: targetId }),
      setIsRemovalVote: (isRemoval) => set({ isRemovalVote: isRemoval }),
      setVoteResult: (eliminatedId, eliminatedRole, voteCounts = {}) => set({
        voteResult: { eliminatedId, eliminatedRole, voteCounts }
      }),
      clearVotes: () => set({ votes: {}, hasVoted: [], myVote: null }),
      
      // Mafia votes
      mafiaVotes: {},
      setMafiaVotes: (votes) => set({ mafiaVotes: votes }),
      
      // Chat
      chatMessages: [],
      mafiaMessages: [],
      addChatMessage: (message) => set((state) => {
        // Prevent duplicate messages
        if (state.chatMessages.some(m => m.id === message.id)) {
          return {};
        }
        return {
          chatMessages: [...state.chatMessages.slice(-99), message]
        };
      }),
      addMafiaMessage: (message) => set((state) => {
        // Prevent duplicate messages
        if (state.mafiaMessages.some(m => m.id === message.id)) {
          return {};
        }
        return {
          mafiaMessages: [...state.mafiaMessages.slice(-49), message]
        };
      }),
      
      // Game end
      gameEnded: false,
      winner: null,
      winningTeam: null,
      winningPlayers: [],
      setGameEnd: (winner, team, players) => set({
        gameEnded: true,
        winner,
        winningTeam: team,
        winningPlayers: players,
        currentPhase: GamePhase.GAME_OVER
      }),
      
      // Player states
      eliminatePlayer: (playerId, role, _reason) => set((state) => {
        if (!state.room) return {};
        
        const players = state.room.players.map(p => 
          p.oderId === playerId 
            ? { ...p, status: PlayerStatus.DEAD, role }
            : p
        );
        
        return { room: { ...state.room, players } };
      }),
      setPlayerDisconnected: (playerId) => set((state) => {
        if (!state.room) return {};
        
        const players = state.room.players.map(p =>
          p.oderId === playerId ? { ...p, isConnected: false } : p
        );
        
        return { room: { ...state.room, players } };
      }),
      setPlayerReconnected: (playerId) => set((state) => {
        if (!state.room) return {};
        
        const players = state.room.players.map(p =>
          p.oderId === playerId ? { ...p, isConnected: true } : p
        );
        
        return { room: { ...state.room, players } };
      }),
      
      // Error handling
      error: null,
      setError: (error) => set({ error }),
      
      // Utility
      clearGame: () => set({
        room: null,
        gameState: null,
        myRole: null,
        myTeam: null,
        teammates: [],
        currentPhase: GamePhase.LOBBY,
        dayNumber: 0,
        timer: 0,
        roleTimer: null,
        roleTimerFor: null,
        actionRequired: false,
        validTargets: [],
        hasActed: false,
        selectedTarget: null,
        nightResult: null,
        investigationResult: null,
        donResult: null,
        votes: {},
        hasVoted: [],
        myVote: null,
        isRemovalVote: false,
        voteResult: null,
        mafiaVotes: {},
        chatMessages: [],
        mafiaMessages: [],
        gameEnded: false,
        winner: null,
        winningTeam: null,
        winningPlayers: [],
        error: null
      }),
      
      isAlive: () => {
        const state = get();
        if (!state.room || !state.user) return false;
        const player = state.room.players.find(p => p.oderId === state.user?.oderId);
        return player?.status === PlayerStatus.ALIVE;
      },
      
      isHost: () => {
        const state = get();
        if (!state.room || !state.user) return false;
        return state.room.hostId === state.user.oderId;
      },
      
      getPlayerById: (oderId) => {
        const state = get();
        return state.room?.players.find(p => p.oderId === oderId);
      }
    }),
    {
      name: 'mafia-game-storage',
      partialize: (state) => ({ user: state.user })
    }
  )
);
