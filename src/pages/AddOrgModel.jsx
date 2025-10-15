import React, { useState, useEffect } from "react";
import Supersidebar from "../components/Supersidebar";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Pagination, Form } from "react-bootstrap";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../components/AuthContext.jsx";

function AddOrgModels() {
  const navigate = useNavigate();

  // ================== STATE ==================
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
  const organizationId = Number(sessionStorage.getItem("organization_id"));

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

 
  const getToastType = (bg) => {
    switch (bg) {
      case "primary":
        return "success";
      case "warning":
        return "warning";
      case "danger":
        return "error";
      default:
        return "info";
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
      showToast(
        "Model name can only contain letters, numbers, '-', '.', and '_'.",
        "warning"
      );
      return false;
    }
    return true;
  };


  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${BASE_URL}/llm/orgadmin/organization-models`, config);

      if (response.data.success) {
        const sorted = (response.data.data || []).sort(
          (a, b) => b.model_id - a.model_id
        );
        setModels(sorted);
      } else {
        setError(response.data.message || "Failed to fetch models");
        showToast("Unexpected server response.", "warning");
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      const message =
        err.response?.data?.message ||
        (err.response?.status === 403
          ? "You can only view your organization's models."
          : "Error loading models.");
      showToast(message, "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleEdit = (model) => {
    setSelectedModel(model);
    setModelName(model.model_name);
    setName(model.name || "");
    setApiKey(model.api_key);
    setDescription(model.description || "");
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


  const handleSave = async () => {
    const trimmedModelName = modelName.trim();
    const trimmedName = name.trim();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedModelName || !trimmedName || !trimmedApiKey) {
      showToast("Model name, display name, and API key are required.", "warning");
      return;
    }

    if (!validateModelName(trimmedModelName)) return;

    try {
      const payload = {
  model_name: trimmedModelName,
  name: trimmedName,
  api_key: trimmedApiKey,
  description: description.trim(),
  is_active: isActive,
  organization_id: editMode
    ? selectedModel.organization_id || organizationId || null
    : organizationId || null,
};


      let response;
      if (editMode) {
        response = await axios.put(
          `${BASE_URL}/llm/models/${selectedModel.model_id}`,
          payload,
          config
        );
      } else {
        response = await axios.post(`${BASE_URL}/llm/models`, payload, config);
      }

      if (response.data.success) {
        const successMessage =
          editMode
            ? "LLM model updated successfully"
            : "LLM model added successfully";
        showToast(successMessage, "primary");
        fetchModels();
        resetForm();
        setShowForm(false);
      } else {
        showToast(response.data.message || "Operation failed.", "warning");
      }
    } catch (err) {
      console.error("Save error:", err);

      const msg =
        err.response?.data?.message ||
        (err.response?.status === 403
          ? editMode
            ? "Orgadmins can only update models for their own organization."
            : "Orgadmins can only create models for their own organization."
          : "Server error while saving.");
      showToast(msg, "danger");
    }
  };


  const handleCloseModal = (e) => {
    if (e.target === e.currentTarget) {
      resetForm();
      setShowForm(false);
    }
  };

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const filteredModels = models.filter((m) =>
    m.model_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentModels = filteredModels.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);

  const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };

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
            <h3 className="mb-0">Add Models</h3>
           <button
  className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
  style={{ minWidth: "120px" }}
  onClick={() => {
    resetForm();
    setShowForm(true);
  }}
>
  <FaPlus />
  <span>New Model</span>
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
                {[5, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </Form.Select>
            </div>

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

          <div className="table-responsive">
  <table className="table table-striped table-hover">
    <thead>
      <tr>
        <th>Model Name</th>
        <th>Display Name</th>
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
        currentModels.map((m) => (
          <tr key={m.model_id}>
            <td>{m.model_name}</td>
            <td>{m.name || "—"}</td>
            
            <td title={m.description}>{m.description || "—"}</td>
            <td>
              <span
                className={`badge ${
                  m.is_active ? "bg-success" : "bg-secondary"
                }`}
              >
                {m.is_active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => handleEdit(m)}
              >
                <FaEdit /> Edit
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="6" className="text-center">
            No models found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>


          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT POPUP */}
      {showForm && (
  <div className="popup-overlay" onClick={handleCloseModal}>
    <div className="popup-box" onClick={(e) => e.stopPropagation()}>
      <h5 className="mb-3 text-center">
        {editMode ? "Edit Model" : "Add New Model"}
      </h5>

      <div className="mb-3">
  <label className="form-label">
    Model Name <span className="text-danger">*</span>
  </label>
  <input
    type="text"
    onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
    className="form-control"
    value={modelName}
    onChange={(e) => {
      const input = e.target.value;
      // ✅ Allow only letters, numbers, spaces, dash, underscore, dot
      const cleaned = input.replace(/[^a-zA-Z0-9._\-\s]/g, "");

      // ⚠️ If invalid characters were removed
      if (input !== cleaned) {
        toast.warning(
          "Invalid character ignored — only letters, numbers, '.', '-', '_' allowed.",
          {
            autoClose: 2000,
            hideProgressBar: true,
          }
        );
      }

      // ⚠️ Show toast when user reaches 30 characters
      if (cleaned.length === 30) {
        toast.info("Maximum 30 characters reached.", {
          autoClose: 2000,
          hideProgressBar: true,
        });
      }

      // ✅ Always update state safely within limit
      if (cleaned.length <= 30) setModelName(cleaned);
    }}
    placeholder="e.g., gpt-4o-org"
    maxLength="30"
  />
</div>


     <div className="mb-3">
  <label className="form-label">
    Display Name <span className="text-danger">*</span>
  </label>
  <input
    type="text"
    onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
    className="form-control"
    value={name}
    onChange={(e) => {
      const input = e.target.value;
      // ✅ Allow only letters, numbers, spaces, dash, underscore, dot
      const cleaned = input.replace(/[^a-zA-Z0-9._\-\s]/g, "");

      // ⚠️ If invalid characters were removed
      if (input !== cleaned) {
        toast.warning(
          "Invalid character ignored — only letters, numbers, '.', '-', '_' allowed.",
          {
            autoClose: 2000,
            hideProgressBar: true,
          }
        );
      }

      // ⚠️ Show toast when user reaches 30 characters
      if (cleaned.length === 30) {
        toast.info("Maximum 30 characters reached.", {
          autoClose: 2000,
          hideProgressBar: true,
        });
      }

      // ✅ Always update safely within limit
      if (cleaned.length <= 30) setName(cleaned);
    }}
    placeholder="Enter model display name"
    maxLength="30"
  />
</div>


      <div className="mb-3">
        <label className="form-label">
          API Key <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
          className="form-control"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
         onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
          className="form-control"
          rows="3"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter model description"
        ></textarea>
      </div>

      {/* ✅ NEW FIELD ADDED BELOW — Activate / Deactivate toggle */}
      {/* ✅ ONLY show the toggle during Edit mode */}
{editMode && (
  <div className="form-check form-switch mb-3">
    <input
      className="form-check-input"
      type="checkbox"
      id="isActiveSwitch"
      checked={isActive}
      onChange={(e) => setIsActive(e.target.checked)}
    />
    <label className="form-check-label" htmlFor="isActiveSwitch">
      {isActive ? "Active" : "Inactive"}
    </label>
  </div>
)}
{/* ✅ END toggle */}

      {/* ✅ END OF NEW FIELD */}

      <div className="d-flex justify-content-end gap-2 mt-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCloseModal}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={handleSave}
        >
          {editMode ? "Update" : "Create"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default AddOrgModels;
