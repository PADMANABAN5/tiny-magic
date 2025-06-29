import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx'; 
import Variables from './pages/Variables.jsx';
import Prompt from './pages/prompt.jsx';
import Superadmin from './pages/Superadmin.jsx'; 
import Mentor from './pages/Mentor.jsx';
import Orgadmin from './pages/Orgadmin.jsx';

function getRedirectPath() {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role_name");
  const selectedModel = sessionStorage.getItem("selectedModel");

  if (token && role) {
    switch (role) {
      case "superadmin":
        return "/superadmin";
      case "orgadmin":
        return "/orgadmin";
      case "mentor":
        return "/mentor";
      case "orguser":
        return selectedModel ? "/dashboard" : "/login"; // trigger model popup if not selected
      default:
        return "/login";
    }
  }

  return "/login";
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={getRedirectPath()} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/variables" element={<Variables />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/superadmin" element={<Superadmin />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/orgadmin" element={<Orgadmin />} />
      </Routes>
    </Router>
  );
}

export default App;
