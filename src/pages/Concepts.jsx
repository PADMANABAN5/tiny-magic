import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

export default function Concepts() {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    learning_assessment_dimensions: '',
    is_active: true
  });

  const fetchConcepts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/concepts`);
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
      learning_assessment_dimensions: '',
      is_active: true
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
        await axios.put(`${process.env.REACT_APP_API_LINK}/concepts/${selectedConceptId}`, conceptForm);
      } else {
        await axios.post(`${process.env.REACT_APP_API_LINK}/concepts`, conceptForm);
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConcepts = concepts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(concepts.length / itemsPerPage);

  const handlePageChange = (pageNum) => setCurrentPage(pageNum);

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
          <div className="d-flex justify-content-start mb-3">
                                <button className="btn btn-outline-secondary text-white" onClick={() => navigate(-1)} style={{width: '10%'}}>
                                  <FaArrowLeft/>
                                </button>
                              </div>

          {loading ? (
            <p>Loading concepts...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>Concept ID</th>
                    <th>Name</th>
                    <th>Content</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentConcepts.length > 0 ? (
                    currentConcepts.map((concept) => (
                      <tr key={concept.concept_id}>
                        <td>{concept.concept_id}</td>
                        <td>{concept.concept_name}</td>
                        <td>{concept.concept_content}</td>
                        <td>
                          <span className={`badge ${concept.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {concept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-warning btn-sm" onClick={() => openEditModal(concept)}>
                            Update
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No concepts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                    {[...Array(totalPages)].map((_, index) => (
                      <Pagination.Item
                        key={index + 1}
                        active={currentPage === index + 1}
                        onClick={() => handlePageChange(index + 1)}
                      >
                        {index + 1}
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

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h4>{isEditMode ? 'Update Concept' : 'Create New Concept'}</h4>
            <form onSubmit={handleFormSubmit}>
              {Object.entries(conceptForm).map(([key, value]) => {
                if (key === 'is_active') {
                  return (
                    <div className="mb-3" key={key}>
                      <label className="form-label d-block" htmlFor={key}>Active Status</label>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={key}
                          checked={value}
                          onChange={(e) =>
                            setConceptForm((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        <label className="form-check-label" htmlFor={key}>
                          {value ? 'Active' : 'Inactive'}
                        </label>
                      </div>
                    </div>
                  );
                }

                return (
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
                );
              })}
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
