import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination, Toast, ToastContainer, Accordion, Button } from 'react-bootstrap';
import '../styles/OrgList.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaEdit, FaHistory } from 'react-icons/fa';
 
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const storedToken = sessionStorage.getItem("token");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAccordionKey, setActiveAccordionKey] = useState('0');

  const [originalConcept, setOriginalConcept] = useState({
    concept_title: '',
    concept_description: '',
  });
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };
 
 
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
    download_link: '',
    is_active: true
  });
 
  const fetchConcepts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/concepts`, config);
 
      if (res.data && Array.isArray(res.data.data)) {
        setConcepts(res.data.data);
      } else {
        setConcepts([]);
        setToastMessage("⚠️ Unexpected data format received from server.");
        setToastBg("warning");
        setShowToast(true);
      }
 
    } catch (err) {
      console.error("Error fetching concepts:", err);
 
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load concepts.";
        const errorType = err.response?.status;
 
        switch (errorType) {
          case 400:
            setToastMessage(`⚠️ Bad request: ${errorMessage}`);
            break;
          case 401:
            setToastMessage("⚠️ Unauthorized. Please log in.");
            break;
          case 403:
            setToastMessage("⚠️ Forbidden: You do not have permission.");
            break;
          case 404:
            setToastMessage("⚠️ Concepts not found.");
            break;
          case 409:
            setToastMessage("⚠️ Conflict: Data inconsistency.");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try again later.");
            break;
          default:
            setToastMessage(`⚠️ Failed to fetch concepts. (${errorType || "Unknown error"})`);
        }
 
        setToastBg("warning");
      } else {
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("danger");
      }
 
      setShowToast(true);
      setConcepts([]);
    } finally {
      setLoading(false);
    }
  };
 
 const handleAccordionSelect = (selectedKey) => {
  setActiveAccordionKey(selectedKey === activeAccordionKey ? null : selectedKey);
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
      download_link: '',
      is_active: true
    });
    setIsEditMode(false);
    setShowModal(true);
    setSelectedConceptId(null);
  };
 
  const openEditModal = (concept) => {
    setConceptForm({ ...concept });
    setOriginalConcept({ ...concept }); // NEW: store for comparison
    setIsEditMode(true);
    setShowModal(true);
    setSelectedConceptId(concept.concept_id);
  };
 
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedConceptId) {
        const isFormUnchanged = JSON.stringify(conceptForm) === JSON.stringify(originalConcept); // NEW
        if (isFormUnchanged) {
          setToastBg('warning');
          setToastMessage('⚠️ No changes detected.');
          setShowToast(true);
          setIsLoading(false); // reset loader manually
          return;
        }
 
        await axios.put(`${process.env.REACT_APP_API_LINK}/concepts/${selectedConceptId}`, conceptForm, config);
        setToastBg('primary');
        setToastMessage('✅ Concept updated successfully!');
      }
 
      setShowModal(false);
      fetchConcepts();
      setShowToast(true);
    } catch (err) {
      console.error("Error saving concept:", err);
 
      if (axios.isAxiosError(err) && err.response) {
        // Handle different error statuses with specific toast messages
        switch (err.response.status) {
          case 400:
            setToastBg('warning');
            setToastMessage('⚠️ Bad request. Please check your input.');
            break;
          case 401:
            setToastBg('warning');
            setToastMessage('⚠️ Unauthorized. Please log in.');
            break;
          case 403:
            setToastBg('warning');
            setToastMessage('⚠️ Forbidden: You do not have permission to perform this action.');
            break;
          case 409:
            setToastBg('warning');
            setToastMessage('⚠️ Concept name already exists!');
            break;
          case 500:
            setToastBg('warning');
            setToastMessage('⚠️ Server error. Please try again later.');
            break;
          default:
            setToastBg('warning');
            setToastMessage(`⚠️ Unexpected error: ${err.message}`);
        }
        setShowToast(true);
      } else {
        // Non-Axios errors or network issues
        setToastBg('warning');
        setToastMessage('⚠️ Network error. Please check your connection.');
        setShowToast(true);
      }
    }
  };
  useEffect(() => {
    fetchConcepts();
  }, []);
  const filteredConcepts = concepts.filter(concept =>
    concept.concept_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConcepts = filteredConcepts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredConcepts.length / itemsPerPage);
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
            <div className="d-flex justify-content-between" style={{ width: '26%' }}>
              <Button variant="secondary" onClick={() => navigate('/archivedconcepts')} style={{ width: '49%' }}>
                <FaHistory />
              </Button>
              <Button variant="primary" onClick={() => openCreateModal()} style={{ width: '49%' }} >
                <FaPlus />
              </Button>
 
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
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
                {[5, 10, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
 
            <div className="d-flex gap-3 mb-3">
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: '250px' }}
                placeholder="Search by Concept Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
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
                      <th>Concept Name</th>
                      <th>Concept Content</th>
                      {/* <th>Status</th> */}
                      <th>version</th>
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
                          {/* <td>
                            <span className={`badge ${concept.is_active ? 'bg-success' : 'bg-secondary'}`}>
                              {concept.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td> */}
                          <td>{concept.version}</td>
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
 
      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h4>{isEditMode ? 'Update Concept' : 'Create New Concept'}</h4>
            <form onSubmit={handleFormSubmit}>
              <Accordion activeKey={activeAccordionKey} onSelect={handleAccordionSelect}>
                {Object.entries({
                  concept_name: 'Concept Name',
                  concept_content: 'Concept Content',
                  concept_enduring_understandings: 'Enduring Understandings',
                  concept_essential_questions: 'Essential Questions',
                  concept_knowledge_skills: 'Knowledge & Skills',
                  stage_1_content: 'Stage 1 Content',
                  stage_2_content: 'Stage 2 Content',
                  stage_3_content: 'Stage 3 Content',
                  stage_4_content: 'Stage 4 Content',
                  stage_5_content: 'Stage 5 Content',
                  concept_understanding_rubric: 'Understanding Rubric',
                  understanding_skills_rubric: 'Skills Rubric',
                  learning_assessment_dimensions: 'Assessment Dimensions',
                  download_link: 'Download Link'
                }).map(([key, label], index) => (
                  <Accordion.Item eventKey={index.toString()} key={key}>
                    <Accordion.Header>{label}</Accordion.Header>
                    <Accordion.Body>
                      <div className="mb-3">
                        <label className="form-label" htmlFor={key}>{label}</label>
                        <textarea
                          className="form-control"
                          id={key}
                          name={key}  // ✅ ADD THIS
                          rows={4}
                          value={conceptForm[key] || ''}
                          onChange={(e) =>
                            setConceptForm((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          required={['concept_name', 'concept_content'].includes(key)}
                        />
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
 
                {/* Status Field in its own accordion */}
                {/* <Accordion.Item eventKey="status">
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
                </Accordion.Item> */}
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
 