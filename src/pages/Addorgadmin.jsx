import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/OrgList.css';

export default function Addorgadmin() {
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    organization_name: '',
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const fetchOrgAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/orgadmin`);
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
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations`);
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
      await axios.post(`${process.env.REACT_APP_API_LINK}/users/orgadmin`, newAdmin);
      setShowModal(false);
      setNewAdmin({ organization_name: '', email: '', first_name: '', last_name: '', password: '' });
      fetchOrgAdmins();
    } catch (err) {
      console.error("Error creating org admin:", err);
      alert("Failed to create admin.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const { user_id, username, email, first_name, last_name, password } = editingAdmin;
    try {
      await axios.put(`${process.env.REACT_APP_API_LINK}/users/${user_id}`, {
        username,
        email,
        first_name,
        last_name,
        password
      });
      setShowEditModal(false);
      setEditingAdmin(null);
      fetchOrgAdmins();
    } catch (error) {
      console.error("Error updating admin:", error);
      alert("Failed to update admin.");
    }
  };

  useEffect(() => {
    fetchOrgAdmins();
    fetchOrganizations();
  }, []);

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
            <h3 className="mb-0">Organization Admins</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add Org Admin
            </button>
          </div>
          <div className="d-flex justify-content-start mb-3">
            <button className="btn btn-outline-secondary text-white" onClick={() => navigate(-1)} style={{ width: '10%' }}>
              <FaArrowLeft />
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
                    <th>Organization</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAdmins.length > 0 ? (
                    currentAdmins.map((admin) => (
                      <tr key={admin.user_id}>
                        <td>{admin.organization_name}</td>
                        <td>{admin.email}</td>
                        <td>{admin.username || '-'}</td>
                        <td>{admin.first_name}</td>
                        <td>{admin.last_name}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => {
                              setEditingAdmin({ ...admin, password: '' });
                              setShowEditModal(true);
                            }}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">No admins found.</td>
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

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create Organization Admin</h4>
            <form onSubmit={handleCreateAdmin}>
              <div className="mb-3">
                <label className="form-label">Organization Name</label>
                <select
                  className="form-select"
                  value={newAdmin.organization_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, organization_name: e.target.value })}
                  required
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_name}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newAdmin.first_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newAdmin.last_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
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

      {/* Edit Modal */}
      {showEditModal && editingAdmin && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Admin</h4>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAdmin.username || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, username: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editingAdmin.email || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAdmin.first_name || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAdmin.last_name || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={editingAdmin.password || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-success me-2" style={{ width: '200px' }}>Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} style={{ width: '200px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
