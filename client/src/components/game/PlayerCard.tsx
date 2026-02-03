/**
 * Player Card Component
 * Displays player info in lobby and game
 */

import { motion } from 'framer-motion';
import { FaCrown, FaTimes, FaSkull, FaWifi } from 'react-icons/fa';
import { IPlayer, PlayerStatus, ROLE_DISPLAY } from '@/types';

interface PlayerCardProps {
  player: IPlayer;
  isCurrentUser?: boolean;
  showKick?: boolean;
  showRole?: boolean;
  isSelected?: boolean;
  isValidTarget?: boolean;
  voteCount?: number;
  onClick?: () => void;
  onKick?: () => void;
}

export default function PlayerCard({
  player,
  isCurrentUser = false,
  showKick = false,
  showRole = false,
  isSelected = false,
  isValidTarget = false,
  voteCount,
  onClick,
  onKick
}: PlayerCardProps) {
  const isDead = player.status === PlayerStatus.DEAD;
  const isDisconnected = !player.isConnected;
  const roleDisplay = player.role ? ROLE_DISPLAY[player.role] : null;

  return (
    <motion.div
      whileHover={onClick && isValidTarget ? { scale: 1.05 } : {}}
      whileTap={onClick && isValidTarget ? { scale: 0.95 } : {}}
      onClick={onClick && isValidTarget ? onClick : undefined}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300
        ${isDead 
          ? 'bg-dark-800/50 border-dark-600 opacity-60' 
          : isSelected
            ? 'bg-blood-500/20 border-blood-500 shadow-glow-red'
            : isCurrentUser
              ? 'bg-dark-700 border-amber-500/50'
              : isValidTarget
                ? 'bg-dark-700 border-dark-400 hover:border-blood-500/50 cursor-pointer'
                : 'bg-dark-700 border-dark-500'
        }
      `}
    >
      {/* Host crown */}
      {player.isHost && (
        <div className="absolute -top-2 -right-2 bg-amber-500 rounded-full p-1.5">
          <FaCrown className="text-xs text-dark-900" />
        </div>
      )}

      {/* Kick button */}
      {showKick && !isDead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onKick?.();
          }}
          className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 rounded-full p-1.5 transition-colors"
        >
          <FaTimes className="text-xs text-white" />
        </button>
      )}

      {/* Vote count badge */}
      {voteCount !== undefined && voteCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-blood-500 rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{voteCount}</span>
        </div>
      )}

      {/* Avatar */}
      <div className="relative mx-auto w-16 h-16 mb-3">
        {isDead ? (
          <div className="w-full h-full rounded-full bg-dark-600 flex items-center justify-center">
            <FaSkull className="text-2xl text-gray-500" />
          </div>
        ) : (
          <div className={`
            w-full h-full rounded-full flex items-center justify-center text-2xl font-bold
            ${isCurrentUser 
              ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
              : 'bg-gradient-to-br from-dark-500 to-dark-600'
            }
          `}>
            {player.username.slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Disconnected indicator */}
        {isDisconnected && !isDead && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
            <FaWifi className="text-xs text-dark-900 animate-pulse" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className={`text-center font-semibold truncate ${
        isDead ? 'text-gray-500 line-through' : 'text-white'
      }`}>
        {player.username}
      </p>

      {/* Role badge - only show for current user or when explicitly enabled */}
      {showRole && roleDisplay && isCurrentUser && (
        <div className={`mt-2 text-center`}>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleDisplay.bgColor} ${roleDisplay.color}`}>
            <span>{roleDisplay.icon}</span>
            {roleDisplay.name}
          </span>
        </div>
      )}

      {/* Current user indicator */}
      {isCurrentUser && !isDead && !showRole && (
        <p className="text-center text-xs text-amber-400 mt-1">
          {player.role ? ROLE_DISPLAY[player.role].name : 'Ready'}
        </p>
      )}
    </motion.div>
  );
}
