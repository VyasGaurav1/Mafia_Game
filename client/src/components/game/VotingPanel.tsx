/**
 * Voting Panel Component
 * Handles voting phase UI with current votes display
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FaGavel, FaVoteYea, FaCheck, FaTimes, FaUserSlash } from 'react-icons/fa';
import { IPlayer, PlayerStatus } from '@/types';

interface VotingPanelProps {
  players: IPlayer[];
  votes: Record<string, number>;
  currentUserId: string;
  hasVoted: boolean;
  onVote: (targetId: string) => void;
  onSkipVote: () => void;
  requiredVotes: number;
  canVote: boolean;
}

export default function VotingPanel({
  players,
  votes,
  currentUserId,
  hasVoted,
  onVote,
  onSkipVote,
  requiredVotes,
  canVote
}: VotingPanelProps) {
  const alivePlayers = players.filter(p => p.status === PlayerStatus.ALIVE);
  const totalVotes = Object.values(votes).reduce((sum, v) => sum + v, 0);
  
  // Sort by votes (descending)
  const sortedPlayers = [...alivePlayers].sort((a, b) => {
    const votesA = votes[a.oderId] || 0;
    const votesB = votes[b.oderId] || 0;
    return votesB - votesA;
  });

  // Find the leader
  const maxVotes = Math.max(...Object.values(votes), 0);
  const leaders = sortedPlayers.filter(p => (votes[p.oderId] || 0) === maxVotes && maxVotes > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-800/90 backdrop-blur-sm rounded-xl border border-dark-700 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-blood-600/20 border-b border-blood-500/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaGavel className="text-blood-400" />
            <h3 className="font-semibold text-white">Town Vote</h3>
          </div>
          <div className="text-sm text-gray-400">
            {totalVotes} / {alivePlayers.length} voted
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {requiredVotes} votes needed for elimination
        </p>
      </div>

      {/* Voting list */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600">
        <AnimatePresence>
          {sortedPlayers.map((player) => {
            const playerVotes = votes[player.oderId] || 0;
            const isCurrentUser = player.oderId === currentUserId;
            const isLeader = leaders.includes(player) && maxVotes > 0;
            const votePercentage = (playerVotes / alivePlayers.length) * 100;
            const reachedThreshold = playerVotes >= requiredVotes;

            return (
              <motion.div
                key={player.oderId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                  relative overflow-hidden rounded-lg transition-all
                  ${isLeader && reachedThreshold
                    ? 'ring-2 ring-blood-500'
                    : isLeader
                      ? 'ring-1 ring-amber-500/50'
                      : ''
                  }
                `}
              >
                {/* Vote progress bar background */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${votePercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className={`
                    absolute inset-y-0 left-0
                    ${reachedThreshold ? 'bg-blood-500/30' : 'bg-amber-500/10'}
                  `}
                />

                {/* Player row */}
                <div className="relative flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                      ${isCurrentUser 
                        ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/50' 
                        : 'bg-dark-600 text-white'
                      }
                    `}>
                      {player.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {player.username}
                        {isCurrentUser && <span className="text-amber-400 text-xs ml-1">(You)</span>}
                      </p>
                      {isLeader && playerVotes > 0 && (
                        <p className="text-xs text-amber-400">Leading</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Vote count */}
                    <div className={`
                      px-3 py-1 rounded-full text-sm font-bold
                      ${reachedThreshold 
                        ? 'bg-blood-500 text-white' 
                        : playerVotes > 0 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-dark-600 text-gray-400'
                      }
                    `}>
                      {playerVotes}
                    </div>

                    {/* Vote button */}
                    {canVote && !hasVoted && !isCurrentUser && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onVote(player.oderId)}
                        className="px-3 py-1.5 bg-blood-600 hover:bg-blood-500 text-white text-sm rounded-lg transition-colors"
                      >
                        <FaVoteYea />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Skip vote option */}
      {canVote && !hasVoted && (
        <div className="p-4 border-t border-dark-700">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSkipVote}
            className="w-full py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <FaUserSlash />
            <span>Skip Vote (No Lynch)</span>
          </motion.button>
        </div>
      )}

      {/* Already voted indicator */}
      {hasVoted && (
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <FaCheck />
            <span>Vote submitted</span>
          </div>
        </div>
      )}

      {/* Cannot vote indicator */}
      {!canVote && !hasVoted && (
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <FaTimes />
            <span>You cannot vote</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
