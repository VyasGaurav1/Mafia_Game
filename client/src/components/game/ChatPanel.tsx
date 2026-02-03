/**
 * Chat Panel Component
 * Handles day chat and mafia-only night chat
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPaperPlane, FaSkull, FaComments, FaUserSecret } from 'react-icons/fa';
import { IChatMessage, Team, GamePhase } from '@/types';

interface ChatPanelProps {
  messages: IChatMessage[];
  mafiaMessages: IChatMessage[];
  canChat: boolean;
  canMafiaChat: boolean;
  myTeam: Team | null;
  currentPhase: GamePhase;
  onSendMessage: (content: string) => void;
  onSendMafiaMessage: (content: string) => void;
}

export default function ChatPanel({
  messages,
  mafiaMessages,
  canChat,
  canMafiaChat,
  myTeam,
  currentPhase,
  onSendMessage,
  onSendMafiaMessage
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'day' | 'mafia'>('day');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMessages = activeTab === 'day' ? messages : mafiaMessages;
  const canSend = activeTab === 'day' ? canChat : canMafiaChat;
  
  const isNightPhase = [
    GamePhase.NIGHT,
    GamePhase.MAFIA_ACTION,
    GamePhase.DETECTIVE_ACTION,
    GamePhase.DOCTOR_ACTION,
    GamePhase.DON_ACTION,
    GamePhase.VIGILANTE_ACTION
  ].includes(currentPhase);

  const isMafia = myTeam === Team.MAFIA;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Auto-switch to mafia chat during night for mafia members
  useEffect(() => {
    if (isNightPhase && isMafia) {
      setActiveTab('mafia');
    } else if (!isNightPhase) {
      setActiveTab('day');
    }
  }, [currentPhase, isMafia, isNightPhase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !canSend) return;
    
    if (activeTab === 'day') {
      onSendMessage(inputValue.trim());
    } else {
      onSendMafiaMessage(inputValue.trim());
    }
    
    setInputValue('');
    inputRef.current?.focus();
  };

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
      {/* Tab header - only show if mafia */}
      {isMafia && (
        <div className="flex border-b border-dark-700">
          <button
            onClick={() => setActiveTab('day')}
            className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'day'
                ? 'bg-dark-700 text-amber-400 border-b-2 border-amber-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaComments />
            <span>Day Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('mafia')}
            className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'mafia'
                ? 'bg-red-900/30 text-red-400 border-b-2 border-red-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FaUserSecret />
            <span>Mafia Chat</span>
            {mafiaMessages.length > 0 && activeTab !== 'mafia' && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {mafiaMessages.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat title for non-mafia */}
      {!isMafia && (
        <div className="py-2 px-4 border-b border-dark-700 flex items-center gap-2">
          <FaComments className="text-amber-400" />
          <span className="font-medium text-white">Chat</span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FaComments className="text-3xl mb-2 opacity-50" />
              <p className="text-sm">No messages yet</p>
              {canSend && <p className="text-xs mt-1">Be the first to speak!</p>}
            </div>
          ) : (
            currentMessages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`${msg.isSystem ? 'flex justify-center' : ''}`}
              >
                {msg.isSystem || msg.type === 'system' ? (
                  <div className="bg-dark-700/50 text-gray-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-amber-500 font-semibold">Operator:</span>
                    {msg.content.includes('died') || msg.content.includes('eliminated') ? (
                      <FaSkull className="text-red-400" />
                    ) : null}
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <div className={`flex flex-col ${activeTab === 'mafia' ? 'bg-red-900/10 rounded-lg p-2' : ''}`}>
                    <div className="flex items-baseline gap-2">
                      <span className={`font-medium text-sm ${
                        activeTab === 'mafia' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {msg.senderUsername || msg.sender?.username || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 break-words">{msg.content}</p>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-dark-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!canSend}
            placeholder={
              !canSend 
                ? activeTab === 'day' 
                  ? 'Chat disabled during night...' 
                  : 'Mafia chat not available'
                : activeTab === 'day'
                  ? 'Type a message...'
                  : 'Message your fellow mafia...'
            }
            maxLength={200}
            className={`
              flex-1 bg-dark-700 border rounded-lg px-4 py-2 text-sm text-white
              placeholder:text-gray-500 focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === 'mafia' 
                ? 'border-red-900/50 focus:ring-red-500/50' 
                : 'border-dark-600 focus:ring-amber-500/50'
              }
            `}
          />
          <button
            type="submit"
            disabled={!canSend || !inputValue.trim()}
            className={`
              px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${activeTab === 'mafia'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-dark-900'
              }
            `}
          >
            <FaPaperPlane />
          </button>
        </div>
        {inputValue.length > 150 && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {inputValue.length}/200
          </p>
        )}
      </form>
    </div>
  );
}
