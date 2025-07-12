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
import Batch from './pages/Batch.jsx';
import Pods from './pages/Pods.jsx';
import Assign from './pages/Assign.jsx';
import User from './pages/User.jsx';
import Addusers from './pages/Addusers.jsx';
import Addorgadmin from './pages/Addorgadmin.jsx';
import OrgadminBatch from './pages/OrgadminBatch.jsx';
import OrgadminPods from './pages/Orgadminpods.jsx';
import OrgadminUsers from './pages/OrgadminUsers.jsx';
import Orgadminuserprogress from './pages/Orgadminuserprogress.jsx';
import ConversationHistory from './pages/ConversationHistory.jsx';
import Mentordashboard from './pages/Mentordashboard.jsx';

// ✅ Import the PrivateRoute component
import PrivateRoute from './components/PrivateRoute.jsx';

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
        return "/mentordashboard";
      case "orguser":
        return selectedModel ? "/dashboard" : "/login";
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

        {/* ✅ Protected Routes by Role */}
        <Route path="/dashboard" element={
          <PrivateRoute roles={["orguser"]}><Dashboard /></PrivateRoute>
        } />
        <Route path="/conversationhistory" element={
          <PrivateRoute roles={["orguser"]}><ConversationHistory /></PrivateRoute>
        } />
        <Route path="/variables" element={
          <PrivateRoute roles={["orguser"]}><Variables /></PrivateRoute>
        } />
        <Route path="/prompt" element={
          <PrivateRoute roles={["orguser"]}><Prompt /></PrivateRoute>
        } />

        <Route path="/superadmin" element={
          <PrivateRoute roles={["superadmin"]}><Superadmin /></PrivateRoute>
        } />
        <Route path="/mentor" element={
          <PrivateRoute roles={["superadmin"]}><Mentor /></PrivateRoute>
        } />
        <Route path="/orgadmin" element={
          <PrivateRoute roles={["orgadmin"]}><Orgadmin /></PrivateRoute>
        } />

        <Route path="/organization" element={
          <PrivateRoute roles={["superadmin"]}><OrgList /></PrivateRoute>
        } />
        <Route path="/concepts" element={
          <PrivateRoute roles={["superadmin"]}><Concepts /></PrivateRoute>
        } />
        <Route path="/batch" element={
          <PrivateRoute roles={["superadmin"]}><Batch /></PrivateRoute>
        } />
        <Route path="/pods" element={
          <PrivateRoute roles={["superadmin"]}><Pods /></PrivateRoute>
        } />
        <Route path="/assign" element={
          <PrivateRoute roles={["superadmin"]}><Assign /></PrivateRoute>
        } />
        <Route path="/users" element={
          <PrivateRoute roles={["superadmin"]}><User /></PrivateRoute>
        } />
        <Route path="/addusers" element={
          <PrivateRoute roles={["superadmin"]}><Addusers /></PrivateRoute>
        } />
        <Route path="/addorgadmin" element={
          <PrivateRoute roles={["superadmin"]}><Addorgadmin /></PrivateRoute>
        } />
        <Route path="/orgadminbatch" element={
          <PrivateRoute roles={["orgadmin"]}><OrgadminBatch /></PrivateRoute>
        } />
        <Route path="/orgadminpods/:batchId" element={
          <PrivateRoute roles={["orgadmin"]}><OrgadminPods /></PrivateRoute>
        } />
        <Route path="/orgadminusers/:podId" element={
          <PrivateRoute roles={["orgadmin"]}><OrgadminUsers /></PrivateRoute>
        } />
        <Route path="/orgadminuserprogress/:userId" element={
          <PrivateRoute roles={["orgadmin"]}><Orgadminuserprogress /></PrivateRoute>
        } />
        <Route path="/mentordashboard" element={
          <PrivateRoute roles={["mentor"]}><Mentordashboard /></PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
