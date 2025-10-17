import React , {useState, useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { toast } from 'react-toastify';
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
import Mentorconcepts from './pages/Mentorconcepts.jsx';
import Mentorpods from './pages/Mentorpods.jsx';
import Mentorpodusers from './pages/Mentorpodusers.jsx';
import MentorPodusersprogress from './pages/MentorPodusersprogress.jsx';
import Archived from './pages/Archived.jsx';
import ArchivedConcepts from './pages/Archivedconcepts.jsx';
import Practicemode from './pages/Practicemode.jsx'; // Import Practicemode
import PracticeHistory from './pages/PracticeHistory.jsx'; // Import PracticeHistory
import { ToastContainer } from "react-toastify";
import PageProtection from './components/Pageprotection.jsx';
import { AuthProvider } from "./components/AuthContext.jsx";
import AutoLogout from "./components/Autologout.jsx";
// ✅ Import the PrivateRoute component
import PrivateRoute from './components/PrivateRoute.jsx';
import ForgotPassword from './components/Forgotpassword.jsx';
import Models from './pages/Models_management.jsx'
import Addmodels from './pages/Addmodels.jsx';
import Assignmodels from './pages/Assignmodels.jsx';
import ViewModel from './pages/Viewmodels.js';
import ViewAssignedModels from './pages/ViewAssignedModels.jsx';
import ViewOrgModels from './pages/ViewOrgmodels.jsx';
import AddOrgModels from './pages/AddOrgModel.jsx';
import AssignmentOrg from './pages/AssignmentOrg.jsx';
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
        return "/mentorpods";
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
    <>
     <AutoLogout timeout={10 * 60 * 1000} />
     
      <Routes>
        <Route path="/" element={<Navigate to={getRedirectPath()} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ✅ Protected Routes by Role */}
        <Route path="/dashboard" element={
          <PrivateRoute roles={["orguser"]}><PageProtection /><Dashboard /></PrivateRoute>
        } />
        <Route path="/conversationhistory" element={
          <PrivateRoute roles={["orguser"]}><PageProtection /><ConversationHistory /></PrivateRoute>
        } />
        <Route path="/practicehistory" element={
          <PrivateRoute roles={["orguser"]}><PageProtection /><PracticeHistory /></PrivateRoute>
        } />
        <Route path="/variables" element={
          <PrivateRoute roles={["orguser"]}><PageProtection /><Variables /></PrivateRoute>
        } />
        <Route path="/prompt" element={
          <PrivateRoute roles={["superadmin"]}><Prompt /></PrivateRoute>
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
        <Route path="/models" element={
          <PrivateRoute roles={["superadmin"]}><Models/></PrivateRoute>
        }/>
        <Route path="/addmodels" element={
          <PrivateRoute roles={["superadmin"]}><Addmodels/></PrivateRoute>
        }/>
        <Route path="/assignmodels" element={
          <PrivateRoute roles={["superadmin"]}><Assignmodels/></PrivateRoute>
        }/>
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
        <Route path="/orgadmin/models" element={
          <PrivateRoute roles={["orgadmin"]}><ViewModel /></PrivateRoute>
        } />
        <Route path="/orgadmin/assignments" element={
          <PrivateRoute roles={["orgadmin"]}><ViewAssignedModels /></PrivateRoute>
        } />       
         <Route path="/orgadmin/organization-models" element={
          <PrivateRoute roles={["orgadmin"]}><ViewOrgModels /></PrivateRoute>
        } />
        <Route path="/orgadmin/add-orgmodels" element={
          <PrivateRoute roles={["orgadmin"]}><AddOrgModels /></PrivateRoute>
        } />
        <Route path="/orgadmin/org-assignment" element={
          <PrivateRoute roles={["orgadmin"]}><AssignmentOrg /></PrivateRoute>
        } />          
        <Route path="/mentordashboard" element={
          <PrivateRoute roles={["mentor"]}><Mentordashboard /></PrivateRoute>
        } />
        <Route path="/mentorconcepts" element={
          <PrivateRoute roles={["mentor"]}><Mentorconcepts /></PrivateRoute>
        } />
        <Route path="/mentorpods" element={
          <PrivateRoute roles={["mentor"]}><Mentorpods /></PrivateRoute>
        } />
        <Route path="/mentorpodusers/:podId" element={
          <PrivateRoute roles={["mentor"]}><Mentorpodusers /></PrivateRoute>
        }/>
        <Route path="/mentorpodusersprogress/:userId" element={
          <PrivateRoute roles={["mentor"]}><MentorPodusersprogress /></PrivateRoute>
        }/>
        <Route path="/archived" element={
          <PrivateRoute roles={["superadmin"]}><Archived /></PrivateRoute>
        } />
        <Route path="/archivedconcepts" element={
          <PrivateRoute roles={["superadmin"]}><ArchivedConcepts /></PrivateRoute>
        } />
        <Route path="/practice" element={
          <PrivateRoute roles={["orguser"]}>
            <PageProtection />
            <Practicemode />
          </PrivateRoute>
        } />

        {/* Redirect to login if no route matches */}
      </Routes>
    <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
      />
   
    </>
  );
}

export default App;
