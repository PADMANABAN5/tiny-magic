import React, { useState, useEffect } from 'react';
import Supersidebar from "../components/Supersidebar";
import "../styles/superadmin.css";
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { Modal, Button, Form, Pagination, Dropdown } from "react-bootstrap";
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../components/AuthContext';

const BASE_URL = process.env.REACT_APP_API_LINK;


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
   const { token } = useAuth();
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    };
  
  // Pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const getToastType = (bg) => {
    switch (bg) {
      case 'primary':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      default:
        return 'info';
    }
  };

  const showToastMsg = (message, bg = "primary") => {
    toast(message, { type: getToastType(bg) });
  };

  // Helper function to handle API errors with codes
  const handleApiError = (err, context = '') => {
    let errorMsg = 'An unexpected error occurred.';
    if (axios.isAxiosError(err)) {
      const { status, data } = err.response || {};
      // Handle HTTP status codes
      switch (status) {
        case 400:
          errorMsg = 'Bad request - Please check your input.';
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
      const response = await axios.get(`${BASE_URL}/llm/models`,config);
      setModels(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching models');
      showToastMsg(errorMsg, 'warning');
      console.error('Error fetching models:', err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/llm/assignments`,config);
      setAssignments(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching assignments');
      showToastMsg(errorMsg, 'warning');
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/organizations/active`,config);
      setOrganizations(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching organizations');
      showToastMsg(errorMsg, 'warning');
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/batches`,config);
      setBatches(response.data.data || []);
    } catch (err) {
      const errorMsg = handleApiError(err, 'fetching batches');
      showToastMsg(errorMsg, 'warning');
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
      showToastMsg('Please select a model.', 'warning');
      return;
    }

    let payload = {
      model_id: parseInt(selectedModel),
      level: selectedLevel
    };

    if (selectedLevel === 'global') {
      payload.organization_id = null;
      payload.batch_id = null;
    } else if (selectedLevel === 'organization') {
      if (!selectedOrg) {
        showToastMsg('Please select an organization.', 'warning');
        return;
      }
      payload.organization_id = parseInt(selectedOrg);
      payload.batch_id = null;
    } else if (selectedLevel === 'batch') {
      if (!selectedOrg) {
        showToastMsg('Please select an organization.', 'warning');
        return;
      }
      if (!selectedBatch) {
        showToastMsg('Please select a batch.', 'warning');
        return;
      }
      payload.organization_id = parseInt(selectedOrg);
      payload.batch_id = parseInt(selectedBatch);
    }

    try {
      let response;
      if (isEditMode && selectedAssignmentId) {
        // For update, only send model_id, let the backend keep the rest
        const updatePayload = { model_id: parseInt(selectedModel) };
        response = await axios.put(`${BASE_URL}/llm/assignments/${selectedAssignmentId}`, updatePayload ,config);
        showToastMsg('Assignment updated successfully!', 'primary');
      } else {
        response = await axios.post(`${BASE_URL}/llm/assignments`, payload ,config);
        showToastMsg('Model assigned successfully!', 'primary');
      }
      if (response.data.success) {
        handleClose();
        fetchAssignments();
      } else {
        showToastMsg(response.data.message || 'Failed to save assignment.', 'warning');
      }
    } catch (err) {
      const errorMsg = handleApiError(err, 'saving assignment');
      showToastMsg(errorMsg, 'warning');
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
              className="back-button text-white border-0"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
            <h3 className="mb-0">Assigned Models</h3>
            <button
              className="create-btn btn btn-primary"
              
              onClick={handleShow}
            >
              <FaPlus />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
             <div className="d-flex align-items-center">
                <span className="me-2">Show entries:</span>
                <Dropdown className="entries-dropdown" autoClose="true">
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    id="entries-dropdown"
                    className="d-flex justify-content-between align-items-center"
                    style={{
                      width: "80px",
                      textAlign: "left",
                      backgroundColor: "#fff",
                      color: "#000",
                      borderColor: "#ccc",
                      boxShadow: "none",
                      padding: "6px 10px",
                      fontSize: "14px",
                    }}
                  >
                    {itemsPerPage}
                  </Dropdown.Toggle>
            
                  <Dropdown.Menu
                    style={{
                      minWidth: "80px",
                      maxWidth: "100px",
                      backgroundColor: "#fff",
                      maxHeight: "130px",
                      overflowY: "auto",
                      border: "1px solid #ccc",
                      marginTop: "0px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.15)",
                      padding: "0",
                      scrollbarWidth: "thin", 
                      scrollbarColor: "#ccc transparent",
                    }}
                  >
                    
                    <style>
                      {`
                        .entries-dropdown .dropdown-menu::-webkit-scrollbar {
                          width: 5px;
                        }
                        .entries-dropdown .dropdown-menu::-webkit-scrollbar-thumb {
                          background-color: #bbb;
                          border-radius: 4px;
                        }
                        .entries-dropdown .dropdown-menu::-webkit-scrollbar-thumb:hover {
                          background-color: #999;
                        }
                      `}
                    </style>
            
                    {[5, 10, 15, 20, 50].map((num) => (
                      <Dropdown.Item
                        key={num}
                        onClick={() => {
                          setCurrentPage(1);
                          setItemsPerPage(num);
                        }}
                        active={itemsPerPage === num}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          padding: "6px 0",
                          fontSize: "14px",
                          textAlign: "center",
                        }}
                      >
                        {num}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
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
              <thead className="">
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
                        className="btn btn-outline-success btn-sm"
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

         {showModal && (
  <>
    {/* Overlay background */}
    <div
      className="modal-backdrop fade show"
      onClick={handleClose}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    ></div>

    {/* Modal box */}
    <div
      className="modal d-block"
      tabIndex="-1"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-overlay">
        <div className="modal-content p-3">
          <h5 className="mb-3">
            {isEditMode ? "Update Assignment" : "Assign Model"}
          </h5>

          {/* Form Section */}
          <form>
            {/* Level */}
            <div className="mb-3">
              <label className="form-label">
                Level <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="form-select"
                value={selectedLevel}
                onChange={handleLevelChange}
                disabled={isEditMode}
              >
                <option value="global">Global</option>
                <option value="organization">Organization</option>
                <option value="batch">Batch</option>
              </select>
            </div>

            {/* Model */}
            <div className="mb-3">
              <label className="form-label">
                Model <span style={{ color: "red" }}>*</span>
              </label>
              <select
                className="form-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="">Select Model</option>
                {models.map((model) => (
                  <option key={model.model_id} value={model.model_id}>
                    {model.model_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization */}
            {(selectedLevel === "organization" || selectedLevel === "batch") && (
              <div className="mb-3">
                <label className="form-label">
                  Organization <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedOrg}
                  onChange={handleOrgChange}
                  disabled={isEditMode}
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org) => (
                    <option
                      key={org.organization_id}
                      value={org.organization_id}
                    >
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Batch */}
            {selectedLevel === "batch" && (
              <div className="mb-3">
                <label className="form-label">
                  Batch <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  disabled={isEditMode}
                >
                  <option value="">Select Batch</option>
                  {batches
                    .filter((b) => b.organization_id === parseInt(selectedOrg))
                    .map((batch) => (
                      <option key={batch.batch_id} value={batch.batch_id}>
                        {batch.batch_name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </form>

          {/* Buttons */}
          <div className="d-flex justify-content-between mt-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleSave}
            >
              {isEditMode ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
)}

    </div>
  );
}

export default Assignmodels;