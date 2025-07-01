import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function Concepts() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState(null);

  const [conceptForm, setConceptForm] = useState({
    concept_name: '',
    concept_content: '',
    concept_enduring_understandings: '',
    concept_essential_questions: '',
    concept_knowledge_skills: '',
    stage_1_content: '',
    stage_2_content: '',
    stage_3_content: '',
    stage_4_content: '',
    stage_5_content: '',
    concept_understanding_rubric: '',
    understanding_skills_rubric: '',
    learning_assessment_dimensions: ''
  });

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/concepts");
      if (res.data && Array.isArray(res.data.data)) {
        setConcepts(res.data.data);
      } else {
        setError("Unexpected data format.");
        setConcepts([]);
      }
    } catch (err) {
      console.error("Error fetching concepts:", err);
      setError("Failed to load concepts.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setConceptForm({
      concept_name: '',
      concept_content: '',
      concept_enduring_understandings: '',
      concept_essential_questions: '',
      concept_knowledge_skills: '',
      stage_1_content: '',
      stage_2_content: '',
      stage_3_content: '',
      stage_4_content: '',
      stage_5_content: '',
      concept_understanding_rubric: '',
      understanding_skills_rubric: '',
      learning_assessment_dimensions: ''
    });
    setIsEditMode(false);
    setShowModal(true);
    setSelectedConceptId(null);
  };

  const openEditModal = (concept) => {
    setConceptForm({ ...concept });
    setIsEditMode(true);
    setShowModal(true);
    setSelectedConceptId(concept.concept_id);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedConceptId) {
        await axios.put(`http://localhost:5000/api/concepts/${selectedConceptId}`, conceptForm);
      } else {
        await axios.post("http://localhost:5000/api/concepts", conceptForm);
      }
      setShowModal(false);
      fetchConcepts();
    } catch (err) {
      console.error("Error saving concept:", err);
      alert("Failed to save concept.");
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, []);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Concepts</h3>
            <button className="btn btn-primary" onClick={openCreateModal} style={{ width: '200px' }}>
              Add Concept
            </button>
          </div>

          {loading ? (
            <p>Loading concepts...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Concept ID</th>
                  <th>Name</th>
                  <th>Content</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {concepts.length > 0 ? (
                  concepts.map((concept) => (
                    <tr key={concept.concept_id}>
                      <td>{concept.concept_id}</td>
                      <td>{concept.concept_name}</td>
                      <td>{concept.concept_content}</td>
                      <td>
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => openEditModal(concept)}
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">No concepts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* === Modal Form === */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h4>{isEditMode ? 'Update Concept' : 'Create New Concept'}</h4>
            <form onSubmit={handleFormSubmit}>
              {Object.entries(conceptForm).map(([key, value]) => (
                <div className="mb-3" key={key}>
                  <label className="form-label" htmlFor={key}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                  <textarea
                    className="form-control"
                    id={key}
                    rows={2}
                    value={value}
                    onChange={(e) =>
                      setConceptForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    required={['concept_name', 'concept_content'].includes(key)}
                  />
                </div>
              ))}
              <div className="d-flex justify-content-between">
                <button type="submit" className="btn btn-success me-2" style={{ width: '200px' }}>
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
