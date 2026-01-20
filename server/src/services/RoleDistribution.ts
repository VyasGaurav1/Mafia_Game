/**
 * Role Distribution Service
 * Dynamic Mafia role assignment engine with automatic scaling and balancing
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
   * Get role distribution based on player count
   * Based on balanced role specification for competitive Mafia gameplay
   */
  private static getRoleDistribution(playerCount: number, config: RoleConfig): Record<Role, number> {
    const distribution: Record<Role, number> = {} as any;
    
    // CORE ROLES - Always use basic Mafia and Villager structure
    // Distribution follows standard Mafia balance ratios
    
    if (playerCount === 3) {
      distribution[Role.MAFIA] = 1;
      distribution[Role.VILLAGER] = 2;
    }
    else if (playerCount === 4) {
      distribution[Role.MAFIA] = 1;
      distribution[Role.VILLAGER] = 2;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      if (!config.enableDoctor) distribution[Role.VILLAGER] = 3;
    }
    else if (playerCount === 5) {
      distribution[Role.MAFIA] = 1;
      distribution[Role.VILLAGER] = 3;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      if (!config.enableDoctor) distribution[Role.VILLAGER] = 4;
    }
    else if (playerCount === 6) {
      distribution[Role.MAFIA] = 2;
      distribution[Role.VILLAGER] = 3;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      if (!config.enableDoctor) distribution[Role.VILLAGER] = 4;
    }
    else if (playerCount === 7) {
      distribution[Role.MAFIA] = 2;
      distribution[Role.VILLAGER] = 3;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      // Adjust villagers based on enabled roles
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0);
      distribution[Role.VILLAGER] = 5 - powerRoles;
    }
    else if (playerCount === 8) {
      distribution[Role.MAFIA] = 2;
      distribution[Role.VILLAGER] = 4;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0);
      distribution[Role.VILLAGER] = 6 - powerRoles;
    }
    else if (playerCount === 9) {
      distribution[Role.MAFIA] = 3;
      distribution[Role.VILLAGER] = 4;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0);
      distribution[Role.VILLAGER] = 6 - powerRoles;
    }
    else if (playerCount === 10) {
      distribution[Role.MAFIA] = 3;
      distribution[Role.VILLAGER] = 4;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0);
      distribution[Role.VILLAGER] = 7 - powerRoles;
    }
    else if (playerCount === 11) {
      distribution[Role.MAFIA] = 3;
      distribution[Role.VILLAGER] = 5;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0);
      distribution[Role.VILLAGER] = 8 - powerRoles;
    }
    else if (playerCount === 12) {
      distribution[Role.MAFIA] = 4;
      distribution[Role.VILLAGER] = 5;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0);
      distribution[Role.VILLAGER] = 8 - powerRoles;
    }
    else if (playerCount === 13) {
      distribution[Role.MAFIA] = 4;
      distribution[Role.VILLAGER] = 6;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0);
      distribution[Role.VILLAGER] = 9 - powerRoles;
    }
    else if (playerCount === 14) {
      distribution[Role.MAFIA] = 4;
      distribution[Role.VILLAGER] = 6;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 10 - powerRoles;
    }
    else if (playerCount === 15) {
      distribution[Role.MAFIA] = 5;
      distribution[Role.VILLAGER] = 6;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 11 - powerRoles;
    }
    else if (playerCount === 16) {
      distribution[Role.MAFIA] = 5;
      distribution[Role.VILLAGER] = 7;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 12 - powerRoles;
    }
    else if (playerCount === 17) {
      distribution[Role.MAFIA] = 5;
      distribution[Role.VILLAGER] = 8;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 13 - powerRoles;
    }
    else if (playerCount === 18) {
      distribution[Role.MAFIA] = 6;
      distribution[Role.VILLAGER] = 8;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 14 - powerRoles;
    }
    else if (playerCount === 19) {
      distribution[Role.MAFIA] = 6;
      distribution[Role.VILLAGER] = 9;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 15 - powerRoles;
    }
    else if (playerCount === 20) {
      distribution[Role.MAFIA] = 7;
      distribution[Role.VILLAGER] = 9;
      distribution[Role.DOCTOR] = config.enableDoctor ? 1 : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? 1 : 0;
      distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
      distribution[Role.BODYGUARD] = config.enableAdvancedRoles ? 1 : 0;
      const powerRoles = (config.enableDoctor ? 1 : 0) + (config.enableDetective ? 1 : 0) + (config.enableVigilante ? 1 : 0) + (config.enableAdvancedRoles ? 1 : 0);
      distribution[Role.VILLAGER] = 16 - powerRoles;
    }
    // For 20+ players, use scaling formula
    else {
      // Mafia: ~35% for balance in larger games
      const mafiaCount = Math.ceil(playerCount * 0.35);
      distribution[Role.MAFIA] = mafiaCount;
      
      // Core power roles
      distribution[Role.DOCTOR] = config.enableDoctor ? Math.ceil(playerCount / 15) : 0;
      distribution[Role.DETECTIVE] = config.enableDetective ? Math.ceil(playerCount / 15) : 0;
      
      if (config.enableAdvancedRoles) {
        distribution[Role.VIGILANTE] = config.enableVigilante ? 1 : 0;
        distribution[Role.BODYGUARD] = 1;
        distribution[Role.JAILOR] = 1;
        distribution[Role.MAYOR] = 1;
        distribution[Role.SPY] = config.enableChaosRoles ? 1 : 0;
      }
      
      if (config.enableNeutralRoles && playerCount >= 25) {
        distribution[Role.JESTER] = config.enableJester ? 1 : 0;
        distribution[Role.SERIAL_KILLER] = 1;
      }
      
      // Fill remaining with villagers
      const assignedCount = Object.values(distribution).reduce((sum, count) => sum + count, 0);
      distribution[Role.VILLAGER] = playerCount - assignedCount;
    }
    
    return distribution;
  }
  
  /**
   * Create role assignments from distribution
   */
  private static createRoleAssignments(distribution: Record<Role, number>): RoleAssignment[] {
    const assignments: RoleAssignment[] = [];
    
    for (const [roleStr, count] of Object.entries(distribution)) {
      const role = roleStr as Role;
      const metadata = ROLE_METADATA[role];
      
      if (!metadata) continue;
      
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
   * Check game balance
   */
  private static checkBalance(
    teamCounts: { mafia: number; town: number; neutral: number },
    totalPlayers: number,
    warnings: string[]
  ): boolean {
    let isBalanced = true;
    
    // Rule 1: Mafia should never be >= Town
    if (teamCounts.mafia >= teamCounts.town) {
      warnings.push('CRITICAL: Mafia count >= Town count - game is unbalanced');
      isBalanced = false;
    }
    
    // Rule 2: Mafia should be ~20-30% of total
    const mafiaPercent = (teamCounts.mafia / totalPlayers) * 100;
    if (mafiaPercent < 15 || mafiaPercent > 35) {
      warnings.push(`Mafia percentage (${mafiaPercent.toFixed(1)}%) is outside recommended range (15-35%)`);
    }
    
    // Rule 3: Too many neutrals can cause chaos
    if (teamCounts.neutral > totalPlayers * 0.15) {
      warnings.push('High neutral role count may cause game imbalance');
    }
    
    // Rule 4: Minimum town members
    if (teamCounts.town < 4) {
      warnings.push('Town has too few members');
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
    
    if (playerCount < 6) {
      errors.push('Minimum 6 players required');
    }
    
    if (playerCount > 50) {
      errors.push('Maximum 50 players recommended');
    }
    
    // Add more validation rules as needed
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
