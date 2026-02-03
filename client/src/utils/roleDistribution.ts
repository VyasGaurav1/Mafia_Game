/**
 * Role Distribution Utility
 * Client-side role calculation to match server logic
 * MUST stay in sync with server/src/services/RoleDistribution.ts
 */

export interface RoleCount {
  mafia: number;
  detective: number;
  doctor: number;
  vigilante: number;
  jester: number;
  bodyguard: number;
  villagers: number;
}

export interface RoleSettings {
  enableDonMafia: boolean;
  enableJester: boolean;
  enableVigilante: boolean;
}

/**
 * Calculate role distribution based on player count and settings
 * This matches the server-side logic exactly
 */
export function calculateRoleDistribution(
  playerCount: number,
  settings: RoleSettings
): RoleCount {
  const roles: RoleCount = {
    mafia: 0,
    detective: 0,
    doctor: 0,
    vigilante: 0,
    jester: 0,
    bodyguard: 0,
    villagers: 0,
  };

  // Match exact server logic
  if (playerCount === 3) {
    roles.mafia = 1;
    roles.villagers = 2;
  } else if (playerCount === 4) {
    roles.mafia = 1;
    roles.doctor = 1;
    roles.villagers = 2;
  } else if (playerCount === 5) {
    roles.mafia = 1;
    roles.doctor = 1;
    roles.villagers = 3;
  } else if (playerCount === 6) {
    roles.mafia = 2;
    roles.doctor = 1;
    roles.villagers = 3;
  } else if (playerCount === 7) {
    roles.mafia = 2;
    roles.doctor = 1;
    roles.detective = 1;
    roles.villagers = 3;
  } else if (playerCount === 8) {
    roles.mafia = 2;
    roles.doctor = 1;
    roles.detective = 1;
    roles.villagers = 4;
  } else if (playerCount === 9) {
    roles.mafia = 3;
    roles.doctor = 1;
    roles.detective = 1;
    roles.villagers = 4;
  } else if (playerCount === 10) {
    roles.mafia = 3;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.villagers = 5 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 11) {
    roles.mafia = 3;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.villagers = 6 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 12) {
    roles.mafia = 4;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.villagers = 6 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 13) {
    roles.mafia = 4;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.villagers = 7 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 14) {
    roles.mafia = 4;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 7 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 15) {
    roles.mafia = 5;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 7 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 16) {
    roles.mafia = 5;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 8 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 17) {
    roles.mafia = 5;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 9 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 18) {
    roles.mafia = 6;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 9 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 19) {
    roles.mafia = 6;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 10 - (settings.enableVigilante ? 1 : 0);
  } else if (playerCount === 20) {
    roles.mafia = 7;
    roles.doctor = 1;
    roles.detective = 1;
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;
    roles.villagers = 10 - (settings.enableVigilante ? 1 : 0);
  } else {
    // 20+ players, use scaling formula
    const mafiaCount = Math.ceil(playerCount * 0.35);
    roles.mafia = mafiaCount;
    roles.doctor = Math.ceil(playerCount / 15);
    roles.detective = Math.ceil(playerCount / 15);
    roles.vigilante = settings.enableVigilante ? 1 : 0;
    roles.bodyguard = 1;

    const totalAssigned =
      roles.mafia +
      roles.doctor +
      roles.detective +
      roles.vigilante +
      roles.bodyguard;
    roles.villagers = playerCount - totalAssigned;
  }

  // Apply jester if enabled (replaces one villager)
  if (settings.enableJester && roles.villagers > 0 && playerCount >= 8) {
    roles.jester = 1;
    roles.villagers -= 1;
  }

  return roles;
}
