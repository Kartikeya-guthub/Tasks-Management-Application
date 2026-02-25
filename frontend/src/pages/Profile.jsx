import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 400, margin: '4rem auto', padding: '0 1rem' }}>
      <h2>Profile</h2>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>ID:</strong> {user?.id}</p>
      <br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
