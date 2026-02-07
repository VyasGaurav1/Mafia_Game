/**
 * Settings Panel Component
 * Room configuration for hosts
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaCog, FaClock, FaUsers, FaShieldAlt, FaSkull, 
  FaSearch, FaHeartbeat, FaCrosshairs, FaTheaterMasks,
  FaTimes, FaSave
} from 'react-icons/fa';
import { IRoomSettings, DEFAULT_TIMER_SETTINGS } from '@/types';

interface SettingsPanelProps {
  settings: IRoomSettings;
  isHost: boolean;
  onUpdateSettings: (settings: Partial<IRoomSettings>) => void;
  onClose: () => void;
  playerCount: number;
}

const DEFAULT_SETTINGS: IRoomSettings = {
  maxPlayers: 12,
  minPlayers: 6,
  isPrivate: false,
  dayDuration: 120,
  nightDuration: 45,
  votingDuration: 60,
  revealRolesOnDeath: true,
  allowSpectators: true,
  enableVigilante: true,
  enableJester: true,
  enableDoctor: true,
  enableDetective: true,
  enableDonMafia: true,
  enableGodfather: false,
  enableAdvancedRoles: false,
  enableNeutralRoles: false,
  enableChaosRoles: false,
  timers: DEFAULT_TIMER_SETTINGS,
  tieBreaker: 'no_elimination'
};

export default function SettingsPanel({
  settings,
  isHost,
  onUpdateSettings,
  onClose,
  playerCount
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<IRoomSettings>({
    ...DEFAULT_SETTINGS,
    ...settings
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings({ ...DEFAULT_SETTINGS, ...settings });
  }, [settings]);

  const handleChange = <K extends keyof IRoomSettings>(key: K, value: IRoomSettings[K]) => {
    if (!isHost) return;
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings({ ...DEFAULT_SETTINGS, ...settings });
    setHasChanges(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <FaCog className="text-amber-400 text-xl" />
            <h2 className="text-xl font-bold text-white">Game Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Timer settings */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaClock className="text-amber-400" />
              Phase Timers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TimerInput
                label="Day Duration"
                value={localSettings.dayDuration || 120}
                onChange={(v) => handleChange('dayDuration', v)}
                disabled={!isHost}
                min={60}
                max={300}
              />
              <TimerInput
                label="Night Duration"
                value={localSettings.nightDuration || 45}
                onChange={(v) => handleChange('nightDuration', v)}
                disabled={!isHost}
                min={30}
                max={120}
              />
              <TimerInput
                label="Voting Duration"
                value={localSettings.votingDuration || 60}
                onChange={(v) => handleChange('votingDuration', v)}
                disabled={!isHost}
                min={30}
                max={120}
              />
            </div>
          </div>

          {/* Player settings */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaUsers className="text-amber-400" />
              Player Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Minimum Players</label>
                <select
                  value={localSettings.minPlayers || 6}
                  onChange={(e) => handleChange('minPlayers', parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                >
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Maximum Players</label>
                <select
                  value={localSettings.maxPlayers || 12}
                  onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                >
                  {[8, 10, 12, 14, 16, 20, 24, 30].map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current players: {playerCount} | Mafia count: {Math.floor(playerCount / 4)}
            </p>
          </div>

          {/* Role toggles */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaShieldAlt className="text-amber-400" />
              Optional Roles
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <RoleToggle
                icon={<FaSearch className="text-blue-400" />}
                label="Detective"
                description="Investigate players each night"
                enabled={localSettings.enableDetective ?? true}
                onChange={(v) => handleChange('enableDetective', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaHeartbeat className="text-green-400" />}
                label="Doctor"
                description="Protect players from death"
                enabled={localSettings.enableDoctor ?? true}
                onChange={(v) => handleChange('enableDoctor', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaCrosshairs className="text-purple-400" />}
                label="Vigilante"
                description="One-time kill power"
                enabled={localSettings.enableVigilante ?? true}
                onChange={(v) => handleChange('enableVigilante', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaTheaterMasks className="text-pink-400" />}
                label="Jester"
                description="Wins if voted out (13+ players)"
                enabled={localSettings.enableJester ?? true}
                onChange={(v) => handleChange('enableJester', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaSkull className="text-red-500" />}
                label="Godfather"
                description="Mafia boss, appears innocent"
                enabled={localSettings.enableGodfather ?? false}
                onChange={(v) => handleChange('enableGodfather', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaShieldAlt className="text-cyan-400" />}
                label="Advanced Roles"
                description="Bodyguard, Nurse, Mayor"
                enabled={localSettings.enableAdvancedRoles ?? false}
                onChange={(v) => handleChange('enableAdvancedRoles', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaTheaterMasks className="text-purple-400" />}
                label="Neutral Roles"
                description="Jester, Serial Killer (13+)"
                enabled={localSettings.enableNeutralRoles ?? false}
                onChange={(v) => handleChange('enableNeutralRoles', v)}
                disabled={!isHost}
              />
            </div>
          </div>

          {/* Game options */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FaSkull className="text-amber-400" />
              Game Options
            </h3>
            <div className="space-y-3">
              <ToggleOption
                label="Reveal Roles on Death"
                description="Show the role of eliminated players"
                enabled={localSettings.revealRolesOnDeath ?? true}
                onChange={(v) => handleChange('revealRolesOnDeath', v)}
                disabled={!isHost}
              />
              <ToggleOption
                label="Allow Spectators"
                description="Dead players can spectate the game"
                enabled={localSettings.allowSpectators ?? true}
                onChange={(v) => handleChange('allowSpectators', v)}
                disabled={!isHost}
              />
              <ToggleOption
                label="Private Room"
                description="Room won't appear in public listings"
                enabled={localSettings.isPrivate ?? false}
                onChange={(v) => handleChange('isPrivate', v)}
                disabled={!isHost}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        {isHost && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-700 bg-dark-900/50">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-dark-600 disabled:text-gray-500 text-dark-900 font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaSave />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Timer input component
function TimerInput({
  label,
  value,
  onChange,
  disabled,
  min,
  max
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  min: number;
  max: number;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={15}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 accent-amber-500"
        />
        <span className="text-white text-sm w-14 text-right">{formatTime(value)}</span>
      </div>
    </div>
  );
}

// Role toggle component
function RoleToggle({
  icon,
  label,
  description,
  enabled,
  onChange,
  disabled
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-all text-left
        ${enabled
          ? 'bg-dark-700 border-amber-500/30'
          : 'bg-dark-800 border-dark-600 opacity-60'
        }
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-amber-500/50'}
      `}
    >
      <div className={`mt-0.5 ${enabled ? '' : 'opacity-50'}`}>{icon}</div>
      <div>
        <p className={`font-medium ${enabled ? 'text-white' : 'text-gray-400'}`}>{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}

// Toggle option component
function ToggleOption({
  label,
  description,
  enabled,
  onChange,
  disabled
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
      <div>
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${enabled ? 'bg-amber-500' : 'bg-dark-600'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
            ${enabled ? 'left-7' : 'left-1'}
          `}
        />
      </button>
    </div>
  );
}
