/**
 * Main Game Page
 * Handles all game phases with dynamic UI
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt } from 'react-icons/fa';

import { useGameStore } from '@/store/gameStore';
import { socketService } from '@/services/socketService';
import { 
  GamePhase, 
  Role, 
  Team, 
  PlayerStatus,
  ROLE_DISPLAY, 
  PHASE_DISPLAY
} from '@/types';

// Components
import GameHeader from '@/components/game/GameHeader';
import PlayerGrid from '@/components/game/PlayerGrid';
import ChatPanel from '@/components/game/ChatPanel';
import RoleReveal from '@/components/game/RoleReveal';
import NightOverlay from '@/components/game/NightOverlay';
import VotingPanel from '@/components/game/VotingPanel';
import GameEndScreen from '@/components/game/GameEndScreen';
import ActionPrompt from '@/components/game/ActionPrompt';
import NightResultBanner from '@/components/game/NightResultBanner';

export default function Game() {
  useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  const {
    user,
    room,
    myRole,
    myTeam,
    teammates,
    currentPhase,
    dayNumber,
    timer,
    actionRequired,
    validTargets,
    hasActed,
    selectedTarget,
    setSelectedTarget,
    nightResult,
    investigationResult,
    donResult,
    votes,
    hasVoted,
    myVote,
    setMyVote,
    mafiaVotes,
    chatMessages,
    mafiaMessages,
    gameEnded,
    winner,
    isAlive,
    clearGame
  } = useGameStore();

  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [showNightResult, setShowNightResult] = useState(false);

  const playerAlive = isAlive();
  const isMafia = myTeam === Team.MAFIA;
  // Check if current player is a Mafia role (either by team or by role)
  const isMafiaRole = myRole === Role.MAFIA || myRole === Role.DON_MAFIA || myRole === Role.GODFATHER || myRole === Role.MAFIA_GOON;
  const isMafiaPlayer = isMafia || isMafiaRole;
  const isNightPhase = PHASE_DISPLAY[currentPhase]?.isNight || false;

  // Show role reveal on game start
  useEffect(() => {
    if (currentPhase === GamePhase.ROLE_REVEAL && myRole) {
      setShowRoleReveal(true);
    }
  }, [currentPhase, myRole]);

  // Show night result at day start
  useEffect(() => {
    if (currentPhase === GamePhase.DAY_DISCUSSION && nightResult) {
      setShowNightResult(true);
      const timeout = setTimeout(() => setShowNightResult(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [currentPhase, nightResult]);

  // Handle night action submission
  const handleNightAction = () => {
    if (!room || !selectedTarget) return;
    socketService.performNightAction(room.code, selectedTarget);
  };

  // Handle Mafia kill action
  const handleMafiaKill = (targetId: string) => {
    if (!room || !isMafiaPlayer) return;
    socketService.performNightAction(room.code, targetId);
    setSelectedTarget(targetId);
  };

  // Handle vote submission
  const handleVote = (targetId: string) => {
    if (!room || !playerAlive) return;
    socketService.castVote(room.code, targetId);
    setMyVote(targetId);
  };

  // Handle skip vote
  const handleSkipVote = () => {
    if (!room || !playerAlive) return;
    socketService.castVote(room.code, 'SKIP');
    setMyVote('SKIP');
  };

  // Handle request removal vote
  const handleRequestRemoval = (targetId: string) => {
    if (!room || !playerAlive) return;
    const targetPlayer = room.players.find(p => p.oderId === targetId);
    if (targetPlayer) {
      socketService.requestRemovalVote(room.code, targetId);
      useGameStore.getState().setIsRemovalVote(true);
    }
  };

  // Handle chat send
  const handleSendChat = (message: string) => {
    if (!room) return;
    socketService.sendDayChat(room.code, message);
  };

  // Handle mafia chat send
  const handleSendMafiaChat = (message: string) => {
    if (!room || !isMafiaPlayer) return;
    socketService.sendMafiaChat(room.code, message);
  };

  // Leave game
  const handleLeave = () => {
    if (room) {
      socketService.leaveRoom(room.code);
    }
    clearGame();
    navigate('/');
  };

  // Play again handler
  const handlePlayAgain = () => {
    // Return to lobby with same room
    clearGame();
    if (room) {
      navigate(`/lobby/${room.code}`);
    } else {
      navigate('/');
    }
  };

  if (!room || !user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // Calculate required votes for elimination
  const alivePlayers = room.players.filter(p => p.status === PlayerStatus.ALIVE);
  const requiredVotes = Math.ceil(alivePlayers.length / 2);

  // Calculate valid targets for Mafia kill during MAFIA_ACTION phase
  const mafiaKillTargets = React.useMemo(() => {
    if (currentPhase === GamePhase.MAFIA_ACTION && isMafiaPlayer && playerAlive) {
      // Mafia can kill any alive player except themselves and other mafia members
      return alivePlayers
        .filter(p => p.oderId !== user.oderId) // Not self
        .filter(p => {
          // Not other mafia members (check both myTeam and teammates)
          if (teammates.includes(p.oderId)) return false;
          // Also check if they have mafia role
          if (p.role && [Role.MAFIA, Role.DON_MAFIA, Role.GODFATHER, Role.MAFIA_GOON].includes(p.role as Role)) return false;
          return true;
        })
        .map(p => p.oderId);
    }
    return [];
  }, [currentPhase, isMafiaPlayer, playerAlive, alivePlayers, user.oderId, teammates]);

  // Combine server validTargets with client-calculated mafia targets
  const allValidTargets = React.useMemo(() => {
    if (currentPhase === GamePhase.MAFIA_ACTION && isMafiaPlayer) {
      return mafiaKillTargets;
    }
    // For Doctor, include all alive players
    if (currentPhase === GamePhase.DOCTOR_ACTION && myRole === Role.DOCTOR) {
      return alivePlayers.map(p => p.oderId);
    }
    return validTargets;
  }, [currentPhase, isMafiaPlayer, mafiaKillTargets, validTargets, myRole, alivePlayers]);

  // Determine if current player should see an action prompt
  const shouldShowActionPrompt = React.useMemo(() => {
    if (!playerAlive || hasActed) return false;
    
    // Mafia during MAFIA_ACTION - use isMafiaPlayer (checks both team AND role)
    if (currentPhase === GamePhase.MAFIA_ACTION && isMafiaPlayer) return true;
    
    // Doctor during DOCTOR_ACTION
    if (currentPhase === GamePhase.DOCTOR_ACTION && myRole === Role.DOCTOR) return true;
    
    // Detective during DETECTIVE_ACTION
    if (currentPhase === GamePhase.DETECTIVE_ACTION && myRole === Role.DETECTIVE) return true;
    
    // Don during DON_ACTION
    if (currentPhase === GamePhase.DON_ACTION && myRole === Role.DON_MAFIA) return true;
    
    // Vigilante during VIGILANTE_ACTION
    if (currentPhase === GamePhase.VIGILANTE_ACTION && myRole === Role.VIGILANTE) return true;
    
    // Fallback to server-provided actionRequired
    return actionRequired;
  }, [currentPhase, isMafiaPlayer, myRole, playerAlive, hasActed, actionRequired]);

  // Debug logging for Mafia action
  React.useEffect(() => {
    console.log('[Game] Debug:', {
      currentPhase,
      myRole,
      myTeam,
      isMafia,
      isMafiaRole,
      isMafiaPlayer,
      playerAlive,
      hasActed,
      shouldShowActionPrompt,
      validTargetPlayers: validTargetPlayers?.length,
      allValidTargets: allValidTargets?.length
    });
  }, [currentPhase, myRole, myTeam, isMafia, isMafiaRole, isMafiaPlayer, playerAlive, hasActed, shouldShowActionPrompt]);

  // Get valid targets for action prompt
  const validTargetPlayers = room.players.filter(p => allValidTargets.includes(p.oderId));

  // Convert night result for banner
  const nightDeaths = nightResult?.deaths?.map(d => ({
    username: room.players.find(p => p.oderId === d.playerId)?.username || 'Unknown',
    role: d.role,
    cause: d.cause
  })) || [];

  const nightSaves = nightResult?.saves?.map(s => ({
    username: room.players.find(p => p.oderId === s.playerId)?.username || 'Unknown'
  })) || [];

  // Game ended screen
  if (gameEnded && winner) {
    return (
      <GameEndScreen
        winner={winner}
        players={room.players}
        myTeam={myTeam}
        myRole={myRole}
        onPlayAgain={handlePlayAgain}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${
      isNightPhase ? 'bg-dark-900' : 'bg-gradient-to-b from-[#1a2a3a] to-dark-900'
    }`}>
      {/* Night overlay effect */}
      <NightOverlay 
        currentPhase={currentPhase}
        canAct={actionRequired && playerAlive && !hasActed}
      />

      {/* Role reveal modal */}
      <AnimatePresence>
        {showRoleReveal && myRole && (
          <RoleReveal
            role={myRole}
            teammates={teammates.map(id => room.players.find(p => p.oderId === id)?.username || 'Unknown')}
            onComplete={() => setShowRoleReveal(false)}
          />
        )}
      </AnimatePresence>

      {/* Night result banner */}
      <AnimatePresence>
        {showNightResult && (
          <NightResultBanner
            deaths={nightDeaths}
            saves={nightSaves}
            onDismiss={() => setShowNightResult(false)}
            dayNumber={dayNumber}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-4 py-4 min-h-screen flex flex-col">
        {/* Game Header */}
        <GameHeader
          phase={currentPhase}
          dayNumber={dayNumber}
          timer={timer}
          roomCode={room.code}
          isNight={isNightPhase}
          onLeave={handleLeave}
        />

        {/* Main game area */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Player grid - Left/Center */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Action prompt for special roles */}
            <AnimatePresence>
              {shouldShowActionPrompt && myRole && (
                <div className="mb-4">
                  <ActionPrompt
                    role={myRole}
                    validTargets={validTargetPlayers}
                    selectedTarget={selectedTarget}
                    onSelectTarget={setSelectedTarget}
                    onConfirmAction={handleNightAction}
                    investigationResult={investigationResult ? {
                      targetId: investigationResult.targetId,
                      result: investigationResult.isGuilty ? 'Mafia' : 'Innocent'
                    } : donResult ? {
                      targetId: donResult.targetId,
                      result: donResult.isDetective ? 'Detective' : 'Not Detective'
                    } : null}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Investigation results display */}
            <AnimatePresence>
              {investigationResult && myRole === Role.DETECTIVE && hasActed && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-4 p-4 rounded-xl border ${
                    investigationResult.isGuilty 
                      ? 'bg-red-500/10 border-red-500/50' 
                      : 'bg-green-500/10 border-green-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FaShieldAlt className={investigationResult.isGuilty ? 'text-red-400' : 'text-green-400'} />
                    <span className="font-semibold text-white">
                      {room.players.find(p => p.oderId === investigationResult.targetId)?.username} is{' '}
                      <span className={investigationResult.isGuilty ? 'text-red-400' : 'text-green-400'}>
                        {investigationResult.isGuilty ? 'GUILTY' : 'INNOCENT'}
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Don investigation result */}
            <AnimatePresence>
              {donResult && myRole === Role.DON_MAFIA && hasActed && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`mb-4 p-4 rounded-xl border ${
                    donResult.isDetective 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-dark-700 border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FaShieldAlt className={donResult.isDetective ? 'text-green-400' : 'text-gray-400'} />
                    <span className="font-semibold text-white">
                      {room.players.find(p => p.oderId === donResult.targetId)?.username} is{' '}
                      <span className={donResult.isDetective ? 'text-green-400' : 'text-gray-400'}>
                        {donResult.isDetective ? 'THE DETECTIVE!' : 'not the Detective'}
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player grid */}
            <PlayerGrid
              players={room.players}
              currentUserId={user.oderId}
              myRole={myRole}
              myTeam={myTeam}
              currentPhase={currentPhase}
              validTargets={allValidTargets}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              votes={votes}
              hasVoted={hasVoted}
              mafiaVotes={mafiaVotes}
              canAct={actionRequired && playerAlive && !hasActed}
              canVote={currentPhase === GamePhase.VOTING && playerAlive && !myVote}
              onVote={handleVote}
              isHost={useGameStore.getState().isHost()}
              onKickPlayer={(playerId) => socketService.kickPlayer(room.code, playerId)}
              onRequestRemoval={handleRequestRemoval}
              onMafiaKill={handleMafiaKill}
            />

            {/* Voting panel during voting phase */}
            <AnimatePresence>
              {currentPhase === GamePhase.VOTING && (
                <div className="mt-4">
                  <VotingPanel
                    players={alivePlayers}
                    votes={votes}
                    currentUserId={user.oderId}
                    hasVoted={!!myVote}
                    onVote={handleVote}
                    onSkipVote={handleSkipVote}
                    requiredVotes={requiredVotes}
                    canVote={playerAlive && !myVote}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat panel - Right */}
          <div className="lg:col-span-1">
            <ChatPanel
              messages={chatMessages}
              mafiaMessages={mafiaMessages}
              canChat={playerAlive && !isNightPhase}
              canMafiaChat={playerAlive && isMafiaPlayer && isNightPhase}
              myTeam={myTeam}
              currentPhase={currentPhase}
              onSendMessage={handleSendChat}
              onSendMafiaMessage={handleSendMafiaChat}
            />
          </div>
        </main>

        {/* Player status bar */}
        <footer className="mt-4 py-3 px-4 bg-dark-800/80 backdrop-blur rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {myRole && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${ROLE_DISPLAY[myRole].bgColor}`}>
                  <span>{ROLE_DISPLAY[myRole].icon}</span>
                  <span className={`font-semibold text-sm ${ROLE_DISPLAY[myRole].color}`}>
                    {ROLE_DISPLAY[myRole].name}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">{user.username}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                playerAlive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {playerAlive ? 'Alive' : 'Dead'}
              </span>
            </div>
          </div>

          {/* Mafia teammates indicator */}
          {isMafia && teammates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Allies:</span>
              <div className="flex -space-x-2">
                {teammates.map(id => {
                  const player = room.players.find(p => p.oderId === id);
                  return player ? (
                    <div
                      key={id}
                      className="w-8 h-8 rounded-full bg-red-500/30 border-2 border-red-500 flex items-center justify-center text-xs font-bold"
                      title={player.username}
                    >
                      {player.username[0].toUpperCase()}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
