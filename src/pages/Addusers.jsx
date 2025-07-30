import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft,FaPlus,FaEdit} from 'react-icons/fa';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer,Form } from 'react-bootstrap';
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
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
const [selectedOrganization, setSelectedOrganization] = useState('');
 const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };


  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  const fetchOrgUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/orguser`, config);
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
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`);
      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  const handleCreateUser = async (e) => {
  e.preventDefault();

  const trimmedUser = {
    organization_name: newUser.organization_name.trim(),
    email: newUser.email.trim(),
    first_name: capitalize(newUser.first_name.trim()),
    last_name: capitalize(newUser.last_name.trim()),
    password: newUser.password.trim()
  };

  if (!trimmedUser.organization_name || !trimmedUser.first_name || !trimmedUser.last_name) {
    setToastMessage('Organization, First Name, and Last Name are required.');
    setToastBg('warning');
    setShowToast(true);
    return;
  }

  const payload = {
    organization_name: trimmedUser.organization_name,
    first_name: trimmedUser.first_name,
    last_name: trimmedUser.last_name
  };

  if (trimmedUser.email) payload.email = trimmedUser.email;
  if (trimmedUser.password) payload.password = trimmedUser.password;

  try {
    await axios.post(`${process.env.REACT_APP_API_LINK}/users/orguser`, payload, config);
    setShowModal(false);
    setNewUser({ organization_name: '', email: '', first_name: '', last_name: '', password: '' });
    fetchOrgUsers();

    setToastMessage('User created successfully!');
    setToastBg('primary'); // Changed to primary for consistency
    setShowToast(true);
  } catch (err) {
    let errorMessage = 'Failed to create user.';
    
    if (err.response) {
      switch (err.response.status) {
        case 400:
          errorMessage = err.response.data.message || 'Bad request: Invalid input data.';
          break;
        
        case 409:
          errorMessage = 'User already exists!';
          break;
        case 422:
          errorMessage = 'Validation error: ' + 
            (err.response.data.errors?.map(e => e.msg).join(', ') || 'Invalid data');
          break;
        case 500:
          errorMessage = 'Server error: Please try again later.';
          break;
        default:
          errorMessage = `Error: ${err.response.status} - ${err.response.statusText}`;
      }
    } else if (err.request) {
      errorMessage = 'Network error: Could not connect to server.';
    } else {
      errorMessage = 'Error: ' + err.message;
    }

    setToastMessage(errorMessage);
    setToastBg('warning');
    setShowToast(true);
  }
};

  const handleUpdateUser = async (e) => {
  e.preventDefault();
  
  // Validate required fields
  if (!editingUser.first_name?.trim() || !editingUser.last_name?.trim()) {
    setToastMessage('First Name and Last Name are required.');
    setToastBg('warning');
    setShowToast(true);
    return;
  }

  const updatedUser = {
    username: editingUser.username?.trim() || '',
    email: editingUser.email?.trim() || '',
    first_name: capitalize(editingUser.first_name.trim()),
    last_name: capitalize(editingUser.last_name.trim()),
    password: editingUser.password?.trim() || ''
  };

  try {
    await axios.put(`${process.env.REACT_APP_API_LINK}/users/${editingUser.user_id}`, updatedUser, config);
    setShowEditModal(false);
    setEditingUser(null);
    fetchOrgUsers();

    setToastMessage('User updated successfully!');
    setToastBg('primary'); // Changed to primary for consistency
    setShowToast(true);
  } catch (err) {
    let errorMessage = 'Failed to update user.';
    
    if (err.response) {
      switch (err.response.status) {
        case 400:
          errorMessage = err.response.data.message || 
            (err.response.data.error?.message || 'Bad request: Invalid input data.');
          break;
        case 404:
          errorMessage = 'User not found.';
          break;
        case 409:
          errorMessage = 'Conflict: ' + 
            (err.response.data.message || 'Username or email already exists.');
          break;
        case 422:
          errorMessage = 'Validation error: ' + 
            (err.response.data.errors?.map(e => e.msg).join(', ') || 'Invalid data');
          break;
        case 500:
          errorMessage = 'Server error: Please try again later.';
          break;
        default:
          errorMessage = `Error: ${err.response.status} - ${err.response.statusText}`;
      }
    } else if (err.request) {
      errorMessage = 'Network error: Could not connect to server.';
    } else {
      errorMessage = 'Error: ' + err.message;
    }

    console.error("Update failed", err);
    setToastMessage(errorMessage);
    setToastBg('warning');
    setShowToast(true);
  }
};
  useEffect(() => {
    fetchOrgUsers();
    fetchOrganizations();
  }, []);
  
  const filteredUsers = orgUsers.filter((user) => {
  const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
  const matchesFullName = fullName.includes(searchTerm.toLowerCase());
  const matchesOrganization =
    !selectedOrganization || user.organization_name === selectedOrganization;
  return matchesFullName && matchesOrganization;
});

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">

          <div className="d-flex justify-content-start mb-3">
             <button
              className='back-button bg-primary text-white border-0'
              onClick={() => navigate(-1)}>
                                    <FaArrowLeft />
                                  </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">Organization Users</h3>
            <button className="create-btn" onClick={() => setShowModal(true)} style={{ width: '10%' }}>
                                     <FaPlus />
            </button>
          </div>
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
  <div className="d-flex align-items-center">
    <span className="me-2">Show entries:</span>
    <Form.Select
      style={{ width: '100px' }}
      value={itemsPerPage}
      onChange={(e) => {
        setCurrentPage(1);
        setItemsPerPage(Number(e.target.value));
      }}
    >
      {[5, 10, 15, 20, 50].map((num) => (
        <option key={num} value={num}>
          {num}
        </option>
      ))}
    </Form.Select>
  </div>

        <div className="d-flex gap-3 mb-3">
  {/* Full Name Filter */}
  <input
    type="text"
    className="form-control"
    style={{ maxWidth: '250px' }}
    placeholder="Search by Full Name..."
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1); // reset pagination
    }}
  />

  {/* Organization Filter */}
  <select
    className="form-select"
    style={{ maxWidth: '200px' }}
    value={selectedOrganization}
    onChange={(e) => {
      setSelectedOrganization(e.target.value);
      setCurrentPage(1); // reset pagination
    }}
  >
    <option value="">All Organizations</option>
    {organizations.map((org) => (
      <option key={org.organization_id} value={org.organization_name}>
        {org.organization_name}
      </option>
    ))}
  </select>
</div>
</div>


          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
            <div className="table-responsive">
              <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                  <tr>
                    <th>Organization</th>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Full Name</th>
                  
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <tr key={user.user_id}>
                        <td>{user.organization_name}</td>
                        <td>{user.email}</td>
                        <td>{user.username || '-'}</td>
                        <td>{`${user.first_name} ${user.last_name}`}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => {
                              setEditingUser({ ...user, password: '' });
                              setShowEditModal(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              {totalPages > 1 && (
                              <div className="d-flex justify-content-center mt-4">
                                <Pagination>
                                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                                  <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                            
                                  {(() => {
                                    const pageNumbers = [];
                                    const visiblePages = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
                                    let endPage = startPage + visiblePages - 1;
                            
                                    if (endPage > totalPages) {
                                      endPage = totalPages;
                                      startPage = Math.max(1, endPage - visiblePages + 1);
                                    }
                            
                                    for (let i = startPage; i <= endPage; i++) {
                                      pageNumbers.push(
                                        <Pagination.Item
                                          key={i}
                                          active={i === currentPage}
                                          onClick={() => handlePageChange(i)}
                                        >
                                          {i}
                                        </Pagination.Item>
                                      );
                                    }
                            
                                    return pageNumbers;
                                  })()}
                            
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
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create Organization User</h4>
            <form onSubmit={handleCreateUser}>
              <div className="mb-3">
                <label className="form-label">Organization Name</label>
                <select
                  className="form-select"
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
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
               <input
                type="password"
                className="form-control"
                value={newUser.password}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewUser({ ...newUser, password: value });
                  e.target.setCustomValidity(
                    value && value.length < 8 ? 'Password must be at least 8 characters long.' : ''
                  );
                }}
              />
              </div>
              <button type="submit" className="btn btn-success me-2" >Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Edit Organization User</h4>
            <form onSubmit={handleUpdateUser}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingUser.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingUser.first_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingUser.last_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
               <input
                type="password"
                className="form-control"
                value={editingUser.password || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditingUser({ ...editingUser, password: value });
                  e.target.setCustomValidity(
                    value && value.length < 8 ? 'Password must be at least 8 characters long.' : ''
                  );
                }}
              />
              </div>
              <button type="submit" className="btn btn-success me-2" >
                Update
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          bg={toastBg}
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Notice</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
