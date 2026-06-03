const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db/pool');

let token;
let wordId;

beforeAll(async () => {
  // Register and login a test user
  const res = await request(app).post('/auth/register').send({
    email: 'test_words@test.com',
    password: 'password123'
  });
  token = res.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = 'test_words@test.com'");
  await pool.end();
});

describe('POST /words', () => {
  it('adds a new word', async () => {
    const res = await request(app)
      .post('/words')
      .set('Authorization', `Bearer ${token}`)
      .send({ german: 'der Hund', english: 'the dog', category_id: 1 });

    expect(res.statusCode).toBe(201);
    expect(res.body.german).toBe('der Hund');
    wordId = res.body.id;
  });

  it('rejects word without german field', async () => {
    const res = await request(app)
      .post('/words')
      .set('Authorization', `Bearer ${token}`)
      .send({ english: 'the cat' });
    expect(res.statusCode).toBe(400);
  });

  it('rejects request without token', async () => {
    const res = await request(app).post('/words').send({ german: 'die Katze', english: 'the cat' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /words', () => {
  it('returns list of words for authenticated user', async () => {
    const res = await request(app)
      .get('/words')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('PUT /words/:id', () => {
  it('updates a word', async () => {
    const res = await request(app)
      .put(`/words/${wordId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ german: 'der Hund', english: 'the dog (updated)', category_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.english).toBe('the dog (updated)');
  });
});

describe('DELETE /words/:id', () => {
  it('deletes a word', async () => {
    const res = await request(app)
      .delete(`/words/${wordId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});