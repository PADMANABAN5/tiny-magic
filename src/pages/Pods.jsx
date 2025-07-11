import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [podForm, setPodForm] = useState({
    organization_id: '',
    batch_id: '',
    mentor_id: '',
    pod_name: '',
    is_active: true,
  });

  const [filters, setFilters] = useState({
    pod_id: '',
    pod_name: '',
    organization_id: '',
    mentor_id: '',
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const filteredPods = pods.filter((pod) => {
    return (
      (filters.pod_id === '' || pod.pod_id?.toString().includes(filters.pod_id)) &&
      (filters.pod_name === '' || pod.pod_name?.toLowerCase().includes(filters.pod_name.toLowerCase())) &&
      (filters.organization_id === '' || pod.organization_id?.toString().includes(filters.organization_id)) &&
      (filters.mentor_id === '' || pod.mentor_id?.toString().includes(filters.mentor_id))
    );
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
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations`);
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

    const selectedOrg = organizations.find((org) => org.organization_id === parseInt(podForm.organization_id));
    const selectedBatch = batches.find((batch) => batch.batch_id === parseInt(podForm.batch_id));
    const selectedMentor = mentors.find((mentor) => mentor.user_id === parseInt(podForm.mentor_id));

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
      } else {
        await axios.post(`${process.env.REACT_APP_API_LINK}/pods`, payload);
      }
      setShowModal(false);
      fetchPods();
    } catch (err) {
      console.error('Error saving pod:', err);
      alert('Failed to save pod.');
    }
  };

  // Handle organization change to reset batch_id if needed
  const handleOrganizationChange = (e) => {
    const organizationId = e.target.value;
    setPodForm((prev) => ({
      ...prev,
      organization_id: organizationId,
      batch_id: '', // Reset batch_id when organization changes
    }));
  };

  // Filter batches based on selected organization
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
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Pods</h3>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ width: '200px' }}>
              Add Pod
            </button>
          </div>
          <div className="d-flex justify-content-start mb-3">
                      <button className="btn btn-outline-secondary text-white" onClick={() => navigate(-1)} style={{ width: '10%' }}>
                        <FaArrowLeft/>
                      </button>
                    </div>

          <div className="card p-3 mb-3">
            <h5>Filter Pods</h5>
            <div className="row">
              <div className="col-md-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Pod ID"
                  name="pod_id"
                  value={filters.pod_id}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Pod Name"
                  name="pod_name"
                  value={filters.pod_name}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Organization ID"
                  name="organization_id"
                  value={filters.organization_id}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mentor ID"
                  name="mentor_id"
                  value={filters.mentor_id}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <p>Loading pods...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                   
                    <th>Pod Name</th>
                    <th>Organization ID</th>
                    <th>Batch ID</th>
                    <th>Mentor ID</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPods.length > 0 ? (
                    currentPods.map((pod) => (
                      <tr key={pod.pod_id}>
                       
                        <td>{pod.pod_name}</td>
                        <td>{pod.organization_id || '—'}</td>
                        <td>{pod.batch_id || '—'}</td>
                        <td>{pod.mentor_id || '—'}</td>
                        <td>
                          <span
                            className={`badge ${pod.is_active ? 'bg-success text-white' : 'bg-secondary text-white'}`}
                          >
                            {pod.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-warning btn-sm" onClick={() => openEditModal(pod)}>
                            Update
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">No pods found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    {[...Array(totalPages).keys()].map((num) => (
                      <Pagination.Item
                        key={num + 1}
                        active={currentPage === num + 1}
                        onClick={() => handlePageChange(num + 1)}
                      >
                        {num + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{isEditMode ? 'Update Pod' : 'Create Pod'}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <select
                  className="form-control"
                  value={podForm.organization_id}
                  onChange={handleOrganizationChange} // Use the new handler
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
                  disabled={!podForm.organization_id} // Disable if no organization is selected
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
                <label className="form-label d-block" htmlFor="is_active">
                  Active Status
                </label>
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
                <button type="submit" className="btn btn-success" style={{ width: '200px' }}>
                  {isEditMode ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  style={{ width: '200px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}