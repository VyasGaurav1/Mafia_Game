/**
 * Lobby Page
 * Pre-game waiting room with settings and player list
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCog, 
  FaPlay, 
  FaCopy, 
  FaSignOutAlt,
  FaCheck,
  FaCrown
} from 'react-icons/fa';
import toast from 'react-hot-toast';

import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import { GamePhase } from '@/types';
import { calculateRoleDistribution } from '@/utils/roleDistribution';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PlayerCard from '@/components/game/PlayerCard';
import SettingsPanel from '@/components/game/SettingsPanel';

export default function Lobby() {
  useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const { 
    user, 
    room, 
    currentPhase,
    isHost
  } = useGameStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const amHost = isHost();
  const canStart = room && room.players.length >= room.minPlayers;

  // Navigate to game when it starts
  useEffect(() => {
    if (currentPhase !== GamePhase.LOBBY && room) {
      navigate(`/game/${room.code}`);
    }
  }, [currentPhase, room, navigate]);

  const handleCopyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      toast.success('Room code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (room) {
      const link = `${window.location.origin}/join/${room.code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    if (!room || !canStart) return;
    
    setIsStarting(true);
    try {
      await socketService.startGame(room.code);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start game');
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      socketService.leaveRoom(room.code);
      navigate('/');
    }
  };

  const handleKickPlayer = (playerId: string) => {
    if (room && amHost) {
      socketService.kickPlayer(room.code, playerId);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-blood-500/5 via-transparent to-transparent" />
      
      <div className="relative z-10 container mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-2xl font-bold text-white">{room.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors group"
              >
                <span className="font-mono text-lg tracking-widest text-amber-400">
                  {room.code}
                </span>
                {copied ? (
                  <FaCheck className="text-green-400" />
                ) : (
                  <FaCopy className="text-gray-400 group-hover:text-white transition-colors" />
                )}
              </button>
              <span className="text-gray-500">
                {room.players.length} / {room.maxPlayers} players
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            {amHost && (
              <Button
                variant="ghost"
                onClick={() => setShowSettings(true)}
                icon={<FaCog />}
              >
                Settings
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleLeaveRoom}
              icon={<FaSignOutAlt />}
            >
              Leave
            </Button>
          </motion.div>
        </header>

        {/* Main content */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <h2 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <FaCrown className="text-amber-400" />
                Players
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {room.players.map((player, index) => (
                    <motion.div
                      key={player.oderId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PlayerCard
                        player={player}
                        isCurrentUser={player.oderId === user?.oderId}
                        showKick={amHost && player.oderId !== user?.oderId}
                        onKick={() => handleKickPlayer(player.oderId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Empty slots */}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                  <motion.div
                    key={`empty-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="aspect-square rounded-xl border-2 border-dashed border-dark-500 flex items-center justify-center"
                  >
                    <span className="text-gray-600 text-sm">Empty</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Info panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {/* Start game section */}
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Game Status</h3>
              
              {room.players.length < room.minPlayers ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-2">
                    Waiting for more players...
                  </p>
                  <p className="text-sm text-gray-500">
                    Need at least {room.minPlayers} players to start
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-green-400 mb-2">
                    ✓ Ready to start!
                  </p>
                  <p className="text-sm text-gray-500">
                    {room.players.length} players in lobby
                  </p>
                </div>
              )}

              {amHost ? (
                <Button
                  variant="primary"
                  className="w-full mt-4"
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  isLoading={isStarting}
                  icon={<FaPlay />}
                >
                  Start Game
                </Button>
              ) : (
                <p className="text-center text-gray-400 text-sm mt-4">
                  Waiting for host to start...
                </p>
              )}
            </div>

            {/* Role preview */}
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Role Distribution</h3>
              <div className="space-y-2 text-sm">
                {(() => {
                  const roleCount = calculateRoleDistribution(room.players.length, {
                    enableDonMafia: room.settings.enableDonMafia ?? false,
                    enableGodfather: room.settings.enableGodfather ?? false,
                    enableJester: room.settings.enableJester ?? false,
                    enableVigilante: room.settings.enableVigilante ?? false,
                    enableDoctor: room.settings.enableDoctor ?? true,
                    enableDetective: room.settings.enableDetective ?? true,
                    enableAdvancedRoles: room.settings.enableAdvancedRoles ?? false,
                    enableNeutralRoles: room.settings.enableNeutralRoles ?? false,
                  });
                  return (
                    <>
                      <div className="flex justify-between text-gray-400">
                        <span>Mafia</span>
                        <span className="text-red-400">
                          {roleCount.mafia}
                        </span>
                      </div>
                      {roleCount.godfather > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span className="ml-3">├ Godfather</span>
                          <span className="text-red-500">{roleCount.godfather}</span>
                        </div>
                      )}
                      {room.settings.enableDonMafia && room.players.length >= 8 && (
                        <div className="flex justify-between text-gray-400">
                          <span className="ml-3">├ Don Mafia</span>
                          <span className="text-red-500">1</span>
                        </div>
                      )}
                      {roleCount.detective > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Detective</span>
                          <span className="text-green-400">{roleCount.detective}</span>
                        </div>
                      )}
                      {roleCount.deputyDetective > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span className="ml-3">├ Deputy Detective</span>
                          <span className="text-green-400">{roleCount.deputyDetective}</span>
                        </div>
                      )}
                      {roleCount.doctor > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Doctor</span>
                          <span className="text-pink-400">{roleCount.doctor}</span>
                        </div>
                      )}
                      {roleCount.nurse > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span className="ml-3">├ Nurse</span>
                          <span className="text-pink-300">{roleCount.nurse}</span>
                        </div>
                      )}
                      {roleCount.vigilante > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Vigilante</span>
                          <span className="text-orange-400">{roleCount.vigilante}</span>
                        </div>
                      )}
                      {roleCount.bodyguard > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Bodyguard</span>
                          <span className="text-yellow-400">{roleCount.bodyguard}</span>
                        </div>
                      )}
                      {roleCount.mayor > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Mayor</span>
                          <span className="text-yellow-500">{roleCount.mayor}</span>
                        </div>
                      )}
                      {roleCount.jester > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Jester</span>
                          <span className="text-purple-400">{roleCount.jester}</span>
                        </div>
                      )}
                      {roleCount.serialKiller > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Serial Killer</span>
                          <span className="text-purple-500">{roleCount.serialKiller}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-400">
                        <span>Villagers</span>
                        <span className="text-blue-400">
                          {roleCount.villagers}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Share section */}
            <div className="card bg-dark-800/50">
              <h3 className="font-semibold text-white mb-3">Invite Friends</h3>
              <p className="text-gray-400 text-sm mb-3">
                Share this link — they'll join instantly:
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-dark-700 rounded-lg px-4 py-3 font-mono text-sm text-center text-amber-400 truncate select-all">
                  {`${window.location.origin}/join/${room.code}`}
                </div>
                <Button
                  variant="secondary"
                  onClick={handleCopyLink}
                  icon={copied ? <FaCheck /> : <FaCopy />}
                />
              </div>
              <p className="text-gray-500 text-xs mt-2 text-center">
                Or share room code: <span className="font-mono text-amber-400 tracking-widest">{room.code}</span>
              </p>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Room Settings"
        size="lg"
      >
        <SettingsPanel 
          settings={room.settings}
          isHost={amHost}
          onUpdateSettings={(settings) => {
            socketService.updateSettings(room.code, settings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
          playerCount={room.players.length}
        />
      </Modal>
    </div>
  );
}
