/**
 * Action Prompt Component
 * Night action selection UI for special roles - Modal popup
 */

import { motion } from 'framer-motion';
import { FaSkull, FaSearch, FaHeartbeat, FaCrown, FaCrosshairs, FaCheck, FaQuestionCircle } from 'react-icons/fa';
import { Role, IPlayer, ROLE_DISPLAY } from '@/types';
import Modal from '@/components/ui/Modal';

interface ActionPromptProps {
  role: Role;
  validTargets: IPlayer[];
  selectedTarget: string | null;
  onSelectTarget: (targetId: string | null) => void;
  onConfirmAction: () => void;
  investigationResult?: { targetId: string; result: string } | null;
  isOpen?: boolean;
  timeRemaining?: number;
  onDismiss?: () => void;
}

const rolePrompts: Record<Role, { icon: React.ReactNode; title: string; description: string }> = {
  [Role.MAFIA]: {
    icon: <FaSkull className="text-2xl" />,
    title: 'Choose Your Victim',
    description: 'Select a player to eliminate tonight'
  },
  [Role.GODFATHER]: {
    icon: <FaCrown className="text-2xl" />,
    title: 'Godfather\'s Command',
    description: 'Lead your Mafia to choose a victim'
  },
  [Role.MAFIA_GOON]: {
    icon: <FaSkull className="text-2xl" />,
    title: 'Mafia Action',
    description: 'Vote with your Mafia to eliminate someone'
  },
  [Role.MAFIOSO]: {
    icon: <FaSkull className="text-2xl" />,
    title: 'Mafioso Action',
    description: 'Vote with your Mafia to eliminate someone'
  },
  [Role.MAFIA_HEALER]: {
    icon: <FaHeartbeat className="text-2xl" />,
    title: 'Protect Your Ally',
    description: 'Select a Mafia member to protect'
  },
  [Role.SILENCER]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: 'Silence Target',
    description: 'Choose who cannot speak tomorrow'
  },
  [Role.DON_MAFIA]: {
    icon: <FaCrown className="text-2xl" />,
    title: 'Don\'s Investigation',
    description: 'Check if a player is the Detective'
  },
  [Role.DETECTIVE]: {
    icon: <FaSearch className="text-2xl" />,
    title: 'Investigation',
    description: 'Select a player to investigate'
  },
  [Role.DEPUTY_DETECTIVE]: {
    icon: <FaSearch className="text-2xl" />,
    title: 'Deputy Investigation',
    description: 'You inherited the Detective\'s power. Investigate a player.'
  },
  [Role.DOCTOR]: {
    icon: <FaHeartbeat className="text-2xl" />,
    title: 'Protection',
    description: 'Select a player to protect tonight'
  },
  [Role.NURSE]: {
    icon: <FaHeartbeat className="text-2xl" />,
    title: 'Nurse Protection',
    description: 'You inherited the Doctor\'s power. Protect someone tonight.'
  },
  [Role.BODYGUARD]: {
    icon: <FaCrosshairs className="text-2xl" />,
    title: 'Bodyguard Duty',
    description: 'Protect someone - you will die if they are attacked'
  },
  [Role.JAILOR]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: 'Jail Someone',
    description: 'Lock up a player, blocking their actions'
  },
  [Role.VIGILANTE]: {
    icon: <FaCrosshairs className="text-2xl" />,
    title: 'Vigilante Justice',
    description: 'Choose wisely - you can only do this once'
  },
  [Role.MAYOR]: {
    icon: <FaCrown className="text-2xl" />,
    title: 'Mayor',
    description: 'Your vote counts double'
  },
  [Role.SPY]: {
    icon: <FaSearch className="text-2xl" />,
    title: 'Spy Intelligence',
    description: 'Gather information on Mafia activities'
  },
  [Role.SERIAL_KILLER]: {
    icon: <FaSkull className="text-2xl" />,
    title: 'Serial Killer',
    description: 'Choose your next victim'
  },
  [Role.CULT_LEADER]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: 'Cult Conversion',
    description: 'Convert a townsperson to your cult'
  },
  [Role.ARSONIST]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: 'Arsonist Action',
    description: 'Douse with gasoline or ignite all'
  },
  [Role.VILLAGER]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: '',
    description: ''
  },
  [Role.JESTER]: {
    icon: <FaQuestionCircle className="text-2xl" />,
    title: '',
    description: ''
  }
};

export default function ActionPrompt({
  role,
  validTargets,
  selectedTarget,
  onSelectTarget,
  onConfirmAction,
  investigationResult,
  isOpen = true,
  timeRemaining,
  onDismiss
}: ActionPromptProps) {
  const prompt = rolePrompts[role] || rolePrompts[Role.VILLAGER];
  const roleData = ROLE_DISPLAY[role];
  
  const isMafiaRole = [Role.MAFIA, Role.DON_MAFIA].includes(role);

  // If we have investigation result, show that instead
  if (investigationResult) {
    const targetPlayer = validTargets.find(p => p.oderId === investigationResult.targetId);
    
    return (
      <Modal isOpen={isOpen} onClose={onDismiss || (() => {})} title="Investigation Result" size="sm" showClose={!!onDismiss}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className={`text-5xl mb-4 ${role === Role.DETECTIVE ? 'text-blue-400' : 'text-red-400'}`}>
          <FaSearch />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Investigation Complete</h3>
        <p className="text-gray-300 mb-4">
          <span className="font-semibold text-white">{targetPlayer?.username}</span> is...
        </p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className={`
            inline-block px-6 py-3 rounded-lg text-xl font-bold
            ${investigationResult.result === 'Mafia' || investigationResult.result === 'Detective'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }
          `}
        >
          {investigationResult.result}
        </motion.div>
        
        {/* Dismiss button */}
        {onDismiss && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={onDismiss}
            className="mt-6 px-6 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
          >
            Got it
          </motion.button>
        )}
      </motion.div>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onDismiss || (() => {})} 
      title={prompt.title}
      size="md"
      showClose={!!onDismiss}
    >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <div className={`inline-block p-3 rounded-full mb-2 ${roleData.bgColor}`}>
          <span className={roleData.color}>{prompt.icon}</span>
        </div>
        <p className="text-gray-400 text-sm">{prompt.description}</p>
        {timeRemaining !== undefined && (
          <div className="mt-2 text-amber-400 text-sm font-semibold">
            ⏱ {timeRemaining}s remaining
          </div>
        )}
      </div>

      {/* Target selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600">
        {validTargets.map((player) => {
          const isSelected = selectedTarget === player.oderId;
          
          return (
            <motion.button
              key={player.oderId}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTarget(isSelected ? null : player.oderId)}
              className={`
                p-3 rounded-lg border-2 transition-all
                ${isSelected
                  ? isMafiaRole
                    ? 'bg-red-500/20 border-red-500 text-white'
                    : role === Role.DETECTIVE
                      ? 'bg-blue-500/20 border-blue-500 text-white'
                      : role === Role.DOCTOR
                        ? 'bg-green-500/20 border-green-500 text-white'
                        : 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-dark-700 border-dark-600 text-gray-300 hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                  ${isSelected ? 'bg-white/20' : 'bg-dark-600'}
                `}>
                  {player.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm truncate">{player.username}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Confirm button */}
      <motion.button
        whileHover={{ scale: selectedTarget ? 1.02 : 1 }}
        whileTap={{ scale: selectedTarget ? 0.98 : 1 }}
        onClick={onConfirmAction}
        disabled={!selectedTarget}
        className={`
          w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
          ${selectedTarget
            ? isMafiaRole
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : role === Role.DETECTIVE
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : role === Role.DOCTOR
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-dark-700 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        <FaCheck />
        <span>Confirm {role === Role.DOCTOR ? 'Protection' : role === Role.DETECTIVE || role === Role.DON_MAFIA ? 'Investigation' : 'Target'}</span>
      </motion.button>

      {/* Skip option available for all roles */}
      <button
        onClick={() => {
          onSelectTarget(null);
          onDismiss?.();
        }}
        className="w-full mt-2 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        Skip this action
      </button>
    </motion.div>
    </Modal>
  );
}
