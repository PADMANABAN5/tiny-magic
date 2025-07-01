import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function Pods() {
  const [pods, setPods] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState(null);

  const [podForm, setPodForm] = useState({
    organization_name: '',
    batch_name: '',
    mentor_email: '',
    pod_name: '',
    is_active: true
  });

  const fetchPods = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/pods");
      if (res.data && Array.isArray(res.data.data)) {
        setPods(res.data.data);
      } else {
        setPods([]);
        setError("Unexpected API response format.");
      }
    } catch (err) {
      console.error("Error fetching pods:", err);
      setError("Failed to load pods.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/organizations");
      setOrganizations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/batches");
      setBatches(res.data.data || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/role/mentor");
      setMentors(res.data.data || []);
    } catch (err) {
      console.error("Error fetching mentors:", err);
    }
  };

  const openCreateModal = () => {
    setPodForm({
      organization_name: '',
      batch_name: '',
      mentor_email: '',
      pod_name: '',
      is_active: true
    });
    setIsEditMode(false);
    setSelectedPodId(null);
    setShowModal(true);
  };

  const openEditModal = (pod) => {
    setPodForm({
      organization_name: pod.organization_name || '',
      batch_name: pod.batch_name || '',
      mentor_email: pod.mentor_email || '',
      pod_name: pod.pod_name || '',
      is_active: pod.is_active || false
    });
    setIsEditMode(true);
    setSelectedPodId(pod.pod_id);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedPodId) {
        await axios.put(`http://localhost:5000/api/pods/${selectedPodId}`, podForm);
      } else {
        await axios.post("http://localhost:5000/api/pods", podForm);
      }
      setShowModal(false);
      fetchPods();
    } catch (err) {
      console.error("Error saving pod:", err);
      alert("Failed to save pod.");
    }
  };

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

          {loading ? (
            <p>Loading pods...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Pod ID</th>
                  <th>Pod Name</th>
                  <th>Organization ID</th>
                  <th>Batch ID</th>
                  <th>Mentor ID</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pods.map(pod => (
                  <tr key={pod.pod_id}>
                    <td>{pod.pod_id}</td>
                    <td>{pod.pod_name}</td>
                    <td>{pod.organization_id || '—'}</td>
                    <td>{pod.batch_id || '—'}</td>
                    <td>{pod.mentor_id || '—'}</td>
                    <td>{pod.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button className="btn btn-warning btn-sm" onClick={() => openEditModal(pod)}>Update</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{isEditMode ? 'Update Pod' : 'Create Pod'}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <select
                  className="form-control"
                  value={podForm.organization_name}
                  onChange={(e) => setPodForm(prev => ({ ...prev, organization_name: e.target.value }))}
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (
                    <option key={org.organization_id} value={org.organization_name}>{org.organization_id}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Batch</label>
                <select
                  className="form-control"
                  value={podForm.batch_name}
                  onChange={(e) => setPodForm(prev => ({ ...prev, batch_name: e.target.value }))}
                  required
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map(batch => (
                    <option key={batch.batch_id} value={batch.batch_name}>{batch.batch_id}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Mentor Email</label>
                <select
                  className="form-control"
                  value={podForm.mentor_email}
                  onChange={(e) => setPodForm(prev => ({ ...prev, mentor_email: e.target.value }))}
                  required
                >
                  <option value="">-- Select Mentor --</option>
                  {mentors.map(mentor => (
                    <option key={mentor.user_id} value={mentor.email}>{mentor.user_id}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Pod Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={podForm.pod_name}
                  onChange={(e) => setPodForm(prev => ({ ...prev, pod_name: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={podForm.is_active}
                  onChange={(e) => setPodForm(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <label className="form-check-label">Is Active</label>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" style={{ width: '200px' }}>
                  {isEditMode ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
