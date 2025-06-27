import React from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/orgadmin.css';

function Orgadmin() {
    const username = sessionStorage.getItem("username");
  return (
    <div className="orgadmin-container">
      <Sidebar />
      <div className="orgadmin-content">
        <div className="orgadmin-header" style={{ textAlign: 'center' }}>
          <h1>Welcome, Org Admin 👋</h1>
          <p>Manage users, monitor activities, and oversee your organization efficiently. This dashboard is your central control point.</p>
        </div>

        {/* Core Management Sections */}
        <div className="orgadmin-grid">
          <div className="orgadmin-card user-card">
            <div className="icon" >👥</div>
            <h3>Manage Users</h3>
            <p>View, create, edit, and deactivate user accounts within your organization. Assign roles and permissions.</p>
            <button className="btn-view">View Users</button>
          </div>

          <div className="orgadmin-card org-card">
            <div className="icon">🏢</div>
            <h3>Organization Profile</h3>
            <p>Update your organization’s fundamental details, contact information, and branding assets.</p>
            <button className="btn-view">Edit Profile</button>
          </div>

          <div className="orgadmin-card report-card">
            <div className="icon">📊</div>
            <h3>Reports & Analytics</h3>
            <p>Generate detailed reports on user activity, resource usage, and overall organizational performance.</p>
            <button className="btn-view">View Reports</button>
          </div>
        </div>

    

        {/* New Section: Advanced Organization Settings */}
        <div className="orgadmin-section-header">
          <h2><span className="icon-small">⚙️</span> Organization Settings</h2>
          <p>Configure advanced settings specific to your organization's operations.</p>
        </div>
        <div className="orgadmin-grid">
          <div className="orgadmin-card settings-card card-small">
            <div className="icon">🔑</div>
            <h3>API & Integrations</h3>
            <p>Manage API keys, webhooks, and integrate with third-party applications securely.</p>
            <button className="btn-view">Manage Integrations</button>
          </div>

          <div className="orgadmin-card billing-card card-small">
            <div className="icon">💳</div>
            <h3>Billing & Subscriptions</h3>
            <p>Review your subscription plan, view invoices, and manage payment methods.</p>
            <button className="btn-view">Manage Billing</button>
          </div>

          <div className="orgadmin-card notifications-card card-small">
            <div className="icon">🔔</div>
            <h3>Notification Preferences</h3>
            <p>Customize email and in-app notification settings for your organization's alerts.</p>
            <button className="btn-view">Edit Preferences</button>
          </div>

          <div className="orgadmin-card custom-fields-card card-small">
            <div className="icon">📝</div>
            <h3>Custom Fields</h3>
            <p>Define and manage custom fields for users or other data within your organization.</p>
            <button className="btn-view">Configure Fields</button>
          </div>
        </div>

        

        {/* New Section: Activity & Compliance */}
        <div className="orgadmin-section-header">
          <h2><span className="icon-small">📜</span> Activity & Compliance</h2>
          <p>Monitor all activities and ensure compliance within your organization.</p>
        </div>
        <div className="orgadmin-grid">
          <div className="orgadmin-card audit-card card-small">
            <div className="icon">📋</div>
            <h3>Audit Logs</h3>
            <p>Access detailed logs of all administrative and user actions for compliance and troubleshooting.</p>
            <button className="btn-view">View Logs</button>
          </div>

          <div className="orgadmin-card security-policy-card card-small">
            <div className="icon">🛡️</div>
            <h3>Security Policy</h3>
            <p>Review and set security policies like password complexity and multi-factor authentication for your organization.</p>
            <button className="btn-view">Manage Policy</button>
          </div>

          <div className="orgadmin-card announcements-card card-small">
            <div className="icon">📢</div>
            <h3>Announcements</h3>
            <p>Create and manage announcements or messages visible to all users in your organization.</p>
            <button className="btn-view">Post Announcements</button>
          </div>
        </div>

        

        {/* Quick Actions (Optional) */}
        <div className="orgadmin-section-header">
          <h2><span className="icon-small">⚡</span> Quick Actions</h2>
          <p>Common tasks you might want to perform immediately.</p>
        </div>
        <div className="orgadmin-quick-links">
          <button className="btn-quick-link">Add New User</button>
          <button className="btn-quick-link">Download Activity Report</button>
          <button className="btn-quick-link">Update Org Contact Info</button>
        </div>

      </div>
    </div>
  );
}

export default Orgadmin;