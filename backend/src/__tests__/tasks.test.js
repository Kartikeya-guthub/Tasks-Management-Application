'use strict';

const request = require('supertest');
const app     = require('../app');
const pool    = require('../db/pool');

// ── Helpers ───────────────────────────────────────────────────────

function extractCookies(res) {
  return (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
}

async function registerAndLogin(email, password) {
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ email, password });
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { cookies: extractCookies(loginRes), userId: regRes.body.user.id };
}

// ── Module-level state shared across tests in this file ───────────
let cookiesA, cookiesB;

// ── Setup / teardown ──────────────────────────────────────────────

beforeEach(async () => {
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM users');

  // Two independent users for permission tests.
  ({ cookies: cookiesA } = await registerAndLogin('user-a@test.com', 'password123'));
  ({ cookies: cookiesB } = await registerAndLogin('user-b@test.com', 'password123'));
});

afterAll(async () => {
  await pool.end();
});

// ── POST /api/tasks ───────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with the task object', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ title: 'Write tests', description: 'Cover all routes', status: 'todo' });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Write tests');
    expect(res.body.task.status).toBe('todo');
    // Description is stored encrypted but returned decrypted.
    expect(res.body.task.description).toBe('Cover all routes');
    expect(res.body.task.id).toBeDefined();
  });

  it('defaults status to todo when not provided', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ title: 'No status task' });

    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe('todo');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ description: 'No title here' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Unauthenticated task' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/tasks ────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  beforeEach(async () => {
    // Seed three tasks for user A.
    for (const [title, status] of [
      ['Task Alpha', 'todo'],
      ['Task Beta', 'in_progress'],
      ['Task Gamma', 'done'],
    ]) {
      await request(app)
        .post('/api/tasks')
        .set('Cookie', cookiesA)
        .send({ title, status });
    }
    // One unrelated task for user B (should never appear in A's listing).
    await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesB)
      .send({ title: 'User B task', status: 'todo' });
  });

  it("returns only the authenticated user's tasks", async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', cookiesA);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(3);
    expect(res.body.tasks.every((t) => t.title !== 'User B task')).toBe(true);
  });

  it('includes pagination meta', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', cookiesA);

    expect(res.body.meta).toMatchObject({
      total:      3,
      page:       1,
      limit:      20,
      totalPages: 1,
    });
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/tasks?status=todo')
      .set('Cookie', cookiesA);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].status).toBe('todo');
  });

  it('filters by search term (title ILIKE)', async () => {
    const res = await request(app)
      .get('/api/tasks?search=beta')
      .set('Cookie', cookiesA);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe('Task Beta');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/tasks/:id ────────────────────────────────────────────

describe('GET /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ title: 'My task', status: 'todo' });
    taskId = res.body.task.id;
  });

  it('returns a single task owned by the user', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesA);

    expect(res.status).toBe(200);
    expect(res.body.task.id).toBe(taskId);
    expect(res.body.task.title).toBe('My task');
  });

  it('returns 404 for a non-existent task ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/tasks/${fakeId}`)
      .set('Cookie', cookiesA);

    expect(res.status).toBe(404);
  });

  it('returns 404 when another user tries to read the task', async () => {
    // user B cannot see user A's task — returns 404 (not 403 to avoid
    // leaking resource existence to a different user).
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesB);

    expect(res.status).toBe(404);
  });
});

// ── PUT /api/tasks/:id ────────────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ title: 'Original title', status: 'todo' });
    taskId = res.body.task.id;
  });

  it('updates the task and returns 200', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesA)
      .send({ title: 'Updated title', status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Updated title');
    expect(res.body.task.status).toBe('in_progress');
  });

  it('returns 403 when another user tries to update the task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesB)
      .send({ title: 'Hijacked title' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent task', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .put(`/api/tasks/${fakeId}`)
      .set('Cookie', cookiesA)
      .send({ title: 'Ghost update' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/tasks/:id ─────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookiesA)
      .send({ title: 'To be deleted', status: 'todo' });
    taskId = res.body.task.id;
  });

  it('deletes the task and returns 200', async () => {
    const delRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesA);

    expect(delRes.status).toBe(200);

    // Task must no longer exist.
    const getRes = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesA);
    expect(getRes.status).toBe(404);
  });

  it('returns 403 when another user tries to delete the task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Cookie', cookiesB);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent task', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .delete(`/api/tasks/${fakeId}`)
      .set('Cookie', cookiesA);

    expect(res.status).toBe(404);
  });
});
