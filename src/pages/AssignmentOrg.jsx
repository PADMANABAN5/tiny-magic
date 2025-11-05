import React, { useEffect, useState } from "react";
import {
  Spinner,
  Alert,
  Button,
  Form,
  Card,
} from "react-bootstrap";
import { FaArrowLeft,FaEdit,FaPlus } from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import Orgadminsidebar from "../components/Orgadminsidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
function AssignmentOrg() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [models, setModels] = useState([]);
  const [orgModels, setOrgModels] = useState([]);
  const [orgModelIds, setOrgModelIds] = useState(new Set());
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [formLoading, setFormLoading] = useState(false);
  const username = sessionStorage.getItem("username");

  const [formData, setFormData] = useState({
    model_id: "",
    modelSource: "",
    level: "",
    batch_id: "",
    organization_id: "",
  });

  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // ✅ Fetch assignments
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/llm/orgadmin/assignments`,
        config
      );
      if (res.data.success) {
        const data = res.data.data || [];
        setAssignments(data);
      } else {
        setError("Failed to fetch assignments");
        setAssignments([]);
        toast.warning("Unexpected data format received from server.");
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load assignments.";
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
            message = "Assignments not found.";
            break;
          case 409:
            message = "Conflict: Data inconsistency.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Failed to fetch assignments. (${errorType || "Unknown error"})`;
        }
        setError(message);
        toast.warn(message);
      } else {
        const message = "Network error. Please check your connection.";
        setError(message);
        toast.warn(message);
      }
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch batches
  const fetchBatches = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/orgadmin/batches/${username}`,
        config
      );
      if (res.data.success) {
        const data = res.data.data || [];
        setBatches(data);
      } else {
        setBatches([]);
        toast.warning("Unexpected data format received from server.");
      }
    } catch (err) {
      console.error("Error fetching batches:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load batches.";
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
            message = "Batches not found.";
            break;
          case 409:
            message = "Conflict: Data inconsistency.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Failed to fetch batches. (${errorType || "Unknown error"})`;
        }
        toast.warn(message);
      } else {
        toast.warn("Network error. Please check your connection.");
      }
      setBatches([]);
    }
  };

  // ✅ Fetch models
  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_LINK}/llm/models`, config);
      if (response.data.success) {
        const sortedModels = (response.data.data || []).sort((a, b) => b.model_id - a.model_id);
        setModels(sortedModels);
      } else {
        setError("Failed to fetch models");
        setModels([]);
        toast.warning("Unexpected data format received from server.");
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
        toast.warn(message);
      } else {
        toast.warn("Network error. Please check your connection.");
      }
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch org models
  const fetchOrgModels = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/llm/orgadmin/organization-models`,
        config
      );
      if (res.data.success) {
        const data = res.data.data || [];
        setOrgModels(data);
        const ids = new Set(data.map((m) => m.model_id));
        setOrgModelIds(ids);
      } else {
        setOrgModels([]);
        setOrgModelIds(new Set());
        toast.warning("Unexpected data format received from server.");
      }
    } catch (err) {
      console.error("Error fetching org models:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load org models.";
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
            message = "Org models not found.";
            break;
          case 409:
            message = "Conflict: Data inconsistency.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Failed to fetch org models. (${errorType || "Unknown error"})`;
        }
        toast.warn(message);
      } else {
        toast.warn("Network error. Please check your connection.");
      }
      setOrgModels([]);
      setOrgModelIds(new Set());
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchBatches();
    fetchModels();
    fetchOrgModels();
  }, []);

  // ============ Modal Handlers ============
  const openCreateModal = () => {
    setEditMode(false);
    setSelectedAssignment(null);
    setFormData({
      model_id: "",
      modelSource: "",
      level: "",
      batch_id: "",
      organization_id: "",
    });
    setShowModal(true);
  };

  const openEditModal = (assignment) => {
    const source = orgModelIds.has(assignment.model_id) ? "org" : "global";
    setEditMode(true);
    setSelectedAssignment(assignment);
    setFormData({
      model_id: assignment.model_id || "",
      modelSource: source,
      level: assignment.level || "",
      batch_id: assignment.batch_id || "",
      organization_id: assignment.organization_id || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedAssignment(null);
  };

  // 🆕 Handle global model change
  const handleGlobalModelChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      model_id: value,
      modelSource: value ? "global" : "",
    }));
  };

  // 🆕 Handle org model change
  const handleOrgModelChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      model_id: value,
      modelSource: value ? "org" : "",
    }));
  };

  // 🆕 Auto-fill organization_id when user selects "organization"
  const handleLevelChange = (e) => {
    const selectedLevel = e.target.value;
    if (selectedLevel === "organization" && user?.organization_id) {
      setFormData({
        ...formData,
        level: selectedLevel,
        organization_id: user.organization_id,
      });
    } else {
      setFormData({ ...formData, level: selectedLevel, organization_id: "" });
    }
  };

  // ============ Submit (POST or PUT) ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const payload = {
        model_id: Number(formData.model_id),
        level: formData.level,
      };
      if (formData.level === "batch" && formData.batch_id)
        payload.batch_id = Number(formData.batch_id);
      if (formData.level === "organization" && formData.organization_id)
        payload.organization_id = Number(formData.organization_id);

      let res;
      if (editMode && selectedAssignment) {
        res = await axios.put(
          `${process.env.REACT_APP_API_LINK}/llm/assignments/${selectedAssignment.assignment_id}`,
          payload,
          config
        );
      } else {
        res = await axios.post(
          `${process.env.REACT_APP_API_LINK}/llm/assignments`,
          payload,
          config
        );
      }

      if (res.data.success) {
        toast.success(res.data.message);
        setTimeout(() => {
          closeModal();
          fetchAssignments();
        }, 800);
      } else {
        toast.warn(res.data.message || "Operation failed.");
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Operation failed.";
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
            message = `Assignment ${editMode ? 'not found' : 'endpoint not found'}.`;
            break;
          case 409:
            message = "Conflict: Assignment already exists.";
            break;
          case 500:
            message = "Server error. Please try again later.";
            break;
          default:
            message = `Failed to ${editMode ? 'update' : 'create'} assignment. (${errorType || "Unknown error"})`;
        }
        toast.warn(message);
      } else {
        toast.warn("Network error. Please check your connection.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // ============ UI ============
  return (
    <div className="main-layout-container bg-light min-vh-100">
      <Orgadminsidebar />

      <div className="content-area">
        <div className="container py-4">
          {/* Back Button */}
          <div className="d-flex justify-content-start mb-3">
            <button
              className="back-button text-white border-0"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
            </button>
          </div>

          {/* Header Section */}
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap">
            <h3 className=" mb-0">Model Assignments</h3>
            <button
              className="create-btn btn btn-primary"
              style={{ minWidth: "120px" }}
              onClick={openCreateModal}
            >
              <FaPlus />
            </button>
          </div>

          {/* Table Card */}
          <Card className="shadow-sm border-0">
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                  <p className="mt-3 text-muted">Loading assignments...</p>
                </div>
              ) : error ? (
                <Alert variant="danger">{error}</Alert>
              ) : assignments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="bg-dark text-white">
                      <tr>
                        <th>Model Name</th>
                        <th>Display Name</th>
                        <th>Level</th>
                        <th>Organization</th>
                        <th>Batch</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.assignment_id}>
                          <td>{`${a.model_name} (${a.name})`}</td>
                          <td>{a.name || "—"}</td>
                          <td>{a.level}</td>
                          <td>{a.organization_name || "—"}</td>
                          <td>{a.batch_name || "—"}</td>
                          <td className="text-center">
                            {a.level !== "global" && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                onClick={() => openEditModal(a)}
                              >
                                <FaEdit /> Edit
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  No LLM assignments found.
                </div>
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Custom Modal for Create/Edit */}
      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center"
            style={{ zIndex: 1050 }}
            
          >
            {/* Modal Dialog */}
            <div
              className="bg-white rounded shadow-lg"
              style={{
                width: "90%",
                maxWidth: "500px",
                maxHeight: "90vh",
                overflowY: "auto"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="d-flex align-items-center p-3 position-relative">
                <h5 className="position-absolute start-50 translate-middle-x mt-2 mb-0">
                  {editMode ? "Edit Assignment" : " Assign models"}
                </h5>
               
              </div>

              {/* Modal Body */}
              <div className="p-3">
                <Form onSubmit={handleSubmit}>
                  {/* Model Dropdown */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Model</Form.Label>
                    <Form.Select
                      value={formData.modelSource === "global" ? formData.model_id : ""}
                      onChange={handleGlobalModelChange}
                      disabled={formData.modelSource === "org"}
                      required
                    >
                      <option value="">Select Model</option>
                      {models.map((m) => (
                        <option key={m.model_id} value={m.model_id}>
                          {`${m.model_name} (${m.name})`}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {/* Org Models Dropdown */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Org Models</Form.Label>
                    <Form.Select
                      value={formData.modelSource === "org" ? formData.model_id : ""}
                      onChange={handleOrgModelChange}
                      disabled={formData.modelSource === "global"}
                      required={formData.modelSource === "org"}
                    >
                      <option value="">Select Org Model</option>
                      {orgModels.map((m) => (
                        <option key={m.model_id} value={m.model_id}>
                          {`${m.model_name} (${m.name})`}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {/* Level Dropdown */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Level</Form.Label>
                    <Form.Select
                      value={formData.level}
                      onChange={handleLevelChange}
                      required
                    >
                      <option value="">Select Level</option>
                      {!assignments.some((a) => a.level === "organization") && (
      <option value="organization">Organization</option>
    )}

                      <option value="batch">Batch</option>
                    </Form.Select>
                  </Form.Group>

                  {/* Batch Dropdown */}
                  {formData.level === "batch" && (
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Batch</Form.Label>
                      <Form.Select
                        value={formData.batch_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            batch_id: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Select Batch</option>
                        {batches.map((b) => (
                          <option key={b.batch_id} value={b.batch_id}>
                            {b.batch_name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  )}

                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button variant="secondary" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="success" disabled={formLoading}>
                      {formLoading ? (
                        <>
                          <Spinner animation="border" size="sm" /> Saving...
                        </>
                      ) : editMode ? (
                        "Update"
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AssignmentOrg;