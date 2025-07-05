import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';

export default function Addusers() {
  const [orgUsers, setOrgUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
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

  const fetchOrgUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/orguser`);
      if (res.data && Array.isArray(res.data.data)) {
        setOrgUsers(res.data.data);
      } else {
        setError("Unexpected data format received from server.");
        setOrgUsers([]);
      }
    } catch (err) {
      console.error("Error fetching org users:", err);
      setError("Failed to load organization users.");
      setOrgUsers([]);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { organization_name, email, first_name, last_name, password } = newUser;

    if (!organization_name || !email || !first_name || !last_name || !password) {
      alert("All fields are required.");
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_LINK}/users/orguser`, newUser);
      setShowModal(false);
      setNewUser({ organization_name: '', email: '', first_name: '', last_name: '', password: '' });
      fetchOrgUsers();
    } catch (err) {
      console.error("Error creating org user:", err);
      alert("Failed to create user.");
    }
  };

  useEffect(() => {
    fetchOrgUsers();
    fetchOrganizations();
  }, []);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = orgUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orgUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Organization Users</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add Org User
            </button>
          </div>

          {loading ? (
            <p>Loading users...</p>
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
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <tr key={user.user_id}>
                        <td>{user.user_id}</td>
                        <td>{user.organization_name}</td>
                        <td>{user.email}</td>
                        <td>{user.first_name}</td>
                        <td>{user.last_name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No users found.</td>
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
            <h4>Create Organization User</h4>
            <form onSubmit={handleCreateUser}>
              <div className="mb-3">
                <label htmlFor="org" className="form-label">Organization Name</label>
                <select
                  className="form-select"
                  id="org"
                  value={newUser.organization_name}
                  onChange={(e) => setNewUser({ ...newUser, organization_name: e.target.value })}
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
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="first_name" className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="first_name"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="last_name" className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="last_name"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
