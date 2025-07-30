import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer,Form } from 'react-bootstrap';
import { FaArrowLeft,FaPlus,FaEdit} from 'react-icons/fa';
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
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');
  const [showToast, setShowToast] = useState(false);
  const passwordRef = useRef(null);
  const editPasswordRef = useRef(null);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');

  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };
  // Fetch admins & orgs
  const fetchOrgAdmins = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/orgadmin`, config);

    if (res.status === 200 && Array.isArray(res.data?.data)) {
      setOrgAdmins(res.data.data);
    } else {
      setOrgAdmins([]);
      setToastMessage("⚠️ Unexpected data format received from server.");
      setToastBg("warning");
      setShowToast(true);
    }

  } catch (err) {
    console.error("Error fetching organization admins:", err);

    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "Failed to load organization admins.";

      switch (status) {
        case 400:
          setToastMessage(`⚠️ ${message}`);
          setToastBg("warning");
          break;
        case 401:
          setToastMessage("⚠️ Unauthorized. Please log in.");
          setToastBg("danger");
          break;
        case 403:
          setToastMessage("⚠️ Forbidden: Access denied.");
          setToastBg("danger");
          break;
        case 404:
          setToastMessage("⚠️ Organization admins not found.");
          setToastBg("warning");
          break;
        case 409:
          setToastMessage("⚠️ Conflict: Duplicate admin data.");
          setToastBg("warning");
          break;
        case 500:
          setToastMessage("⚠️ Server error. Please try again later.");
          setToastBg("danger");
          break;
        default:
          setToastMessage("⚠️ Unexpected error occurred.");
          setToastBg("warning");
      }

      setShowToast(true);
    } else {
      setToastMessage("⚠️ Network error. Please check your connection.");
      setToastBg("danger");
      setShowToast(true);
    }

    setOrgAdmins([]);
  } finally {
    setLoading(false);
  }
};


  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`, config);
      setOrganizations(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      // ignore
    }
  };

  // Password validation handler
  const validatePassword = (e, ref) => {
  const pwd = e.target.value;
  ref.current.setCustomValidity(pwd.length < 8 ? "Password must be at least 8 characters" : '');
};
  // Create admin
const handleCreateAdmin = async (e) => {
  e.preventDefault();
  if (newAdmin.password.length < 8) {
    passwordRef.current.setCustomValidity("Password must be at least 8 characters");
    passwordRef.current.reportValidity();
    return;
  }
  passwordRef.current.setCustomValidity(""); // Clear error before submit
  try {
    await axios.post(`${process.env.REACT_APP_API_LINK}/users/orgadmin`, newAdmin, config);
    setToastBg('primary');
    setToastMessage('Admin created successfully!');
    setShowToast(true);
    setShowModal(false);
    setNewAdmin({ organization_name:'', email:'', first_name:'', last_name:'', password:'' });
    fetchOrgAdmins();
  } catch (err) {
    let toastMessage = '';
    let toastBg = 'warning';
    
    switch (err.response?.status) {
      case 400:
        // Handle specific backend error messages
        if (err.response.data?.message) {
          toastMessage = `⚠️ ${err.response.data.message}`;
        } else if (err.response.data?.error === "Bad request") {
          toastMessage = '⚠️ Invalid request: ' + (
            err.response.data?.message || 'Missing required fields or invalid data'
          );
        } else {
          toastMessage = '⚠️ Invalid request. Please check your input.';
        }
        break;
         case 401:
          setToastMessage("⚠️ Unauthorized. Please log in.");
          setToastBg("danger");
          break;
        case 403:
          setToastMessage("⚠️ Forbidden: Access denied.");
          setToastBg("danger");
          break;
      case 409:
        toastMessage = '⚠️ ' + (
          err.response.data?.message || 
          'Admin with this email or username already exists'
        );
        break;
        
      case 500:
        toastMessage = '⚠️ Server error. Please try again later.';
        break;
        
      default:
        toastMessage = '⚠️ Failed to create admin. Please try again.';
    }

    setToastBg(toastBg);
    setToastMessage(toastMessage);
    setShowToast(true);
  }
};

  // Edit admin
 const handleEditSubmit = async (e) => {
  e.preventDefault();
  if (editingAdmin.password && editingAdmin.password.length < 8) {
    editPasswordRef.current.setCustomValidity("Password must be at least 8 characters");
    editPasswordRef.current.reportValidity();
    return;
  }
  editPasswordRef.current.setCustomValidity(""); // Clear error
  try {
    await axios.put(`${process.env.REACT_APP_API_LINK}/users/${editingAdmin.user_id}`, editingAdmin, config);
    setToastBg('primary');
    setToastMessage('Admin updated successfully!');
    setShowToast(true);
    setShowEditModal(false);
    setEditingAdmin(null);
    fetchOrgAdmins();
  } catch (err) {
    let toastMessage = '';
    let toastBg = 'warning';
    
    switch (err.response?.status) {
      case 400:
        toastMessage = '⚠️ Invalid request. Please check your input.';
        break;
      case 401:
        toastMessage = '⚠️ Unauthorized. Please login again.';
        break;
      case 403:
        toastMessage = '⚠️ Forbidden. You don\'t have permission to update this admin.';
        break;
      case 404:
        toastMessage = '⚠️ Admin not found.';
        break;
      case 409:
        toastMessage = '⚠️ Organization Admin with this email already exists.';
        toastBg = 'warning';
        break;
      case 500:
        toastMessage = '⚠️ Server error. Please try again later.';
        break;
      default:
        toastMessage = '⚠️ Failed to update admin. Please try again.';
    }

    setToastBg(toastBg);
    setToastMessage(toastMessage);
    setShowToast(true);
  }
};


  useEffect(() => {
    fetchOrgAdmins();
    fetchOrganizations();
  }, []);
const filteredAdmins = orgAdmins.filter((admin) => {
  const fullName = `${admin.first_name} ${admin.last_name}`.toLowerCase();
  const matchesFullName = fullName.includes(searchTerm.toLowerCase());
  const matchesOrganization = !selectedOrganization || admin.organization_name === selectedOrganization;
  return matchesFullName && matchesOrganization;
});

const idxLast = currentPage * itemsPerPage;
const idxFirst = idxLast - itemsPerPage;
const currentAdmins = filteredAdmins.slice(idxFirst, idxLast);
const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
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
            <h3>Organization Admins</h3>
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

          {loading ? <p>Loading admins...</p> :
           error ? <p className="text-danger">{error}</p> :
          <>
            <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                <tr>
                  <th>Organization</th><th>Email</th><th>Username</th>
                  <th>Full Name</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentAdmins.length > 0 ? currentAdmins.map(admin => (
                  <tr key={admin.user_id}>
                    <td>{admin.organization_name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.username || '-'}</td>
                    <td>{`${admin.first_name} ${admin.last_name}`}</td>
                    <td>
                      <button className="btn btn-sm btn-warning" onClick={() => {
                        setEditingAdmin({ ...admin, password:'' });
                        setShowEditModal(true);
                      }}>
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="text-center">No admins found.</td></tr>
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
          </>}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer position="top-end" className="p-3">
        <Toast bg={toastBg} show={showToast} delay={3000} autohide onClose={() => setShowToast(false)}>
          <Toast.Header closeButton>
            <strong className="me-auto">Notice</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4>Create Organization Admin</h4>
            <form onSubmit={handleCreateAdmin}>
              <div className="mb-3">
                <label className="form-label">Organization Name</label>
                <select className="form-select" value={newAdmin.organization_name}
                        onChange={e => setNewAdmin({ ...newAdmin, organization_name: e.target.value })}
                        required
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.organization_id} value={org.organization_name}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>

              {['email', 'first_name', 'last_name'].map(field => (
                <div className="mb-3" key={field}>
                  <label className="form-label">{field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    className="form-control"
                    value={newAdmin[field]}
                    onChange={e => setNewAdmin({ ...newAdmin, [field]: e.target.value })}
                    required
                  />
                </div>
              ))}

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  ref={passwordRef}
                  value={newAdmin.password}
                  onChange={e => {
                    setNewAdmin({ ...newAdmin, password: e.target.value });
                    validatePassword(e, passwordRef);
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success me-2" >Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAdmin && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h4>Update Admin</h4>
            <form onSubmit={handleEditSubmit}>
              {['username', 'email', 'first_name', 'last_name'].map(field => (
                <div className="mb-3" key={field}>
                  <label className="form-label">{field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    className="form-control"
                    value={editingAdmin[field] || ''}
                    onChange={e => setEditingAdmin({ ...editingAdmin, [field]: e.target.value })}
                    required
                  />
                </div>
              ))}

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  ref={editPasswordRef}
                  value={editingAdmin.password || ''}
                  onChange={e => {
                    setEditingAdmin({ ...editingAdmin, password: e.target.value });
                    validatePassword(e, editPasswordRef);
                  }}
                />
              </div>

              <button type="submit" className="btn btn-success me-2" >Update</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
