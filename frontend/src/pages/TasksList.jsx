import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useDebounce } from '../hooks/useDebounce.js';

const BADGE = { todo: 'badge-todo', in_progress: 'badge-in_progress', done: 'badge-done' };

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TasksList() {
  const navigate = useNavigate();
  const [tasks, setTasks]     = useState([]);
  const [meta, setMeta]       = useState({});
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, status]);

  useEffect(() => {
    let cancelled = false;
    async function fetchTasks() {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 20 };
        if (debouncedSearch) params.search = debouncedSearch;
        if (status)          params.status = status;
        const data = await api.getTasks(params);
        if (!cancelled) { setTasks(data.tasks); setMeta(data.meta); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTasks();
    return () => { cancelled = true; };
  }, [page, debouncedSearch, status]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setMeta((prev) => ({ ...prev, total: (prev.total || 1) - 1 }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="navbar">
        <h2>My Tasks</h2>
        <span>
          <Link to="/tasks/new">+ New Task</Link>
          <Link to="/profile">Profile</Link>
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search & filter — auto-debounced, no submit needed */}
      <div className="search-bar">
        <input
          placeholder="Search title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>

      {loading ? (
        <p><span className="spinner" />Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p>No tasks found.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t.id} className="task-item">
              <div>
                <span className="task-title">{t.title}</span>
                {' '}
                <span className={`badge ${BADGE[t.status] || ''}`}>{t.status}</span>
                {t.description && <p className="task-desc">{t.description}</p>}
                <p className="task-meta">Created: {fmt(t.created_at)}</p>
                {t.status === 'done' && (
                  <p className="task-meta task-meta-done">Completed: {fmt(t.updated_at)}</p>
                )}
              </div>
              <div className="task-actions">
                <button className="btn btn-ghost" onClick={() => navigate(`/tasks/${t.id}/edit`)}>Edit</button>
                <button className="btn btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {meta.page} / {meta.totalPages} &nbsp;({meta.total} tasks)</span>
          <button className="btn btn-ghost" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
