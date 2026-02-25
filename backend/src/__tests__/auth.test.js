'use strict';

const request = require('supertest');
const app     = require('../app');
const pool    = require('../db/pool');

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Extract cookie values from a supertest response so subsequent
 * requests can send them as the Cookie header.
 */
function extractCookies(res) {
  const setCookies = res.headers['set-cookie'] || [];
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

/** Register then login, return the combined cookie string. */
async function registerAndLogin(email, password) {
  await request(app).post('/api/auth/register').send({ email, password });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return extractCookies(res);
}

// ── Setup / teardown ──────────────────────────────────────────────

beforeEach(async () => {
  // Truncate all tables in dependency order; cascade handles the rest.
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

// ── Tests ─────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201 with safe user object', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'supersecret' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.id).toBeDefined();
    // Must NOT leak the password hash
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 400 on duplicate email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'pass1' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'pass2' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@test.com', password: 'mypassword' });
  });

  it('returns 200 and sets HttpOnly cookies on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'mypassword' });

    expect(res.status).toBe(200);

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    // Cookies must be HttpOnly — must NOT be readable by JS.
    expect(cookies.every((c) => c.toLowerCase().includes('httponly'))).toBe(true);
    // Response body must never expose raw tokens.
    expect(JSON.stringify(res.body)).not.toMatch(/^ey/);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('issues new tokens when a valid refresh cookie is present', async () => {
    const cookies = await registerAndLogin('carol@test.com', 'mypassword');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    // New cookies should be set.
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 when no refresh cookie is sent', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears cookies and revokes the refresh token in the DB', async () => {
    const cookies = await registerAndLogin('dave@test.com', 'mypassword');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);

    // A subsequent refresh with the old cookie must now fail.
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const cookies = await registerAndLogin('eve@test.com', 'mypassword');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('eve@test.com');
    // Still no password hash in the response.
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
