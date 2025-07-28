import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer,Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/OrgList.css';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';

export default function OrgList() {
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations`);
      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      } else {
        setOrganizations([]);
        setError("Unexpected data format from server.");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Server error.");
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
      await axios.put(`${process.env.REACT_APP_API_LINK}/organizations/${org.organization_id}`, {
        organization_name: org.organization_name,
        is_active: newIsActiveState,
      });
      setToastBg(newIsActiveState ? 'primary' : 'secondary');
      setToastMessage(`Marked as ${newIsActiveState ? 'Active' : 'inactive'} successfully`);
      setShowToast(true);
    } catch (err) {
      console.error("Error toggling status:", err);
      setOrganizations(prevOrgs =>
        prevOrgs.map(o =>
          o.organization_id === org.organization_id ? { ...o, is_active: originalIsActive } : o
        )
      );
      alert("Failed to update organization status.");
    }
  };

  const handleCreateOrganization = async (e) => {
  e.preventDefault();
  if (!newOrgName.trim()) {
    setToastMessage('⚠️ Organization name cannot be empty!');
    setToastBg('warning');
    setShowToast(true);
    return;
  }

  try {
    await axios.post(`${process.env.REACT_APP_API_LINK}/organizations`, {
      organization_name: newOrgName,
      is_active: true,
    });

    setShowModal(false);
    setNewOrgName('');
    fetchOrganizations();
    setToastMessage('✅ Organization created successfully!');
    setToastBg('success');
    setShowToast(true);
  } catch (err) {
    console.error("Error creating organization:", err);

    if (axios.isAxiosError(err)) {
      switch (err.response?.status) {
        case 400:
          // Bad Request (missing fields or invalid data)
          setToastMessage(`⚠️ ${err.response.data?.message || 'Invalid organization data'}`);
          setToastBg('warning');
          break;
        case 404:
          // Not Found (though unlikely for POST, but could happen if endpoint is wrong)
          setToastMessage('⚠️ Resource not found');
          setToastBg('danger');
          break;
        case 409:
          // Conflict (organization name exists)
          setToastMessage('⚠️ Organization name already exists!');
          setToastBg('warning');
          break;
        case 500:
          // Internal Server Error
          setToastMessage('⚠️ Server error. Please try again later.');
          setToastBg('danger');
          break;
        default:
          // Other errors
          setToastMessage('⚠️ Failed to create organization');
          setToastBg('danger');
      }
    } else {
      // Non-Axios errors (network errors, etc.)
      setToastMessage('⚠️ Network error. Please check your connection.');
      setToastBg('danger');
    }
    setShowToast(true);
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
            className='back-button bg-primary text-white border-0'
            onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
  <h3 className="mb-0">Organizations</h3>
  <button className="create-btn" onClick={() => setShowModal(true)} style={{ width: '10%' }}>
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
                  <thead className="bg-primary text-white">
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
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-success me-2 ">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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
