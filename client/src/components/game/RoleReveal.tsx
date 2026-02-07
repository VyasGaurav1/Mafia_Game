/**
 * Role Reveal Component
 * Animated modal for revealing player's role at game start
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Role, ROLE_DISPLAY } from '@/types';
import { FaUserSecret, FaSkull, FaSearch, FaHeartbeat, FaCrosshairs, FaTheaterMasks } from 'react-icons/fa';

interface RoleRevealProps {
  role: Role;
  teammates: string[];
  onComplete: () => void;
}

const roleIcons: Record<Role, React.ReactNode> = {
  [Role.VILLAGER]: <FaUserSecret className="text-6xl" />,
  [Role.MAFIA]: <FaSkull className="text-6xl" />,
  [Role.GODFATHER]: <FaSkull className="text-6xl" />,
  [Role.MAFIOSO]: <FaSkull className="text-6xl" />,
  [Role.MAFIA_GOON]: <FaSkull className="text-6xl" />,
  [Role.MAFIA_HEALER]: <FaHeartbeat className="text-6xl" />,
  [Role.SILENCER]: <FaTheaterMasks className="text-6xl" />,
  [Role.DON_MAFIA]: <FaSkull className="text-6xl" />,
  [Role.DETECTIVE]: <FaSearch className="text-6xl" />,
  [Role.DEPUTY_DETECTIVE]: <FaSearch className="text-6xl" />,
  [Role.DOCTOR]: <FaHeartbeat className="text-6xl" />,
  [Role.NURSE]: <FaHeartbeat className="text-6xl" />,
  [Role.BODYGUARD]: <FaCrosshairs className="text-6xl" />,
  [Role.JAILOR]: <FaUserSecret className="text-6xl" />,
  [Role.VIGILANTE]: <FaCrosshairs className="text-6xl" />,
  [Role.MAYOR]: <FaUserSecret className="text-6xl" />,
  [Role.SPY]: <FaSearch className="text-6xl" />,
  [Role.SERIAL_KILLER]: <FaSkull className="text-6xl" />,
  [Role.CULT_LEADER]: <FaTheaterMasks className="text-6xl" />,
  [Role.ARSONIST]: <FaSkull className="text-6xl" />,
  [Role.JESTER]: <FaTheaterMasks className="text-6xl" />
};

const roleDescriptions: Record<Role, string> = {
  [Role.VILLAGER]: 'Find and eliminate the Mafia through careful observation and voting. Trust no one.',
  [Role.MAFIA]: 'Work with your team to eliminate villagers each night. Blend in during the day.',
  [Role.GODFATHER]: 'Lead the Mafia. You appear innocent to Detective investigations.',
  [Role.MAFIOSO]: 'Backup killer for the Mafia. Step up if the Godfather is eliminated.',
  [Role.MAFIA_GOON]: 'Work with your Mafia team to eliminate townspeople each night.',
  [Role.MAFIA_HEALER]: 'Protect one Mafia member from death each night.',
  [Role.SILENCER]: 'Prevent one player from speaking during the day phase.',
  [Role.DON_MAFIA]: 'Lead the Mafia. You can detect if a player is the Detective.',
  [Role.DETECTIVE]: 'Investigate one player each night to learn if they are Mafia.',
  [Role.DEPUTY_DETECTIVE]: 'You inherit the Detective\'s power if they are eliminated.',
  [Role.DOCTOR]: 'Protect one player each night from the Mafia\'s attack.',
  [Role.NURSE]: 'You inherit the Doctor\'s power if they are eliminated.',
  [Role.BODYGUARD]: 'Protect one player each night. You will die if they are attacked.',
  [Role.JAILOR]: 'Jail one player each night, blocking all their actions.',
  [Role.VIGILANTE]: 'Once per game, you can eliminate a player you suspect is Mafia.',
  [Role.MAYOR]: 'Your vote counts as 2 during town voting.',
  [Role.SPY]: 'Receive partial information about Mafia actions each night.',
  [Role.SERIAL_KILLER]: 'Kill one player each night. Win by being the last one standing.',
  [Role.CULT_LEADER]: 'Convert one townsperson to your cult each night.',
  [Role.ARSONIST]: 'Douse players with gasoline and ignite them all at once.',
  [Role.JESTER]: 'Get yourself voted out during the day. Win if you\'re eliminated by vote.'
};

export default function RoleReveal({ role, teammates, onComplete }: RoleRevealProps) {
  const [stage, setStage] = useState<'intro' | 'reveal' | 'info'>('intro');
  const roleData = ROLE_DISPLAY[role];
  const isMafia = [Role.MAFIA, Role.DON_MAFIA, Role.GODFATHER, Role.MAFIOSO].includes(role);

  useEffect(() => {
    // Auto-advance stages
    const introTimer = setTimeout(() => setStage('reveal'), 1500);
    const revealTimer = setTimeout(() => setStage('info'), 3500);
    
    return () => {
      clearTimeout(introTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-24 h-24 border-4 border-amber-500/30 border-t-amber-500 rounded-full mx-auto"
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-xl text-gray-300 font-cinzel"
            >
              Fate is being decided...
            </motion.p>
          </motion.div>
        )}

        {stage === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className={`
                w-40 h-40 rounded-full mx-auto flex items-center justify-center
                ${isMafia 
                  ? 'bg-gradient-to-br from-red-600 to-red-900 text-red-200' 
                  : role === Role.DETECTIVE
                    ? 'bg-gradient-to-br from-blue-600 to-blue-900 text-blue-200'
                    : role === Role.DOCTOR
                      ? 'bg-gradient-to-br from-green-600 to-green-900 text-green-200'
                      : role === Role.VIGILANTE
                        ? 'bg-gradient-to-br from-purple-600 to-purple-900 text-purple-200'
                        : role === Role.JESTER
                          ? 'bg-gradient-to-br from-pink-600 to-pink-900 text-pink-200'
                          : 'bg-gradient-to-br from-gray-600 to-gray-900 text-gray-200'
                }
                shadow-2xl
              `}
            >
              {roleIcons[role]}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`mt-6 text-4xl font-bold font-cinzel ${roleData.color}`}
            >
              {roleData.name}
            </motion.h2>
          </motion.div>
        )}

        {stage === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto px-6"
          >
            <div className={`
              text-center p-8 rounded-2xl border-2
              ${isMafia 
                ? 'bg-gradient-to-b from-red-900/40 to-dark-900 border-red-500/30' 
                : 'bg-gradient-to-b from-dark-800/80 to-dark-900 border-dark-600'
              }
            `}>
              {/* Role icon */}
              <div className={`
                w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl
                ${roleData.bgColor}
              `}>
                <span className={roleData.color}>{roleData.icon}</span>
              </div>

              {/* Role name */}
              <h2 className={`text-3xl font-bold font-cinzel mb-2 ${roleData.color}`}>
                {roleData.name}
              </h2>

              {/* Role description */}
              <p className="text-gray-300 mb-6 leading-relaxed">
                {roleDescriptions[role]}
              </p>

              {/* Teammates (for Mafia) */}
              {isMafia && teammates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 p-4 bg-red-900/20 rounded-lg border border-red-500/20"
                >
                  <h3 className="text-red-400 font-semibold mb-2 flex items-center justify-center gap-2">
                    <FaUserSecret />
                    Your Fellow Mafia
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {teammates.map((teammate, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-900/30 rounded-full text-sm text-red-300"
                      >
                        {teammate}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Win condition */}
              <div className="mb-6 p-3 bg-dark-700/50 rounded-lg">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Win Condition</p>
                <p className="text-sm text-white">
                  {isMafia 
                    ? 'Eliminate all villagers or equal the village count'
                    : role === Role.JESTER
                      ? 'Get voted out during the day phase'
                      : 'Eliminate all Mafia members'
                  }
                </p>
              </div>

              {/* Continue button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onComplete}
                className={`
                  w-full py-3 rounded-lg font-semibold transition-all
                  ${isMafia
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-dark-900'
                  }
                `}
              >
                I Understand
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
