import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabase } from './utils/test-database';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
    await testDb.cleanDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await testDb.cleanDatabase();
    await testDb.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanDatabase();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.fullName).toBe('Test User');
    });

    it('should return error for duplicate username', async () => {
      const userData = {
        username: 'testuser',
        fullName: 'Test User',
      };

      // Register first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same username
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('Username already taken');
    });

    it('should return error for empty username', async () => {
      const userData = {
        username: '',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should normalize username to lowercase', async () => {
      const userData = {
        username: 'TestUser',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.username).toBe('testuser');
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser',
          fullName: 'Test User',
        });
    });

    it('should login user successfully', async () => {
      const loginData = {
        username: 'testuser',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        username: 'nonexistentuser',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return error for empty username', async () => {
      const loginData = {
        username: '',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });
});
