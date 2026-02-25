import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth.jsx';
import Login      from './pages/Login.jsx';
import Register   from './pages/Register.jsx';
import TasksList  from './pages/TasksList.jsx';
import TaskForm   from './pages/TaskForm.jsx';
import Profile    from './pages/Profile.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/tasks" element={<RequireAuth><TasksList /></RequireAuth>} />
      <Route path="/tasks/new" element={<RequireAuth><TaskForm /></RequireAuth>} />
      <Route path="/tasks/:id/edit" element={<RequireAuth><TaskForm /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
