import React from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/superadmin.css';

function Superadmin() {
    const username = sessionStorage.getItem("username");
  return (
    <div className="superadmin-container">
      <Sidebar />
      <div className="superadmin-content">
        <div className="superadmin-header">
          <h1>Welcome, Super Admin 👑</h1>
          <p>Manage platform-wide settings, organizations, and admin controls. Your central hub for ultimate control.</p>
        </div>

        {/* Core Management Sections */}
        <div className="superadmin-grid">
          <div className="superadmin-card">
            <div className="icon">🏢</div>
            <h3>Organizations</h3>
            <p>View, create, edit, and manage all registered organizations on the platform. Control their access and features.</p>
            <button className="btn-action">View All</button>
          </div>
          <div className="superadmin-card">
            <div className="icon">🧑‍💼</div>
            <h3>Platform Admins</h3>
            <p>Create, manage, and assign roles to platform-level administrators. Control their permissions and access rights.</p>
            <button className="btn-action">Manage Admins</button>
          </div>
          <div className="superadmin-card">
            <div className="icon">📈</div>
            <h3>Platform Stats</h3>
            <p>Get comprehensive insights into platform usage, user activity, and performance metrics.</p>
            <button className="btn-action">View Stats</button>
          </div>
        </div>

        {/* New Section: Advanced Configuration */}
        <div className="superadmin-section-header">
          <h2><span className="icon-small">⚙️</span> Advanced Configuration</h2>
          <p>Configure core platform functionalities and security settings.</p>
        </div>
        <div className="superadmin-grid">
          <div className="superadmin-card card-small">
            <div className="icon">🔒</div>
            <h3>Security Settings</h3>
            <p>Manage platform-wide security policies, authentication methods, and data encryption settings.</p>
            <button className="btn-action">Configure</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">📧</div>
            <h3>Email & Notifications</h3>
            <p>Set up and manage platform email templates, notification preferences, and communication channels.</p>
            <button className="btn-action">Setup</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">💾</div>
            <h3>Backup & Restore</h3>
            <p>Schedule and manage platform data backups. Perform data restoration operations as needed.</p>
            <button className="btn-action">Manage</button>
          </div>
          <div className="superadmin-card card-small">
            <div className="icon">🔗</div>
            <h3>API Integrations</h3>
            <p>Manage API keys, webhooks, and third-party service integrations.</p>
            <button className="btn-action">Configure APIs</button>
          </div>
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
            <button className="btn-action">View Users</button>
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