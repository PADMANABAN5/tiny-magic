import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';

export default function Addorgadmin() {
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    organization_name: '',
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchOrgAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/users/role/orgadmin");
      if (res.data && Array.isArray(res.data.data)) {
        setOrgAdmins(res.data.data);
      } else {
        setError("Unexpected data format received from server.");
        setOrgAdmins([]);
      }
    } catch (err) {
      console.error("Error fetching org admins:", err);
      setError("Failed to load organization admins.");
      setOrgAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/organizations");
      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const { organization_name, email, first_name, last_name, password } = newAdmin;

    if (!organization_name || !email || !first_name || !last_name || !password) {
      alert("All fields are required.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/users/orgadmin", newAdmin);
      setShowModal(false);
      setNewAdmin({ organization_name: '', email: '', first_name: '', last_name: '', password: '' });
      fetchOrgAdmins();
    } catch (err) {
      console.error("Error creating org admin:", err);
      alert("Failed to create admin.");
    }
  };

  useEffect(() => {
    fetchOrgAdmins();
    fetchOrganizations();
  }, []);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAdmins = orgAdmins.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orgAdmins.length / itemsPerPage);

  const handlePageChange = (pageNum) => setCurrentPage(pageNum);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Organization Admins</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add Org Admin
            </button>
          </div>

          {loading ? (
            <p>Loading admins...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Organization</th>
                    <th>Email</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAdmins.length > 0 ? (
                    currentAdmins.map((admin) => (
                      <tr key={admin.user_id}>
                        <td>{admin.user_id}</td>
                        <td>{admin.organization_name}</td>
                        <td>{admin.email}</td>
                        <td>{admin.first_name}</td>
                        <td>{admin.last_name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No admins found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                    {[...Array(totalPages)].map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => handlePageChange(index + 1)}
                      >
                        {index + 1}
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
            <h4>Create Organization Admin</h4>
            <form onSubmit={handleCreateAdmin}>
              <div className="mb-3">
                <label htmlFor="org" className="form-label">Organization Name</label>
                <select
                  className="form-select"
                  id="org"
                  value={newAdmin.organization_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, organization_name: e.target.value })}
                  required
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_name}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="first_name" className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="first_name"
                  value={newAdmin.first_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="last_name" className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="last_name"
                  value={newAdmin.last_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  required
                />
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
