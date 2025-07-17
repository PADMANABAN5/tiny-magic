import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer,Accordion} from 'react-bootstrap';
import '../styles/OrgList.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft,FaPlus,FaEdit } from 'react-icons/fa';

export default function Concepts() {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');
  const [showToast, setShowToast] = useState(false);
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
        setToastBg('primary');
        setToastMessage('✅ Concept updated successfully!');
      } else {
        await axios.post(`${process.env.REACT_APP_API_LINK}/concepts`, conceptForm);
        setToastBg('primary');
        setToastMessage('✅ Concept created successfully!');
      }
      setShowModal(false);
      fetchConcepts();
      setShowToast(true);
    } catch (err) {
      console.error("Error saving concept:", err);
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setToastBg('warning');
        setToastMessage('⚠️ Concept name already exists!');
        setShowToast(true);
      } else {
        alert("Failed to save concept.");
      }
    }
  };

  useEffect(() => {
    fetchConcepts();
  }, []);

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
        <div className="d-flex justify-content-start mb-3">
          <button
            className='back-button bg-primary text-white border-0'
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft />
          </button>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3>Concepts</h3>
          <button className="create-btn" onClick={openCreateModal} style={{ width: '10%' }}>
            <FaPlus />
          </button>
        </div>

        {loading ? (
          <p>Loading concepts...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-striped table-bordered table-hover">
                <thead className="bg-primary text-white">
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
                        <td>
                          <span className="single-line-tooltip" title={concept.concept_content}>
                            {concept.concept_content}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${concept.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {concept.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-warning btn-sm" onClick={() => openEditModal(concept)}>
                            <FaEdit />
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
            </div>

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
      <div className="modal-overlay">
        <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h4>{isEditMode ? 'Update Concept' : 'Create New Concept'}</h4>
          <form onSubmit={handleFormSubmit}>
            <Accordion>
              <Accordion.Item eventKey="0">
                <Accordion.Header>🧾 General Info</Accordion.Header>
                <Accordion.Body>
                  {['concept_name', 'concept_content', 'concept_enduring_understandings', 'concept_essential_questions', 'concept_knowledge_skills'].map((key) => (
                    <div className="mb-3" key={key}>
                      <label className="form-label" htmlFor={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      <textarea
                        className="form-control"
                        id={key}
                        rows={4}
                        value={conceptForm[key]}
                        onChange={(e) => setConceptForm((prev) => ({ ...prev, [key]: e.target.value }))}
                        required={['concept_name', 'concept_content'].includes(key)}
                      />
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="1">
                <Accordion.Header>📚 Stage Content</Accordion.Header>
                <Accordion.Body>
                  {['stage_1_content', 'stage_2_content', 'stage_3_content', 'stage_4_content', 'stage_5_content'].map((key) => (
                    <div className="mb-3" key={key}>
                      <label className="form-label" htmlFor={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      <textarea
                        className="form-control"
                        id={key}
                        rows={4}
                        value={conceptForm[key]}
                        onChange={(e) => setConceptForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="2">
                <Accordion.Header>📊 Rubrics & Dimensions</Accordion.Header>
                <Accordion.Body>
                  {['concept_understanding_rubric', 'understanding_skills_rubric', 'learning_assessment_dimensions'].map((key) => (
                    <div className="mb-3" key={key}>
                      <label className="form-label" htmlFor={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      <textarea
                        className="form-control"
                        id={key}
                        rows={4}
                        value={conceptForm[key]}
                        onChange={(e) => setConceptForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="3">
                <Accordion.Header>⚙️ Active Status</Accordion.Header>
                <Accordion.Body>
                  <div className="mb-3">
                    <label className="form-label d-block" htmlFor="is_active">Active Status</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="is_active"
                        checked={conceptForm.is_active}
                        onChange={(e) => setConceptForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="is_active">
                        {conceptForm.is_active ? 'Active' : 'Inactive'}
                      </label>
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>

            <div className="d-flex justify-content-between mt-3">
              <button type="submit" className="btn btn-success me-2">
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

    {/* ✅ Toast Message */}
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
