import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/OrgList.css';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useAuth } from '../components/AuthContext.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
   const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };

  const getToastType = (bg) => {
    switch (bg) {
      case 'primary':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      default:
        return 'info';
    }
  };

  const showToastMsg = (message, bg = "primary") => {
    toast(message, { type: getToastType(bg) });
  };

  const fetchOrganizations = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations`, config);

    if (res.status === 200 && Array.isArray(res.data?.data)) {
      setOrganizations(res.data.data);
    } else {
      setOrganizations([]);
      showToastMsg("Unexpected data format from server.", "warning");
    }

  } catch (err) {
    console.error("Error fetching organizations:", err);

    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      switch (status) {
        case 400:
          showToastMsg(`${message || "Bad request"}`, "warning");
          break;
        case 401:
          showToastMsg("Unauthorized access try again", "warning");
          break;
        case 403:
          showToastMsg("Forbidden: Access denied try again", "warning");
          break;
        case 404:
          showToastMsg("Not found: Endpoint or data missing", "warning");
          break;
        case 409:
          showToastMsg("Conflict: Duplicate data", "warning");
          break;
        case 500:
          showToastMsg("Server error. Please try again later.", "warning");
          break;
        default:
          showToastMsg("Failed to fetch organizations. please try again later.", "warning");
      }
    } else {
      showToastMsg("Network error. Please check your connection.", "danger");
    }

    setOrganizations([]);
  } finally {
    setLoading(false);
  }
};

  const toggleIsActive = async (org) => {
  const originalIsActive = org.is_active;
  const newIsActiveState = !originalIsActive;

  // Optimistically update UI
  setOrganizations(prevOrgs =>
    prevOrgs.map(o =>
      o.organization_id === org.organization_id ? { ...o, is_active: newIsActiveState } : o
    )
  );

  try {
    await axios.put(
      `${process.env.REACT_APP_API_LINK}/organizations/${org.organization_id}`,
      {
        organization_name: org.organization_name,
        is_active: newIsActiveState,
      },
      config
    );

    showToastMsg(`Marked as ${newIsActiveState ? 'Active' : 'Inactive'} successfully`, newIsActiveState ? 'primary' : 'secondary');
  } catch (err) {
    console.error("Error toggling status:", err);

    // Revert optimistic update
    setOrganizations(prevOrgs =>
      prevOrgs.map(o =>
        o.organization_id === org.organization_id ? { ...o, is_active: originalIsActive } : o
      )
    );

    if (axios.isAxiosError(err) && err.response?.status === 500) {
      showToastMsg("Internal server error. Please try again later.", "danger");
    }
  }
};

const isValidOrgName = (name) => {
  const regex = /^[a-zA-Z0-9\s]+$/; 
  return regex.test(name);
};

  const handleCreateOrganization = async (e) => {
  e.preventDefault();
  if (!newOrgName.trim()) {
    showToastMsg('Organization name cannot be empty!', 'warning');
    return;
  }
    if (!isValidOrgName(newOrgName)) {
    showToastMsg('Special characters are not allowed in the organization name!', 'warning');
    return;
  }
 


  try {
    await axios.post(`${process.env.REACT_APP_API_LINK}/organizations`, {
      organization_name: newOrgName,
      is_active: true,
    }, config);

    setShowModal(false);
    setNewOrgName('');
    fetchOrganizations();
    showToastMsg('Organization created successfully!', 'primary');
  } catch (err) {
    console.error("Error creating organization:", err);

    if (axios.isAxiosError(err)) {
      switch (err.response?.status) {
        case 400:
          // Bad Request (missing fields or invalid data)
          showToastMsg(`${err.response.data?.message || 'Invalid organization data'}`, 'warning');
          break;
        case 404:
          // Not Found (though unlikely for POST, but could happen if endpoint is wrong)
          showToastMsg('Resource not found', 'danger');
          break;
        case 409:
          // Conflict (organization name exists)
          showToastMsg('Organization name already exists!', 'warning');
          break;
        case 500:
          // Internal Server Error
          showToastMsg('Server error. Please try again later.', 'danger');
          break;
        default:
          // Other errors
          showToastMsg('Failed to create organization', 'danger');
      }
    } else {
      // Non-Axios errors (network errors, etc.)
      showToastMsg('Network error. Please check your connection.', 'danger');
    }
  }
};

  useEffect(() => {
    fetchOrganizations();
  }, []);

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
          <div className="d-flex justify-content-start mb-3">
            <button
            className='back-button text-white border-0'
            onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
  <h3 className="mb-0">Organizations</h3>
  <button className="create-btn" onClick={() => setShowModal(true)} >
    <FaPlus />
  </button>
</div>

<div className="d-flex justify-content-start align-items-center mb-3">
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


          {loading ? (
            <p>Loading organizations...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="">
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
                              <label className="form-check-label " htmlFor={`toggle-${org.organization_id}`}>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Organization</h4>
            <form onSubmit={handleCreateOrganization}>
              <div className="mb-3">
                <label htmlFor="orgName" className="form-label">Organization Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="orgName"
                  placeholder="Enter organization name"
                  onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  value={newOrgName}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      showToastMsg("Organization name cannot exceed 30 characters!", "warning");
      return; // don’t update state
    }
    setNewOrgName(e.target.value);
  }}
  required

                />
              </div>
              <button type="submit" className="btn btn-success me-2 ">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}