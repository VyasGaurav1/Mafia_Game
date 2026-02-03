/**
 * Landing Page
 * Main entry point with options to create/join game
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlay, FaUsers, FaBook, FaCog } from 'react-icons/fa';
// Icons removed - not used in current implementation
import toast from 'react-hot-toast';

import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import { RoomVisibility, ROLE_DISPLAY, Role } from '@/types';
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
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

  // Check for existing user on mount
  useEffect(() => {
    if (user) {
      connectSocket(user.oderId, user.username);
    }
  }, []);

  const connectSocket = async (oderId: string, username: string) => {
    try {
      setConnectionStatus('connecting');
      await socketService.connect(oderId, username);
      setConnectionStatus('connected');
    } catch (error) {
      toast.error('Failed to connect to server');
      setConnectionStatus('disconnected');
    }
  };

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
      }
      setPendingAction(null);
    } catch (error) {
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
      
      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blood-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-500" />
      
      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
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
          
          {user && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="text-gray-400">Playing as</span>
              <span className="font-semibold text-white">{user.username}</span>
              <button 
                onClick={() => setShowUsernameModal(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaCog />
              </button>
            </motion.div>
          )}
        </header>

        {/* Hero section */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-8">
          {/* Left side - Title and description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center lg:text-left max-w-xl"
          >
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
              <span className="text-white">THE </span>
              <span className="text-gradient">MAFIA</span>
              <br />
              <span className="text-white">GAME</span>
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl mb-8 leading-relaxed">
              A thrilling multiplayer social deduction game. Unmask the Mafia before they 
              eliminate the town, or work in the shadows to take control.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="primary"
                size="lg"
                onClick={handlePlayClick}
                icon={<FaPlay />}
              >
                Create Game
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                onClick={handleJoinClick}
                icon={<FaUsers />}
              >
                Join Game
              </Button>
            </div>

            {/* Rules button */}
            <button
              onClick={() => setShowRulesModal(true)}
              className="mt-6 text-gray-400 hover:text-white flex items-center gap-2 mx-auto lg:mx-0 transition-colors"
            >
              <FaBook />
              <span>How to Play</span>
            </button>
          </motion.div>

          {/* Right side - Role showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[Role.MAFIA, Role.DETECTIVE, Role.DOCTOR, Role.VILLAGER].map((role, index) => (
                <motion.div
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className={`card-hover p-5 ${ROLE_DISPLAY[role].bgColor}`}
                >
                  <div className="text-4xl mb-3">{ROLE_DISPLAY[role].icon}</div>
                  <h3 className={`font-semibold ${ROLE_DISPLAY[role].color}`}>
                    {ROLE_DISPLAY[role].name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {ROLE_DISPLAY[role].description}
                  </p>
                </motion.div>
              ))}
            </div>
            
            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-radial from-blood-500/20 via-transparent to-transparent blur-2xl -z-10" />
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Made with ❤️ for social deduction enthusiasts</p>
        </footer>
      </div>

      {/* Username Modal */}
      <Modal
        isOpen={showUsernameModal}
        onClose={() => {
          setShowUsernameModal(false);
          setPendingAction(null);
        }}
        title="Enter Your Name"
      >
        <div className="space-y-4">
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            maxLength={30}
            autoFocus
          />
          
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <div>
              <p className="font-medium text-white">Private Room</p>
              <p className="text-sm text-gray-400">Only players with code can join</p>
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

      {/* Join Room Modal */}
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
