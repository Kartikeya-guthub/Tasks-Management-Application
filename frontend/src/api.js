// All requests go through the Vite proxy to http://localhost:5000
// credentials: 'include' ensures cookies are sent with every request

const BASE = '/api';

// Tracks whether a refresh is already in flight to prevent loops.
let refreshing = false;

async function request(method, path, body, isRetry = false) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  // Auto-refresh on 401 — but never retry a refresh call itself.
  if (res.status === 401 && !isRetry && path !== '/auth/refresh' && path !== '/auth/login') {
    if (!refreshing) {
      refreshing = true;
      try {
        const refreshRes = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!refreshRes.ok) throw new Error('refresh failed');
      } catch {
        refreshing = false;
        throw new Error('Session expired. Please log in again.');
      }
      refreshing = false;
    }
    // Retry original request once with fresh cookies.
    return request(method, path, body, true);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error?.message || data?.error || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export const api = {
  // Auth
  register: (body)       => request('POST', '/auth/register', body),
  login:    (body)       => request('POST', '/auth/login', body),
  logout:   ()           => request('POST', '/auth/logout'),
  refresh:  ()           => request('POST', '/auth/refresh'),
  me:       ()           => request('GET',  '/auth/me'),

  // Tasks
  getTasks:   (params)   => request('GET',  `/tasks?${new URLSearchParams(params)}`),
  getTask:    (id)       => request('GET',  `/tasks/${id}`),
  createTask: (body)     => request('POST', '/tasks', body),
  updateTask: (id, body) => request('PUT',  `/tasks/${id}`, body),
  deleteTask: (id)       => request('DELETE', `/tasks/${id}`),
};
