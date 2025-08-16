export const ERROR_MESSAGES = {
  AUTH: {
    USERNAME_EMPTY: 'Username cannot be empty',
    USERNAME_TAKEN: 'Username already taken',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_HAS_ACTIVE_SESSION: 'User has an active session and cannot log in.',
    MISSING_TOKEN: 'Missing token',
    INVALID_TOKEN: 'Invalid token',
  },
  SESSION: {
    ALREADY_ACTIVE: 'Session already active',
    NO_ACTIVE_SESSION: 'No active session',
    ALREADY_IN_SESSION: 'Already in session',
    ALREADY_IN_QUEUE: 'Already in queue',
  },
  VALIDATION: {
    PICK_RANGE: (min: number, max: number) => `Pick must be between ${min} and ${max}`,
  },
} as const; 