/**
 * Night Result Banner Component
 * Shows death announcements and save notifications
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FaSkull, FaHeartbeat, FaSun } from 'react-icons/fa';
import { Role, ROLE_DISPLAY } from '@/types';

interface NightResultBannerProps {
  deaths: Array<{ username: string; role?: Role; cause?: string }>;
  saves: Array<{ username: string }>;
  onDismiss: () => void;
  dayNumber: number;
}

export default function NightResultBanner({
  deaths,
  saves,
  onDismiss,
  dayNumber
}: NightResultBannerProps) {
  const hasSaves = saves.length > 0;
  const hasDeaths = deaths.length > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-lg w-full mx-4"
      >
        {/* Day transition header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ rotate: -180 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-block text-amber-400 mb-2"
          >
            <FaSun className="text-5xl" />
          </motion.div>
          <h2 className="text-3xl font-cinzel font-bold text-white">
            Day {dayNumber}
          </h2>
          <p className="text-gray-400">The sun rises on the village...</p>
        </motion.div>

        {/* Deaths */}
        {hasDeaths && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-red-900/40 to-dark-800 rounded-xl border border-red-500/30 p-6 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <FaSkull className="text-2xl text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-400">
                  {deaths.length === 1 ? 'A body was found...' : 'Bodies were found...'}
                </h3>
                <p className="text-sm text-gray-400">The night claimed its victims</p>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {deaths.map((death, index) => (
                  <motion.div
                    key={death.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.2 }}
                    className="flex items-center justify-between bg-dark-800/60 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center">
                        <FaSkull className="text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-white line-through">
                          {death.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          {death.cause || 'Killed by Mafia'}
                        </p>
                      </div>
                    </div>
                    {death.role && (
                      <div className={`px-3 py-1 rounded-full text-sm ${ROLE_DISPLAY[death.role].bgColor}`}>
                        <span className={ROLE_DISPLAY[death.role].color}>
                          {ROLE_DISPLAY[death.role].icon} {ROLE_DISPLAY[death.role].name}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Saves */}
        {hasSaves && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-r from-green-900/40 to-dark-800 rounded-xl border border-green-500/30 p-6 mb-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <FaHeartbeat className="text-2xl text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">
                  Someone was saved!
                </h3>
                <p className="text-sm text-gray-400">The doctor's intervention</p>
              </div>
            </div>

            <div className="space-y-2">
              {saves.map((save, index) => (
                <motion.div
                  key={save.username}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-2 text-green-300"
                >
                  <span>🩺</span>
                  <span>{save.username} survived the attack!</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Peaceful night */}
        {!hasDeaths && !hasSaves && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-900/40 to-dark-800 rounded-xl border border-blue-500/30 p-6 mb-4 text-center"
          >
            <div className="text-4xl mb-3">🌅</div>
            <h3 className="text-lg font-semibold text-blue-400">A Peaceful Night</h3>
            <p className="text-gray-400">No one was killed during the night</p>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDismiss}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-dark-900 font-semibold rounded-xl transition-colors"
        >
          Continue to Discussion
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
