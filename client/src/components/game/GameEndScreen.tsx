/**
 * Game End Screen Component
 * Victory/defeat screen with game summary
 */

import { motion } from 'framer-motion';
import { FaTrophy, FaSkull, FaCrown, FaTheaterMasks, FaRedo, FaSignOutAlt } from 'react-icons/fa';
import { IPlayer, Role, Team, WinCondition, ROLE_DISPLAY, PlayerStatus } from '@/types';

interface GameEndScreenProps {
  winner: WinCondition;
  players: IPlayer[];
  myTeam: Team | null;
  myRole: Role | null;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export default function GameEndScreen({
  winner,
  players,
  myTeam,
  myRole,
  onPlayAgain,
  onLeave
}: GameEndScreenProps) {
  const didWin = (winner === WinCondition.MAFIA_WINS && myTeam === Team.MAFIA) ||
                 (winner === WinCondition.TOWN_WINS && myTeam === Team.TOWN) ||
                 (winner === WinCondition.JESTER_WINS && myRole === Role.JESTER);
  
  const getWinnerTitle = () => {
    switch (winner) {
      case WinCondition.MAFIA_WINS:
        return 'Mafia Wins!';
      case WinCondition.TOWN_WINS:
        return 'Village Wins!';
      case WinCondition.JESTER_WINS:
        return 'Jester Wins!';
      default:
        return 'Game Over';
    }
  };

  const getWinnerDescription = () => {
    switch (winner) {
      case WinCondition.MAFIA_WINS:
        return 'The Mafia has taken over the village';
      case WinCondition.TOWN_WINS:
        return 'All Mafia members have been eliminated';
      case WinCondition.JESTER_WINS:
        return 'The Jester fooled everyone!';
      default:
        return '';
    }
  };

  const getWinnerIcon = () => {
    switch (winner) {
      case WinCondition.MAFIA_WINS:
        return <FaSkull className="text-6xl" />;
      case WinCondition.TOWN_WINS:
        return <FaTrophy className="text-6xl" />;
      case WinCondition.JESTER_WINS:
        return <FaTheaterMasks className="text-6xl" />;
      default:
        return <FaTrophy className="text-6xl" />;
    }
  };

  const getWinnerColors = () => {
    switch (winner) {
      case WinCondition.MAFIA_WINS:
        return {
          bg: 'from-red-900/50 to-dark-900',
          border: 'border-red-500/30',
          text: 'text-red-400',
          button: 'bg-red-600 hover:bg-red-500'
        };
      case WinCondition.TOWN_WINS:
        return {
          bg: 'from-amber-900/50 to-dark-900',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          button: 'bg-amber-500 hover:bg-amber-400'
        };
      case WinCondition.JESTER_WINS:
        return {
          bg: 'from-pink-900/50 to-dark-900',
          border: 'border-pink-500/30',
          text: 'text-pink-400',
          button: 'bg-pink-600 hover:bg-pink-500'
        };
      default:
        return {
          bg: 'from-dark-800 to-dark-900',
          border: 'border-dark-600',
          text: 'text-gray-400',
          button: 'bg-dark-600 hover:bg-dark-500'
        };
    }
  };

  const colors = getWinnerColors();

  // Group players by team
  const mafiaPlayers = players.filter(p => p.team === Team.MAFIA);
  const villagePlayers = players.filter(p => p.team === Team.TOWN);
  const neutralPlayers = players.filter(p => p.team === Team.NEUTRAL);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-y-auto py-8"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-2xl w-full mx-4"
      >
        {/* Result header */}
        <div className={`bg-gradient-to-b ${colors.bg} rounded-2xl border-2 ${colors.border} p-8 text-center`}>
          {/* Personal result */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-6"
          >
            <div className={`inline-block p-4 rounded-full ${didWin ? 'bg-green-500/20' : 'bg-red-500/20'} mb-4`}>
              <span className={didWin ? 'text-green-400' : 'text-red-400'}>
                {didWin ? <FaTrophy className="text-5xl" /> : <FaSkull className="text-5xl" />}
              </span>
            </div>
            <h3 className={`text-2xl font-bold ${didWin ? 'text-green-400' : 'text-red-400'}`}>
              {didWin ? 'Victory!' : 'Defeat'}
            </h3>
            {myRole && (
              <p className="text-gray-400 mt-1">
                You were the <span className={ROLE_DISPLAY[myRole].color}>{ROLE_DISPLAY[myRole].name}</span>
              </p>
            )}
          </motion.div>

          {/* Winner announcement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className={colors.text}>{getWinnerIcon()}</div>
            <h2 className={`text-4xl font-cinzel font-bold mt-4 ${colors.text}`}>
              {getWinnerTitle()}
            </h2>
            <p className="text-gray-400 mt-2">{getWinnerDescription()}</p>
          </motion.div>

          {/* Player roles reveal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-4 mb-8"
          >
            {/* Mafia team */}
            <div className="bg-dark-800/50 rounded-xl p-4">
              <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2 justify-center">
                <FaSkull />
                <span>Mafia</span>
              </h4>
              <div className="flex flex-wrap justify-center gap-2">
                {mafiaPlayers.map((player) => (
                  <PlayerBadge key={player.oderId} player={player} />
                ))}
              </div>
            </div>

            {/* Village team */}
            <div className="bg-dark-800/50 rounded-xl p-4">
              <h4 className="text-amber-400 font-semibold mb-3 flex items-center gap-2 justify-center">
                <FaCrown />
                <span>Village</span>
              </h4>
              <div className="flex flex-wrap justify-center gap-2">
                {villagePlayers.map((player) => (
                  <PlayerBadge key={player.oderId} player={player} />
                ))}
              </div>
            </div>

            {/* Neutral */}
            {neutralPlayers.length > 0 && (
              <div className="bg-dark-800/50 rounded-xl p-4">
                <h4 className="text-pink-400 font-semibold mb-3 flex items-center gap-2 justify-center">
                  <FaTheaterMasks />
                  <span>Neutral</span>
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {neutralPlayers.map((player) => (
                    <PlayerBadge key={player.oderId} player={player} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex gap-3 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlayAgain}
              className={`px-6 py-3 ${colors.button} text-white font-semibold rounded-xl flex items-center gap-2 transition-colors`}
            >
              <FaRedo />
              <span>Play Again</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onLeave}
              className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-gray-300 font-semibold rounded-xl flex items-center gap-2 transition-colors"
            >
              <FaSignOutAlt />
              <span>Leave</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Player badge component
function PlayerBadge({ player }: { player: IPlayer }) {
  const roleData = player.role ? ROLE_DISPLAY[player.role] : null;
  const isAlive = player.status === PlayerStatus.ALIVE;

  return (
    <div className={`
      px-3 py-2 rounded-lg flex items-center gap-2
      ${isAlive ? 'bg-dark-700' : 'bg-dark-700/50'}
    `}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
        ${isAlive ? 'bg-dark-600 text-white' : 'bg-dark-800 text-gray-500'}
      `}>
        {isAlive ? player.username.slice(0, 2).toUpperCase() : <FaSkull />}
      </div>
      <div className="text-left">
        <p className={`text-sm font-medium ${isAlive ? 'text-white' : 'text-gray-500 line-through'}`}>
          {player.username}
        </p>
        {roleData && (
          <p className={`text-xs ${roleData.color}`}>
            {roleData.icon} {roleData.name}
          </p>
        )}
      </div>
    </div>
  );
}
