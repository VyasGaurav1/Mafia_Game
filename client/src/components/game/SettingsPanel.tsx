/**
 * Settings Panel Component
 * Full room configuration for hosts with live role preview,
 * all timer durations, and visibility toggle
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaClock, FaUsers, FaShieldAlt, FaSkull,
  FaSearch, FaHeartbeat, FaCrosshairs, FaTheaterMasks,
  FaSave, FaGlobe, FaLock, FaChevronDown,
  FaChevronUp, FaMoon, FaSun, FaGavel
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { IRoomSettings, ITimerSettings, RoomVisibility, DEFAULT_TIMER_SETTINGS, DEFAULT_ROOM_SETTINGS, ROLE_DISPLAY, Role } from '@/types';
import { calculateRoleDistribution } from '@/utils/roleDistribution';
import { socketService } from '@/services/socketService';

interface SettingsPanelProps {
  settings: IRoomSettings;
  isHost: boolean;
  onUpdateSettings: (settings: Partial<IRoomSettings>) => void;
  onClose: () => void;
  playerCount: number;
  roomCode: string;
  roomVisibility: RoomVisibility;
}

type SettingsSection = 'visibility' | 'roles' | 'timers' | 'players' | 'options' | 'preview';

export default function SettingsPanel({
  settings,
  isHost,
  onUpdateSettings,
  onClose: _onClose,
  playerCount,
  roomCode,
  roomVisibility
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<IRoomSettings>({
    ...DEFAULT_ROOM_SETTINGS,
    ...settings,
    timers: { ...DEFAULT_TIMER_SETTINGS, ...(settings.timers || {}) }
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [visibility, setVisibility] = useState(roomVisibility);
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>('roles');

  useEffect(() => {
    setLocalSettings({
      ...DEFAULT_ROOM_SETTINGS,
      ...settings,
      timers: { ...DEFAULT_TIMER_SETTINGS, ...(settings.timers || {}) }
    });
  }, [settings]);

  useEffect(() => {
    setVisibility(roomVisibility);
  }, [roomVisibility]);

  // Live role preview
  const rolePreview = useMemo(
    () => calculateRoleDistribution(playerCount, localSettings),
    [playerCount, localSettings]
  );

  const handleChange = <K extends keyof IRoomSettings>(key: K, value: IRoomSettings[K]) => {
    if (!isHost) return;
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTimerChange = (key: keyof ITimerSettings, value: number) => {
    if (!isHost) return;
    setLocalSettings(prev => ({
      ...prev,
      timers: { ...prev.timers, [key]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings({
      ...DEFAULT_ROOM_SETTINGS,
      ...settings,
      timers: { ...DEFAULT_TIMER_SETTINGS, ...(settings.timers || {}) }
    });
    setHasChanges(false);
  };

  const handleVisibilityToggle = async () => {
    if (!isHost) return;
    const newVisibility = visibility === RoomVisibility.PUBLIC
      ? RoomVisibility.PRIVATE
      : RoomVisibility.PUBLIC;
    try {
      await socketService.updateVisibility(roomCode, newVisibility);
      setVisibility(newVisibility);
      toast.success(
        newVisibility === RoomVisibility.PRIVATE
          ? 'Room is now private'
          : 'Room is now public'
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  // Build active roles list for preview
  const roleEntries = useMemo(() => {
    const entries: { icon: string; name: string; count: number; color: string }[] = [];
    if (rolePreview.mafia > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.MAFIA].icon, name: 'Mafia', count: rolePreview.mafia, color: 'text-red-400' });
    if (rolePreview.godfather > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.GODFATHER].icon, name: 'Godfather', count: rolePreview.godfather, color: 'text-red-600' });
    if (rolePreview.detective > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.DETECTIVE].icon, name: 'Detective', count: rolePreview.detective, color: 'text-blue-400' });
    if (rolePreview.deputyDetective > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.DEPUTY_DETECTIVE].icon, name: 'Deputy Detective', count: rolePreview.deputyDetective, color: 'text-blue-300' });
    if (rolePreview.doctor > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.DOCTOR].icon, name: 'Doctor', count: rolePreview.doctor, color: 'text-green-400' });
    if (rolePreview.nurse > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.NURSE].icon, name: 'Nurse', count: rolePreview.nurse, color: 'text-green-300' });
    if (rolePreview.vigilante > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.VIGILANTE].icon, name: 'Vigilante', count: rolePreview.vigilante, color: 'text-orange-400' });
    if (rolePreview.bodyguard > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.BODYGUARD].icon, name: 'Bodyguard', count: rolePreview.bodyguard, color: 'text-cyan-400' });
    if (rolePreview.mayor > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.MAYOR].icon, name: 'Mayor', count: rolePreview.mayor, color: 'text-yellow-400' });
    if (rolePreview.jester > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.JESTER].icon, name: 'Jester', count: rolePreview.jester, color: 'text-purple-500' });
    if (rolePreview.serialKiller > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.SERIAL_KILLER].icon, name: 'Serial Killer', count: rolePreview.serialKiller, color: 'text-red-500' });
    if (rolePreview.villagers > 0)
      entries.push({ icon: ROLE_DISPLAY[Role.VILLAGER].icon, name: 'Villager', count: rolePreview.villagers, color: 'text-blue-300' });
    return entries;
  }, [rolePreview]);

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Room Visibility */}
      <SectionHeader
        icon={visibility === RoomVisibility.PUBLIC ? <FaGlobe className="text-green-400" /> : <FaLock className="text-amber-400" />}
        title="Room Visibility"
        expanded={expandedSection === 'visibility'}
        onToggle={() => toggleSection('visibility')}
        badge={visibility === RoomVisibility.PUBLIC ? 'Public' : 'Private'}
        badgeColor={visibility === RoomVisibility.PUBLIC ? 'text-green-400 bg-green-400/10' : 'text-amber-400 bg-amber-400/10'}
      />
      <AnimatePresence>
        {expandedSection === 'visibility' && (
          <CollapsibleContent>
            <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <div>
                <p className="text-white font-medium flex items-center gap-2">
                  {visibility === RoomVisibility.PUBLIC ? (
                    <><FaGlobe className="text-green-400 text-sm" /> Public</>
                  ) : (
                    <><FaLock className="text-amber-400 text-sm" /> Private</>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {visibility === RoomVisibility.PUBLIC
                    ? 'Anyone can find and join this room from the lobby'
                    : 'Only players with the room code or invite link can join'}
                </p>
              </div>
              <ToggleSwitch
                enabled={visibility === RoomVisibility.PRIVATE}
                onChange={handleVisibilityToggle}
                disabled={!isHost}
              />
            </div>
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Live Role Preview */}
      <SectionHeader
        icon={<FaTheaterMasks className="text-purple-400" />}
        title={`Role Preview (${playerCount} players)`}
        expanded={expandedSection === 'preview'}
        onToggle={() => toggleSection('preview')}
      />
      <AnimatePresence>
        {expandedSection === 'preview' && (
          <CollapsibleContent>
            {playerCount < 3 ? (
              <p className="text-gray-500 text-sm text-center py-4">Need at least 3 players to preview roles</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roleEntries.map(entry => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-2 p-2 bg-dark-700/50 rounded-lg"
                  >
                    <span className="text-lg">{entry.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${entry.color} truncate`}>{entry.name}</p>
                      <p className="text-xs text-gray-500">x{entry.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-600 mt-2 text-center">
              Roles update live based on player count and enabled settings
            </p>
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Role Toggles */}
      <SectionHeader
        icon={<FaShieldAlt className="text-amber-400" />}
        title="Role Configuration"
        expanded={expandedSection === 'roles'}
        onToggle={() => toggleSection('roles')}
      />
      <AnimatePresence>
        {expandedSection === 'roles' && (
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-2">
              <RoleToggle
                icon={<FaSearch className="text-blue-400" />}
                label="Detective"
                description="Investigate alignment"
                enabled={localSettings.enableDetective ?? true}
                onChange={(v) => handleChange('enableDetective', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaHeartbeat className="text-green-400" />}
                label="Doctor"
                description="Protect from death"
                enabled={localSettings.enableDoctor ?? true}
                onChange={(v) => handleChange('enableDoctor', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaCrosshairs className="text-orange-400" />}
                label="Vigilante"
                description="One-time kill (14+)"
                enabled={localSettings.enableVigilante ?? false}
                onChange={(v) => handleChange('enableVigilante', v)}
                disabled={!isHost}
              />
              <RoleToggle
                icon={<FaSkull className="text-red-500" />}
                label="Godfather"
                description="Appears innocent to Detective"
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
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Timer Settings */}
      <SectionHeader
        icon={<FaClock className="text-amber-400" />}
        title="Timer Settings"
        expanded={expandedSection === 'timers'}
        onToggle={() => toggleSection('timers')}
      />
      <AnimatePresence>
        {expandedSection === 'timers' && (
          <CollapsibleContent>
            {/* Night Action Timers */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FaMoon className="text-indigo-400" /> Night Actions
              </p>
              <div className="space-y-3">
                <TimerInput
                  label="Role Reveal"
                  value={localSettings.timers.roleReveal}
                  onChange={(v) => handleTimerChange('roleReveal', v)}
                  disabled={!isHost}
                  min={5} max={30} step={5}
                />
                <TimerInput
                  label="Mafia Action"
                  value={localSettings.timers.mafiaAction}
                  onChange={(v) => handleTimerChange('mafiaAction', v)}
                  disabled={!isHost}
                  min={15} max={90} step={5}
                />
                <TimerInput
                  label="Detective Action"
                  value={localSettings.timers.detectiveAction}
                  onChange={(v) => handleTimerChange('detectiveAction', v)}
                  disabled={!isHost}
                  min={10} max={60} step={5}
                />
                <TimerInput
                  label="Doctor Action"
                  value={localSettings.timers.doctorAction}
                  onChange={(v) => handleTimerChange('doctorAction', v)}
                  disabled={!isHost}
                  min={10} max={60} step={5}
                />
                <TimerInput
                  label="Don Action"
                  value={localSettings.timers.donAction}
                  onChange={(v) => handleTimerChange('donAction', v)}
                  disabled={!isHost}
                  min={10} max={60} step={5}
                />
                <TimerInput
                  label="Vigilante Action"
                  value={localSettings.timers.vigilanteAction}
                  onChange={(v) => handleTimerChange('vigilanteAction', v)}
                  disabled={!isHost}
                  min={10} max={60} step={5}
                />
                <TimerInput
                  label="Night Total"
                  value={localSettings.timers.nightTotal}
                  onChange={(v) => handleTimerChange('nightTotal', v)}
                  disabled={!isHost}
                  min={30} max={180} step={10}
                />
              </div>
            </div>
            {/* Day Phase Timers */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FaSun className="text-amber-400" /> Day Phase
              </p>
              <div className="space-y-3">
                <TimerInput
                  label="Day Discussion"
                  value={localSettings.timers.dayDiscussion}
                  onChange={(v) => handleTimerChange('dayDiscussion', v)}
                  disabled={!isHost}
                  min={30} max={300} step={15}
                />
                <TimerInput
                  label="Voting"
                  value={localSettings.timers.voting}
                  onChange={(v) => handleTimerChange('voting', v)}
                  disabled={!isHost}
                  min={15} max={120} step={5}
                />
                <TimerInput
                  label="Resolution"
                  value={localSettings.timers.resolution}
                  onChange={(v) => handleTimerChange('resolution', v)}
                  disabled={!isHost}
                  min={5} max={30} step={5}
                />
              </div>
            </div>
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Player Settings */}
      <SectionHeader
        icon={<FaUsers className="text-amber-400" />}
        title="Player Limits"
        expanded={expandedSection === 'players'}
        onToggle={() => toggleSection('players')}
        badge={`${playerCount} in room`}
        badgeColor="text-gray-400 bg-dark-600"
      />
      <AnimatePresence>
        {expandedSection === 'players' && (
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Min Players</label>
                <select
                  value={localSettings.minPlayers || 6}
                  onChange={(e) => handleChange('minPlayers', parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                >
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Max Players</label>
                <select
                  value={localSettings.maxPlayers || 12}
                  onChange={(e) => handleChange('maxPlayers', parseInt(e.target.value))}
                  disabled={!isHost}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                >
                  {[8, 10, 12, 14, 16, 20, 24, 30].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Game Options */}
      <SectionHeader
        icon={<FaGavel className="text-amber-400" />}
        title="Game Options"
        expanded={expandedSection === 'options'}
        onToggle={() => toggleSection('options')}
      />
      <AnimatePresence>
        {expandedSection === 'options' && (
          <CollapsibleContent>
            <div className="space-y-2">
              <ToggleOption
                label="Reveal Roles on Death"
                description="Show the role of eliminated players"
                enabled={localSettings.revealRolesOnDeath ?? true}
                onChange={(v) => handleChange('revealRolesOnDeath', v)}
                disabled={!isHost}
              />
              <ToggleOption
                label="Allow Spectators"
                description="Dead players can spectate"
                enabled={localSettings.allowSpectators ?? true}
                onChange={(v) => handleChange('allowSpectators', v)}
                disabled={!isHost}
              />
              <div className="p-3 bg-dark-700/50 rounded-lg">
                <label className="text-white text-sm font-medium block mb-1">Tie Breaker</label>
                <p className="text-xs text-gray-500 mb-2">What happens when votes are tied</p>
                <select
                  value={localSettings.tieBreaker || 'no_elimination'}
                  onChange={(e) => handleChange('tieBreaker', e.target.value as IRoomSettings['tieBreaker'])}
                  disabled={!isHost}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                >
                  <option value="no_elimination">No Elimination</option>
                  <option value="revote">Revote</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </AnimatePresence>

      {/* Save / Reset footer */}
      {isHost && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-700">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-dark-600 disabled:text-gray-500 text-dark-900 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FaSave className="text-xs" />
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  expanded,
  onToggle,
  badge,
  badgeColor
}: {
  icon: React.ReactNode;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 bg-dark-700/40 hover:bg-dark-700/70 rounded-lg transition-colors group"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-white font-semibold text-sm">{title}</span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor || 'text-gray-400 bg-dark-600'}`}>
            {badge}
          </span>
        )}
      </div>
      {expanded ? (
        <FaChevronUp className="text-gray-500 text-xs" />
      ) : (
        <FaChevronDown className="text-gray-500 text-xs" />
      )}
    </button>
  );
}

function CollapsibleContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pb-2">{children}</div>
    </motion.div>
  );
}

function TimerInput({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
  step = 5
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  min: number;
  max: number;
  step?: number;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-gray-400 text-xs w-28 flex-shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="flex-1 accent-amber-500 h-1.5"
      />
      <span className="text-white text-xs font-mono w-12 text-right">{formatTime(value)}</span>
    </div>
  );
}

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
        flex items-start gap-2 p-2.5 rounded-lg border transition-all text-left
        ${enabled
          ? 'bg-dark-700 border-amber-500/30'
          : 'bg-dark-800 border-dark-600 opacity-60'
        }
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-amber-500/50'}
      `}
    >
      <div className={`mt-0.5 text-sm ${enabled ? '' : 'opacity-50'}`}>{icon}</div>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${enabled ? 'text-white' : 'text-gray-400'}`}>{label}</p>
        <p className="text-[10px] text-gray-500 leading-tight">{description}</p>
      </div>
    </button>
  );
}

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
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-[10px] text-gray-500">{description}</p>
      </div>
      <ToggleSwitch enabled={enabled} onChange={() => !disabled && onChange(!enabled)} disabled={disabled} />
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onChange,
  disabled
}: {
  enabled: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        relative w-10 h-5 rounded-full transition-colors flex-shrink-0
        ${enabled ? 'bg-amber-500' : 'bg-dark-600'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
          ${enabled ? 'left-5' : 'left-0.5'}
        `}
      />
    </button>
  );
}
