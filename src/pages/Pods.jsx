import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer } from 'react-bootstrap';
import '../styles/OrgList.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit } from 'react-icons/fa';

export default function Pods() {
  const navigate = useNavigate();
  const [pods, setPods] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchPodName, setSearchPodName] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  // Changed from selectedBatch to searchBatchName for input field
  const [searchBatchName, setSearchBatchName] = useState('');
  // Changed from selectedMentor to searchMentorName for input field
  const [searchMentorName, setSearchMentorName] = useState('');

  const [podForm, setPodForm] = useState({
    organization_id: '',
    batch_id: '',
    mentor_id: '',
    pod_name: '',
    is_active: true,
  });

  // Filters state is no longer directly used for batch/mentor search inputs
  // The individual state variables (searchBatchName, searchMentorName) are used instead.
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // This function is kept for consistency if other filters are added to the 'filters' state
    // but for batch/mentor, we'll use their specific state setters.
    setCurrentPage(1);
  };

  const filteredPods = pods.filter((pod) => {
    const podNameMatch = pod.pod_name?.toLowerCase().includes(searchPodName.toLowerCase());
    const orgMatch = selectedOrganization === '' || pod.organization_id?.toString() === selectedOrganization;

    // Filter by batch name (text input)
    const batchName = batches.find(b => b.batch_id === pod.batch_id)?.batch_name || '';
    const batchMatch = searchBatchName === '' || batchName.toLowerCase().includes(searchBatchName.toLowerCase());

    // Filter by mentor name (text input)
    const mentor = mentors.find(m => m.user_id === pod.mentor_id);
    const mentorFullName = mentor ? `${mentor.first_name || ''} ${mentor.last_name || ''}`.trim() : '';
    const mentorMatch = searchMentorName === '' || mentorFullName.toLowerCase().includes(searchMentorName.toLowerCase());

    return podNameMatch && orgMatch && batchMatch && mentorMatch;
  });


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPods = filteredPods.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPods.length / itemsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const fetchPods = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/pods`);
      if (res.data && Array.isArray(res.data.data)) {
        setPods(res.data.data);
      } else {
        setPods([]);
        setError('Unexpected API response format.');
      }
    } catch (err) {
      console.error('Error fetching pods:', err);
      setError('Failed to load pods.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`);
      setOrganizations(res.data.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/batches`);
      setBatches(res.data.data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/mentor`);
      setMentors(res.data.data || []);
    } catch (err) {
      console.error('Error fetching mentors:', err);
    }
  };

  const openCreateModal = () => {
    setPodForm({
      organization_id: '',
      batch_id: '',
      mentor_id: '',
      pod_name: '',
      is_active: true,
    });
    setIsEditMode(false);
    setSelectedPodId(null);
    setShowModal(true);
  };

  const openEditModal = (pod) => {
    setPodForm({
      organization_id: pod.organization_id || '',
      batch_id: pod.batch_id || '',
      mentor_id: pod.mentor_id || '',
      pod_name: pod.pod_name || '',
      is_active: pod.is_active || false,
    });
    setIsEditMode(true);
    setSelectedPodId(pod.pod_id);
    setShowModal(true);
  };

 const handleFormSubmit = async (e) => {
  e.preventDefault();

  const selectedOrg = organizations.find(
    (org) => org.organization_id === parseInt(podForm.organization_id)
  );
  const selectedBatch = batches.find(
    (batch) => batch.batch_id === parseInt(podForm.batch_id)
  );
  const selectedMentor = mentors.find(
    (mentor) => mentor.user_id === parseInt(podForm.mentor_id)
  );

  const payload = {
    organization_name: selectedOrg ? selectedOrg.organization_name : '',
    batch_name: selectedBatch ? selectedBatch.batch_name : '',
    mentor_email: selectedMentor ? selectedMentor.email : '',
    pod_name: podForm.pod_name,
    is_active: podForm.is_active,
  };

  try {
    if (isEditMode && selectedPodId) {
      await axios.put(`${process.env.REACT_APP_API_LINK}/pods/${selectedPodId}`, payload);
      setToastMessage('✅ Pod updated successfully!');
      setToastBg('primary'); // Changed to primary for consistency
    } else {
      await axios.post(`${process.env.REACT_APP_API_LINK}/pods`, payload);
      setToastMessage('✅ Pod created successfully!');
      setToastBg('primary'); // Changed to primary for consistency
    }
    setShowToast(true);
    setShowModal(false);
    fetchPods();
  } catch (err) {
    console.error('Error saving pod:', err);
    
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      const data = err.response.data;
      
      switch (status) {
        case 400:
          setToastMessage(`⚠️ ${data.message || 'Invalid request parameters'}`);
          setToastBg('warning');
          break;
        
        case 404:
          setToastMessage(`⚠️ ${data.message || 'Resource not found'}`);
          setToastBg('warning');
          break;
          
        case 409:
          setToastMessage('⚠️ Pod name already exists!');
          setToastBg('warning');
          break;
          
        case 500:
          setToastMessage('⚠️ Server error. Please try again later');
          setToastBg('warning');
          break;
          
        default:
          setToastMessage('⚠️ An unexpected error occurred');
          setToastBg('warning');
      }
    } else {
      setToastMessage('⚠️ Network error. Please check your connection');
      setToastBg('warning');
    }
    
    setShowToast(true);
  }
};

  const handleOrganizationChange = (e) => {
    const organizationId = e.target.value;
    setPodForm((prev) => ({
      ...prev,
      organization_id: organizationId,
      batch_id: '', // Reset batch when organization changes
    }));
  };

  const filteredBatches = batches.filter(
    (batch) => batch.organization_id?.toString() === podForm.organization_id.toString()
  );

  useEffect(() => {
    fetchPods();
    fetchOrganizations();
    fetchBatches();
    fetchMentors();
  }, []);

  return (
    <div className="main-layout-container">
      {/* Supersidebar is assumed to be a separate component */}
       <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-start mb-3">
            <button
              className='back-button bg-primary text-white border-0'
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
            </button>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Pods</h3>
            <button className="create-btn" onClick={openCreateModal} style={{ width: '10%' }}>
              <FaPlus />
            </button>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            {/* Show Entries */}
            <div className="d-flex align-items-center">
              <span className="me-2">Show entries:</span>
              <select
                className="form-select"
                style={{ width: '100px' }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 6, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Filters Row */}
  <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ flexWrap: 'nowrap' }}>
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '200px' }}
                placeholder="Search Pod Name"
                value={searchPodName}
                onChange={(e) => {
                  setSearchPodName(e.target.value);
                  setCurrentPage(1);
                }}
              />

              {/* Changed Batch filter to input */}
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '200px' }}
                placeholder="Search Batch Name"
                value={searchBatchName}
                onChange={(e) => {
                  setSearchBatchName(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <select
                className="form-select"
                style={{ maxWidth: '200px' }}
                value={selectedOrganization}
                onChange={(e) => {
                  setSelectedOrganization(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.organization_id} value={org.organization_id}>
                    {org.organization_name}
                  </option>
                ))}
              </select>

              {/* Changed Mentor filter to input */}
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '200px' }}
                placeholder="Search Mentor Name"
                value={searchMentorName}
                onChange={(e) => {
                  setSearchMentorName(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>


          {loading ? (
            <p>Loading pods...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th>Pod Name</th>
                      <th>Organization Name</th>
                      <th>Batch Name</th>
                      <th>Mentor Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPods.length > 0 ? (
                      currentPods.map((pod) => (
                        <tr key={pod.pod_id}>
                          <td>{pod.pod_name}</td>
                          <td>{organizations.find((org) => org.organization_id === pod.organization_id)?.organization_name || '—'}</td>
                          <td>{batches.find((batch) => batch.batch_id === pod.batch_id)?.batch_name || '—'}</td>
                          <td>
                            {(() => {
                              const mentor = mentors.find((mentor) => mentor.user_id === pod.mentor_id);
                              return mentor ? `${mentor.first_name || ''} ${mentor.last_name || ''}`.trim() : '—';
                            })()}
                          </td>
                          <td>
                            <span className={`badge ${pod.is_active ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                              {pod.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-warning btn-sm" onClick={() => openEditModal(pod)}>
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">No pods found.</td>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{isEditMode ? 'Update Pod' : 'Create Pod'}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <select
                  className="form-control"
                  value={podForm.organization_id}
                  onChange={handleOrganizationChange}
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Batch</label>
                <select
                  className="form-control"
                  value={podForm.batch_id}
                  onChange={(e) => setPodForm((prev) => ({ ...prev, batch_id: e.target.value }))}
                  required
                  disabled={!podForm.organization_id}
                >
                  <option value="">-- Select Batch --</option>
                  {filteredBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Mentor</label>
                <select
                  className="form-control"
                  value={podForm.mentor_id}
                  onChange={(e) => setPodForm((prev) => ({ ...prev, mentor_id: e.target.value }))}
                  required
                >
                  <option value="">-- Select Mentor --</option>
                  {mentors.map((mentor) => (
                    <option key={mentor.user_id} value={mentor.user_id}>
                      {mentor.full_name || mentor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Pod Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={podForm.pod_name}
                  onChange={(e) => setPodForm((prev) => ({ ...prev, pod_name: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label d-block" htmlFor="is_active">Active Status</label>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="is_active"
                    checked={podForm.is_active}
                    onChange={(e) => setPodForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="is_active">
                    {podForm.is_active ? 'Active' : 'Inactive'}
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" >
                  {isEditMode ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      <ToastContainer position="top-end" className="p-3">
        <Toast bg={toastBg} show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide>
          <Toast.Header closeButton>
            <strong className="me-auto">Notice</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
