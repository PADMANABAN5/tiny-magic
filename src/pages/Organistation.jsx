import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgIsActive, setNewOrgIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/organizations");

      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      } else {
        console.error("Unexpected API response structure.", res.data);
        setOrganizations([]);
        setError("Unexpected data format from server.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          setError(`Server error (${err.response.status}): ${err.response.data.message || 'Unknown server error'}`);
        } else if (err.request) {
          setError("No response from server.");
        } else {
          setError(`Request error: ${err.message}`);
        }
      } else {
        setError("Unexpected error occurred.");
      }
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleIsActive = async (org) => {
    const originalIsActive = org.is_active;
    const newIsActiveState = !originalIsActive;

    setOrganizations(prevOrgs =>
      prevOrgs.map(o =>
        o.organization_id === org.organization_id ? { ...o, is_active: newIsActiveState } : o
      )
    );

    try {
      const endpoint = newIsActiveState
        ? `http://localhost:5000/api/organizations/${org.organization_id}/active`
        : `http://localhost:5000/api/organizations/${org.organization_id}/inactive`;

      await axios.get(endpoint);
    } catch (err) {
      console.error("Error toggling status:", err);
      setOrganizations(prevOrgs =>
        prevOrgs.map(o =>
          o.organization_id === org.organization_id ? { ...o, is_active: originalIsActive } : o
        )
      );
      alert("Failed to update status.");
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      alert("Organization name cannot be empty.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/organizations", {
        organization_name: newOrgName,
        is_active: newOrgIsActive,
      });

      setShowModal(false);
      setNewOrgName('');
      setNewOrgIsActive(true);
      fetchOrganizations();
    } catch (err) {
      console.error("Error creating organization:", err);
      alert("Failed to create organization.");
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrganizations = organizations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(organizations.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

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
            <>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Organization ID</th>
                    <th>Organization Name</th>
                    <th>Action (Is Active)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrganizations.length > 0 ? (
                    currentOrganizations.map((org) => (
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
                            />
                            <label className="form-check-label" htmlFor={`toggle-${org.organization_id}`}>
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

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                    {[...Array(totalPages).keys()].map((num) => (
                      <Pagination.Item
                        key={num + 1}
                        active={num + 1 === currentPage}
                        onClick={() => handlePageChange(num + 1)}
                      >
                        {num + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                    <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                  </Pagination>
                </div>
              )}
            </>
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
