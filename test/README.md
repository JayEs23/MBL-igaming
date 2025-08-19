# Backend Tests

This directory contains comprehensive tests for the MBL iGaming backend application.

## Test Structure

### Unit Tests

- **`src/modules/auth/auth.service.spec.ts`** - Tests for authentication service
- **`src/modules/sessions/sessions.service.spec.ts`** - Tests for session management service
- **`src/common/jwt.guard.spec.ts`** - Tests for JWT authentication guard

### Integration Tests (E2E)

- **`test/auth.e2e-spec.ts`** - End-to-end tests for authentication endpoints
- **`test/sessions.e2e-spec.ts`** - End-to-end tests for session endpoints

### Test Utilities

- **`test/utils/test-database.ts`** - Database utilities for test setup and cleanup
- **`test/jest.setup.ts`** - Jest configuration and environment setup
- **`test/jest-e2e.json`** - Jest configuration for E2E tests

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Run E2E Tests Only

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npm test -- auth.service.spec.ts
```

## Test Configuration

### Environment Variables

Tests use a separate test database. Set up your `.env.test` file:

```env
DATABASE_URL="postgresql://test:test@localhost:5432/mbl_gaming_test"
JWT_SECRET="test-secret-key"
SESSION_DURATION_SECONDS="60"
SESSION_MAX_PLAYERS="10"
```

### Database Setup

Before running tests, ensure you have a test database:

```bash
# Create test database
createdb mbl_gaming_test

# Run migrations on test database
DATABASE_URL="postgresql://test:test@localhost:5432/mbl_gaming_test" npx prisma migrate deploy
```

## Test Coverage

The tests cover:

### Authentication

- ✅ User registration
- ✅ User login
- ✅ JWT token generation
- ✅ Input validation
- ✅ Error handling
- ✅ Username normalization

### Session Management

- ✅ Session creation
- ✅ Session joining
- ✅ Session leaving
- ✅ Queue management
- ✅ Session status validation
- ✅ User activity tracking

### JWT Authentication

- ✅ Token validation
- ✅ Token extraction
- ✅ Error handling
- ✅ User context injection

### API Endpoints

- ✅ Authentication endpoints
- ✅ Session endpoints
- ✅ Authorization guards
- ✅ Response formatting

## Writing New Tests

### Unit Tests

Create test files with `.spec.ts` extension in the same directory as the source file:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### E2E Tests

Create test files with `.e2e-spec.ts` extension in the `test/` directory:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('YourController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/your-endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/your-endpoint')
      .expect(200);
  });
});
```

## Best Practices

1. **Use descriptive test names** that explain what is being tested
2. **Test both success and failure cases**
3. **Mock external dependencies** in unit tests
4. **Use real database** in E2E tests
5. **Clean up test data** after each test
6. **Group related tests** using `describe` blocks
7. **Use meaningful assertions** that test the actual behavior
8. **Keep tests independent** - each test should be able to run in isolation

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure test database exists and is accessible
2. **JWT errors**: Check that JWT_SECRET is set in test environment
3. **Module import errors**: Verify all dependencies are properly mocked
4. **Timeout errors**: Increase Jest timeout for slow tests

### Debug Mode

Run tests in debug mode to step through code:

```bash
npm run test:debug
```
