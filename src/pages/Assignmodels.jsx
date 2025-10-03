import React, { useState, useEffect } from 'react';
import Supersidebar from "../components/Supersidebar";
import "../styles/superadmin.css";
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { Modal, Button, Form, Pagination } from "react-bootstrap";
import { Toast, ToastContainer } from "react-bootstrap";
import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_LINK;
const API_BASE = `${BASE_URL}/llm`;
const API_BASE_ADMIN = `${BASE_URL}`;

function Assignmodels() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [models, setModels] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('global');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  // Toast states
  const [toastMessage, setToastMessage] = useState("");
  const [toastBg, setToastBg] = useState("primary");
  const [showToast, setShowToast] = useState(false);
  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  // Helper function to handle API errors with codes
  const handleApiError = (err, context = '') => {
    let errorMsg = 'An unexpected error occurred.';
    if (axios.isAxiosError(err)) {
      const { status, data } = err.response || {};
      // Handle HTTP status codes
      switch (status) {
        case 400:
          errorMsg = data?.message || 'Bad request - Please check your input.';
          break;
        case 401:
          errorMsg = 'Unauthorized - Please log in again.';
          break;
        case 403:
          errorMsg = 'Forbidden - You do not have permission to perform this action.';
          break;
        case 404:
          errorMsg = `Not found - Resource not available for ${context}.`;
          break;
        case 409:
          errorMsg = 'Conflict - This assignment already exists.';
          break;
        case 422:
          errorMsg = data?.message || 'Validation error - Please correct the form data.';
          break;
        case 500:
          errorMsg = 'Server error - Please try again later.';
          break;
        default:
          // Handle custom error codes if present in response data
          if (data?.code) {
            switch (data.code) {
              case 'MODEL_NOT_FOUND':
                errorMsg = 'Selected model not found.';
                break;
              case 'ORG_NOT_FOUND':
                errorMsg = 'Selected organization not found.';
                break;
              case 'BATCH_NOT_FOUND':
                errorMsg = 'Selected batch not found.';
                break;
              case 'ASSIGNMENT_EXISTS':
                errorMsg = 'This model is already assigned at the selected level.';
                break;
              default:
                errorMsg = data.message || `Error code ${data.code}: ${data.message || 'Unknown error.'}`;
            }
          } else {
            errorMsg = data?.message || errorMsg;
          }
      }
    } else if (err.request) {
      errorMsg = 'Network error - Please check your connection.';
    }
    console.error(`Error in ${context}:`, err);
    return errorMsg;
  };

  // Show toast helper
  const showToastMsg = (message, bg = "primary") => {
    setToastMessage(message);
    setToastBg(bg);
    setShowToast(true);
  };

  const handleShow = () => {
    setShowModal(true);
    setIsEditMode(false);
    setSelectedAssignmentId(null);
    setSelectedLevel('global');
    setSelectedModel('');
    setSelectedOrg('');
    setSelectedBatch('');
  };

  const openEditModal = (assignment) => {
    setSelectedLevel(assignment.level);
    setSelectedModel(assignment.model_id.toString());
    setSelectedOrg(assignment.organization_id ? assignment.organization_id.toString() : '');
    setSelectedBatch(assignment.batch_id ? assignment.batch_id.toString() : '');
    setIsEditMode(true);
    setSelectedAssignmentId(assignment.assignment_id);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE}/models`);
      setModels(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching models');
      showToastMsg(`⚠️ ${errorMsg}`, 'warning');
      console.error('Error fetching models:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/assignments`);
      setAssignments(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching assignments');
      showToastMsg(`⚠️ ${errorMsg}`, 'warning');
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get(`${API_BASE_ADMIN}/organizations`);
      setOrganizations(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching organizations');
      showToastMsg(`⚠️ ${errorMsg}`, 'warning');
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API_BASE_ADMIN}/batches`);
      setBatches(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching batches');
      showToastMsg(`⚠️ ${errorMsg}`, 'warning');
      console.error('Error fetching batches:', err);
    }
  };

  useEffect(() => {
    fetchModels();
    fetchAssignments();
    fetchOrganizations();
    fetchBatches();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  const handleLevelChange = (e) => {
    const level = e.target.value;
    setSelectedLevel(level);
    setSelectedOrg('');
    setSelectedBatch('');
  };

  const handleOrgChange = (e) => {
    setSelectedOrg(e.target.value);
    setSelectedBatch('');
  };

  const handleSave = async () => {
    if (!selectedModel) {
      showToastMsg('⚠️ Please select a model.', 'warning');
      return;
    }

    let payload = {
      model_id: parseInt(selectedModel),
      level: selectedLevel
    };

    if (selectedLevel === 'organization') {
      if (!selectedOrg) {
        showToastMsg('⚠️ Please select an organization.', 'warning');
        return;
      }
      payload.organization_id = parseInt(selectedOrg);
    } else if (selectedLevel === 'batch') {
      if (!selectedOrg) {
        showToastMsg('⚠️ Please select an organization.', 'warning');
        return;
      }
      if (!selectedBatch) {
        showToastMsg('⚠️ Please select a batch.', 'warning');
        return;
      }
      payload.organization_id = parseInt(selectedOrg);
      payload.batch_id = parseInt(selectedBatch);
    }

    try {
      let response;
      if (isEditMode && selectedAssignmentId) {
        response = await axios.put(`${API_BASE}/assignment/${selectedAssignmentId}`, payload);
        showToastMsg('✅ Assignment updated successfully!', 'primary');
      } else {
        response = await axios.post(`${API_BASE}/assignment`, payload);
        showToastMsg('✅ Model assigned successfully!', 'primary');
      }
      if (response.data.success) {
        handleClose();
        fetchAssignments();
      } else {
        showToastMsg(`⚠️ ${response.data.message || 'Failed to save assignment.'}`, 'warning');
      }
    } catch (err) {
      const errorMsg = handleApiError(err, 'saving assignment');
      showToastMsg(`⚠️ ${errorMsg}`, 'warning');
    }
  };

  const getModelName = (modelId) => {
    if (!modelId) return '';
    const model = models.find(m => m.model_id === parseInt(modelId));
    return model ? model.model_name : String(modelId);
  };

  const getOrgName = (orgId) => {
    if (!orgId) return '';
    const org = organizations.find(o => o.organization_id === parseInt(orgId));
    return org ? org.organization_name : String(orgId);
  };

  const getBatchName = (batchId) => {
    if (!batchId) return '';
    const batch = batches.find(b => b.batch_id === parseInt(batchId));
    return batch ? batch.batch_name : String(batchId);
  };

  // Filter assignments based on search term (e.g., model name or level)
  const filteredAssignments = assignments.filter(assignment =>
    getModelName(assignment.model_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssignments = filteredAssignments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);

  const handlePageChange = (pageNum) => setCurrentPage(pageNum);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-start mb-3">
            <button
              className="back-button bg-primary text-white border-0"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
            <h3 className="mb-0">Assigned Models</h3>
            <button
              className="create-btn btn btn-primary"
              style={{ width: "10%" }}
              onClick={handleShow}
            >
              <FaPlus />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
            <div className="d-flex align-items-center">
              <span className="me-2">Show entries:</span>
              <select
                className="form-select"
                style={{ width: "100px" }}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
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
                style={{ maxWidth: "250px" }}
                placeholder="Search by Model or Level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover">
              <thead className="bg-primary text-white">
                <tr>
                  <th>Model</th>
                  <th>Level</th>
                  <th>Organization</th>
                  <th>Batch</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentAssignments.map((assignment) => (
                  <tr key={assignment.assignment_id || assignment.id}>
                    <td>{getModelName(assignment.model_id)}</td>
                    <td>{assignment.level}</td>
                    <td>{getOrgName(assignment.organization_id || "-")}</td>
                    <td>{getBatchName(assignment.batch_id || "-")}</td>
                    <td>
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(assignment)}
                      >
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))}
                {currentAssignments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center">No assignments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                />
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
        </div>
      </div>

      {/* Modal for Assign Form */}
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditMode ? 'Update Assignment' : 'Assign Model'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Level</Form.Label>
              <Form.Select value={selectedLevel} onChange={handleLevelChange}>
                <option value="global">Global</option>
                <option value="organization">Organization</option>
                <option value="batch">Batch</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Model</Form.Label>
              <Form.Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                <option value="">Select Model</option>
                {models.map((model) => (
                  <option key={model.model_id} value={model.model_id}>{model.model_name}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {(selectedLevel === 'organization' || selectedLevel === 'batch') && (
              <Form.Group className="mb-3">
                <Form.Label>Organization</Form.Label>
                <Form.Select value={selectedOrg} onChange={handleOrgChange}>
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option key={org.organization_id} value={org.organization_id}>
                      {org.organization_name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {selectedLevel === 'batch' && (
              <Form.Group className="mb-3">
                <Form.Label>Batch</Form.Label>
                <Form.Select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                  <option value="">Select Batch</option>
                  {batches
                    .filter(b => b.organization_id === parseInt(selectedOrg))
                    .map((batch) => (
                      <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_name}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {isEditMode ? 'Update' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

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

export default Assignmodels;