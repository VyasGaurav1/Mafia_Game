/**
 * Game Header Component
 * Displays phase, day number, timer, and room code
 */

import { motion } from 'framer-motion';
import { FaSun, FaMoon, FaDoorOpen } from 'react-icons/fa';
import { GamePhase, PHASE_DISPLAY } from '@/types';

interface GameHeaderProps {
  phase: GamePhase;
  dayNumber: number;
  timer: number;
  roomCode: string;
  isNight: boolean;
  onLeave: () => void;
}

export default function GameHeader({
  phase,
  dayNumber,
  timer,
  roomCode,
  isNight,
  onLeave
}: GameHeaderProps) {
  const phaseInfo = PHASE_DISPLAY[phase];
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Calculate timer progress (assuming max timer is the starting value)
  const maxTimer = getMaxTimerForPhase(phase);
  const progress = maxTimer > 0 ? (timer / maxTimer) * 100 : 0;
  const isLowTime = timer <= 10;

  return (
    <header className="flex items-center justify-between">
      {/* Left side - Phase info */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        {/* Day/Night indicator */}
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full
          ${isNight 
            ? 'bg-indigo-900/50 text-indigo-300' 
            : 'bg-amber-500/20 text-amber-300'
          }
        `}>
          {isNight ? <FaMoon /> : <FaSun />}
          <span className="font-display font-semibold uppercase tracking-wide">
            {phaseInfo.name}
          </span>
        </div>

        {/* Day number */}
        <div className="text-gray-400">
          <span className="text-sm uppercase tracking-wide">Day </span>
          <span className="font-bold text-white">{dayNumber}</span>
        </div>

        {/* Room code */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-dark-700/80 rounded-lg">
          <span className="text-gray-500 text-sm">Room:</span>
          <span className="font-mono text-amber-400 tracking-wider">{roomCode}</span>
        </div>
      </motion.div>

      {/* Right side - Timer and leave button */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        {/* Timer */}
        <div className="flex flex-col items-end">
          <motion.span
            key={timer}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`
              font-mono text-3xl font-bold tabular-nums
              ${isLowTime ? 'text-red-400 animate-pulse' : isNight ? 'text-indigo-300' : 'text-amber-300'}
            `}
          >
            {timerDisplay}
          </motion.span>
          
          {/* Timer bar */}
          <div className="w-32 h-1.5 bg-dark-600 rounded-full overflow-hidden mt-1">
            <motion.div
              className={`h-full rounded-full ${
                isLowTime 
                  ? 'bg-red-500' 
                  : 'bg-gradient-to-r from-blood-500 to-amber-500'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Leave button */}
        <button
          onClick={onLeave}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
          title="Leave Game"
        >
          <FaDoorOpen className="text-xl" />
        </button>
      </motion.div>
    </header>
  );
}

function getMaxTimerForPhase(phase: GamePhase): number {
  const timers: Partial<Record<GamePhase, number>> = {
    [GamePhase.ROLE_REVEAL]: 10,
    [GamePhase.MAFIA_ACTION]: 40,
    [GamePhase.DETECTIVE_ACTION]: 25,
    [GamePhase.DOCTOR_ACTION]: 25,
    [GamePhase.DON_ACTION]: 25,
    [GamePhase.VIGILANTE_ACTION]: 20,
    [GamePhase.DAY_DISCUSSION]: 120,
    [GamePhase.VOTING]: 45,
    [GamePhase.RESOLUTION]: 10
  };
  return timers[phase] || 60;
}
