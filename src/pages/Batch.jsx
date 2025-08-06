import React, { useEffect, useState } from "react";
import axios from "axios";
import Select from "react-select";
import { Pagination, Toast, ToastContainer } from "react-bootstrap";
import Supersidebar from "../components/Supersidebar";
import "../styles/OrgList.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";

export default function Batch() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastBg, setToastBg] = useState("primary");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchBatchName, setSearchBatchName] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  const [batchForm, setBatchForm] = useState({
    organization_name: "",
    batch_name: "",
    batch_size: "",
    is_active: true,
    concept_ids: [],
  });

  const fetchBatches = async () => {
    setLoading(true);
    setError(null); // Optional if you're only using toast

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/batches`,
        config
      );

      if (res.data && Array.isArray(res.data.data)) {
        setBatches(res.data.data);
      } else {
        setBatches([]);
        setToastMessage("⚠️ Unexpected response format from server.");
        setToastBg("warning");
        setShowToast(true);
      }
    } catch (err) {
      console.error("Error fetching batches:", err);

      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to load batches.";
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
            setToastMessage("⚠️ Batches not found.");
            break;
          case 409:
            setToastMessage("⚠️ Conflict: Data inconsistency.");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try again later.");
            break;
          default:
            setToastMessage(
              `⚠️ Failed to fetch batches. (${errorType || "Unknown error"})`
            );
        }

        setToastBg("warning");
      } else {
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("danger");
      }

      setShowToast(true);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConcepts = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/concepts`,
        config
      );
      if (res.data && Array.isArray(res.data.data)) {
        setConcepts(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching concepts:", err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/organizations/active`,
        config
      );
      if (res.data && Array.isArray(res.data.data)) {
        setOrganizations(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  const openCreateModal = () => {
    setBatchForm({
      organization_name: "",
      batch_name: "",
      batch_size: "",
      is_active: true,
      concept_ids: [],
    });
    setIsEditMode(false);
    setSelectedBatchId(null);
    setShowModal(true);
  };

  const openEditModal = (batch) => {
    setBatchForm({
      organization_name: batch.organization_name,
      batch_name: batch.batch_name,
      batch_size: batch.batch_size,
      is_active: batch.is_active,
      concept_ids: Array.isArray(batch.concepts)
        ? batch.concepts.map((c) => ({
            value: c.concept_id,
            label: `${c.concept_id} - ${c.concept_name}`,
          }))
        : [],
    });
    setIsEditMode(true);
    setSelectedBatchId(batch.batch_id);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...batchForm,
      concept_ids: batchForm.concept_ids.map((c) => c.value),
    };

    try {
      if (isEditMode && selectedBatchId) {
        await axios.put(
          `${process.env.REACT_APP_API_LINK}/batches/${selectedBatchId}`,
          payload,
          config
        );
        setToastMessage("✅ Batch updated successfully!");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_LINK}/batches`,
          payload,
          config
        );
        setToastMessage("✅ Batch created successfully!");
      }
      setToastBg("primary");
      setShowToast(true);
      setShowModal(false);
      fetchBatches();
    } catch (err) {
      console.error("Error saving batch:", err);

      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        switch (status) {
          case 400:
            // Handle all validation errors
            setToastMessage(`⚠️ ${errorData.message || "Invalid request"}`);
            setToastBg("warning");
            break;
          case 401:
            // Handle unauthorized access
            setToastMessage("⚠️ Unauthorized. Please log in.");
            setToastBg("warning");
            break;
          case 403:
            // Handle forbidden access
            setToastMessage(
              "⚠️ Forbidden: You do not have permission to perform this action."
            );
            setToastBg("warning");
            break;

          case 404:
            // Handle batch not found (update only)
            setToastMessage("⚠️ Batch not found");
            setToastBg("warning");
            break;

          case 409:
            // Handle duplicate batch name or sequence conflict
            setToastMessage(`⚠️ ${errorData.message}`);
            setToastBg("warning");
            break;

          case 500:
            // Handle server errors
            setToastMessage("⚠️ Server error. Please try again later.");
            setToastBg("warning");
            break;

          default:
            // Handle other errors
            setToastMessage("⚠️ Unexpected error occurred");
            setToastBg("warning");
        }
      } else {
        // Handle network errors
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("warning");
      }

      setShowToast(true);
    }
  };
  useEffect(() => {
    fetchConcepts();
    fetchOrganizations();
    fetchBatches();
  }, []);

  const conceptOptions = concepts.map((concept) => ({
    value: concept.concept_id,
    label: `${concept.concept_id} - ${concept.concept_name}`,
  }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredBatches = batches.filter(
    (batch) =>
      batch.batch_name.toLowerCase().includes(searchBatchName.toLowerCase()) &&
      (selectedOrganization === "" ||
        batch.organization_name === selectedOrganization)
  );

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const currentBatches = filteredBatches.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Batches</h3>
            <button
              className="create-btn"
              onClick={openCreateModal}
              style={{ width: "10%" }}
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
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* Filters in single line */}
            <div
              className="d-flex align-items-center gap-3 flex-grow-1"
              style={{ flexWrap: "nowrap" }}
            >
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "220px" }}
                placeholder="Search by Batch Name"
                value={searchBatchName}
                onChange={(e) => {
                  setSearchBatchName(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <select
                className="form-select"
                style={{ maxWidth: "200px" }}
                value={selectedOrganization}
                onChange={(e) => {
                  setSelectedOrganization(e.target.value);
                  setCurrentPage(1); // reset pagination
                }}
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option
                    key={org.organization_id}
                    value={org.organization_name}
                  >
                    {org.organization_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p>Loading batches...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th>Org Name</th>
                      <th>Batch Name</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Concept IDs</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBatches.length > 0 ? (
                      currentBatches.map((batch) => (
                        <tr key={batch.batch_id}>
                          <td>{batch.organization_name}</td>
                          <td>{batch.batch_name}</td>
                          <td>{batch.batch_size}</td>
                          <td>
                            <span
                              className={`badge ${
                                batch.is_active ? "bg-success" : "bg-secondary"
                              }`}
                            >
                              {batch.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {Array.isArray(batch.concepts)
                              ? batch.concepts
                                  .map((c) => c.concept_id)
                                  .join(", ")
                              : "—"}
                          </td>
                          <td>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => openEditModal(batch)}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          No batches found.
                        </td>
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
            </>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div
            className="modal-content modal-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <h4>{isEditMode ? "Update Batch" : "Create New Batch"}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  Organization Name<span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={batchForm.organization_name}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      organization_name: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((org) => (
                    <option
                      key={org.organization_id}
                      value={org.organization_name}
                    >
                      {org.organization_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Batch Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={batchForm.batch_name}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      batch_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Batch Size<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={batchForm.batch_size}
                  onChange={(e) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      batch_size: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Concepts<span style={{ color: "red" }}>*</span>
                </label>
                <Select
                  isMulti
                  options={conceptOptions}
                  value={batchForm.concept_ids}
                  onChange={(selected) =>
                    setBatchForm((prev) => ({
                      ...prev,
                      concept_ids: selected || [],
                    }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label d-block" htmlFor="is_active">
                  Active Status
                </label>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="is_active"
                    checked={batchForm.is_active}
                    onChange={(e) =>
                      setBatchForm((prev) => ({
                        ...prev,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="is_active">
                    {batchForm.is_active ? "Active" : "Inactive"}
                  </label>
                </div>
              </div>

              <div className="d-flex justify-content-between">
                <button type="submit" className="btn btn-success">
                  {isEditMode ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
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
