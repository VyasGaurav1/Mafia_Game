/**
 * Player Grid Component
 * Displays all players in a grid layout during game
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSkull, FaCheckCircle, FaCrosshairs, FaTimes, FaUserSlash } from 'react-icons/fa';
import { GiKnifeFork } from 'react-icons/gi';
import { IPlayer, Role, Team, GamePhase, PlayerStatus, ROLE_DISPLAY } from '@/types';

interface PlayerGridProps {
  players: IPlayer[];
  currentUserId: string;
  myRole: Role | null;
  myTeam: Team | null;
  currentPhase: GamePhase;
  validTargets: string[];
  selectedTarget: string | null;
  onSelectTarget: (targetId: string | null) => void;
  votes: Record<string, number>;
  hasVoted: string[];
  mafiaVotes: Record<string, string>;
  canAct: boolean;
  canVote: boolean;
  onVote: (targetId: string) => void;
  isHost: boolean;
  onKickPlayer?: (playerId: string) => void;
  onRequestRemoval?: (playerId: string) => void;
  onMafiaKill?: (playerId: string) => void;
}

export default function PlayerGrid({
  players,
  currentUserId,
  myRole,
  myTeam,
  currentPhase,
  validTargets,
  selectedTarget,
  onSelectTarget,
  votes,
  hasVoted,
  mafiaVotes,
  canAct,
  canVote,
  onVote,
  isHost,
  onKickPlayer,
  onRequestRemoval,
  onMafiaKill
}: PlayerGridProps) {
  const [actionMenuPlayer, setActionMenuPlayer] = useState<string | null>(null);
  
  const isVotingPhase = currentPhase === GamePhase.VOTING;
  const isNightPhase = [
    GamePhase.NIGHT,
    GamePhase.MAFIA_ACTION,
    GamePhase.DETECTIVE_ACTION,
    GamePhase.DOCTOR_ACTION,
    GamePhase.DON_ACTION,
    GamePhase.VIGILANTE_ACTION
  ].includes(currentPhase);
  
  const isMafiaActionPhase = currentPhase === GamePhase.MAFIA_ACTION;
  const isMafia = myTeam === Team.MAFIA;

  const handlePlayerClick = (player: IPlayer) => {
    if (player.status !== PlayerStatus.ALIVE) return;
    if (player.oderId === currentUserId) return; // Can't target self
    
    // Show action menu
    setActionMenuPlayer(actionMenuPlayer === player.oderId ? null : player.oderId);
  };
  
  const handleVoteAction = (playerId: string) => {
    if (canVote && isVotingPhase) {
      onVote(playerId);
    }
    setActionMenuPlayer(null);
  };
  
  const handleKickAction = (playerId: string) => {
    if (isHost && onKickPlayer) {
      onKickPlayer(playerId);
    }
    setActionMenuPlayer(null);
  };
  
  const handleRequestRemoval = (playerId: string) => {
    if (onRequestRemoval) {
      onRequestRemoval(playerId);
    }
    setActionMenuPlayer(null);
  };
  
  const handleMafiaKill = (playerId: string) => {
    if (onMafiaKill && isMafia && isMafiaActionPhase) {
      onMafiaKill(playerId);
      onSelectTarget(playerId);
    }
    setActionMenuPlayer(null);
  };

  // Calculate mafia vote target for display
  const getMafiaVoteTarget = (playerId: string): string | null => {
    return mafiaVotes[playerId] || null;
  };

  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {players.map((player, index) => {
            const isCurrentUser = player.oderId === currentUserId;
            const isDead = player.status === PlayerStatus.DEAD;
            const isSelected = selectedTarget === player.oderId;
            const isValidTarget = validTargets.includes(player.oderId);
            // For current user, use myRole from store; for others, use player.role
            const playerRole = isCurrentUser ? (myRole || player.role) : player.role;
            const isMafiaTeammate = myTeam === Team.MAFIA && 
              playerRole && 
              [Role.MAFIA, Role.DON_MAFIA].includes(playerRole);
            const playerVoteCount = votes[player.oderId] || 0;
            const hasPlayerVoted = hasVoted.includes(player.oderId);
            const mafiaTarget = getMafiaVoteTarget(player.oderId);

            return (
              <motion.div
                key={player.oderId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handlePlayerClick(player)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${isDead 
                    ? 'bg-dark-800/30 border-dark-700 cursor-default' 
                    : isSelected
                      ? 'bg-blood-500/20 border-blood-500 shadow-glow-red cursor-pointer'
                      : isCurrentUser
                        ? 'bg-dark-700/80 border-amber-500/50'
                        : isValidTarget && canAct
                          ? 'bg-dark-700/80 border-dark-400 hover:border-blood-500/50 cursor-pointer'
                          : canVote && isVotingPhase
                            ? 'bg-dark-700/80 border-dark-400 hover:border-amber-500/50 cursor-pointer'
                            : 'bg-dark-700/80 border-dark-600'
                  }
                `}
              >
                {/* Vote count badge */}
                {isVotingPhase && playerVoteCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-blood-500 rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
                  >
                    <span className="text-sm font-bold text-white">{playerVoteCount}</span>
                  </motion.div>
                )}

                {/* Has voted indicator */}
                {isVotingPhase && hasPlayerVoted && !isDead && (
                  <div className="absolute top-2 left-2">
                    <FaCheckCircle className="text-green-400 text-sm" />
                  </div>
                )}

                {/* Target indicator for mafia */}
                {isNightPhase && myTeam === Team.MAFIA && mafiaTarget && (
                  <div className="absolute top-2 right-2">
                    <FaCrosshairs className="text-red-400 text-sm animate-pulse" />
                  </div>
                )}

                {/* Avatar */}
                <div className="relative mx-auto w-14 h-14 mb-2">
                  {isDead ? (
                    <div className="w-full h-full rounded-full bg-dark-600 flex items-center justify-center">
                      <FaSkull className="text-xl text-gray-500" />
                    </div>
                  ) : (
                    <div className={`
                      w-full h-full rounded-full flex items-center justify-center text-xl font-bold
                      ${isCurrentUser 
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-dark-900' 
                        : isMafiaTeammate
                          ? 'bg-gradient-to-br from-red-600 to-red-700 text-white ring-2 ring-red-500/50'
                          : 'bg-gradient-to-br from-dark-500 to-dark-600 text-white'
                      }
                    `}>
                      {player.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Connection status */}
                  {!player.isConnected && !isDead && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px]">⚡</span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className={`text-center font-medium text-sm truncate ${
                  isDead ? 'text-gray-500 line-through' : 'text-white'
                }`}>
                  {player.username}
                </p>

                {/* Role for current user (always visible) */}
                {isCurrentUser && !isDead && playerRole && (
                  <div className="mt-1 flex justify-center">
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full font-semibold
                      ${ROLE_DISPLAY[playerRole].bgColor} ${ROLE_DISPLAY[playerRole].color}
                    `}>
                      {ROLE_DISPLAY[playerRole].icon} {ROLE_DISPLAY[playerRole].name}
                    </span>
                  </div>
                )}

                {/* Role for dead players or mafia teammates */}
                {!isCurrentUser && (isDead || isMafiaTeammate) && playerRole && (
                  <div className="mt-1 flex justify-center">
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${isDead ? 'bg-dark-600 text-gray-400' : ROLE_DISPLAY[playerRole].bgColor + ' ' + ROLE_DISPLAY[playerRole].color}
                    `}>
                      {ROLE_DISPLAY[playerRole].icon} {isDead ? ROLE_DISPLAY[playerRole].name : ''}
                    </span>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 rounded-xl border-2 border-blood-400 pointer-events-none"
                  />
                )}

                {/* Action Menu Popup */}
                <AnimatePresence>
                  {actionMenuPlayer === player.oderId && !isCurrentUser && !isDead && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 10 }}
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full z-50 bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-2 min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Close button */}
                      <button
                        onClick={() => setActionMenuPlayer(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-dark-600 rounded-full flex items-center justify-center hover:bg-dark-500"
                      >
                        <FaTimes className="text-xs text-gray-400" />
                      </button>

                      <div className="flex flex-col gap-1">
                        {/* Kill option - Only for Mafia during Mafia Action phase */}
                        {isMafia && isMafiaActionPhase && (
                          <button
                            onClick={() => handleMafiaKill(player.oderId)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-md transition-colors w-full"
                          >
                            <GiKnifeFork className="text-lg" />
                            <span>Kill</span>
                          </button>
                        )}

                        {/* Vote option - During voting phase */}
                        {isVotingPhase && canVote && (
                          <button
                            onClick={() => handleVoteAction(player.oderId)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/20 rounded-md transition-colors w-full"
                          >
                            <FaCheckCircle />
                            <span>Vote</span>
                          </button>
                        )}

                        {/* Request Removal Vote - Available for all players during day */}
                        {!isNightPhase && !isVotingPhase && onRequestRemoval && (
                          <button
                            onClick={() => handleRequestRemoval(player.oderId)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500/20 rounded-md transition-colors w-full"
                          >
                            <FaUserSlash />
                            <span>Request Removal</span>
                          </button>
                        )}

                        {/* Direct Remove - Only for host (Operator) */}
                        {isHost && onKickPlayer && (
                          <button
                            onClick={() => handleKickAction(player.oderId)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-500/20 rounded-md transition-colors w-full"
                          >
                            <FaUserSlash />
                            <span>Force Remove</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
