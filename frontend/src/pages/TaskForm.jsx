import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

function validate(title) {
  const errors = {};
  if (!title || !title.trim())       errors.title = 'Title is required';
  else if (title.trim().length < 3)  errors.title = 'Title must be at least 3 characters';
  return errors;
}

export default function TaskForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]           = useState('todo');
  const [errors, setErrors]           = useState({});
  const [apiError, setApiError]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    api.getTask(id)
      .then((data) => {
        setTitle(data.task.title);
        setDescription(data.task.description || '');
        setStatus(data.task.status);
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setFetching(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(title);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setLoading(true);
    try {
      if (isEdit) {
        await api.updateTask(id, { title, description, status });
      } else {
        await api.createTask({ title, description, status });
      }
      navigate('/tasks');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <p className="page"><span className="spinner" />Loading task…</p>;

  return (
    <div className="page-narrow">
      <div className="card">
        <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title" value={title}
              className={errors.title ? 'is-invalid' : ''}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" rows={4} value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/tasks')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
