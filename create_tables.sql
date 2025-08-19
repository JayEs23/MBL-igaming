-- Create User table
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "fullName" TEXT,
    "password" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Session table
CREATE TABLE "Session" (
    "id" SERIAL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "winnerNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedById" INTEGER REFERENCES "User"("id") ON DELETE SET NULL
);

-- Create SessionPlayer table
CREATE TABLE "SessionPlayer" (
    "id" SERIAL PRIMARY KEY,
    "sessionId" INTEGER NOT NULL REFERENCES "Session"("id") ON DELETE RESTRICT,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "pick" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftBeforeStart" BOOLEAN NOT NULL DEFAULT false,
    UNIQUE("sessionId", "userId")
);

-- Create SessionQueue table
CREATE TABLE "SessionQueue" (
    "id" SERIAL PRIMARY KEY,
    "sessionId" INTEGER NOT NULL REFERENCES "Session"("id") ON DELETE RESTRICT,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("sessionId", "userId")
);

-- Create indexes
CREATE INDEX "Session_startedById_idx" ON "Session"("startedById");
CREATE INDEX "SessionPlayer_sessionId_idx" ON "SessionPlayer"("sessionId");
CREATE INDEX "SessionPlayer_userId_idx" ON "SessionPlayer"("userId");
CREATE INDEX "SessionQueue_sessionId_idx" ON "SessionQueue"("sessionId");
CREATE INDEX "SessionQueue_userId_idx" ON "SessionQueue"("userId");
