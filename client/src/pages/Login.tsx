/**
 * Login Page
 * Authentication UI for login, registration, and guest mode
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Button, Input } from '@/components/ui';

type AuthMode = 'login' | 'register' | 'guest';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, playAsGuest, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when switching modes
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, [mode, clearError]);

  const validateForm = (): boolean => {
    setLocalError(null);

    if (mode === 'register') {
      if (!username || username.length < 3) {
        setLocalError('Username must be at least 3 characters');
        return false;
      }
      if (!email || !email.includes('@')) {
        setLocalError('Please enter a valid email');
        return false;
      }
      if (!password || password.length < 6) {
        setLocalError('Password must be at least 6 characters');
        return false;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match');
        return false;
      }
    } else if (mode === 'login') {
      if (!email) {
        setLocalError('Please enter your email or username');
        return false;
      }
      if (!password) {
        setLocalError('Please enter your password');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(username, email, password, displayName || undefined);
      }
      navigate('/');
    } catch {
      // Error is handled by store
    }
  };

  const handleGuestPlay = async () => {
    try {
      await playAsGuest();
      navigate('/');
    } catch {
      // Error is handled by store
    }
  };

  const currentError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            <span className="text-red-500">Mafia</span>
          </h1>
          <p className="text-gray-400">The Ultimate Social Deduction Game</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Mode Tabs */}
          <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {currentError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4"
              >
                <p className="text-red-400 text-sm">{currentError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Username</label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full bg-gray-900 border-gray-700 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">Display Name (optional)</label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="How you want to be known"
                      className="w-full bg-gray-900 border-gray-700 focus:border-red-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-gray-300 text-sm mb-1">
                {mode === 'login' ? 'Email or Username' : 'Email'}
              </label>
              <Input
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'Enter email or username' : 'Enter your email'}
                className="w-full bg-gray-900 border-gray-700 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-gray-900 border-gray-700 focus:border-red-500"
              />
            </div>

            <AnimatePresence>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-gray-300 text-sm mb-1">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full bg-gray-900 border-gray-700 focus:border-red-500"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  {mode === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Login' : 'Create Account'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-700"></div>
            <span className="px-4 text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-gray-700"></div>
          </div>

          {/* Guest Mode */}
          <Button
            variant="secondary"
            className="w-full py-3 mb-4"
            onClick={handleGuestPlay}
            disabled={isLoading}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Play as Guest
            </span>
          </Button>

          {/* Guest Mode Info */}
          <p className="text-xs text-gray-500 text-center">
            Guest mode: Quick play with other guests. No stats saved.
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            &larr; Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
