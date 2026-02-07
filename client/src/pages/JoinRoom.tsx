/**
 * JoinRoom Page
 * Handles direct join via shared link: /join/:roomCode
 * - If user already exists, auto-joins immediately
 * - If new user, shows a name input then joins
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function JoinRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user, setUser, room, setConnectionStatus } = useGameStore();

  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const joinAttempted = useRef(false);

  // If user already has a session and room matches, go straight to lobby
  useEffect(() => {
    if (room && room.code === roomCode?.toUpperCase()) {
      navigate(`/lobby/${room.code}`, { replace: true });
    }
  }, [room, roomCode, navigate]);

  // Auto-join if user already exists (returning user clicking a new link)
  useEffect(() => {
    if (user && !room && roomCode && !joinAttempted.current) {
      joinAttempted.current = true;
      autoJoin(user.oderId, user.username);
    }
  }, [user, room, roomCode]);

  const autoJoin = async (oderId: string, name: string) => {
    if (!roomCode) return;
    setIsJoining(true);
    setError('');

    try {
      // Ensure socket is connected
      if (!socketService.isConnected()) {
        setConnectionStatus('connecting');
        await socketService.connect(oderId, name);
        setConnectionStatus('connected');
      }

      const joinedRoom = await socketService.joinRoom(
        roomCode.toUpperCase().trim(),
        oderId,
        name
      );

      toast.success(`Joined room ${joinedRoom.code}!`);
      navigate(`/lobby/${joinedRoom.code}`, { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Failed to join room';
      setError(msg);
      toast.error(msg);
      // Allow retry
      joinAttempted.current = false;
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    const name = username.trim();
    if (!name || name.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    const oderId = uuidv4();
    const newUser = { oderId, username: name };
    setUser(newUser);

    await autoJoin(oderId, name);
  };

  // While auto-joining for existing user, show a spinner
  if (user && isJoining) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-4">
        <FaSpinner className="text-4xl text-amber-400 animate-spin" />
        <p className="text-gray-400">Joining room <span className="font-mono text-amber-400">{roomCode?.toUpperCase()}</span>...</p>
      </div>
    );
  }

  // Name entry form for new users (or error state for existing users)
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-blood-500/5 via-transparent to-transparent" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-blood-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="card p-8 text-center">
          {/* Header */}
          <div className="w-16 h-16 bg-blood-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎭</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Join Mafia Game</h1>
          <p className="text-gray-400 mb-6">
            You've been invited to room{' '}
            <span className="font-mono text-amber-400 tracking-widest">{roomCode?.toUpperCase()}</span>
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* If user exists but join failed, show retry */}
          {user && !isJoining ? (
            <div className="space-y-4">
              <p className="text-gray-300">
                Welcome back, <span className="font-semibold text-white">{user.username}</span>!
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => autoJoin(user.oderId, user.username)}
                isLoading={isJoining}
                icon={<FaUsers />}
              >
                Join Room
              </Button>
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          ) : (
            /* New user — ask for name */
            <div className="space-y-4">
              <Input
                label="Enter your name"
                placeholder="Your display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={20}
                autoFocus
              />
              <Button
                variant="primary"
                className="w-full"
                onClick={handleJoin}
                isLoading={isJoining}
                disabled={username.trim().length < 2}
                icon={<FaUsers />}
              >
                Join Room
              </Button>
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
