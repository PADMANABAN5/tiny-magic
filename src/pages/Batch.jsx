import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function Batch() {
  const [batches, setBatches] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const [batchForm, setBatchForm] = useState({
    organization_name: '',
    batch_name: '',
    batch_size: '',
    pod_size: '',
    is_active: true,
    concept_ids: []
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/batches");
      if (res.data && Array.isArray(res.data.data)) {
        setBatches(res.data.data);
      } else {
        setError("Unexpected response format.");
        setBatches([]);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to load batches.");
    } finally {
      setLoading(false);
    }
  };

  const fetchConcepts = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/concepts");
      if (res.data && Array.isArray(res.data.data)) {
        setConcepts(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching concepts:", err);
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

  const openCreateModal = () => {
    setBatchForm({
      organization_name: '',
      batch_name: '',
      batch_size: '',
      pod_size: '',
      is_active: true,
      concept_ids: []
    });
    setIsEditMode(false);
    setSelectedBatchId(null);
    setShowModal(true);
  };

  const openEditModal = (batch) => {
    setBatchForm({
      organization_name: batch.organization_name,
      batch_name: batch.batch_name,
      batch_size: batch.batch_size,
      pod_size: batch.pod_size,
      is_active: batch.is_active,
      // When editing, populate concept_ids with the format React-Select expects
      concept_ids: Array.isArray(batch.concepts)
        ? batch.concepts.map((c) => ({ value: c.concept_id, label: `${c.concept_id} - ${c.concept_name}` }))
        : []
    });
    setIsEditMode(true);
    setSelectedBatchId(batch.batch_id);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...batchForm,
      // Ensure concept_ids sent to the API are just the IDs
      concept_ids: batchForm.concept_ids.map((c) => c.value),
    };

    try {
      if (isEditMode && selectedBatchId) {
        await axios.put(`http://localhost:5000/api/batches/${selectedBatchId}`, payload);
      } else {
        await axios.post("http://localhost:5000/api/batches", payload);
      }
      setShowModal(false);
      fetchBatches();
    } catch (err) {
      console.error("Error saving batch:", err);
      alert("Failed to save batch.");
    }
  };

  useEffect(() => {
    fetchConcepts();
    fetchOrganizations();
    fetchBatches();
  }, []);


  const conceptOptions = concepts.map((concept) => ({
    value: concept.concept_id,
    label: `${concept.concept_id} - ${concept.concept_name}`,
  }));

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Batches</h3>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ width: '200px' }}>
              Add Batch
            </button>
          </div>

          {loading ? (
            <p>Loading batches...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Org Name</th>
                  <th>Batch Name</th>
                  <th>Size</th>
                  <th>Pod Size</th>
                  <th>Status</th>
                  <th>Concept IDs</th> {/* Changed column header back to IDs */}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.length > 0 ? (
                  batches.map((batch) => (
                    <tr key={batch.batch_id}>
                      <td>{batch.batch_id}</td>
                      <td>{batch.organization_name}</td>
                      <td>{batch.batch_name}</td>
                      <td>{batch.batch_size}</td>
                      <td>{batch.pod_size}</td>
                      <td>{batch.is_active ? 'Active' : 'Inactive'}</td>
                      <td>
                        {/* Display concept IDs directly from the batch.concepts array */}
                        {Array.isArray(batch.concepts)
                          ? batch.concepts.map((c) => c.concept_id).join(', ')
                          : '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => openEditModal(batch)}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center">No batches found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h4>{isEditMode ? 'Update Batch' : 'Create New Batch'}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">Organization Name</label>
                <select
                  className="form-control"
                  value={batchForm.organization_name}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, organization_name: e.target.value }))}
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_name}>
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Batch Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={batchForm.batch_name}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, batch_name: e.target.value }))}
                  required
                />
              </div>

              <div className="mb-3 d-flex gap-3">
                <div style={{ flex: 1 }}>
                  <label className="form-label">Batch Size</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchForm.batch_size}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, batch_size: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Pod Size</label>
                  <input
                    type="number"
                    className="form-control"
                    value={batchForm.pod_size}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, pod_size: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Concepts</label>
                <Select
                  isMulti
                  options={conceptOptions}
                  value={batchForm.concept_ids}
                  onChange={(selected) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      concept_ids: selected || [],
                    }))
                  }
                />
              </div>

              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={batchForm.is_active}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <label className="form-check-label">Is Active</label>
              </div>

              <div className="d-flex justify-content-between">
                <button type="submit" className="btn btn-success" style={{ width: '200px' }}>
                  {isEditMode ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>
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