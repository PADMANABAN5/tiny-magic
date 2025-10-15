import React, { useEffect, useState } from "react";
import {
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
  Card,
} from "react-bootstrap";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { FaArrowLeft } from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import Supersidebar from "../components/Supersidebar";
import { useNavigate } from "react-router-dom";

function AssignmentOrg() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [models, setModels] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const [formData, setFormData] = useState({
    model_id: "",
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
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/llm/orgadmin/assignments`,
        config
      );
      if (res.data.success) {
        const data = res.data.data || [];
        setAssignments(data);

        // Extract unique batches
        const uniqueBatches = [
          ...new Map(
            data
              .filter((a) => a.batch_id && a.batch_name)
              .map((a) => [
                a.batch_id,
                { batch_id: a.batch_id, batch_name: a.batch_name },
              ])
          ).values(),
        ];
        setBatches(uniqueBatches);
      } else {
        setError(res.data.message || "Failed to fetch assignments");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch models
  const fetchModels = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/llm/orgadmin/assignments`,
        config
      );
      if (res.data.success) {
        const data = res.data.data || [];
        const uniqueModels = [
          ...new Map(
            data
              .filter((m) => m.model_id && m.model_name)
              .map((m) => [
                m.model_id,
                { model_id: m.model_id, model_name: m.model_name },
              ])
          ).values(),
        ];
        setModels(uniqueModels);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchModels();
  }, []);

  // ============ Modal Handlers ============
  const openCreateModal = () => {
    setEditMode(false);
    setSelectedAssignment(null);
    setFormData({
      model_id: "",
      level: "",
      batch_id: "",
      organization_id: "",
    });
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (assignment) => {
    setEditMode(true);
    setSelectedAssignment(assignment);
    setFormData({
      model_id: assignment.model_id || "",
      level: assignment.level || "",
      batch_id: assignment.batch_id || "",
      organization_id: assignment.organization_id || "",
    });
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedAssignment(null);
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
    setFormError(null);
    setFormSuccess(null);
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
        setFormSuccess(res.data.message);
        setTimeout(() => {
          closeModal();
          fetchAssignments();
        }, 800);
      } else {
        setFormError(res.data.message || "Operation failed.");
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ============ UI ============
  return (
    <div className="main-layout-container bg-light min-vh-100">
      <Supersidebar />

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
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
            <h3 className="fw-bold mb-0 text-dark">LLM Model Assignments</h3>
            <Button
              variant="primary"
              className="px-3 d-flex align-items-center gap-2"
              onClick={openCreateModal}
            >
              <FiPlus /> <span>New Assignment</span>
            </Button>
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
                         
                          <td>{a.model_name}</td>
                          <td>{a.name || "—"}</td>
                          <td>{a.level}</td>
                          <td>{a.organization_name || "—"}</td>
                          <td>{a.batch_name || "—"}</td>
                         
                          <td className="text-center">
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              onClick={() => openEditModal(a)}
                            >
                              <FiEdit2 /> Edit
                            </Button>
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

      {/* Modal for Create/Edit */}
      <Modal show={showModal} onHide={closeModal} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            {editMode ? "Edit Assignment" : "Create New Assignment"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            {/* Model Dropdown */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Model</Form.Label>
              <Form.Select
                value={formData.model_id}
                onChange={(e) =>
                  setFormData({ ...formData, model_id: e.target.value })
                }
                required
              >
                <option value="">Select Model</option>
                {models.map((m) => (
                  <option key={m.model_id} value={m.model_id}>
                    {m.model_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {/* Level Dropdown */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Level</Form.Label>
              <Form.Select
                value={formData.level}
                onChange={handleLevelChange} // 🆕 replaced direct handler
                required
              >
                <option value="">Select Level</option>
                <option value="organization">Organization</option>
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

            {formError && <Alert variant="danger">{formError}</Alert>}
            {formSuccess && <Alert variant="success">{formSuccess}</Alert>}

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
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AssignmentOrg;
