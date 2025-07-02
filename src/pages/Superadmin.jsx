import React from 'react';
import Supersidebar from '../components/Supersidebar';
import '../styles/superadmin.css';
import { useNavigate } from 'react-router-dom';

function Superadmin() {
    const username = sessionStorage.getItem("username");
    const navigate = useNavigate();

    return (
        <div className="superadmin-container">
      <Supersidebar />
      <div className="superadmin-content">
        <div className="superadmin-header">
          <h1>Welcome, Super Admin </h1>
          <p>Manage platform-wide settings, organizations, and admin controls. Your central hub for ultimate control.</p>
        </div>

        {/* Core Management Sections */}
        <div className="superadmin-grid">
          <div className="superadmin-card">
            <div className="icon">🏢</div>
            <h3>Organizations</h3>
            <p>View, create, edit, and manage all registered organizations on the platform. Control their access and features.</p>
            <button className="btn-action" onClick={() => navigate('/organization')}>View All</button>
          </div>
          <div className="superadmin-card">
            <div className="icon">🧑‍💼</div>
            <h3>Mentors</h3>
            <p>Create, manage, and assign roles to mentors. Control their permissions and access rights.</p>
            <button className="btn-action" onClick={() => navigate('/mentor')}>Manage Mentors</button>
          </div>
          <div className="superadmin-card">
            <div className="icon">📈</div>
            <h3>Concepts</h3>
            <p>Get comprehensive insights into platform usage, user activity, and performance metrics.</p>
            <button className="btn-action" onClick={() => navigate('/concepts')}>View Stats</button>
          </div>
        </div>

        {/* New Section: Advanced Configuration */}
        <div className="superadmin-section-header">
          <h2><span className="icon-small">⚙️</span> Advanced Configuration</h2>
          <p>Configure core platform functionalities and security settings.</p>
        </div>
        <div className="superadmin-grid">
          <div className="superadmin-card card-small">
            <div className="icon">👥</div>
            <h3>Batch Management</h3>
            <p>Manage all aspects of batch creation, modification, and deletion.</p>
            <button className="btn-action" onClick={() => navigate('/batch')}>Batch</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">📧</div>
            <h3>Pods</h3>
            <p>Set up and manage platform pods, including configuration and resource allocation.</p>
            <button className="btn-action" onClick={() => navigate('/pods')}>Manage Pods</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">💾</div>
            <h3>User Management</h3>
            <p>Schedule and manage platform data backups. Perform data restoration operations as needed.</p>
            <button className="btn-action" onClick={() => navigate('/users')}>Manage Users</button>
          </div>
          {/* <div className="superadmin-card card-small">
            <div className="icon">🔗</div>
            <h3>API Integrations</h3>
            <p>Manage API keys, webhooks, and third-party service integrations.</p>
            <button className="btn-action">Configure APIs</button>
          </div> */}
        </div>

        {/* New Section: User Management & Auditing */}
        <div className="superadmin-section-header">
          <h2><span className="icon-small">👥</span> User & System Oversight</h2>
          <p>Monitor all user activities and system operations.</p>
        </div>
        <div className="superadmin-grid">
          <div className="superadmin-card card-small">
            <div className="icon">🔎</div>
            <h3>All Users</h3>
            <p>Browse and manage all individual user accounts across all organizations.</p>
            <button className="btn-action" onClick={() => navigate('/users')}>View Users</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">📜</div>
            <h3>Activity Logs</h3>
            <p>Review detailed logs of all system and user activities for auditing and troubleshooting.</p>
            <button className="btn-action">View Logs</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">⚠️</div>
            <h3>Alerts & Warnings</h3>
            <p>Manage system-generated alerts and warnings, configure notification thresholds.</p>
            <button className="btn-action">Manage Alerts</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">📊</div>
            <h3>Reporting Tools</h3>
            <p>Generate custom reports on various platform data for in-depth analysis.</p>
            <button className="btn-action">Generate Reports</button>
          </div>
        </div>

        {/* Quick Links / Common Tasks (Optional) */}
        <div className="superadmin-section-header">
          <h2><span className="icon-small">⚡</span> Quick Actions</h2>
          <p>Frequently performed super admin tasks.</p>
        </div>
        <div className="superadmin-quick-links">
          <button className="btn-quick-link">Add New Organization</button>
          <button className="btn-quick-link">Register New Admin</button>
          <button className="btn-quick-link">System Health Check</button>
          <button className="btn-quick-link">Clear Cache</button>
        </div>

      </div>
    </div>
  );
}

export default Superadmin;