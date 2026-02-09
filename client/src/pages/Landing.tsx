/**
 * Landing Page
 * Main entry point with lobby browser, create/join game options
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, FaUsers, FaBook, FaCog, FaSync, FaLock, 
  FaGlobe, FaKey, FaUserFriends, FaCrown, FaGamepad,
  FaSignInAlt, FaBolt
} from 'react-icons/fa';
import toast from 'react-hot-toast';

import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { socketService } from '@/services/socketService';
import { IRoom, RoomVisibility, ROLE_DISPLAY, Role } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Components
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

export default function Landing() {
  const navigate = useNavigate();
  const { user, setUser, setConnectionStatus } = useGameStore();
  const { isAuthenticated, isGuest, user: authUser, logout } = useAuthStore();
  
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [username, setUsername] = useState(user?.username || '');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | 'browse-join' | null>(null);

  // Public room browser state
  const [publicRooms, setPublicRooms] = useState<IRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  // Connect socket on mount if user exists
  useEffect(() => {
    if (user) {
      connectSocket(user.oderId, user.username);
    }
  }, []);

  // Fetch public rooms when connected
  useEffect(() => {
    if (user && socketService.isConnected()) {
      fetchPublicRooms();
      const interval = setInterval(fetchPublicRooms, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const connectSocket = async (oderId: string, uname: string) => {
    try {
      setConnectionStatus('connecting');
      await socketService.connect(oderId, uname);
      setConnectionStatus('connected');
    } catch (_error) {
      toast.error('Failed to connect to server');
      setConnectionStatus('disconnected');
    }
  };

  const fetchPublicRooms = useCallback(async () => {
    if (!socketService.isConnected()) return;
    try {
      setIsLoadingRooms(true);
      const rooms = await socketService.listPublicRooms();
      setPublicRooms(rooms);
    } catch (_err) {
      // silently fail
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  const handlePlayClick = () => {
    if (!user) {
      setPendingAction('create');
      setShowUsernameModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleBrowseJoin = (code: string) => {
    if (!user) {
      setPendingJoinCode(code);
      setPendingAction('browse-join');
      setShowUsernameModal(true);
    } else {
      joinRoomByCode(code);
    }
  };

  const joinRoomByCode = async (code: string) => {
    setIsLoading(true);
    try {
      const room = await socketService.joinRoom(
        code.toUpperCase().trim(),
        user!.oderId,
        user!.username
      );
      toast.success(`Joined room ${room.code}!`);
      navigate(`/lobby/${room.code}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetUsername = async () => {
    if (!username.trim() || username.length < 2) {
      toast.error('Username must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    const oderId = uuidv4();
    const newUser = { oderId, username: username.trim() };
    
    try {
      await connectSocket(oderId, username.trim());
      setUser(newUser);
      setShowUsernameModal(false);
      
      if (pendingAction === 'create') {
        setShowCreateModal(true);
      } else if (pendingAction === 'join') {
        // Code join
        if (roomCode.length === 6) {
          setTimeout(() => joinRoomByCode(roomCode), 100);
        }
      } else if (pendingAction === 'browse-join' && pendingJoinCode) {
        setTimeout(() => joinRoomByCode(pendingJoinCode!), 100);
        setPendingJoinCode(null);
      }
      setPendingAction(null);
    } catch (_error) {
      toast.error('Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsLoading(true);
    try {
      const room = await socketService.createRoom(
        roomName.trim(),
        isPrivate ? RoomVisibility.PRIVATE : RoomVisibility.PUBLIC
      );
      toast.success(`Room ${room.code} created!`);
      navigate(`/lobby/${room.code}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinByCode = () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error('Please enter a valid 6-character room code');
      return;
    }
    if (!user) {
      setPendingAction('join');
      setShowUsernameModal(true);
      return;
    }
    joinRoomByCode(roomCode);
  };

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-blood-500/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-blood-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-500" />

      <div className="relative z-10 container mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-blood-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎭</span>
            </div>
            <span className="font-display text-xl font-bold text-white">MAFIA</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            {isAuthenticated ? (
              <>
                <span className="text-gray-400 text-sm hidden sm:inline">
                  {isGuest ? 'Guest:' : 'Playing as'}
                </span>
                <span className="font-semibold text-white">{authUser?.username}</span>
                {isGuest && <span className="text-xs text-yellow-500">(Guest)</span>}
                <button 
                  onClick={logout}
                  className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                  title="Logout"
                >
                  <FaCog />
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                icon={<FaSignInAlt />}
              >
                Login
              </Button>
            )}
          </motion.div>
        </header>

        {/* Hero — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">
            <span className="text-white">THE </span>
            <span className="text-gradient">MAFIA</span>
            <span className="text-white"> GAME</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            A thrilling multiplayer social deduction game. Unmask the Mafia or work in the shadows.
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-6"
        >
          <Button 
            variant="primary" 
            onClick={() => navigate('/matchmaking')} 
            icon={<FaBolt />}
          >
            Find Game
          </Button>
          <Button variant="secondary" onClick={handlePlayClick} icon={<FaPlay />}>
            Create Game
          </Button>
          <Button variant="ghost" onClick={() => setShowRulesModal(true)} icon={<FaBook />}>
            How to Play
          </Button>
        </motion.div>

        {/* Main content — Lobby browser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 max-w-4xl mx-auto w-full"
        >
          {/* Join by code — inline bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-xl px-4 py-2.5">
              <FaKey className="text-gray-500 text-sm flex-shrink-0" />
              <input
                type="text"
                placeholder="Enter room code to join..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                maxLength={6}
                className="bg-transparent text-white font-mono tracking-widest text-sm w-full outline-none placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-sans"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleJoinByCode}
              disabled={isLoading || roomCode.length !== 6}
              isLoading={isLoading}
            >
              Join
            </Button>
          </div>

          {/* Open games card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <FaGlobe className="text-amber-400" />
                Open Games
              </h2>
              <button
                onClick={fetchPublicRooms}
                disabled={isLoadingRooms || !user}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <FaSync className={`text-xs ${isLoadingRooms ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {!user ? (
              <div className="text-center py-10">
                <FaGamepad className="text-3xl text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-3 text-sm">Set your name to browse and join open games</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setPendingAction(null); setShowUsernameModal(true); }}
                >
                  Enter Name
                </Button>
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="text-center py-10">
                <FaUsers className="text-3xl text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No open games right now</p>
                <p className="text-gray-500 text-xs mt-1">Use the "Create Game" button above to start a new public game!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {publicRooms.map((rm, idx) => {
                    const hostPlayer = rm.players.find(p => p.isHost);
                    const isFull = rm.players.length >= rm.maxPlayers;
                    return (
                      <motion.div
                        key={rm.code}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center justify-between p-3 bg-dark-700/50 hover:bg-dark-700 rounded-xl border border-dark-600/40 hover:border-dark-500 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blood-500/10 border border-blood-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">🎭</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-white text-sm truncate group-hover:text-amber-300 transition-colors">
                              {rm.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <FaCrown className="text-amber-400" style={{ fontSize: '0.6rem' }} />
                                {hostPlayer?.username || 'Unknown'}
                              </span>
                              <span className="text-dark-500">|</span>
                              <span className="flex items-center gap-1">
                                <FaUserFriends style={{ fontSize: '0.6rem' }} />
                                {rm.players.length}/{rm.maxPlayers}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-3">
                          {rm.isGameActive ? (
                            <span className="text-xs text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full">In Game</span>
                          ) : isFull ? (
                            <span className="text-xs text-gray-500 bg-dark-600 px-2.5 py-1 rounded-full">Full</span>
                          ) : (
                            <Button variant="primary" size="sm" onClick={() => handleBrowseJoin(rm.code)} disabled={isLoading}>
                              Join
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        <footer className="text-center py-4 text-gray-500 text-xs mt-4">
          <p>Made with ❤️ for social deduction enthusiasts</p>
        </footer>
      </div>

      {/* Username Modal */}
      <Modal
        isOpen={showUsernameModal}
        onClose={() => { setShowUsernameModal(false); setPendingAction(null); setPendingJoinCode(null); }}
        title="Enter Your Name"
      >
        <div className="space-y-4">
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
            maxLength={20}
            autoFocus
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSetUsername}
            disabled={isLoading || !username.trim()}
            isLoading={isLoading}
          >
            Continue
          </Button>
        </div>
      </Modal>

      {/* Create Room Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Room"
      >
        <div className="space-y-4">
          <Input
            label="Room Name"
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            maxLength={30}
            autoFocus
          />
          
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <div>
              <p className="font-medium text-white flex items-center gap-2">
                <FaLock className="text-sm" /> Private Room
              </p>
              <p className="text-sm text-gray-400">Only players with code or link can join</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blood-500"></div>
            </label>
          </div>

          {!isPrivate && (
            <p className="text-xs text-green-400/80 flex items-center gap-1.5">
              <FaGlobe className="text-xs" /> This room will be visible in the public lobby browser
            </p>
          )}
          
          <Button
            variant="primary"
            className="w-full"
            onClick={handleCreateRoom}
            disabled={isLoading || !roomName.trim()}
            isLoading={isLoading}
          >
            Create Room
          </Button>
        </div>
      </Modal>

      {/* Rules Modal */}
      <Modal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        title="How to Play"
        size="lg"
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          <section>
            <h3 className="font-semibold text-lg text-white mb-2">🎯 Objective</h3>
            <p className="text-gray-400">
              The Town must identify and eliminate all Mafia members through voting.
              The Mafia must eliminate Town members until they equal or outnumber the Town.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-lg text-white mb-2">🌙 Night Phase</h3>
            <p className="text-gray-400">During the night, special roles perform their actions:</p>
            <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
              <li>Mafia votes to kill one Town member</li>
              <li>Detective investigates a player to learn their alignment</li>
              <li>Doctor chooses one player to protect from death</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg text-white mb-2">☀️ Day Phase</h3>
            <p className="text-gray-400">During the day, all players discuss and vote:</p>
            <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
              <li>Night results are revealed</li>
              <li>Players discuss who might be Mafia</li>
              <li>A vote is held to eliminate a suspected Mafia</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg text-white mb-2">🎭 Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {Object.values(Role).map((role) => (
                <div key={role} className={`p-3 rounded-lg ${ROLE_DISPLAY[role].bgColor}`}>
                  <div className="flex items-center gap-2">
                    <span>{ROLE_DISPLAY[role].icon}</span>
                    <span className={`font-semibold ${ROLE_DISPLAY[role].color}`}>
                      {ROLE_DISPLAY[role].name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{ROLE_DISPLAY[role].description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}
