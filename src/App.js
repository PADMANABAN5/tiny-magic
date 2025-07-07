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
import OrgList from './pages/Organistation.jsx';
import Concepts from './pages/Concepts.jsx';
import Batch from './pages/Batch.jsx'; // Assuming you have a Batch page
import Pods from './pages/Pods.jsx'; // Assuming you have a Pods page
import Assign  from './pages/Assign.jsx';
import User from './pages/User.jsx';
import Addusers from './pages/Addusers.jsx'; // Assuming you have an Addusers page
import Addorgadmin from './pages/Addorgadmin.jsx';
import OrgadminBatch from './pages/OrgadminBatch.jsx';
import OrgadminPods from './pages/Orgadminpods.jsx'; // Assuming you have an OrgadminPods page
import OrgadminUsers from './pages/OrgadminUsers.jsx';
import Orgadminuserprogress from './pages/Orgadminuserprogress.jsx';
import ConversationHistory from './pages/ConversationHistory.jsx';

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
        <Route path="/conversationhistory" element={<ConversationHistory />} />
        <Route path="/variables" element={<Variables />} />
        <Route path="/prompt" element={<Prompt />} />
        <Route path="/superadmin" element={<Superadmin />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/orgadmin" element={<Orgadmin />} />
        <Route path="/organization" element={<OrgList />} />
        <Route path="/concepts" element={<Concepts />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/pods" element={<Pods />} />
        <Route path="/assign" element={<Assign />} />
        <Route path="/users" element={<User />} />
        <Route path="/addusers" element={<Addusers />} />
        <Route path="/addorgadmin" element={<Addorgadmin />} />
        <Route path="/orgadminbatch" element={<OrgadminBatch />} />
        <Route path="/orgadminpods/:batchId" element={<OrgadminPods />} />
        <Route path="/orgadminusers/:podId" element={<OrgadminUsers />} />
        <Route path="/orgadminuserprogress/:userId" element={<Orgadminuserprogress />} />

      </Routes>
    </Router>
  );
}

export default App;
