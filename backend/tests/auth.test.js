const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db/pool');

// Clean up test users after all tests
afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE 'test_%@test.com'");
  await pool.end();
});

describe('POST /auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'test_user1@test.com',
      password: 'password123'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test_user1@test.com');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/auth/register').send({
      email: 'test_dup@test.com', password: 'password123'
    });
    const res = await request(app).post('/auth/register').send({
      email: 'test_dup@test.com', password: 'password123'
    });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('rejects missing password', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'test_x@test.com' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'test_short@test.com', password: '123'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/6 characters/i);
  });
});

describe('POST /auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/auth/register').send({
      email: 'test_login@test.com', password: 'password123'
    });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'test_login@test.com', password: 'password123'
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'test_login@test.com', password: 'wrongpassword'
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects non-existent email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'nobody@test.com', password: 'password123'
    });
    expect(res.statusCode).toBe(401);
  });
});