import React, { useEffect, useState } from "react";
import axios from "axios";
import Select from "react-select";  // New import for multi-select
import Supersidebar from "../components/Supersidebar";
import { Pagination, Badge, OverlayTrigger, Popover } from "react-bootstrap";  // Changed Tooltip to Popover
import "../styles/OrgList.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { useAuth } from "../components/AuthContext";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Pods() {
  const navigate = useNavigate();
  const [pods, setPods] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPodId, setSelectedPodId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchPodName, setSearchPodName] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  // Changed from selectedBatch to searchBatchName for input field
  const [searchBatchName, setSearchBatchName] = useState("");
  // Changed from selectedMentor to searchMentorName for input field
  const [searchMentorName, setSearchMentorName] = useState("");
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const podNameRegex = /^(?!.*\s{2,})(?!^\s)(?!.*\s$)[A-Za-z0-9 ]*$/;

  const [podForm, setPodForm] = useState({
    organization_id: "",
    batch_id: "",
    mentors: [],  // Array of selected mentor emails (for react-select values)
    pod_name: "",
    is_active: true,
  });
  const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };

  // Filters state is no longer directly used for batch/mentor search inputs
  // The individual state variables (searchBatchName, searchMentorName) are used instead.
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // This function is kept for consistency if other filters are added to the 'filters' state
    // but for batch/mentor, we'll use their specific state setters.
    setCurrentPage(1);
  };

  // Helper to clean mentors array (remove empties, though not needed for react-select)
  const cleanMentors = () => podForm.mentors.filter(m => m && m.trim() !== "");

  const filteredPods = pods.filter((pod) => {
    const podNameMatch = pod.pod_name
      ?.toLowerCase()
      .includes(searchPodName.toLowerCase());
    const orgMatch =
      selectedOrganization === "" ||
      pod.organization_id?.toString() === selectedOrganization;

    // Filter by batch name (text input)
    const batchName =
      batches.find((b) => b.batch_id === pod.batch_id)?.batch_name || "";
    const batchMatch =
      searchBatchName === "" ||
      batchName.toLowerCase().includes(searchBatchName.toLowerCase());

    // Filter by mentor (check if any in pod.mentors array matches searchMentorName by ID or full name)
    const mentorMatch = searchMentorName === "" || 
      pod.mentors?.some(m => 
        m.user_id?.toString() === searchMentorName || 
        `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase().includes(searchMentorName.toLowerCase())
      );

    return podNameMatch && orgMatch && batchMatch && mentorMatch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPods = filteredPods.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPods.length / itemsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  
  const validatePodName = (e) => {
  const { value } = e.target;
  if (!podNameRegex.test(value)) {
    e.target.setCustomValidity(
      "Please enter a valid pod name."
    );
  } else {
    e.target.setCustomValidity("");
  }
  e.target.reportValidity();
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

  const showToastMsg = (message, bg = "primary") => {
    toast(message, { type: getToastType(bg) });
  };

  const fetchPods = async () => {
    setLoading(true);
    setError(null); // Optional if only using toast

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/pods`,
        config
      );

      if (res.data && Array.isArray(res.data.data)) {
        setPods(res.data.data);
      } else {
        setPods([]);
        showToastMsg("Unexpected API response format.", "warning");
      }
    } catch (err) {
      console.error("Error fetching pods:", err);

      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to load pods.";
        const errorType = err.response?.status;

        switch (errorType) {
          case 400:
            showToastMsg(`Bad request: ${errorMessage}`);
            break;
          case 401:
            showToastMsg("Unauthorized. Please log in.");
            break;
          case 403:
            showToastMsg("Forbidden: You do not have permission.");
            break;
          case 404:
            showToastMsg("Pods not found.");
            break;
          case 409:
            showToastMsg("Conflict: Data inconsistency.");
            break;
          case 500:
            showToastMsg("Server error. Please try again later.");
            break;
          default:
            showToastMsg(
              `Failed to fetch pods. (${errorType || "Unknown error"})`
            );
        }
      } else {
        showToastMsg("Network error. Please check your connection.", "danger");
      }

      setPods([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/organizations/active`,
        config
      );
      setOrganizations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching organizations:", err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/batches`,
        config
      );
      setBatches(res.data.data || []);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/users/role/mentor`,
        config
      );
      setMentors(res.data.data || []);
    } catch (err) {
      console.error("Error fetching mentors:", err);
    }
  };

  const openCreateModal = () => {
    setPodForm({
      organization_id: "",
      batch_id: "",
      mentors: [],  // Empty for create
      pod_name: "",
      is_active: true,
    });
    setIsEditMode(false);
    setSelectedPodId(null);
    setShowModal(true);
  };

  const openEditModal = (pod) => {
    setPodForm({
      organization_id: pod.organization_id || "",
      batch_id: pod.batch_id || "",
      mentors: pod.mentors ? pod.mentors.map(m => m.email) : [],  // Load existing as array of emails
      pod_name: pod.pod_name || "",
      is_active: pod.is_active || false,
    });
    setIsEditMode(true);
    setSelectedPodId(pod.pod_id);
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (cleanMentors().length === 0) {
      showToastMsg("At least one mentor is required.", "warning");
      return;
    }

    const selectedOrg = organizations.find(
      (org) => org.organization_id === parseInt(podForm.organization_id)
    );
    const selectedBatch = batches.find(
      (batch) => batch.batch_id === parseInt(podForm.batch_id)
    );

    const payload = {
      organization_name: selectedOrg ? selectedOrg.organization_name : "",
      batch_name: selectedBatch ? selectedBatch.batch_name : "",
      mentors: cleanMentors(),  // Array of emails for backend
      pod_name: podForm.pod_name,
      is_active: podForm.is_active,
    };

    try {
      if (isEditMode && selectedPodId) {
        await axios.put(
          `${process.env.REACT_APP_API_LINK}/pods/${selectedPodId}`,
          payload,
          config
        );
        showToastMsg("Pod updated successfully!", "primary");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_LINK}/pods`,
          payload,
          config
        );
        showToastMsg("Pod created successfully!", "primary");
      }
      setShowModal(false);
      fetchPods();
    } catch (err) {
      console.error("Error saving pod:", err);

      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const data = err.response.data;

        switch (status) {
          case 400:
            showToastMsg(
              `${data.message || "Invalid request parameters"}`
            , "warning");
            break;
          case 401:
            showToastMsg("Unauthorized. Please log in.", "warning");
            break;

          case 404:
            showToastMsg(`${data.message || "Resource not found"}`, "warning");
            break;

          case 409:
            showToastMsg("Pod name already exists!", "warning");
            break;

          case 500:
            showToastMsg("Server error. Please try again later", "warning");
            break;

          default:
            showToastMsg("An unexpected error occurred", "warning");
        }
      } else {
        showToastMsg("Network error. Please check your connection", "warning");
      }
    }
  };

  const handleOrganizationChange = (e) => {
    const organizationId = e.target.value;
    setPodForm((prev) => ({
      ...prev,
      organization_id: organizationId,
      batch_id: "", // Reset batch when organization changes
    }));
  };

  const filteredBatches = batches.filter(
    (batch) =>
      batch.organization_id?.toString() === podForm.organization_id.toString()
  );

  useEffect(() => {
    fetchPods();
    fetchOrganizations();
    fetchBatches();
    fetchMentors();
  }, []);

  // Helper for popover content: List of mentor names
  const getMentorPopover = (podMentors) => {
    if (!podMentors || podMentors.length === 0) return <div>No mentors assigned</div>;
    return (
      <ul style={{ margin: 0, paddingLeft: '15px' }}>
        {podMentors.map((m, index) => (
          <li key={index}>{`${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email}</li>
        ))}
      </ul>
    );
  };

  // react-select options for mentors
  const mentorOptions = mentors.map(mentor => ({
    value: mentor.email,
    label: `${mentor.email} (${`${mentor.first_name || ""} ${mentor.last_name || ""}`.trim()})`
  }));

  return (
    <div className="main-layout-container">
      {/* Supersidebar is assumed to be a separate component */}
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Pods</h3>
            <button
              className="create-btn"
              onClick={openCreateModal}
              
            >
              <FaPlus />
            </button>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            {/* Show Entries */}
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
                {[5, 6, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            {/* Filters Row */}
            <div
              className="d-flex align-items-center gap-3 flex-grow-1"
              style={{ flexWrap: "nowrap" }}
            >
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "200px" }}
                placeholder="Search Pod Name"
                value={searchPodName}
                onChange={(e) => {
                  setSearchPodName(e.target.value);
                  setCurrentPage(1);
                }}
              />

              {/* Changed Batch filter to input */}
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "200px" }}
                placeholder="Search Batch Name"
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
                  setCurrentPage(1);
                }}
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.organization_id} value={org.organization_id}>
                    {org.organization_name}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                style={{ maxWidth: "250px" }}
                value={searchMentorName}
                onChange={(e) => {
                  setSearchMentorName(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Mentors</option>
                {mentors.map((mentor) => (
                  <option key={mentor.user_id} value={mentor.user_id}>
                    {mentor.email} ({`${mentor.first_name || ""} ${mentor.last_name || ""}`.trim()})
                  </option>
                ))}
              </select>

            </div>
          </div>

          {loading ? (
            <p>Loading pods...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="">
                    <tr>
                      <th>Pod Name</th>
                      <th>Organization Name</th>
                      <th>Batch Name</th>
                      <th>Mentor Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPods.length > 0 ? (
                      currentPods.map((pod) => (
                        <tr key={pod.pod_id}>
                          <td>{pod.pod_name}</td>
                          <td>{pod.batch?.organization_name || "—"}</td>
                          <td>
                            {batches.find(
                              (batch) => batch.batch_id === pod.batch_id
                            )?.batch_name || "—"}
                          </td>
                          <td>
  <OverlayTrigger
    trigger="click"
    rootClose={true}  // Explicitly enable outside-click closing
    rootCloseEvent="mousedown"
    placement="top"
    overlay={
      <Popover id={`mentors-popover-${pod.pod_id}`}>
        <Popover.Header as="h3">Mentors ({pod.mentors?.length || 0})</Popover.Header>
        <Popover.Body>
          {getMentorPopover(pod.mentors)}
        </Popover.Body>
      </Popover>
    }
  >
    <Badge className="outline-primary cursor-pointer user-select-none">
      {pod.mentors?.length || 0} Mentors
    </Badge>
  </OverlayTrigger>
</td>
                          <td>
                            <span
                              className={`badge ${
                                pod.is_active
                                  ? "bg-success"
                                  : "bg-secondary"
                              }`}
                            >
                              {pod.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-success btn-sm"
                              onClick={() => openEditModal(pod)}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          No pods found.
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{isEditMode ? "Update Pod" : "Create Pod"}</h4>
            <form onSubmit={handleFormSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  Organization <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={podForm.organization_id}
                  onChange={handleOrganizationChange}
                  required
                >
                  <option value="">-- Select Organization --</option>
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

              <div className="mb-3">
                <label className="form-label">
                  Batch <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={podForm.batch_id}
                  onChange={(e) =>
                    setPodForm((prev) => ({
                      ...prev,
                      batch_id: e.target.value,
                    }))
                  }
                  required
                  disabled={!podForm.organization_id}
                >
                  <option value="">-- Select Batch --</option>
                  {filteredBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Mentors <span style={{ color: "red" }}>*</span>
                </label>
                <Select
                  isMulti
                  options={mentorOptions}
                  value={mentorOptions.filter(option => podForm.mentors.includes(option.value))}
                  onChange={(selected) => setPodForm(prev => ({ ...prev, mentors: selected ? selected.map(s => s.value) : [] }))}
                  placeholder="Select mentors ..."
                  isClearable
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, minHeight: '38px' }),
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Pod Name <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  value={podForm.pod_name}
                  onChange={(e) => {
                    if (e.target.value.length > 50) {
                      showToastMsg("Pod name cannot exceed 50 characters!", "warning");
                      return;
                    }
                    setPodForm((prev) => ({
                      ...prev,
                      pod_name: e.target.value,
                    }));
                    validatePodName(e); 
                  }}
                  required
                />
              </div>

              <div className="d-flex gap-2">
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
    </div>
  );
}