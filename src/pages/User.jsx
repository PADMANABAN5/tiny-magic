import React, { useEffect, useState } from "react";
import axios from "axios";
import Supersidebar from "../components/Supersidebar";
import {
  Pagination,
  Badge,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import "../styles/OrgList.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { useAuth } from '../components/AuthContext.jsx';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function User() {
  const navigate = useNavigate();
  const [podUsers, setPodUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSelectUsersModal, setShowSelectUsersModal] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [progressText, setProgressText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [unassignedOrgUsers, setUnassignedOrgUsers] = useState([]);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const [filteredBatches, setFilteredBatches] = useState([]);
  const [filteredPods, setFilteredPods] = useState([]);
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  // State for filters
  const [filters, setFilters] = useState({
    organization_name: "",
    batch_name: "", // Added for batch name filter
    pod_name: "",
  });

  // Form state for adding new user(s)
  const [newUser, setNewUser] = useState({
    organization_name: "",
    batch_name: "",
    batch_id: "",
    pod_name: "",
    pod_id: "",
    users: [],
  });

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

  // --- API Fetching Functions ---

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/organizations/active`,
        config
      );
      setOrganizations(res.data.data || []);
      return res.data.data || [];
    } catch (err) {
      console.error("Error fetching organizations:", err);
      setError("Failed to load organizations");
      return [];
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const orgs = await fetchOrganizations();
      if (orgs.length === 0) {
        setPodUsers([]);
        setLoading(false);
        return;
      }
      const userPromises = orgs.map((org) =>
        axios.get(
          `${process.env.REACT_APP_API_LINK}/pod-users/all/${
            org.organization_identifier || org.organization_name
          }`,
          config
        )
      );
      const results = await Promise.all(userPromises);
      const allPodUsers = results.flatMap((res) => res.data.data || []);
      setPodUsers(allPodUsers);
    } catch (err) {
      console.error("Error fetching pod users:", err);

      if (axios.isAxiosError(err) && err.response) {
        switch (err.response.status) {
          case 400:
            setError("Bad request – check organization identifiers.");
            break;
          case 401:
            setError("Unauthorized – please log in.");
            break;
          case 403:
            setError(
              "Forbidden – you do not have permission to access this resource."
            );
            break;
          case 404:
            setError("Not found – some organization data missing.");
            break;
          case 409:
            setError("Conflict – data conflict during fetch.");
            break;
          case 500:
            setError("Server error – please try again later.");
            break;
          default:
            setError(`Unexpected error (${err.response.status})`);
        }
      } else {
        setError("Network error – please check your connection.");
      }

      // Optional Toast UI
      showToastMsg(
        err.response?.data?.message || "Failed to load pod users"
      , "warning");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBatchesAndPods = async () => {
    try {
      const [batchRes, podRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_LINK}/batches`, config),
        axios.get(`${process.env.REACT_APP_API_LINK}/pods`, config),
      ]);
      setBatches(batchRes.data.data || []);
      setPods(podRes.data.data || []);
    } catch (err) {
      console.error("Error fetching dropdown data (batches/pods):", err);
    }
  };
 
  const fetchAllUsersForOrg = async (organizationName) => {
    if (!organizationName) {
      setUnassignedOrgUsers([]);
      return;
    }
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/pod-users/users/${organizationName}`,
        config
      );
      setUnassignedOrgUsers(res.data.data || []);
    } catch (err) {
      console.error(
        `Error fetching all users for ${organizationName}:`,
        err
      );
      setUnassignedOrgUsers([]);
    }
  };

  // --- Event Handlers ---

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUser.users.length === 0) {
      showToastMsg("Please select at least one user.", "warning");
      return;
    }
    if (!newUser.organization_name || !newUser.batch_id || !newUser.pod_id) {
      showToastMsg("Please ensure Organization, Batch, and Pod are selected.", "warning");
      return;
    }
    try {
      const usersToAssign = newUser.users.map((user) => ({
        user_identifier: user.email || user.username || user.user_id,
      }));
      await axios.post(
        `${process.env.REACT_APP_API_LINK}/pod-users`,
        {
          organization_name: newUser.organization_name,
          batch_name: newUser.batch_name,
          pod_name: newUser.pod_name,
          batch_id: newUser.batch_id,
          pod_id: newUser.pod_id,
          users: usersToAssign,
        },
        config
      );
      showToastMsg("User(s) added successfully", "primary");
      setShowAddUserModal(false);
      setNewUser({
        organization_name: "",
        batch_name: "",
        batch_id: "",
        pod_name: "",
        pod_id: "",
        users: [],
      });
      setTempSelectedUsers([]);
      fetchAllUsers();
    } catch (err) {
      console.error("Error adding user:", err);
      let message = "Failed to add user";
      if (err.response?.status === 409) {
        message =
          err.response.data.message || "One or more users are already assigned";
      } else if (err.response?.status === 401) {
        message = "Unauthorized. Please log in.";
      } else if (err.response?.status === 403) {
        message =
          "Forbidden: You do not have permission to perform this action.";
      } else if (err.response?.status === 500) {
        message = "Server error. Please try again later.";
      } else if (err.response?.status === 400) {
        message = err.response.data.message || "Invalid input provided";
      } else {
        message = err.response?.data?.message || "An unexpected error occurred";
      }
      showToastMsg(message, "warning");
    }
  };

  const handleProgressModal = (userId) => {
    setSelectedUserId(userId);
    setProgressText("");
    setShowProgressModal(true);
  };

  const handleInlineProgressUpdate = async () => {
    try {
      const formattedProgress = JSON.parse(progressText);
      await axios.put(
        `${process.env.REACT_APP_API_LINK}/pod-users/${selectedUserId}`,
        {
          progress: formattedProgress,
        },
        config
      );
      showToastMsg("Progress updated successfully", "primary");
      setShowProgressModal(false);
      fetchAllUsers();
    } catch (err) {
      console.error("Error updating progress:", err);
      if (err.response?.status === 409) {
        showToastMsg(err.response.data.message || "Conflict error", "warning");
      } else {
        showToastMsg(
          `Failed to update progress: ${err.message}. Ensure JSON format is correct.`
        , "warning");
      }
    }
  };

  const openSelectUsersModal = () => {
    if (!newUser.organization_name) {
      showToastMsg("Please select an Organization first to load unassigned users.", "warning");
      return;
    }
    setTempSelectedUsers([...newUser.users]);
    setUserSearchTerm("");
    setShowSelectUsersModal(true);
  };

  const handleUserCheckboxChange = (user) => {
    setTempSelectedUsers((prev) =>
      prev.some((u) => u.user_id === user.user_id)
        ? prev.filter((u) => u.user_id !== user.user_id)
        : [...prev, user]
    );
  };

  const confirmUserSelection = () => {
    setNewUser((prev) => ({
      ...prev,
      users: tempSelectedUsers,
    }));
    setShowSelectUsersModal(false);
  };

  // --- Filtering and Pagination ---

  const filteredUnassignedUsers = unassignedOrgUsers.filter((user) =>
    (user.email || "").toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const assignedUsers = podUsers.filter((user) => user.assigned);

  const filteredAssignedUsers = assignedUsers.filter((user) => {
    const fullName = `${user.first_name || ""} ${
      user.last_name || ""
    }`.toLowerCase();
    const orgMatch =
      !filters.organization_name ||
      (user.batch?.organization_name || "").toLowerCase() ===
        filters.organization_name.toLowerCase();
    const batchMatch =
      !filters.batch_name ||
      (user.batch?.batch_name || "")
        .toLowerCase()
        .includes(filters.batch_name.toLowerCase());
    const podMatch =
      !filters.pod_name ||
      (user.pod?.pod_name || "")
        .toLowerCase()
        .includes(filters.pod_name.toLowerCase());
    const nameMatch =
      !userSearchTerm || fullName.includes(userSearchTerm.toLowerCase());
    return orgMatch && batchMatch && podMatch && nameMatch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredAssignedUsers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredAssignedUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // --- useEffect Hooks ---

  useEffect(() => {
    fetchAllUsers();
    fetchAllBatchesAndPods();
  }, []);

  useEffect(() => {
    if (newUser.organization_name && batches.length > 0) {
      const newFilteredBatches = batches.filter(
        (batch) => batch.organization_name === newUser.organization_name
      );
      setFilteredBatches(newFilteredBatches);
    } else {
      setFilteredBatches([]);
    }
    setNewUser((prev) => ({
      ...prev,
      batch_name: "",
      batch_id: "",
      pod_name: "",
      pod_id: "",
      users: [],
    }));
    setUnassignedOrgUsers([]);
    setTempSelectedUsers([]);
  }, [newUser.organization_name, batches]);

  useEffect(() => {
    if (newUser.batch_id && pods.length > 0) {
      const newFilteredPods = pods.filter(
        (pod) => String(pod.batch_id) === String(newUser.batch_id)
      );
      setFilteredPods(newFilteredPods);
    } else {
      setFilteredPods([]);
    }
    setNewUser((prev) => ({ ...prev, pod_name: "", pod_id: "" }));
  }, [newUser.batch_id, pods]);

  useEffect(() => {
    if (newUser.organization_name) {
      fetchAllUsersForOrg(newUser.organization_name);
    } else {
      setUnassignedOrgUsers([]);
    }
  }, [newUser.organization_name]);

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Assigned Users</h3>
            <button
              className="create-btn"
              onClick={() => {
                setShowAddUserModal(true);
                setNewUser({
                  organization_name: "",
                  batch_name: "",
                  batch_id: "",
                  pod_name: "",
                  pod_id: "",
                  users: [],
                });
                setUnassignedOrgUsers([]);
                setTempSelectedUsers([]);
                setFilteredBatches([]);
                setFilteredPods([]);
              }}
              
            >
              <FaPlus />
            </button>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
            <div className="d-flex align-items-center">
              <label className="me-2 mb-0">Show entries:</label>
              <select
                className="form-select"
                style={{ width: "100px" }}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: "200px" }}
              placeholder="Search Full Name"
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <select
              className="form-select"
              style={{ maxWidth: "200px" }}
              value={filters.organization_name}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  organization_name: e.target.value,
                  batch_name: "", // Reset batch filter when organization changes
                }));
                setCurrentPage(1);
              }}
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.organization_id} value={org.organization_name}>
                  {org.organization_name}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: "200px" }}
              placeholder="Search Batch Name"
              value={filters.batch_name}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  batch_name: e.target.value,
                }));
                setCurrentPage(1);
              }}
            />
            <input
              type="text"
              className="form-control"
              style={{ maxWidth: "200px" }}
              placeholder="Search Pod Name"
              value={filters.pod_name}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  pod_name: e.target.value,
                }));
                setCurrentPage(1);
              }}
            />
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="">
                    <tr>
                      <th>Full name</th>
                      <th>Organization</th>
                      <th>Batch</th>
                      <th>Pod</th>
                      <th>Concepts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.length > 0 ? (
                      currentUsers.map((user, idx) => (
                        <tr key={idx}>
                          <td>
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : "—"}
                          </td>
                          <td>{user.batch?.organization_name || "—"}</td>
                          <td>{user.batch?.batch_name || "—"}</td>
                          <td>{user.pod?.pod_name || "—"}</td>
                          <td>
                            {user.batch?.concepts?.length ? (
                              <OverlayTrigger
                                trigger="click"
                                placement="top"
                                overlay={
                                  <Tooltip
                                    id={`tooltip-${user.user_id}`}
                                    className="custom-tooltip"
                                  >
                                    <ul className="mb-0 ps-3">
                                      {user.batch.concepts.map((concept) => (
                                        <li
                                          key={concept.concept_id}
                                          className="concept-item"
                                        >
                                          {concept.concept_name}
                                        </li>
                                      ))}
                                    </ul>
                                  </Tooltip>
                                }
                                rootClose
                              >
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    backgroundColor: "#00b2d7",
                                    color: "white",
                                    borderRadius: "0.5rem",
                                    padding: "4px 10px",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    gap: "6px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Concepts
                                  <span
                                    style={{
                                      backgroundColor: "#6c757d",
                                      color: "white",
                                      borderRadius: "999px",
                                      padding: "2px 8px",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {user.batch.concepts.length}
                                  </span>
                                </div>
                              </OverlayTrigger>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          No assigned users found.
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

      {/* Add User Main Modal */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Add User to Pod</h4>
            <form onSubmit={handleAddUser}>
              <div className="mb-3">
                <label className="form-label">
                  Organization <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={newUser.organization_name}
                  onChange={(e) => {
                    const selectedOrgName = e.target.value;
                    setNewUser((prev) => ({
                      ...prev,
                      organization_name: selectedOrgName,
                      batch_name: "",
                      batch_id: "",
                      pod_name: "",
                      pod_id: "",
                      users: [],
                    }));
                  }}
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
                  Batch <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={newUser.batch_id}
                  onChange={(e) => {
                    const selectedBatchId = e.target.value;
                    const selectedBatch = filteredBatches.find(
                      (batch) =>
                        String(batch.batch_id) === String(selectedBatchId)
                    );
                    setNewUser((prev) => ({
                      ...prev,
                      batch_id: selectedBatchId,
                      batch_name: selectedBatch ? selectedBatch.batch_name : "",
                      pod_name: "",
                      pod_id: "",
                    }));
                  }}
                  required
                  disabled={!newUser.organization_name}
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
                  Pod <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={newUser.pod_id}
                  onChange={(e) => {
                    const selectedPodId = e.target.value;
                    const selectedPod = filteredPods.find(
                      (pod) => String(pod.pod_id) === String(selectedPodId)
                    );
                    setNewUser((prev) => ({
                      ...prev,
                      pod_id: selectedPodId,
                      pod_name: selectedPod ? selectedPod.pod_name : "",
                    }));
                  }}
                  required
                  disabled={!newUser.batch_id}
                >
                  <option value="">-- Select Pod --</option>
                  {filteredPods.map((pod) => (
                    <option key={pod.pod_id} value={pod.pod_id}>
                      {pod.pod_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Selected User(s) <span style={{ color: "red" }}>*</span>
                </label>
                <div className="d-flex align-items-center border p-2 rounded">
                  <span className="flex-grow-1 text-muted">
                    {newUser.users.length > 0
                      ? newUser.users
                          .map(
                            (u) =>
                              `${u.first_name} ${u.last_name} (${u.username})`
                          )
                          .join(", ")
                      : "No users selected"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-info btn-sm ms-2"
                    onClick={openSelectUsersModal}
                    disabled={!newUser.organization_name}
                    style={{ width: "150px" }}
                  >
                    Select Users
                  </button>
                </div>
                {newUser.users.length === 0 && (
                  <small className="text-danger mt-1">
                    Please select at least one user.
                  </small>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success">
                  Add
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddUserModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSelectUsersModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSelectUsersModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Select Unassigned Users for {newUser.organization_name}</h4>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search user name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <div
              className="user-list-container"
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                border: "1px solid #ccc",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              {filteredUnassignedUsers.length > 0 ? (
                <ul className="list-group">
                  {filteredUnassignedUsers.map((user) => (
                    <li
                      key={user.user_id}
                      className="list-group-item d-flex align-items-center"
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        id={`user-${user.user_id}`}
                        checked={tempSelectedUsers.some(
                          (u) => u.user_id === user.user_id
                        )}
                        onChange={() => handleUserCheckboxChange(user)}
                      />
                      <label
                        htmlFor={`user-${user.user_id}`}
                        className="form-check-label flex-grow-1"
                      >
                        {user.first_name} {user.last_name} ({user.username})
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted">
                  {newUser.organization_name
                    ? "No unassigned users found for this organization or matching your search."
                    : "Select an organization first."}
                </p>
              )}
            </div>
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn btn-success"
                onClick={confirmUserSelection}
                style={{ width: "200px" }}
              >
                Add Selected Users ({tempSelectedUsers.length})
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSelectUsersModal(false)}
                style={{ width: "200px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgressModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowProgressModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Progress</h4>
            <textarea
              className="form-control mb-3"
              placeholder='[{"concept_id":1,"status":"completed"}]'
              value={progressText}
              onChange={(e) => setProgressText(e.target.value)}
              rows={6}
            ></textarea>
            <div className="d-flex gap-2">
              <button
                className="btn btn-warning"
                onClick={handleInlineProgressUpdate}
              >
                Update
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowProgressModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}