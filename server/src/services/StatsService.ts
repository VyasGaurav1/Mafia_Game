/**
 * Stats Service
 * Handles player statistics, game records, and analytics
 */

import { User, IUserDocument } from '../models/UserModel';
import { GameRecord, IGameRecordDocument, IPlayerGameRecord } from '../models/GameRecord';
import { Role, Team, WinCondition } from '../types';
import logger from '../utils/logger';

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  oderId: string;
  username: string;
  displayName: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  tier: string;
}

// Player statistics
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  
  // By team
  gamesAsMafia: number;
  gamesAsTown: number;
  gamesAsNeutral: number;
  mafiaWinRate: number;
  townWinRate: number;
  
  // Role-specific
  detectiveSuccessRate: number;
  doctorSaves: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  
  // Time
  totalPlayTime: number;
  averageGameDuration: number;
  
  // History
  recentGames: GameSummary[];
  roleHistory: RoleHistorySummary[];
}

export interface GameSummary {
  gameId: string;
  roomName: string;
  role: string;
  team: string;
  result: 'WIN' | 'LOSS' | 'DRAW';
  duration: number;
  playedAt: Date;
}

export interface RoleHistorySummary {
  role: string;
  timesPlayed: number;
  wins: number;
  winRate: number;
}

class StatsService {
  private static instance: StatsService;

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * Record a completed game
   */
  async recordGame(
    gameId: string,
    roomCode: string,
    roomName: string,
    winner: WinCondition,
    winningTeam: Team,
    winningPlayers: string[],
    players: IPlayerGameRecord[],
    settings: Record<string, any>,
    gameMode: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY' | 'QUICK_PLAY',
    totalDays: number,
    gameDuration: number,
    hadBots: boolean,
    botCount: number
  ): Promise<IGameRecordDocument> {
    // Calculate role distribution
    const roleDistribution: Record<string, number> = {};
    players.forEach(p => {
      roleDistribution[p.role] = (roleDistribution[p.role] || 0) + 1;
    });

    const gameRecord = new GameRecord({
      gameId,
      roomCode,
      roomName,
      winner,
      winningTeam,
      winningPlayers,
      players,
      totalPlayers: players.length,
      totalDays,
      gameDuration,
      gameMode,
      hadBots,
      botCount,
      roleDistribution,
      settings,
      endedAt: new Date()
    });

    await gameRecord.save();

    // Update player stats
    await this.updatePlayerStats(players, winner, winningTeam, gameDuration);

    logger.info(`Game recorded: ${gameId} (${winner})`);

    return gameRecord;
  }

  /**
   * Update all players' stats after a game
   */
  private async updatePlayerStats(
    players: IPlayerGameRecord[],
    winner: WinCondition,
    winningTeam: Team,
    gameDuration: number
  ): Promise<void> {
    for (const playerRecord of players) {
      // Skip bots
      if (playerRecord.oderId.startsWith('bot_')) continue;

      const user = await User.findByOderId(playerRecord.oderId);
      if (!user || user.isGuest) continue;

      // Update basic stats
      user.stats.gamesPlayed++;
      user.stats.totalPlayTime += Math.floor(gameDuration / 60);
      user.stats.lastPlayedAt = new Date();

      // Team-based stats
      const playerTeam = playerRecord.team as Team;
      if (playerTeam === Team.MAFIA) {
        user.stats.gamesAsMafia++;
        if (playerRecord.isWinner) user.stats.mafiaWins++;
      } else if (playerTeam === Team.TOWN) {
        user.stats.gamesAsTown++;
        if (playerRecord.isWinner) user.stats.townWins++;
      } else {
        user.stats.gamesAsNeutral++;
      }

      // Win/loss tracking
      if (playerRecord.isWinner) {
        user.stats.gamesWon++;
        user.stats.currentStreak++;
        if (user.stats.currentStreak > user.stats.longestStreak) {
          user.stats.longestStreak = user.stats.currentStreak;
        }
        // Update MMR (simplified)
        user.matchmakingRating += 25;
      } else {
        user.stats.gamesLost++;
        user.stats.currentStreak = 0;
        user.matchmakingRating -= 15;
      }

      // Clamp MMR
      user.matchmakingRating = Math.max(100, Math.min(3000, user.matchmakingRating));

      // Role-specific stats from actions
      for (const action of playerRecord.actions) {
        if (action.actionType === 'DETECTIVE_INVESTIGATE' && action.result === 'correct') {
          // Track successful investigations
        }
        if (action.actionType === 'DOCTOR_SAVE' && action.result === 'success') {
          user.stats.doctorSaves++;
        }
      }

      // Add to role history
      user.roleHistory.push({
        role: playerRecord.role,
        team: playerRecord.team,
        gameId: playerRecord.oderId, // This should be gameId, passed separately
        result: playerRecord.isWinner ? 'WIN' : 'LOSS',
        playedAt: new Date()
      });

      // Keep only last 100 games in history
      if (user.roleHistory.length > 100) {
        user.roleHistory = user.roleHistory.slice(-100);
      }

      // Calculate detection success rate
      const detectiveGames = user.roleHistory.filter(r => 
        r.role === 'DETECTIVE' || r.role === 'DEPUTY_DETECTIVE'
      );
      if (detectiveGames.length > 0) {
        const wins = detectiveGames.filter(r => r.result === 'WIN').length;
        user.stats.detectiveSuccessRate = Math.round((wins / detectiveGames.length) * 100);
      }

      await user.save();
    }
  }

  /**
   * Get player stats
   */
  async getPlayerStats(oderId: string): Promise<PlayerStats | null> {
    const user = await User.findByOderId(oderId);
    if (!user || user.isGuest) return null;

    // Get recent games
    const recentGames = await GameRecord.find({ 'players.oderId': oderId })
      .sort({ endedAt: -1 })
      .limit(10)
      .select('-chatLogs -snapshots');

    const gameSummaries: GameSummary[] = recentGames.map(game => {
      const playerRecord = game.players.find(p => p.oderId === oderId)!;
      return {
        gameId: game.gameId,
        roomName: game.roomName,
        role: playerRecord.role,
        team: playerRecord.team,
        result: playerRecord.isWinner ? 'WIN' : 'LOSS',
        duration: game.gameDuration,
        playedAt: game.endedAt
      };
    });

    // Calculate role history summary
    const roleMap = new Map<string, { played: number; wins: number }>();
    user.roleHistory.forEach(entry => {
      const existing = roleMap.get(entry.role) || { played: 0, wins: 0 };
      existing.played++;
      if (entry.result === 'WIN') existing.wins++;
      roleMap.set(entry.role, existing);
    });

    const roleHistory: RoleHistorySummary[] = Array.from(roleMap.entries()).map(([role, data]) => ({
      role,
      timesPlayed: data.played,
      wins: data.wins,
      winRate: data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0
    })).sort((a, b) => b.timesPlayed - a.timesPlayed);

    // Calculate win rates
    const mafiaWinRate = user.stats.gamesAsMafia > 0 
      ? Math.round((user.stats.mafiaWins / user.stats.gamesAsMafia) * 100) 
      : 0;
    const townWinRate = user.stats.gamesAsTown > 0 
      ? Math.round((user.stats.townWins / user.stats.gamesAsTown) * 100) 
      : 0;
    const overallWinRate = user.stats.gamesPlayed > 0 
      ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) 
      : 0;

    // Average game duration
    let avgDuration = 0;
    if (recentGames.length > 0) {
      avgDuration = recentGames.reduce((sum, g) => sum + g.gameDuration, 0) / recentGames.length;
    }

    return {
      gamesPlayed: user.stats.gamesPlayed,
      gamesWon: user.stats.gamesWon,
      gamesLost: user.stats.gamesLost,
      winRate: overallWinRate,
      gamesAsMafia: user.stats.gamesAsMafia,
      gamesAsTown: user.stats.gamesAsTown,
      gamesAsNeutral: user.stats.gamesAsNeutral,
      mafiaWinRate,
      townWinRate,
      detectiveSuccessRate: user.stats.detectiveSuccessRate,
      doctorSaves: user.stats.doctorSaves,
      currentStreak: user.stats.currentStreak,
      longestStreak: user.stats.longestStreak,
      totalPlayTime: user.stats.totalPlayTime,
      averageGameDuration: Math.round(avgDuration),
      recentGames: gameSummaries,
      roleHistory
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    sortBy: 'wins' | 'winRate' | 'gamesPlayed' = 'wins',
    limit = 100
  ): Promise<LeaderboardEntry[]> {
    let sortField: any;
    
    switch (sortBy) {
      case 'wins':
        sortField = { 'stats.gamesWon': -1 };
        break;
      case 'gamesPlayed':
        sortField = { 'stats.gamesPlayed': -1 };
        break;
      case 'winRate':
        sortField = { matchmakingRating: -1 }; // Use MMR as proxy for win rate
        break;
      default:
        sortField = { 'stats.gamesWon': -1 };
    }

    const users = await User.find({ 
      isGuest: false,
      'stats.gamesPlayed': { $gte: 5 } // Minimum games to appear on leaderboard
    })
      .sort(sortField)
      .limit(limit)
      .select('-password -email -friendRequests -blockedUsers');

    return users.map((user, index) => {
      const winRate = user.stats.gamesPlayed > 0 
        ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100) 
        : 0;

      return {
        rank: index + 1,
        oderId: user.oderId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        gamesPlayed: user.stats.gamesPlayed,
        gamesWon: user.stats.gamesWon,
        winRate,
        tier: user.matchmakingTier
      };
    });
  }

  /**
   * Get game history for replay/debugging
   */
  async getGameHistory(gameId: string, includeDetails = false): Promise<IGameRecordDocument | null> {
    const select = includeDetails ? '' : '-chatLogs -snapshots';
    return GameRecord.findOne({ gameId }).select(select);
  }

  /**
   * Get player's game history
   */
  async getPlayerGameHistory(oderId: string, limit = 20): Promise<GameSummary[]> {
    const games = await GameRecord.find({ 'players.oderId': oderId })
      .sort({ endedAt: -1 })
      .limit(limit)
      .select('-chatLogs -snapshots');

    return games.map(game => {
      const playerRecord = game.players.find(p => p.oderId === oderId)!;
      return {
        gameId: game.gameId,
        roomName: game.roomName,
        role: playerRecord.role,
        team: playerRecord.team,
        result: playerRecord.isWinner ? 'WIN' : 'LOSS',
        duration: game.gameDuration,
        playedAt: game.endedAt
      };
    });
  }

  /**
   * Add game snapshot (for debugging/replay)
   */
  async addGameSnapshot(
    gameId: string,
    phase: string,
    dayNumber: number,
    alivePlayers: string[],
    data: Record<string, any>
  ): Promise<void> {
    await GameRecord.updateOne(
      { gameId },
      {
        $push: {
          snapshots: {
            phase,
            dayNumber,
            alivePlayers,
            timestamp: new Date(),
            data
          }
        }
      }
    );
  }

  /**
   * Add chat log to game record
   */
  async addChatLog(
    gameId: string,
    day: number,
    phase: string,
    senderId: string,
    senderRole: string,
    messageType: 'PLAYER' | 'MAFIA' | 'SYSTEM',
    content: string
  ): Promise<void> {
    await GameRecord.updateOne(
      { gameId },
      {
        $push: {
          chatLogs: {
            day,
            phase,
            senderId,
            senderRole,
            messageType,
            content,
            timestamp: new Date()
          }
        }
      }
    );
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<{
    totalGames: number;
    totalPlayers: number;
    averageGameDuration: number;
    mafiaWinRate: number;
    townWinRate: number;
    mostPlayedRole: string;
  }> {
    const [
      totalGames,
      totalPlayers,
      avgDuration,
      winStats,
      roleStats
    ] = await Promise.all([
      GameRecord.countDocuments(),
      User.countDocuments({ isGuest: false }),
      GameRecord.aggregate([
        { $group: { _id: null, avg: { $avg: '$gameDuration' } } }
      ]),
      GameRecord.aggregate([
        { $group: { _id: '$winningTeam', count: { $sum: 1 } } }
      ]),
      GameRecord.aggregate([
        { $unwind: '$players' },
        { $group: { _id: '$players.role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ])
    ]);

    const mafiaWins = winStats.find(w => w._id === 'MAFIA')?.count || 0;
    const townWins = winStats.find(w => w._id === 'TOWN')?.count || 0;
    const total = mafiaWins + townWins;

    return {
      totalGames,
      totalPlayers,
      averageGameDuration: avgDuration[0]?.avg || 0,
      mafiaWinRate: total > 0 ? Math.round((mafiaWins / total) * 100) : 50,
      townWinRate: total > 0 ? Math.round((townWins / total) * 100) : 50,
      mostPlayedRole: roleStats[0]?._id || 'VILLAGER'
    };
  }
}

export const statsService = StatsService.getInstance();
export default statsService;
