import React, { useState, useEffect } from 'react'
import Supersidebar from "../components/Supersidebar"
import { FaArrowLeft, FaPlus } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AddModels() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = process.env.REACT_APP_API_LINK;

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

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${BASE_URL}/llm/models`);
      if (response.data.success) {
        setModels(response.data.data || []);
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

  // Toggle model status
  const handleToggle = async (modelId, currentStatus) => {
    try {
      const response = await axios.patch(`${BASE_URL}/llm/model/${modelId}`, {
        is_active: !currentStatus,
      });

      if (response.data.success) {
        showToast(`Model status updated to ${!currentStatus ? 'Active' : 'Inactive'}`, "primary");
        fetchModels(); // Refresh the list
      } else {
        showToast("Error: " + response.data.message, "warning");
      }
    } catch (error) {
      console.error("Error updating model status:", error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || "Something went wrong while updating status";
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

  // Save new model
  const handleSave = async () => {
    if (!modelName.trim()) {
      showToast("Model name is required.", "warning");
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/llm/model`, {
        model_name: modelName.trim(),
        description: description.trim(),
        is_active: isActive,
      });

      if (response.data.success) {
        showToast(response.data.message, "primary");
        console.log("Saved:", response.data);
        fetchModels();
        setModelName("");
        setDescription("");
        setIsActive(true);
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
            message = "Bad request. Please check your input.";
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
      setShowForm(false);
    }
  };

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
            <h3 className="mb-0">OpenAI Models</h3>
            <button
              className="create-btn btn btn-primary"
              style={{ minWidth: "120px" }}
              onClick={() => setShowForm(true)}
            >
              <FaPlus />
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover">
              <thead className="bg-primary text-white">
                <tr>
                  <th>Model</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="3" className="text-center text-danger">
                      {error}
                    </td>
                  </tr>
                ) : models.length > 0 ? (
                  models.map((m) => {
                    const truncatedDesc = m.description.length > 30 
                      ? m.description.substring(0, 30) + '...' 
                      : m.description;
                    return (
                      <tr key={m.model_id}>
                        <td>{m.model_name}</td>
                        <td title={m.description}>{truncatedDesc}</td>
                        <td><span className={`badge ${m.is_active ? 'bg-success' : 'bg-secondary'}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center">No models found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <>
          <div className="modal-backdrop fade show" onClick={handleCloseModal}></div>
          <div className="modal d-block" tabIndex="-1" onClick={handleCloseModal}>
            <div className="modal-dialog">
              <div className="modal-content">
                
                  <h5 className="modal-title">Add New Model</h5>
                  <button
                    type="button"
                    className="btn-close position-absolute top-0 end-0 m-3"
                    onClick={() => setShowForm(false)}
                  ></button>
                
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Model Name</label>
                    <input
                      type="text"
                      className="form-control"
                      onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g., gpt-4o"
                    />
                    <div className="form-text text-muted">
                      Enter the model name exactly as specified in OpenAI documentation 
                      (e.g., <code>gpt-4o</code>, <code>gpt-4</code>, <code>gpt-3.5-turbo</code>).
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a brief description of the model..."
                    ></textarea>
                  </div>
                
                </div>
                <div className="d-flex justify-content-between mt-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                  >
                    Save
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

export default AddModels;