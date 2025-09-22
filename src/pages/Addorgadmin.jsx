import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Supersidebar from "../components/Supersidebar";
import { Pagination, Toast, ToastContainer, Form } from "react-bootstrap";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../styles/OrgList.css";
import { useAuth } from "../components/AuthContext";

export default function Addorgadmin() {
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    organization_name: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState("");
  const [toastBg, setToastBg] = useState("primary");
  const [showToast, setShowToast] = useState(false);
  const passwordRef = useRef(null);
  const editPasswordRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const usernameRef = useRef(null);
  const editFirstNameRef = useRef(null);
  const editLastNameRef = useRef(null);
  const editUsernameRef = useRef(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const nameRegex = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/;
  const usernameRegex = /^[A-Za-z0-9_]+$/;
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
   const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };
  // Fetch admins & orgs
  const fetchOrgAdmins = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/users/role/orgadmin`,
        config
      );

      if (res.status === 200 && Array.isArray(res.data?.data)) {
        setOrgAdmins(res.data.data);
      } else {
        setOrgAdmins([]);
        setToastMessage("⚠️ Unexpected data format received from server.");
        setToastBg("warning");
        setShowToast(true);
      }
    } catch (err) {
      console.error("Error fetching organization admins:", err);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message =
          err.response?.data?.message || "Failed to load organization admins.";

        switch (status) {
          case 400:
            setToastMessage(`⚠️ ${message}`);
            setToastBg("warning");
            break;
          case 401:
            setToastMessage("⚠️ Unauthorized. Please log in.");
            setToastBg("warning");
            break;
          case 403:
            setToastMessage("⚠️ Forbidden: Access denied.");
            setToastBg("warning");
            break;
          case 404:
            setToastMessage("⚠️ Organization admins not found.");
            setToastBg("warning");
            break;
          case 409:
            setToastMessage("⚠️ Conflict: Duplicate admin data.");
            setToastBg("warning");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try again later.");
            setToastBg("danger");
            break;
          default:
            setToastMessage(
              "⚠️ Failed to fetch organization admins. Please try again later."
            );
            setToastBg("warning");
        }

        setShowToast(true);
      } else {
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("danger");
        setShowToast(true);
      }

      setOrgAdmins([]);
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
      setOrganizations(Array.isArray(res.data.data) ? res.data.data : []);
    } catch {
      // ignore
    }
  };

  // Validation handlers
  // ✅ Strong password validator (create = required, edit = optional)
  //    Keeps the same signature you are already using: (e, ref)
  const validatePassword = (e, ref) => {
    const pwd = e.target.value || "";

    // If field is optional (e.g., Edit modal with no 'required' attr) and empty -> allow
    const isOptional = ref?.current && !ref.current.required;
    if (isOptional && pwd.length === 0) {
      ref.current.setCustomValidity("");
      return;
    }

    const minLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*?]/.test(pwd);

    let message = "";
    if (!minLength) {
      message = "Password must be at least 8 characters long";
    } else if (!hasUppercase) {
      message = "Password must contain at least one uppercase letter";
    } else if (!hasLowercase) {
      message = "Password must contain at least one lowercase letter";
    } else if (!hasNumber) {
      message = "Password must contain at least one number";
    } else if (!hasSpecialChar) {
      message =
        "Password must contain at least one special character (!@#$%^&*?)";
    }

    ref.current.setCustomValidity(message);
  };

  const validateName = (e, ref, field) => {
    const value = e.target.value;
    ref.current.setCustomValidity(
      !nameRegex.test(value)
        ? `${field} should only contain letters and single spaces between words`
        : ""
    );
  };

  const validateUsername = (e, ref) => {
    const value = e.target.value;
    ref.current.setCustomValidity(
      !usernameRegex.test(value) ? "Please Enter a valid Username" : ""
    );
  };

  // Create admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!nameRegex.test(newAdmin.first_name)) {
      firstNameRef.current.setCustomValidity(
        "Please Enter a valid First Name"
      );
      firstNameRef.current.reportValidity();
      return;
    }
    if (!nameRegex.test(newAdmin.last_name)) {
      lastNameRef.current.setCustomValidity(
        "Please Enter a valid Last Name"
      );
      lastNameRef.current.reportValidity();
      return;
    }
    if (newAdmin.password.length < 8) {
      passwordRef.current.setCustomValidity(
        "Password must be at least 8 characters"
      );
      passwordRef.current.reportValidity();
      return;
    }
    firstNameRef.current.setCustomValidity("");
    lastNameRef.current.setCustomValidity("");
    passwordRef.current.setCustomValidity("");
    try {
      await axios.post(
        `${process.env.REACT_APP_API_LINK}/users/orgadmin`,
        newAdmin,
        config
      );
      setToastBg("primary");
      setToastMessage("Admin created successfully!");
      setShowToast(true);
      setShowModal(false);
      setNewAdmin({
        organization_name: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
      });
      fetchOrgAdmins();
    } catch (err) {
      let toastMessage = "";
      let toastBg = "warning";

      switch (err.response?.status) {
        case 400:
          if (err.response.data?.message) {
            toastMessage = `⚠️ ${err.response.data.message}`;
          } else if (err.response.data?.error === "Bad request") {
            toastMessage =
              "⚠️ Invalid request: " +
              (err.response.data?.message ||
                "Missing required fields or invalid data");
          } else {
            toastMessage = "⚠️ Invalid request. Please check your input.";
          }
          break;
        case 401:
          setToastMessage("⚠️ Unauthorized. Please log in.");
          setToastBg("warning");
          break;
        case 403:
          setToastMessage("⚠️ Forbidden: Access denied.");
          setToastBg("warning");
          break;
        case 409:
          toastMessage =
            "⚠️ " +
            (err.response.data?.message ||
              "Admin with this email or username already exists");
          break;
        case 500:
          toastMessage = "⚠️ Server error. Please try again later.";
          break;
        default:
          toastMessage = "⚠️ Failed to create admin. Please try again.";
      }

      setToastBg(toastBg);
      setToastMessage(toastMessage);
      setShowToast(true);
    }
  };

  // Edit admin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!nameRegex.test(editingAdmin.first_name)) {
      editFirstNameRef.current.setCustomValidity(
        "Please Enter a valid First Name"
      );
      editFirstNameRef.current.reportValidity();
      return;
    }
    if (!nameRegex.test(editingAdmin.last_name)) {
      editLastNameRef.current.setCustomValidity(
        "Please Enter a valid Last Name"
      );
      editLastNameRef.current.reportValidity();
      return;
    }
    if (editingAdmin.username && !usernameRegex.test(editingAdmin.username)) {
      editUsernameRef.current.setCustomValidity(
        "Please Enter a valid Username"
      );
      editUsernameRef.current.reportValidity();
      return;
    }
    if (editingAdmin.password && editingAdmin.password.length < 8) {
      editPasswordRef.current.setCustomValidity(
        "Password must be at least 8 characters"
      );
      editPasswordRef.current.reportValidity();
      return;
    }
    editFirstNameRef.current.setCustomValidity("");
    editLastNameRef.current.setCustomValidity("");
    editUsernameRef.current.setCustomValidity("");
    editPasswordRef.current.setCustomValidity("");
    try {
      await axios.put(
        `${process.env.REACT_APP_API_LINK}/users/${editingAdmin.user_id}`,
        editingAdmin,
        config
      );
      setToastBg("primary");
      setToastMessage("Admin updated successfully!");
      setShowToast(true);
      setShowEditModal(false);
      setEditingAdmin(null);
      fetchOrgAdmins();
    } catch (err) {
      let toastMessage = "";
      let toastBg = "warning";

      switch (err.response?.status) {
        case 400:
          toastMessage = "⚠️ Invalid request. Please check your input.";
          break;
        case 401:
          toastMessage = "⚠️ Unauthorized. Please login again.";
          break;
        case 403:
          toastMessage =
            "⚠️ Forbidden. You don't have permission to update this admin.";
          break;
        case 404:
          toastMessage = "⚠️ Admin not found.";
          break;
        case 409:
          toastMessage =
            "⚠️ Organization Admin with this email already exists.";
          toastBg = "warning";
          break;
        case 500:
          toastMessage = "⚠️ Server error. Please try again later.";
          break;
        default:
          toastMessage = "⚠️ Failed to update admin. Please try again.";
      }

      setToastBg(toastBg);
      setToastMessage(toastMessage);
      setShowToast(true);
    }
  };

  useEffect(() => {
    fetchOrgAdmins();
    fetchOrganizations();
  }, []);

  const filteredAdmins = orgAdmins.filter((admin) => {
    const fullName = `${admin.first_name} ${admin.last_name}`.toLowerCase();
    const matchesFullName = fullName.includes(searchTerm.toLowerCase());
    const matchesOrganization =
      !selectedOrganization || admin.organization_name === selectedOrganization;
    return matchesFullName && matchesOrganization;
  });

  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentAdmins = filteredAdmins.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
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
            <h3>Organization Admins</h3>
            <button
              className="create-btn"
              onClick={() => setShowModal(true)}
              style={{ width: "10%" }}
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
                placeholder="Search by Full Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
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
            <p>Loading admins...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th>Organization</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAdmins.length > 0 ? (
                      currentAdmins.map((admin) => (
                        <tr key={admin.user_id}>
                          <td>{admin.organization_name}</td>
                          <td>{admin.email}</td>
                          <td>{admin.username || "-"}</td>
                          <td>{`${admin.first_name} ${admin.last_name}`}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => {
                                setEditingAdmin({ ...admin, password: "" });
                                setShowEditModal(true);
                              }}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          No admins found.
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

      <ToastContainer position="top-end" className="p-3">
        <Toast
          bg={toastBg}
          show={showToast}
          delay={3000}
          autohide
          onClose={() => setShowToast(false)}
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Notice</strong>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create Organization Admin</h4>
            <form onSubmit={handleCreateAdmin}>
              <div className="mb-3">
                <label className="form-label">
                  Organization Name<span style={{ color: "red" }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={newAdmin.organization_name}
                  onChange={(e) =>
                    setNewAdmin({
                      ...newAdmin,
                      organization_name: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select Organization</option>
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
                  Email<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  value={newAdmin.email}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  First Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  ref={firstNameRef}
                  value={newAdmin.first_name}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ First name cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setNewAdmin({ ...newAdmin, first_name: e.target.value });
                    validateName(e, firstNameRef, "First Name");
                  }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Last Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  ref={lastNameRef}
                  value={newAdmin.last_name}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ Last name cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setNewAdmin({ ...newAdmin, last_name: e.target.value });
                    validateName(e, lastNameRef, "Last Name");
                  }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Password<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="password"
                  className="form-control"
                  ref={passwordRef}
                  value={newAdmin.password}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ Password cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setNewAdmin({ ...newAdmin, password: e.target.value });
                    validatePassword(e, passwordRef);
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success me-2">
                Create
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAdmin && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Admin</h4>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  ref={editUsernameRef}
                  value={editingAdmin.username || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ Username cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setEditingAdmin({
                      ...editingAdmin,
                      username: e.target.value,
                    });
                    validateUsername(e, editUsernameRef);
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Email<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  value={editingAdmin.email || ""}
                  onChange={(e) =>
                    setEditingAdmin({
                      ...editingAdmin,
                      email: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  First Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  ref={editFirstNameRef}
                  value={editingAdmin.first_name || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ First name cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setEditingAdmin({
                      ...editingAdmin,
                      first_name: e.target.value,
                    });
                    validateName(e, editFirstNameRef, "First Name");
                  }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Last Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  onClick={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  className="form-control"
                  ref={editLastNameRef}
                  value={editingAdmin.last_name || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ Last name cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setEditingAdmin({
                      ...editingAdmin,
                      last_name: e.target.value,
                    });
                    validateName(e, editLastNameRef, "Last Name");
                  }}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  ref={editPasswordRef}
                  value={editingAdmin.password || ""}
                  onChange={(e) => {
                    if (e.target.value.length > 30) {
                      setToastMessage(
                        "⚠️ Password cannot exceed 30 characters!"
                      );
                      setToastBg("warning");
                      setShowToast(true);
                      return;
                    }
                    setEditingAdmin({
                      ...editingAdmin,
                      password: e.target.value,
                    });
                    validatePassword(e, editPasswordRef);
                  }}
                />
              </div>

              <button type="submit" className="btn btn-success me-2">
                Update
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}