/**
 * Role Distribution Utility
 * Client-side role calculation to match server logic
 * MUST stay in sync with server/src/services/RoleDistribution.ts
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
 */

export interface RoleCount {
  mafia: number;
  godfather: number;
  detective: number;
  deputyDetective: number;
  doctor: number;
  nurse: number;
  vigilante: number;
  bodyguard: number;
  mayor: number;
  jester: number;
  serialKiller: number;
  villagers: number;
}

export interface RoleSettings {
  enableDonMafia: boolean;
  enableGodfather: boolean;
  enableJester: boolean;
  enableVigilante: boolean;
  enableDoctor: boolean;
  enableDetective: boolean;
  enableAdvancedRoles: boolean;
  enableNeutralRoles: boolean;
}

/**
 * Calculate role distribution based on player count and settings
 * Uses canonical formulas matching server-side logic exactly
 */
export function calculateRoleDistribution(
  playerCount: number,
  settings: Partial<RoleSettings> = {}
): RoleCount {
  const config: RoleSettings = {
    enableDonMafia: settings.enableDonMafia ?? false,
    enableGodfather: settings.enableGodfather ?? false,
    enableJester: settings.enableJester ?? false,
    enableVigilante: settings.enableVigilante ?? false,
    enableDoctor: settings.enableDoctor ?? true,
    enableDetective: settings.enableDetective ?? true,
    enableAdvancedRoles: settings.enableAdvancedRoles ?? false,
    enableNeutralRoles: settings.enableNeutralRoles ?? false,
  };

  const roles: RoleCount = {
    mafia: 0,
    godfather: 0,
    detective: 0,
    deputyDetective: 0,
    doctor: 0,
    nurse: 0,
    vigilante: 0,
    bodyguard: 0,
    mayor: 0,
    jester: 0,
    serialKiller: 0,
    villagers: 0,
  };

  // ============================================================
  // SPECIAL CASES: 3 and 4 players
  // ============================================================
  if (playerCount <= 2) return roles;

  if (playerCount === 3) {
    roles.mafia = 1;
    roles.villagers = 2;
    return roles;
  }

  if (playerCount === 4) {
    roles.mafia = 1;
    roles.detective = config.enableDetective ? 1 : 0;
    roles.villagers = playerCount - 1 - roles.detective;
    return roles;
  }

  // ============================================================
  // CORE FORMULAS (players >= 5)
  // ============================================================

  // 🔫 Mafia: floor(players / 4)
  const mafiaTotal = Math.floor(playerCount / 4);

  // Godfather replaces one regular Mafia if enabled and >= 2 mafia
  if (config.enableGodfather && mafiaTotal >= 2) {
    roles.godfather = 1;
    roles.mafia = mafiaTotal - 1;
  } else {
    roles.mafia = mafiaTotal;
  }

  // 🔍 Detective: min(3, max(1, floor(players / 12)))
  roles.detective = config.enableDetective
    ? Math.min(3, Math.max(1, Math.floor(playerCount / 12)))
    : 0;

  // 🧑‍⚕️ Doctor: min(2, max(1, floor(players / 15)))
  roles.doctor = config.enableDoctor
    ? Math.min(2, Math.max(1, Math.floor(playerCount / 15)))
    : 0;

  // ============================================================
  // THRESHOLD-BASED EXTRAS
  // ============================================================

  // Deputy Detective: 1 if players >= 14
  roles.deputyDetective = (config.enableDetective && playerCount >= 14) ? 1 : 0;

  // Vigilante: 1 if players >= 14
  roles.vigilante = (config.enableVigilante && playerCount >= 14) ? 1 : 0;

  // Bodyguard: 1 if players >= 16
  roles.bodyguard = (config.enableAdvancedRoles && playerCount >= 16) ? 1 : 0;

  // Nurse: 1 if players >= 18
  roles.nurse = (config.enableAdvancedRoles && playerCount >= 18) ? 1 : 0;

  // Mayor: 1 if players >= 20
  roles.mayor = (config.enableAdvancedRoles && playerCount >= 20) ? 1 : 0;

  // ============================================================
  // NEUTRAL ROLES (only when players >= 13, max 2)
  // ============================================================
  if (config.enableNeutralRoles && playerCount >= 13) {
    const neutralCount = Math.min(2, Math.floor(playerCount / 20));

    if (neutralCount >= 1 && config.enableJester) {
      roles.jester = 1;
    }
    if (neutralCount >= 2) {
      roles.serialKiller = 1;
    }
  }

  // ============================================================
  // VILLAGERS = remaining
  // ============================================================
  const totalAssigned =
    roles.mafia +
    roles.godfather +
    roles.detective +
    roles.deputyDetective +
    roles.doctor +
    roles.nurse +
    roles.vigilante +
    roles.bodyguard +
    roles.mayor +
    roles.jester +
    roles.serialKiller;

  roles.villagers = Math.max(0, playerCount - totalAssigned);

  return roles;
}
