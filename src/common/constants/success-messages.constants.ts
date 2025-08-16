export const SUCCESS_MESSAGES = {
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'User logged in successfully',
    LOGOUT_SUCCESS: 'User logged out successfully',
  },
  SESSION: {
    SESSION_STARTED: 'Session started successfully',
    JOINED_SESSION: 'Joined session successfully',
    JOINED_QUEUE: 'Joined queue successfully',
    LEFT_SESSION: 'Left session successfully',
    SESSION_ENDED: 'Session ended successfully',
    CURRENT_SESSION_RETRIEVED: 'Current session retrieved successfully',
    SESSIONS_RETRIEVED: 'Sessions retrieved successfully',
    SESSION_RESULTS_RETRIEVED: 'Session results retrieved successfully',
  },
  USER: {
    USER_CREATED: 'User created successfully',
    USER_RETRIEVED: 'User retrieved successfully',
  },
  LEADERBOARD: {
    LEADERBOARD_RETRIEVED: 'Leaderboard retrieved successfully',
  },
  GENERAL: {
    OPERATION_SUCCESS: 'Operation completed successfully',
    DATA_RETRIEVED: 'Data retrieved successfully',
  },
} as const; 