import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function validate(email, password) {
  const errors = {};
  if (!email)                            errors.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email    = 'Enter a valid email';
  if (!password)                         errors.password = 'Password is required';
  else if (password.length < 8)          errors.password = 'Minimum 8 characters';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(email, password);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setLoading(true);
    try {
      await register(email, password);
      navigate('/login');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-narrow">
      <div className="card">
        <h2>Register</h2>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" value={email}
              className={errors.email ? 'is-invalid' : ''}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" value={password}
              className={errors.password ? 'is-invalid' : ''}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Registering…' : 'Register'}
          </button>
        </form>
        <p className="auth-footer">Have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
