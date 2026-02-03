# 🎭 Mafia - Multiplayer Social Deduction Game

A production-ready, real-time multiplayer Mafia (Werewolf-style) web game built with React, Node.js, Socket.IO, and MongoDB.

![Game Preview](preview.png)

## ✨ Features

### 🎮 Gameplay
- **6-12 players** per room with balanced role distribution
- **Multiple roles**: Mafia, Don Mafia, Detective, Doctor, Vigilante, Jester, Villager
- **Real-time gameplay** with Socket.IO for instant updates
- **Server-authoritative** game logic preventing cheating
- **Finite State Machine** for reliable phase transitions

### 🎨 UI/UX
- **Cinematic dark theme** with smooth animations
- **Responsive design** for desktop and mobile
- **Role-specific UI** with action prompts
- **Day/Night visual transitions**
- **Real-time chat** with profanity filter

### 🔧 Technical
- **TypeScript** throughout for type safety
- **Zustand** for efficient state management
- **Framer Motion** for fluid animations
- **MongoDB** for game persistence
- **Docker** ready for easy deployment

## 🚀 Quick Start

### Development Mode

1. **Clone and install dependencies:**
```bash
git clone <repo-url>
cd Mafia

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Set up environment variables:**
```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI

# Client (optional)
cp client/.env.example client/.env
```

3. **Start MongoDB** (local or cloud):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mafia-mongo mongo:6.0
```

4. **Run the development servers:**

Terminal 1 (Server):
```bash
cd server
npm run dev
```

Terminal 2 (Client):
```bash
cd client
npm run dev
```

5. **Open** http://localhost:5173 in your browser

### Production with Docker

1. **Copy and configure environment:**
```bash
cp .env.example .env
# Edit .env with secure passwords
```

2. **Build and run:**
```bash
docker-compose up -d --build
```

3. **Access** http://localhost

## 📁 Project Structure

```
Mafia/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── game/     # Game-specific components
│   │   │   └── ui/       # Reusable UI elements
│   │   ├── pages/        # Page components
│   │   ├── services/     # Socket service
│   │   ├── store/        # Zustand state
│   │   └── types/        # TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── server/                # Node.js backend
│   ├── src/
│   │   ├── models/       # MongoDB schemas
│   │   ├── services/     # Game logic
│   │   ├── socket/       # Socket handlers
│   │   ├── routes/       # REST API
│   │   └── utils/        # Utilities
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🎲 Game Roles

| Role | Team | Ability |
|------|------|---------|
| 👤 Villager | Village | Vote during the day |
| 🔫 Mafia | Mafia | Kill one player each night |
| 👑 Don Mafia | Mafia | Kill + detect Detective |
| 🔍 Detective | Village | Investigate one player per night |
| 💉 Doctor | Village | Protect one player per night |
| 🎯 Vigilante | Village | One-time kill (use wisely!) |
| 🃏 Jester | Neutral | Win if voted out |

## 🎯 Game Phases

1. **Lobby** - Players join, host configures settings
2. **Role Reveal** - Each player sees their role privately
3. **Night** - Special roles perform actions
4. **Day Discussion** - Players discuss suspicions
5. **Voting** - Players vote to eliminate someone
6. **Game End** - One team achieves victory

## ⚙️ Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| Day Duration | 120s | Time for discussion |
| Night Duration | 45s | Time for night actions |
| Voting Duration | 60s | Time to cast votes |
| Min Players | 6 | Minimum to start |
| Max Players | 12 | Room capacity |
| Reveal Roles on Death | true | Show dead player's role |

## 🔌 Socket Events

### Client → Server
- `room:create` - Create a new room
- `room:join` - Join existing room
- `game:start` - Host starts game
- `night:action` - Submit night action
- `vote:cast` - Cast elimination vote
- `day:chat` - Send chat message
- `mafia:chat` - Send mafia-only message

### Server → Client
- `room:joined` - Successfully joined
- `game:started` - Game has begun
- `role:assigned` - Your role revealed
- `phase:changed` - New game phase
- `player:died` - Someone was eliminated
- `game:ended` - Game over with winner

## 🚢 Deployment

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### GitHub Pages (Frontend Only)
GitHub Pages can host the static React client, but you still need a separate backend for Socket.IO and API routes.

1. **Configure client environment variables (build-time):**
   ```bash
   # client/.env
   VITE_BASE_PATH=/Mafia_Game/
   VITE_ROUTER_MODE=hash
   VITE_SOCKET_URL=https://your-backend.example.com
   VITE_API_URL=https://your-backend.example.com/api
   ```
   - For user/organization Pages (not project pages), set `VITE_BASE_PATH=/`.
   - `VITE_ROUTER_MODE=hash` avoids 404s on refresh.

2. **Build the client:**
   ```bash
   cd client
   npm install
   npm run build
   ```

3. **Deploy `client/dist` to GitHub Pages:**
   - Commit the `client/dist` contents to a `gh-pages` branch or configure GitHub Actions to deploy that folder.

### Manual Deployment
1. Build client: `cd client && npm run build`
2. Build server: `cd server && npm run build`
3. Serve client with nginx/serve
4. Run server: `node server/dist/index.js`

## 🧪 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Zustand (state)
- Framer Motion
- Socket.IO Client

**Backend:**
- Node.js + Express
- TypeScript
- Socket.IO
- MongoDB + Mongoose
- Winston (logging)

**Infrastructure:**
- Docker + Docker Compose
- Nginx
- Redis (optional)

## 📝 License

MIT License - feel free to use for your own projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a PR

---

Built with ❤️ for game nights
