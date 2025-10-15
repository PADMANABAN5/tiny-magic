import React, { useState, useEffect } from 'react'
import Supersidebar from "../components/Supersidebar"
import { FaArrowLeft, FaPlus, FaEdit,FaTrash } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { toast } from 'react-toastify';
import { Pagination, Form } from "react-bootstrap";
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../components/AuthContext.jsx';

function AddModels() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  const [modelName, setModelName] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  
  const BASE_URL = process.env.REACT_APP_API_LINK;
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  };

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

  const showToast = (message, bg) => {
    toast(message, { type: getToastType(bg) });
  };
  const validateModelName = (name) => {
  const regex = /^[a-zA-Z0-9._-]+$/;
  if (name.length > 20) {
    showToast("Model name cannot exceed 20 characters.", "warning");
    return false;
  }
  if (!regex.test(name)) {
    showToast("Model name can only contain letters, numbers, '-', '.', and '_'.", "warning");
    return false;
  }
  return true;
};
  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${BASE_URL}/llm/models`, config);
      if (response.data.success) {
        const sortedModels = (response.data.data || []).sort((a, b) => b.model_id - a.model_id);
        setModels(sortedModels);
      } else {
        setError("Failed to fetch models");
        setModels([]);
        showToast("Unexpected data format received from server.", "warning");
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load models.";
        const errorType = err.response?.status;
        let message = "";
        switch (errorType) {
          case 400:
            message = `Bad request: ${errorMessage}`;
            break;
          case 401:
            message = "Unauthorized. Please log in.";
            break;
          case 403:
            message = "Forbidden: You do not have permission.";
            break;
          case 404:
            message = "Models not found.";
            break;
          case 409:
            message = "Conflict: Data inconsistency.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Failed to fetch models. (${errorType || "Unknown error"})`;
        }
        showToast(message, "warning");
      } else {
        showToast("Network error. Please check your connection.", "danger");
      }
      setModels([]);
    } finally {
      setLoading(false);
    }
  };
   const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Delete model (soft delete: sets is_active to false)
const handleDelete = async (modelId, modelName) => {
  if (!window.confirm(`Are you sure you want to deactivate the model "${modelName}"? This action cannot be undone.`)) {
    return;  // User canceled
  }

  try {
    const response = await axios.delete(`${BASE_URL}/llm/models/${modelId}`, config);

    if (response.data.success) {
      showToast(`Model "${modelName}" deactivated successfully.`, "primary");
      fetchModels();  // Refresh the list
    } else {
      showToast("Error: " + response.data.message, "warning");
    }
  } catch (error) {
    console.error("Error deleting model:", error);
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response.data?.message || "Something went wrong while deleting";
      let message = "";
      switch (error.response.status) {
        case 400:
          message = `Bad request: ${errorMessage}`;
          break;
        case 401:
          message = "Unauthorized. Please log in.";
          break;
        case 403:
          message = "Forbidden: You do not have permission.";
          break;
        case 404:
          message = "Model not found.";
          break;
        case 500:
          message = "Server error. Please try again later.";
          break;
        default:
          message = `Unexpected error: ${errorMessage}`;
      }
      showToast(message, "warning");
    } else {
      showToast("Network error. Please check your connection.", "danger");
    }
  }
};

  
  const handleEdit = (model) => {
    setSelectedModel(model);
    setModelName(model.model_name);
    setName(model.name || '');
    setApiKey(model.api_key);
    setDescription(model.description || '');
    setIsActive(model.is_active);
    setEditMode(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setModelName("");
    setName("");
    setApiKey("");
    setDescription("");
    setIsActive(true);
    setSelectedModel(null);
    setEditMode(false);
  };

  // Save new model or update existing
 const handleSave = async () => {
  const trimmedModelName = modelName.trim();
  const trimmedName = name.trim();
  const trimmedApiKey = apiKey.trim();

  if (!trimmedModelName || !trimmedName || !trimmedApiKey) {
    showToast("Model name, display name, and API key are required.", "warning");
    return;
  }

  if (!validateModelName(trimmedModelName)) {
    return;
  }

  try {
    const payload = {
      model_name: trimmedModelName,
      name: trimmedName,
      api_key: trimmedApiKey,
      description: description.trim(),
      is_active: isActive
    };

    console.log("Payload:", payload);
    
    let response;
    if (editMode) {
      const modelId = selectedModel.model_id;
      response = await axios.put(
        `${BASE_URL}/llm/models/${modelId}`,
        payload,
        config
      );
    } else {
      response = await axios.post(
        `${BASE_URL}/llm/models`,
        payload,
        config
      );
    }

      if (response.data.success) {
        const successMessage = editMode ? "Model updated successfully" : response.data.message;
        showToast(successMessage, "primary");
        console.log("Saved:", response.data);
        fetchModels();
        resetForm();
        setShowForm(false);
      } else {
        showToast("Error: " + response.data.message, "warning");
      }
    } catch (error) {
      console.error("Error saving model:", error);
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.message || "An error occurred";
        let message = "";
        switch (error.response.status) {
          case 400:
            message = "Please check your model.";
            break;
          case 401:
            message = "Unauthorized. Please log in.";
            break;
          case 403:
            message = "Forbidden: You do not have permission to perform this action.";
            break;
          case 409:
            message = "Model name already exists!";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Unexpected error: ${errorMessage}`;
        }
        showToast(message, "warning");
      } else {
        showToast("Network error. Please check your connection.", "danger");
      }
    }
  };

  const handleCloseModal = (e) => {
    if (e.target === e.currentTarget) {
      resetForm();
      setShowForm(false);
    }
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const filteredModels = models.filter((model) => {
    const matchesName = model.model_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesName;
  });

  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentModels = filteredModels.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);

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
            <h3 className="mb-0">OpenAI Models</h3>
            <button
              className="create-btn btn btn-primary"
              style={{ minWidth: "120px" }}
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <FaPlus />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
            <div className="d-flex align-items-center">
              <span className="me-2">Show entries:</span>
              <Form.Select
                style={{ width: "100px" }}
                value={itemsPerPage}
                onChange={(e) => {
                  setCurrentPage(1);
                  setItemsPerPage(Number(e.target.value));
                }}
              >
                {[5, 10, 15, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Form.Select>
            </div>

            <div className="d-flex gap-3 mb-3">
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "250px" }}
                placeholder="Search by Model Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="">
                <tr>
                  <th>Model</th>
                  <th>Name</th>
                  <th>API Key</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="text-center text-danger">
                      {error}
                    </td>
                  </tr>
                ) : currentModels.length > 0 ? (
                  currentModels.map((m) => {
                    const truncatedDesc = (m.description?.length || 0) > 30 
                      ? m.description.substring(0, 30) + '...' 
                      : (m.description || 'No description');
                    return (
                      <tr key={m.model_id}>
                        <td>{m.model_name}</td>
                        <td>{m.name || '—'}</td>
                        <td title={m.api_key}>
                  {m.api_key ? m.api_key.substring(0, 6)  : '—'}
                </td>
                        <td title={m.description}>{truncatedDesc}</td>
                        <td><span className={`badge ${m.is_active ? 'bg-success' : 'bg-secondary'}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
<td>
  <div className="d-flex gap-2">  {/* Container for icons */}
    <button
      className="btn btn-sm btn-outline-success"
      title="Edit"
      onClick={() => handleEdit(m)}  // Assuming you have handleEdit from previous update integration
    >
      <FaEdit />
    </button>
    <button
      className="btn btn-sm btn-outline-danger"
      title="Deactivate"
      onClick={() => handleDelete(m.model_id, m.model_name)}
    >
      <FaTrash />
    </button>
  </div>
</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">No models found</td>
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
                  let startPage = Math.max(
                    1,
                    currentPage - Math.floor(visiblePages / 2)
                  );
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

     {/* ✅ Custom Add/Edit Model Popup */}
{showForm && (
  <div className="popup-overlay" onClick={handleCloseModal}>
    <div
      className="popup-box"
      onClick={(e) => e.stopPropagation()} // prevent closing on inner click
    >
      <h5 className="mb-3 text-center">{editMode ? 'Edit Model' : 'Add New Model'}</h5>

      <div className="mb-3">
        <label className="form-label">
           Name <span style={{ color: "red" }}>*</span>
        </label>
        <input
          type="text"
          className="form-control"
          onCopy={allowCopyPaste}
          onCut={allowCopyPaste}
          onKeyDown={allowCopyPaste}
          onPaste={allowCopyPaste}
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="e.g., gpt-4o"
        />
        <div className="form-text text-muted">
          Enter the model name exactly as specified in OpenAI documentation (
          <code>gpt-4o</code>, <code>gpt-4</code>, <code>gpt-3.5-turbo</code>).
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">
          Name <span style={{ color: "red" }}>*</span>
        </label>
        <input
          type="text"
          onCopy={allowCopyPaste}
          onCut={allowCopyPaste}
          onKeyDown={allowCopyPaste}
          onPaste={allowCopyPaste}
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name "
        />
      </div>

      <div className="mb-3">
        <label className="form-label">
          API Key <span style={{ color: "red" }}>*</span>
        </label>
        <input
          type="text"
          onCopy={allowCopyPaste}
          onCut={allowCopyPaste}
          onKeyDown={allowCopyPaste}
          onPaste={allowCopyPaste}
          className="form-control"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API Key "
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          rows="4"
          onCopy={allowCopyPaste}
          onCut={allowCopyPaste}
          onKeyDown={allowCopyPaste}
          onPaste={allowCopyPaste}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a brief description of the model..."
        ></textarea>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
          Cancel
        </button>
        <button type="button" className="btn btn-success" onClick={handleSave}>
          {editMode ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default AddModels;