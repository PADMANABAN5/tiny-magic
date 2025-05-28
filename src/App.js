import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx'; 
import Variables from './pages/Variables.jsx';
import Prompt from './pages/prompt.jsx'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/variables" element={<Variables />} />
        <Route path="/prompt" element={<Prompt />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
}

export default App;
