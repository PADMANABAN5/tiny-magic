import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgIsActive, setNewOrgIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/organizations");

      console.log("API Response (full object):", res);
      console.log("API Response (data property):", res.data);

      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      } else {
        console.error("Unexpected API response structure. Expected an object with a 'data' array.", res.data);
        setOrganizations([]);
        setError("Received unexpected data format from the server. Expected organizations under 'data' property.");
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error("Server Response Error:", err.response.data);
          console.error("Server Status:", err.response.status);
          setError(`Server error (${err.response.status}): ${err.response.data.message || 'Unknown server error'}`);
        } else if (err.request) {
          console.error("No response received:", err.request);
          setError("No response from server. Please ensure the backend is running and accessible at http://localhost:5000.");
        } else {
          console.error("Axios request setup error:", err.message);
          setError(`Request error: ${err.message}. Check network connection or API URL.`);
        }
      } else {
        console.error("An unexpected error occurred:", err);
        setError("An unexpected error occurred while fetching data.");
      }
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  // --- MODIFIED toggleIsActive function ---
  const toggleIsActive = async (org) => {
    const originalIsActive = org.is_active;
    const newIsActiveState = !originalIsActive; // This will be the state AFTER the toggle

    // Optimistically update the UI
    setOrganizations(prevOrgs =>
      prevOrgs.map(o =>
        o.organization_id === org.organization_id ? { ...o, is_active: newIsActiveState } : o
      )
    );

    try {
      let endpoint = '';
      if (newIsActiveState) {
        // If the new state is 'active', call the /active endpoint
        endpoint = `http://localhost:5000/api/organizations/${org.organization_id}/active`;
      } else {
        // If the new state is 'inactive', call the /inactive endpoint
        endpoint = `http://localhost:5000/api/organizations/${org.organization_id}/inactive`;
      }

      // Use a GET request to these specific action endpoints
      await axios.get(endpoint);

    } catch (err) {
      console.error("Error toggling organization status:", err);
      // Revert UI on error
      setOrganizations(prevOrgs =>
        prevOrgs.map(o =>
          o.organization_id === org.organization_id ? { ...o, is_active: originalIsActive } : o
        )
      );
      alert("Failed to update organization status. Please try again.");
    }
  };
  // --- END OF MODIFIED toggleIsActive function ---

  const handleCreateOrganization = async (e) => {
    e.preventDefault();

    if (!newOrgName.trim()) {
      alert("Organization name cannot be empty.");
      return;
    }

    try {
      const newOrganizationData = {
        organization_name: newOrgName,
        is_active: newOrgIsActive,
      };
      await axios.post("http://localhost:5000/api/organizations", newOrganizationData);

      setShowModal(false);
      setNewOrgName('');
      setNewOrgIsActive(true);
      fetchOrganizations(); // Re-fetch to show the new organization
    } catch (err) {
      console.error("Error creating organization:", err);
      alert("Failed to create organization. Please try again.");
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Organizations</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add Organization
            </button>
          </div>

          {loading ? (
            <p>Loading organizations...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>Organization ID</th>
                  <th>Organization Name</th>
                  <th>Action (Is Active)</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(organizations) && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <tr key={org.organization_id}>
                      <td>{org.organization_id}</td>
                      <td>{org.organization_name}</td>
                      <td>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`toggle-${org.organization_id}`}
                            checked={org.is_active}
                            onChange={() => toggleIsActive(org)}
                            role="switch"
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`toggle-${org.organization_id}`}
                          >
                            {org.is_active ? 'Active' : 'Inactive'}
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">No organizations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Organization</h4>
            <form onSubmit={handleCreateOrganization}>
              <div className="mb-3">
                <label htmlFor="orgName" className="form-label">Organization Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="orgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="isActive"
                  checked={newOrgIsActive}
                  onChange={(e) => setNewOrgIsActive(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="isActive">Is Active</label>
              </div>
              <button type="submit" className="btn btn-success me-2" style={{ width: '200px' }}>Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}