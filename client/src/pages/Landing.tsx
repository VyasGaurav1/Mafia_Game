/**
 * Landing Page
 * Main entry point with lobby browser, create/join game options
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, FaUsers, FaBook, FaCog, FaSync, FaLock, 
  FaGlobe, FaKey, FaUserFriends, FaCrown, FaGamepad 
} from 'react-icons/fa';
import toast from 'react-hot-toast';

import { useGameStore } from '@/store/gameStore';
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
  
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'browse' | 'join'>('browse');

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
      // Auto-refresh every 10 seconds
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
      // silently fail — list just stays empty
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

  const handleJoinClick = () => {
    if (!user) {
      setPendingAction('join');
      setShowUsernameModal(true);
    } else {
      setShowJoinModal(true);
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
      
      // Continue with pending action
      if (pendingAction === 'create') {
        setShowCreateModal(true);
      } else if (pendingAction === 'join') {
        setShowJoinModal(true);
      } else if (pendingAction === 'browse-join' && pendingJoinCode) {
        // Need to set user first, then join — slight delay for state propagation
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

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast.error('Please enter a valid 6-character room code');
      return;
    }

    setIsLoading(true);
    try {
      const room = await socketService.joinRoom(
        roomCode.toUpperCase().trim(),
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

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-blood-500/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-blood-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-500" />

      <div className="relative z-10 container mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
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
          
          {user ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="text-gray-400">Playing as</span>
              <span className="font-semibold text-white">{user.username}</span>
              <button 
                onClick={() => { setPendingAction(null); setShowUsernameModal(true); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaCog />
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPendingAction(null); setShowUsernameModal(true); }}
              >
                Set Name
              </Button>
            </motion.div>
          )}
        </header>

        {/* Hero section — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-3">
            <span className="text-white">THE </span>
            <span className="text-gradient">MAFIA</span>
            <span className="text-white"> GAME</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A thrilling multiplayer social deduction game. Unmask the Mafia or work in the shadows.
          </p>
        </motion.div>

        {/* Action buttons row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          <Button variant="primary" onClick={handlePlayClick} icon={<FaPlay />}>
            Create Game
          </Button>
          <Button variant="secondary" onClick={handleJoinClick} icon={<FaKey />}>
            Join by Code
          </Button>
          <Button variant="ghost" onClick={() => setShowRulesModal(true)} icon={<FaBook />}>
            How to Play
          </Button>
        </motion.div>

        {/* Main content — lobby browser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1"
        >
          <div className="card max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'browse'
                      ? 'bg-blood-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaGlobe className="inline mr-2" />
                  Open Games
                </button>
                <button
                  onClick={() => setActiveTab('join')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'join'
                      ? 'bg-blood-500 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FaLock className="inline mr-2" />
                  Private Room
                </button>
              </div>

              {activeTab === 'browse' && (
                <button
                  onClick={fetchPublicRooms}
                  disabled={isLoadingRooms || !user}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <FaSync className={isLoadingRooms ? 'animate-spin' : ''} />
                  Refresh
                </button>
              )}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'browse' ? (
                <motion.div
                  key="browse"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  {!user ? (
                    /* Not logged in prompt */
                    <div className="text-center py-12">
                      <FaGamepad className="text-4xl text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">Set your name to browse open games</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setPendingAction(null); setShowUsernameModal(true); }}
                      >
                        Enter Name
                      </Button>
                    </div>
                  ) : publicRooms.length === 0 ? (
                    /* No rooms */
                    <div className="text-center py-12">
                      <FaUsers className="text-4xl text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No open games right now</p>
                      <p className="text-gray-500 text-sm mb-4">Be the first — create a public game!</p>
                      <Button variant="primary" size="sm" onClick={handlePlayClick} icon={<FaPlay />}>
                        Create Game
                      </Button>
                    </div>
                  ) : (
                    /* Room list */
                    <div className="space-y-3">
                      {publicRooms.map((rm, idx) => {
                        const hostPlayer = rm.players.find(p => p.isHost);
                        return (
                          <motion.div
                            key={rm.code}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center justify-between p-4 bg-dark-700/60 hover:bg-dark-700 rounded-xl border border-dark-600/50 hover:border-dark-500 transition-all group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              {/* Room icon */}
                              <div className="w-12 h-12 rounded-xl bg-blood-500/10 border border-blood-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">🎭</span>
                              </div>
                              
                              <div className="min-w-0">
                                <h3 className="font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                                  {rm.name}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                                  <span className="flex items-center gap-1">
                                    <FaCrown className="text-amber-400 text-xs" />
                                    {hostPlayer?.username || 'Unknown'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FaUserFriends className="text-xs" />
                                    {rm.players.length}/{rm.maxPlayers}
                                  </span>
                                  <span className="hidden sm:inline font-mono text-xs text-gray-500">
                                    {rm.code}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Join button */}
                            <div className="flex-shrink-0 ml-4">
                              {rm.isGameActive ? (
                                <span className="text-xs text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-full">
                                  In Progress
                                </span>
                              ) : rm.players.length >= rm.maxPlayers ? (
                                <span className="text-xs text-gray-500 bg-dark-600 px-3 py-1.5 rounded-full">
                                  Full
                                </span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleBrowseJoin(rm.code)}
                                  disabled={isLoading}
                                >
                                  Join
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Private room tab — enter code */
                <motion.div
                  key="private"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="max-w-sm mx-auto py-8"
                >
                  <div className="text-center mb-6">
                    <FaLock className="text-3xl text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      Enter the 6-character room code to join a private game
                    </p>
                  </div>
                  <div className="space-y-4">
                    <Input
                      placeholder="ABCDEF"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest font-mono"
                      autoFocus
                    />
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        if (!user) {
                          setPendingAction('join');
                          setShowUsernameModal(true);
                        } else {
                          handleJoinRoom();
                        }
                      }}
                      disabled={isLoading || roomCode.length !== 6}
                      isLoading={isLoading}
                    >
                      Join Room
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-6 text-gray-500 text-sm mt-4">
          <p>Made with ❤️ for social deduction enthusiasts</p>
        </footer>
      </div>

      {/* Username Modal */}
      <Modal
        isOpen={showUsernameModal}
        onClose={() => {
          setShowUsernameModal(false);
          setPendingAction(null);
          setPendingJoinCode(null);
        }}
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

      {/* Join Room Modal (code entry — kept for the Join by Code button) */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Room"
      >
        <div className="space-y-4">
          <Input
            label="Room Code"
            placeholder="Enter 6-character code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            maxLength={6}
            className="text-center text-2xl tracking-widest font-mono"
            autoFocus
          />
          
          <Button
            variant="primary"
            className="w-full"
            onClick={handleJoinRoom}
            disabled={isLoading || roomCode.length !== 6}
            isLoading={isLoading}
          >
            Join Room
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
            <p className="text-gray-400">
              During the night, special roles perform their actions:
            </p>
            <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
              <li>Mafia votes to kill one Town member</li>
              <li>Detective investigates a player to learn their alignment</li>
              <li>Doctor chooses one player to protect from death</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-lg text-white mb-2">☀️ Day Phase</h3>
            <p className="text-gray-400">
              During the day, all players discuss and vote:
            </p>
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
                  <p className="text-sm text-gray-400 mt-1">
                    {ROLE_DISPLAY[role].description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}
