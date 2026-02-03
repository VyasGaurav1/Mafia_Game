/**
 * Night Overlay Component
 * Dark atmospheric overlay for night phases
 * Shows "Night Falls" message briefly then disappears to allow interaction
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMoon } from 'react-icons/fa';
import { GamePhase } from '@/types';

interface NightOverlayProps {
  currentPhase: GamePhase;
  canAct: boolean;
}

export default function NightOverlay({ currentPhase, canAct }: NightOverlayProps) {
  const [showNightFallsMessage, setShowNightFallsMessage] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<GamePhase | null>(null);

  const isNightPhase = [
    GamePhase.NIGHT,
    GamePhase.MAFIA_ACTION,
    GamePhase.DETECTIVE_ACTION,
    GamePhase.DOCTOR_ACTION,
    GamePhase.DON_ACTION,
    GamePhase.VIGILANTE_ACTION
  ].includes(currentPhase);

  // Show "Night Falls" message only when transitioning INTO a night phase
  useEffect(() => {
    const wasNightPhase = previousPhase && [
      GamePhase.NIGHT,
      GamePhase.MAFIA_ACTION,
      GamePhase.DETECTIVE_ACTION,
      GamePhase.DOCTOR_ACTION,
      GamePhase.DON_ACTION,
      GamePhase.VIGILANTE_ACTION
    ].includes(previousPhase);

    // Transition from non-night to night phase (or ROLE_REVEAL to NIGHT)
    if (isNightPhase && !wasNightPhase && previousPhase !== null) {
      setShowNightFallsMessage(true);
      const timer = setTimeout(() => {
        setShowNightFallsMessage(false);
      }, 2500); // Show for 2.5 seconds then dismiss
      return () => clearTimeout(timer);
    }

    setPreviousPhase(currentPhase);
  }, [currentPhase, isNightPhase, previousPhase]);

  // Also show on first night
  useEffect(() => {
    if (currentPhase === GamePhase.NIGHT && previousPhase === GamePhase.ROLE_REVEAL) {
      setShowNightFallsMessage(true);
      const timer = setTimeout(() => {
        setShowNightFallsMessage(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentPhase, previousPhase]);

  // Background overlay (always present during night but subtle)
  if (!isNightPhase) return null;

  return (
    <>
      {/* Subtle dark background overlay - doesn't block interaction */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-dark-900/40 to-transparent" />
        
        {/* Stars effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.8, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`
              }}
            />
          ))}
        </div>

        {/* Moon */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute top-8 right-8 w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 shadow-[0_0_40px_15px_rgba(255,255,200,0.15)]"
        />
      </div>

      {/* "Night Falls" message - shows briefly then disappears */}
      <AnimatePresence>
        {showNightFallsMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-indigo-300 mb-4"
              >
                <FaMoon className="text-8xl mx-auto" />
              </motion.div>
              <h2 className="text-4xl font-cinzel font-bold text-white mb-2">
                Night Falls
              </h2>
              <p className="text-indigo-300 text-xl">
                The village sleeps...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleeping indicator - only for players who can't act */}
      {!canAct && !showNightFallsMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center"
          >
            <span className="text-4xl">💤</span>
            <p className="text-gray-400 text-sm mt-1">You are asleep...</p>
          </motion.div>
        </div>
      )}
    </>
  );
}
