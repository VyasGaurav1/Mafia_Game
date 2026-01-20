/**
 * Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useGameStore } from '@/store/gameStore';

// Pages
import Landing from '@/pages/Landing';
import Lobby from '@/pages/Lobby';
import Game from '@/pages/Game';

// Room guard component - requires user and room to access
function RoomRoute({ children }: { children: React.ReactNode }) {
  const user = useGameStore((state) => state.user);
  const room = useGameStore((state) => state.room);
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (!room) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a25',
            color: '#fff',
            border: '1px solid #32323f',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Landing/Home page */}
        <Route path="/" element={<Landing />} />
        
        {/* Lobby page */}
        <Route
          path="/lobby/:roomCode"
          element={
            <RoomRoute>
              <Lobby />
            </RoomRoute>
          }
        />
        
        {/* Game page */}
        <Route
          path="/game/:roomCode"
          element={
            <RoomRoute>
              <Game />
            </RoomRoute>
          }
        />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
