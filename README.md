# MBL iGaming Backend

A NestJS-based gaming session API that manages real-time gaming lobbies with automatic resource management and user activity tracking.

## What This Does

This backend handles the core logic for a number-picking game where users join sessions, pick numbers 1-9, and winners are determined when sessions end. It's designed to be resource-efficient and automatically manages gaming sessions based on user activity.

## Architecture

- **NestJS** - Main framework for the API structure
- **Prisma** - ORM for database operations (SQLite for now, easy to switch to PostgreSQL/MySQL)
- **JWT** - Authentication with passport strategy
- **Cron Jobs** - Scheduled tasks for session management and cleanup
- **WebSocket-ready** - Structure supports real-time updates (not implemented yet)

## Core Features

### Session Management

- **Pending → Active → Ended** session lifecycle
- Auto-start sessions after 30 seconds if no manual start
- Configurable session duration (default: 20 seconds)
- Max 10 players per session

### User Activity Tracking

- Tracks when users last interacted with the system
- Automatically logs out inactive users after 5 minutes
- Stops all gaming sessions when no active users online
- Resource management to prevent unnecessary server load

### Game Logic

- Random number generation (1-9) for winning numbers
- Queue system when sessions are full
- Auto-promotion from queue when players leave
- Win tracking and leaderboard data

## How It Works

### Session Flow

1. **Pending Session Created** - Available for players to join
2. **Auto-start or Manual Start** - Converts to active with countdown
3. **Active Session** - Players pick numbers, countdown runs
4. **Session Ends** - Winning number generated, results calculated
5. **New Pending Session** - Automatically created for next round

### User Activity System

- Every API call updates `lastActivityAt` timestamp
- Cron job runs every minute to check for inactive users
- Users inactive for 5+ minutes get cleaned up from all sessions
- When no active users detected, all sessions are stopped

### Resource Management

- Gaming sessions only run when there are active users
- Automatic cleanup of expired sessions every 10 seconds
- Queue management prevents memory leaks from abandoned sessions

## API Endpoints

```
GET  /sessions/current          - Get current active/pending session
GET  /sessions/ended/:id        - Get ended session results
GET  /sessions/results/:id      - Get session results (fallback)
POST /sessions/start            - Manually start a session
POST /sessions/join             - Join session with number pick
POST /sessions/leave            - Leave current session
GET  /sessions/group-by-date    - Get historical sessions
GET  /leaderboard               - Get player rankings
POST /auth/register             - User registration
POST /auth/login                - User authentication
```

## Database Schema

### Core Models

- **User** - Player accounts with win tracking
- **Session** - Gaming sessions with status and timing
- **SessionPlayer** - Player participation in sessions
- **SessionQueue** - Queue system for full sessions

### Key Fields

- `lastActivityAt` - Tracks user activity for timeout
- `status` - Session state (PENDING/ACTIVE/ENDED)
- `winnerNumber` - Generated winning number
- `isWinner` - Player win status

## Setup & Development

### Prerequisites

- Node.js 20+
- npm/yarn
- SQLite (or your preferred DB)

### Installation

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Environment Variables

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-here"
SESSION_DURATION_SECONDS=20
SESSION_MAX_PLAYERS=10
```

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name description

# Reset database (dev only)
npx prisma migrate reset

# View database
npx prisma studio
```

## Production Considerations

### Performance

- Cron jobs run every 10 seconds (session management) and every minute (user cleanup)
- Database queries optimized with proper indexing
- Session cleanup prevents memory leaks

### Security

- JWT authentication with proper token validation
- Input validation on all endpoints
- Rate limiting should be added for production

### Monitoring

- Logs user activity and session state changes
- Error logging for debugging production issues
- Session metrics for performance monitoring

## What's Next

- WebSocket implementation for real-time updates
- Redis for session caching and scaling
- Rate limiting and API throttling
- Metrics and monitoring endpoints
- Docker containerization
- Load balancing support

## Why This Architecture

Built this way because:

- **NestJS** gives solid structure without over-engineering
- **Prisma** handles database complexity cleanly
- **Cron-based** approach is simple and reliable for this scale
- **Activity tracking** prevents resource waste when no one's using it
- **Queue system** handles the "what if everyone joins at once" scenario

The goal was to build something that works reliably without being overly complex. It's designed to handle the gaming use case efficiently while being easy to maintain and extend.
