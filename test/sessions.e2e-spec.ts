import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestDatabase } from './utils/test-database';
import { JwtService } from '@nestjs/jwt';

describe('SessionsController (e2e)', () => {
  let app: INestApplication;
  let testDb: TestDatabase;
  let jwtService: JwtService;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.connect();
    await testDb.cleanDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await testDb.cleanDatabase();
    await testDb.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await testDb.cleanDatabase();
    
    // Create a test user and generate token
    const user = await testDb.createTestUser('testuser', 'Test User');
    userId = user.id;
    authToken = await jwtService.signAsync({ sub: user.id, username: user.username });
  });

  describe('/sessions/current (GET)', () => {
    it('should return current session (null if none exists)', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.session).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/sessions/current')
        .expect(401);
    });
  });

  describe('/sessions/joinable (GET)', () => {
    it('should return session joinability status', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions/joinable')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('joinable');
      expect(response.body.data).toHaveProperty('reason');
      expect(response.body.data.joinable).toBe(false);
      expect(response.body.data.reason).toBe('No active session available');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/sessions/joinable')
        .expect(401);
    });
  });

  describe('/sessions/start (POST)', () => {
    it('should start a session successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('status', 'ACTIVE');
      expect(response.body.data).toHaveProperty('startedAt');
      expect(response.body.data).toHaveProperty('endsAt');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/sessions/start')
        .expect(401);
    });

    it('should return error if session already active', async () => {
      // Start first session
      await request(app.getHttpServer())
        .post('/sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Try to start another session
      const response = await request(app.getHttpServer())
        .post('/sessions/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('already active');
    });
  });

  describe('/sessions/join (POST)', () => {
    beforeEach(async () => {
      // Start a session first
      await request(app.getHttpServer())
        .post('/sessions/start')
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should join session successfully', async () => {
      const joinData = {
        pick: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/sessions/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send(joinData)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.message).toContain('joined');
    });

    it('should return error for invalid pick number', async () => {
      const joinData = {
        pick: 15, // Invalid pick (should be 1-10)
      };

      const response = await request(app.getHttpServer())
        .post('/sessions/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send(joinData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return error if no active session', async () => {
      // Clean database to remove active session
      await testDb.cleanDatabase();
      
      const joinData = {
        pick: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/sessions/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send(joinData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 401 without authentication', async () => {
      const joinData = {
        pick: 5,
      };

      await request(app.getHttpServer())
        .post('/sessions/join')
        .send(joinData)
        .expect(401);
    });
  });

  describe('/sessions/leave (POST)', () => {
    beforeEach(async () => {
      // Start a session and join it
      await request(app.getHttpServer())
        .post('/sessions/start')
        .set('Authorization', `Bearer ${authToken}`);

      await request(app.getHttpServer())
        .post('/sessions/join')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pick: 5 });
    });

    it('should leave session successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions/leave')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.message).toContain('left');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/sessions/leave')
        .expect(401);
    });
  });
});
