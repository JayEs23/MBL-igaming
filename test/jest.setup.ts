// Jest setup file
import { config } from 'dotenv';

// Load environment variables for tests
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/mbl_gaming_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_DURATION_SECONDS = '60';
process.env.SESSION_MAX_PLAYERS = '10';

// Global test timeout
jest.setTimeout(30000);
