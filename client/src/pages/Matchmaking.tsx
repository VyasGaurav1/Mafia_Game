/**
 * Matchmaking Page
 * Queue interface for finding games
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { matchmakingService, MatchType, MatchFoundData } from '@/services/matchmakingService';
import { friendsService, Friend } from '@/services/friendsService';
import { Button } from '@/components/ui';

const Matchmaking: React.FC = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuthStore();
  
  const [selectedMode, setSelectedMode] = useState<MatchType | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [queueTime, setQueueTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Friends selection for private games
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Queue timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (inQueue) {
      interval = setInterval(() => {
        setQueueTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inQueue]);

  // Set up matchmaking listeners
  useEffect(() => {
    const unsubMatch = matchmakingService.onMatchFound((data: MatchFoundData) => {
      navigate(`/lobby/${data.roomCode}`);
    });

    const unsubPosition = matchmakingService.onPositionUpdate((position: number) => {
      setQueuePosition(position);
    });

    const unsubCancel = matchmakingService.onCancelled((reason: string) => {
      setInQueue(false);
      setError(reason);
    });

    return () => {
      unsubMatch();
      unsubPosition();
      unsubCancel();
    };
  }, [navigate]);

  // Load friends list for authenticated users
  useEffect(() => {
    if (!isGuest && showFriendsList) {
      loadFriends();
    }
  }, [isGuest, showFriendsList]);

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const onlineFriends = await friendsService.getOnlineFriends();
      setFriends(onlineFriends);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleJoinQueue = async (mode: MatchType) => {
    setError(null);
    setSelectedMode(mode);
    
    try {
      if (mode === 'friends') {
        if (selectedFriends.length === 0) {
          setShowFriendsList(true);
          return;
        }
        const roomCode = await matchmakingService.createPrivateRoom(selectedFriends);
        navigate(`/lobby/${roomCode}`);
        return;
      }

      const result = await matchmakingService.joinQueue(mode);
      setInQueue(true);
      setQueuePosition(result.position);
      setQueueTime(0);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeaveQueue = async () => {
    await matchmakingService.leaveQueue();
    setInQueue(false);
    setSelectedMode(null);
    setQueueTime(0);
  };

  const handleCreatePrivateRoom = async () => {
    if (selectedFriends.length === 0) {
      setError('Select at least one friend');
      return;
    }
    
    try {
      const roomCode = await matchmakingService.createPrivateRoom(selectedFriends);
      navigate(`/lobby/${roomCode}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleFriend = (oderId: string) => {
    setSelectedFriends(prev => 
      prev.includes(oderId)
        ? prev.filter(id => id !== oderId)
        : [...prev, oderId]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const modes = [
    {
      type: 'quick' as MatchType,
      name: 'Quick Play',
      description: 'Fast matchmaking with players of similar skill',
      icon: '⚡',
      disabled: false
    },
    {
      type: 'public' as MatchType,
      name: 'Public Game',
      description: 'Join a public lobby and wait for players',
      icon: '🌐',
      disabled: false
    },
    {
      type: 'friends' as MatchType,
      name: 'Friends Only',
      description: 'Create a private game with your friends',
      icon: '👥',
      disabled: isGuest
    },
    {
      type: 'guest' as MatchType,
      name: 'Guest Game',
      description: 'Quick games with other guests (60s timeout)',
      icon: '🎭',
      disabled: !isGuest
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Find a Game</h1>
          <p className="text-gray-400">
            {user ? `Playing as ${user.username}` : 'Select a game mode'}
            {isGuest && <span className="text-yellow-500 ml-2">(Guest)</span>}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center"
            >
              <p className="text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Queue Status */}
        <AnimatePresence>
          {inQueue && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 mb-8 text-center border border-purple-500/50"
            >
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                <h2 className="text-2xl font-bold text-white">Finding Game...</h2>
                <p className="text-gray-400 mt-2">
                  {selectedMode === 'quick' && 'Matching you with similar players'}
                  {selectedMode === 'public' && 'Waiting for players to join'}
                  {selectedMode === 'guest' && 'Finding other guests (60s max)'}
                </p>
              </div>
              
              <div className="flex justify-center gap-8 mb-6">
                <div>
                  <div className="text-3xl font-bold text-purple-400">{queuePosition}</div>
                  <div className="text-sm text-gray-500">Queue Position</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400">{formatTime(queueTime)}</div>
                  <div className="text-sm text-gray-500">Wait Time</div>
                </div>
              </div>

              <Button
                variant="danger"
                onClick={handleLeaveQueue}
                className="px-8"
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friends Selection Modal */}
        <AnimatePresence>
          {showFriendsList && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
              onClick={() => setShowFriendsList(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-4">Invite Friends</h3>
                
                {loadingFriends ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 mt-2">Loading friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No friends online</p>
                    <p className="text-sm text-gray-500 mt-2">Add friends to invite them to games</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                    {friends.map(friend => (
                      <button
                        key={friend.oderId}
                        onClick={() => toggleFriend(friend.oderId)}
                        className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                          selectedFriends.includes(friend.oderId)
                            ? 'bg-purple-600/30 border border-purple-500'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            friend.status === 'online' ? 'bg-green-500' :
                            friend.status === 'in-game' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}></div>
                          <span className="text-white">{friend.username}</span>
                        </div>
                        {selectedFriends.includes(friend.oderId) && (
                          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowFriendsList(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreatePrivateRoom}
                    disabled={selectedFriends.length === 0}
                    className="flex-1"
                  >
                    Create Room ({selectedFriends.length})
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Modes Grid */}
        {!inQueue && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {modes.map(mode => (
              <motion.button
                key={mode.type}
                whileHover={{ scale: mode.disabled ? 1 : 1.02 }}
                whileTap={{ scale: mode.disabled ? 1 : 0.98 }}
                onClick={() => !mode.disabled && handleJoinQueue(mode.type)}
                disabled={mode.disabled}
                className={`p-6 rounded-xl text-left transition-colors ${
                  mode.disabled
                    ? 'bg-gray-800/40 cursor-not-allowed opacity-50'
                    : 'bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{mode.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{mode.name}</h3>
                    <p className="text-gray-400 text-sm">{mode.description}</p>
                    {mode.disabled && mode.type === 'friends' && (
                      <p className="text-yellow-500 text-xs mt-2">Login required</p>
                    )}
                    {mode.disabled && mode.type === 'guest' && (
                      <p className="text-gray-500 text-xs mt-2">For guests only</p>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Alternative Options */}
        {!inQueue && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => navigate('/join')}
              className="px-6"
            >
              Join with Room Code
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/')}
              className="px-6"
            >
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matchmaking;
