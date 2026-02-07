/**
 * Role Distribution Service
 * Dynamic Mafia role assignment engine with automatic scaling and balancing
 * 
 * CANONICAL FORMULAS:
 *   mafia     = floor(players / 4)
 *   detective = min(3, max(1, floor(players / 12)))
 *   doctor    = min(2, max(1, floor(players / 15)))
 *   deputy_detective = 1 if players >= 14 else 0
 *   bodyguard = 1 if players >= 16 else 0
 *   nurse     = 1 if players >= 18 else 0
 *   vigilante = 1 if players >= 14 else 0
 *   mayor     = 1 if players >= 20 else 0
 *   neutral   = floor(players / 20), max 2 (only if players >= 13)
 *   villagers = players - sum(all roles)
 * 
 * HARD BALANCE RULES:
 *   - Mafia must be <= 40% of players
 *   - Town must always have at least 1 info role
 *   - Town must have at least 1 protection role (if players >= 5)
 *   - Neutral roles only when players >= 13
 */

import { Role, Team } from '../types';

export interface RoleConfig {
  enableAdvancedRoles: boolean;
  enableNeutralRoles: boolean;
  enableChaosRoles: boolean;
  enableGodfather: boolean;
  enableJester: boolean;
  enableVigilante: boolean;
  enableDoctor: boolean;
  enableDetective: boolean;
}

export interface RoleAssignment {
  role: Role;
  team: Team;
  hasNightAction: boolean;
  canKill: boolean;
  isUnique: boolean;
  description: string;
}

export interface RoleDistributionResult {
  roles: RoleAssignment[];
  teamCounts: {
    mafia: number;
    town: number;
    neutral: number;
  };
  powerRoles: number;
  isBalanced: boolean;
  warnings: string[];
}

/**
 * Role metadata defining capabilities and team affiliation
 */
const ROLE_METADATA: Record<Role, Omit<RoleAssignment, 'role'>> = {
  // Core Town Roles
  [Role.VILLAGER]: {
    team: Team.TOWN,
    hasNightAction: false,
    canKill: false,
    isUnique: false,
    description: 'Regular townsperson with no special abilities'
  },
  [Role.DOCTOR]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: false,
    description: 'Saves one player from death each night'
  },
  [Role.DETECTIVE]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: false,
    description: 'Investigates players to discover their alignment'
  },
  [Role.DEPUTY_DETECTIVE]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Inherits Detective power if the Detective is eliminated'
  },
  [Role.NURSE]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Inherits Doctor power if the Doctor is eliminated'
  },
  
  // Core Mafia Roles
  [Role.MAFIA]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: true,
    isUnique: false,
    description: 'Kills one townsperson each night'
  },
  [Role.GODFATHER]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: true,
    isUnique: true,
    description: 'Mafia leader, appears innocent to Detective'
  },
  [Role.MAFIOSO]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: true,
    isUnique: true,
    description: 'Backup killer for the Mafia'
  },
  [Role.MAFIA_GOON]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: true,
    isUnique: false,
    description: 'Regular mafia member'
  },
  
  // Advanced Town Roles
  [Role.BODYGUARD]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Protects one player, dies if they are attacked'
  },
  [Role.JAILOR]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Jails one player, blocking all their actions'
  },
  [Role.VIGILANTE]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: true,
    isUnique: true,
    description: 'Can kill one player (limited uses)'
  },
  [Role.MAYOR]: {
    team: Team.TOWN,
    hasNightAction: false,
    canKill: false,
    isUnique: true,
    description: 'Vote counts as 2 during lynching'
  },
  [Role.SPY]: {
    team: Team.TOWN,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Receives partial information about mafia actions'
  },
  
  // Advanced Mafia Roles
  [Role.MAFIA_HEALER]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Protects mafia members from death'
  },
  [Role.SILENCER]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Prevents a player from speaking during the day'
  },
  
  // Neutral Roles
  [Role.JESTER]: {
    team: Team.NEUTRAL,
    hasNightAction: false,
    canKill: false,
    isUnique: true,
    description: 'Wins if lynched by the town'
  },
  [Role.SERIAL_KILLER]: {
    team: Team.NEUTRAL,
    hasNightAction: true,
    canKill: true,
    isUnique: true,
    description: 'Independent killer, wins alone'
  },
  [Role.CULT_LEADER]: {
    team: Team.NEUTRAL,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Converts townspeople to cult members'
  },
  [Role.ARSONIST]: {
    team: Team.NEUTRAL,
    hasNightAction: true,
    canKill: true,
    isUnique: true,
    description: 'Marks players and can ignite them later'
  },
  
  // Legacy
  [Role.DON_MAFIA]: {
    team: Team.MAFIA,
    hasNightAction: true,
    canKill: false,
    isUnique: true,
    description: 'Legacy godfather role'
  }
};

/**
 * Role Distribution Service
 */
export class RoleDistributionService {
  /**
   * Assign roles based on player count and configuration
   * Uses canonical formulas from game specification
   */
  static assignRoles(playerCount: number, config: RoleConfig): RoleDistributionResult {
    const warnings: string[] = [];
    
    // Validate player count
    if (playerCount < 3) {
      throw new Error('Minimum 3 players required');
    }
    
    if (playerCount > 50) {
      warnings.push('Player count exceeds recommended maximum (50)');
    }
    
    // Get role distribution based on player count
    const distribution = this.getRoleDistribution(playerCount, config);
    
    // Validate and create assignments
    const roles = this.createRoleAssignments(distribution);
    
    // Calculate team counts
    const teamCounts = this.calculateTeamCounts(roles);
    
    // Check balance
    const balanceCheck = this.checkBalance(teamCounts, roles.length, warnings);
    
    return {
      roles,
      teamCounts,
      powerRoles: roles.filter(r => r.hasNightAction || r.canKill).length,
      isBalanced: balanceCheck,
      warnings
    };
  }
  
  /**
   * Get role distribution based on player count using CANONICAL FORMULAS
   * 
   * mafia     = floor(players / 4)
   * detective = min(3, max(1, floor(players / 12)))  
   * doctor    = min(2, max(1, floor(players / 15)))
   * Threshold-based extras added on top
   * villagers = players - sum(all other roles)
   */
  private static getRoleDistribution(playerCount: number, config: RoleConfig): Partial<Record<Role, number>> {
    const distribution: Partial<Record<Role, number>> = {};
    
    // ============================================================
    // SPECIAL CASES: 3 and 4 players (minimal games)
    // ============================================================
    if (playerCount === 3) {
      // Demo / test only: 1 Mafia, 2 Villagers, no night roles
      distribution[Role.MAFIA] = 1;
      distribution[Role.VILLAGER] = 2;
      return distribution;
    }
    
    if (playerCount === 4) {
      // 1 Mafia, 1 Detective, 2 Villagers
      distribution[Role.MAFIA] = 1;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VILLAGER] = playerCount - 1 - (distribution[Role.DETECTIVE] || 0);
      return distribution;
    }
    
    // ============================================================
    // CORE FORMULAS (players >= 5)
    // ============================================================
    
    // 🔫 Mafia Count: floor(total_players / 4)
    const mafiaCount = Math.floor(playerCount / 4);
    distribution[Role.MAFIA] = mafiaCount;
    
    // 🔍 Detective Count: min(3, max(1, floor(total_players / 12)))
    const detectiveCount = config.enableDetective 
      ? Math.min(3, Math.max(1, Math.floor(playerCount / 12)))
      : 0;
    distribution[Role.DETECTIVE] = detectiveCount;
    
    // 🧑‍⚕️ Doctor Count: min(2, max(1, floor(total_players / 15)))
    const doctorCount = config.enableDoctor
      ? Math.min(2, Math.max(1, Math.floor(playerCount / 15)))
      : 0;
    distribution[Role.DOCTOR] = doctorCount;
    
    // ============================================================
    // THRESHOLD-BASED EXTRAS
    // ============================================================
    
    // Deputy Detective: 1 if players >= 14
    distribution[Role.DEPUTY_DETECTIVE] = (config.enableDetective && playerCount >= 14) ? 1 : 0;
    
    // Vigilante: 1 if players >= 14
    distribution[Role.VIGILANTE] = (config.enableVigilante && playerCount >= 14) ? 1 : 0;
    
    // Bodyguard: 1 if players >= 16
    distribution[Role.BODYGUARD] = (config.enableAdvancedRoles && playerCount >= 16) ? 1 : 0;
    
    // Nurse: 1 if players >= 18
    distribution[Role.NURSE] = (config.enableAdvancedRoles && playerCount >= 18) ? 1 : 0;
    
    // Mayor: 1 if players >= 20
    distribution[Role.MAYOR] = (config.enableAdvancedRoles && playerCount >= 20) ? 1 : 0;
    
    // ============================================================
    // NEUTRAL ROLES (Optional, only when players >= 13, max 2)
    // ============================================================
    if (config.enableNeutralRoles && playerCount >= 13) {
      const neutralCount = Math.min(2, Math.floor(playerCount / 20));
      
      if (neutralCount >= 1 && config.enableJester) {
        distribution[Role.JESTER] = 1;
      }
      if (neutralCount >= 2) {
        distribution[Role.SERIAL_KILLER] = 1;
      }
    }
    
    // ============================================================
    // GODFATHER (replaces one regular Mafia if enabled and >= 2 mafia)
    // ============================================================
    if (config.enableGodfather && mafiaCount >= 2) {
      distribution[Role.GODFATHER] = 1;
      distribution[Role.MAFIA] = mafiaCount - 1;
    }
    
    // ============================================================
    // VILLAGERS = remaining players
    // ============================================================
    const assignedCount = Object.values(distribution).reduce((sum, count) => sum + (count || 0), 0);
    distribution[Role.VILLAGER] = Math.max(0, playerCount - assignedCount);
    
    return distribution;
  }
  
  /**
   * Create role assignments from distribution
   */
  private static createRoleAssignments(distribution: Partial<Record<Role, number>>): RoleAssignment[] {
    const assignments: RoleAssignment[] = [];
    
    for (const [roleStr, count] of Object.entries(distribution)) {
      const role = roleStr as Role;
      const metadata = ROLE_METADATA[role];
      
      if (!metadata || !count) continue;
      
      for (let i = 0; i < count; i++) {
        assignments.push({
          role,
          ...metadata
        });
      }
    }
    
    // Shuffle assignments
    return this.shuffleArray(assignments);
  }
  
  /**
   * Calculate team counts
   */
  private static calculateTeamCounts(roles: RoleAssignment[]): { mafia: number; town: number; neutral: number } {
    return {
      mafia: roles.filter(r => r.team === Team.MAFIA).length,
      town: roles.filter(r => r.team === Team.TOWN).length,
      neutral: roles.filter(r => r.team === Team.NEUTRAL).length
    };
  }
  
  /**
   * Check game balance against HARD BALANCE RULES
   */
  private static checkBalance(
    teamCounts: { mafia: number; town: number; neutral: number },
    totalPlayers: number,
    warnings: string[]
  ): boolean {
    let isBalanced = true;
    
    // Rule 1: Mafia must be <= 40% of players
    const mafiaPercent = (teamCounts.mafia / totalPlayers) * 100;
    if (mafiaPercent > 40) {
      warnings.push(`CRITICAL: Mafia percentage (${mafiaPercent.toFixed(1)}%) exceeds 40% cap`);
      isBalanced = false;
    }
    
    // Rule 2: Mafia should never equal or outnumber Town at start
    if (teamCounts.mafia >= teamCounts.town) {
      warnings.push('CRITICAL: Mafia count >= Town count - game is unbalanced');
      isBalanced = false;
    }
    
    // Rule 3: Too many neutrals can cause chaos (max 2)
    if (teamCounts.neutral > 2) {
      warnings.push('Neutral count exceeds maximum of 2');
      isBalanced = false;
    }
    
    return isBalanced;
  }
  
  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Get role metadata
   */
  static getRoleMetadata(role: Role): RoleAssignment {
    return {
      role,
      ...ROLE_METADATA[role]
    };
  }
  
  /**
   * Validate role configuration
   */
  static validateConfiguration(playerCount: number, config: RoleConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (playerCount < 3) {
      errors.push('Minimum 3 players required');
    }
    
    if (playerCount > 50) {
      errors.push('Maximum 50 players recommended');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
