import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaArrowLeft, FaPlus, FaEdit } from "react-icons/fa";
import Supersidebar from "../components/Supersidebar";
import { Pagination, Toast, ToastContainer, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "../styles/OrgList.css";

export default function Mentor() {
  const [mentors, setMentors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newMentor, setNewMentor] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [editMentor, setEditMentor] = useState({
    user_id: "",
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastBg, setToastBg] = useState("primary");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  const navigate = useNavigate();

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_LINK}/users/role/mentor`,
        config
      );

      if (res.status === 200 && Array.isArray(res.data?.data)) {
        setMentors(res.data.data);
      } else {
        setMentors([]);
        setToastMessage("⚠️ Unexpected data format received from server.");
        setToastBg("warning");
        setShowToast(true);
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);

      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to load mentors";
        const errorType = err.response?.status;

        switch (errorType) {
          case 400:
            setToastMessage(`⚠️ ${errorMessage}`);
            setToastBg("warning");
            break;
          case 401:
            setToastMessage("⚠️ Unauthorized. Please log in.");
            setToastBg("warning");
            break;
          case 403:
            setToastMessage("⚠️ Forbidden: You do not have permission.");
            setToastBg("warning");
            break;
          case 404:
            setToastMessage("⚠️ Mentor data not found.");
            setToastBg("warning");
            break;
          case 409:
            setToastMessage("⚠️ Conflict: Data inconsistency.");
            setToastBg("warning");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try again later.");
            setToastBg("warning");
            break;
          default:
            setToastMessage(
              "⚠️ Failed to fetch mentor. Please try again later."
            );
            setToastBg("warning");
        }

        setShowToast(true);
      } else {
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("danger");
        setShowToast(true);
      }

      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMentor = async (e) => {
    e.preventDefault();
    const { email, first_name, last_name, password } = newMentor;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_LINK}/users/mentor`,
        newMentor,
        config
      );

      // Success
      setShowModal(false);
      setNewMentor({ email: "", first_name: "", last_name: "", password: "" });
      fetchMentors();

      setToastMessage("✅ Mentor created successfully!");
      setToastBg("primary");
      setShowToast(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to create mentor";
        const errorType = err.response?.status;

        switch (errorType) {
          case 400:
            setToastMessage(`⚠️ ${errorMessage}`);
            setToastBg("warning");
            break;
          case 401:
            setToastMessage("⚠️ Unauthorized. Please log in.");
            setToastBg("warning");
            break;
          case 403:
            setToastMessage("⚠️ Forbidden: You do not have permission.");
            setToastBg("warning");
            break;
          case 409:
            setToastMessage("⚠️ Mentor with this email already exists.");
            setToastBg("warning");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try later.");
            setToastBg("warning");
            break;
          default:
            setToastMessage("⚠️ Unexpected error occurred.");
            setToastBg("warning");
        }
        setShowToast(true);
      } else {
        console.error("Non-Axios error:", err);
        alert("An unexpected error occurred.");
      }
    }
  };

  const handleUpdateClick = (mentor) => {
    setEditMentor({
      user_id: mentor.user_id,
      email: mentor.email,
      username: mentor.username || "",
      first_name: mentor.first_name,
      last_name: mentor.last_name,
      password: "",
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_LINK}/users/${editMentor.user_id}`,
        editMentor,
        config
      );

      // Success case
      setShowUpdateModal(false);
      fetchMentors();
      setToastMessage("✅ Mentor updated successfully!");
      setToastBg("primary");
      setShowToast(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to update mentor";
        const errorType = err.response?.status;

        switch (errorType) {
          case 400:
            setToastMessage(`⚠️ ${errorMessage}`);
            setToastBg("warning");
            break;
          case 401:
            setToastMessage("⚠️ Unauthorized. Please log in.");
            setToastBg("warning");
            break;
          case 403:
            setToastMessage("⚠️ Forbidden: You do not have permission.");
            setToastBg("warning");
            break;
          case 404:
            setToastMessage("⚠️ Mentor not found");
            setToastBg("warning");
            break;
          case 409:
            setToastMessage("⚠️ Email already in use by another user");
            setToastBg("warning");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try later.");
            setToastBg("warning");
            break;
          default:
            setToastMessage("⚠️ Unexpected error occurred");
            setToastBg("warning");
        }
        setShowToast(true);
      } else {
        console.error("Non-Axios error:", err);
        alert("An unexpected error occurred.");
      }
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const filteredMentors = mentors.filter((mentor) =>
    `${mentor.first_name} ${mentor.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMentors = filteredMentors.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredMentors.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          {/* Back Button */}
          <div className="d-flex justify-content-start mb-3">
            <button
              className="back-button bg-primary text-white border-0"
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft />
            </button>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Mentors</h3>
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

            <div style={{ maxWidth: "300px", flexGrow: 1 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Full Name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {loading ? (
            <p>Loading mentors...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMentors.length > 0 ? (
                      currentMentors.map((mentor) => (
                        <tr key={mentor.user_id}>
                          <td>{mentor.email}</td>
                          <td>{mentor.username || "-"}</td>
                          <td>{`${mentor.first_name} ${mentor.last_name}`}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => handleUpdateClick(mentor)}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center">
                          No mentors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

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
            </>
          )}
        </div>
      </div>

      {/* Add Mentor Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Mentor</h4>
            <form onSubmit={handleCreateMentor}>
              <div className="mb-3">
                <label className="form-label">
                  Email<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={newMentor.email}
                  onChange={(e) =>
                    setNewMentor({ ...newMentor, email: e.target.value })
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
                  className="form-control"
                  value={newMentor.first_name}
                   onChange={(e) => {
                  const value = e.target.value;
                  const isValid = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(value) || value === "";
                  e.target.setCustomValidity(
                    isValid ? "" : "Please Enter a valid First Name"
                  );
                  setNewMentor({ ...newMentor, first_name: value });
                }}
                onInput={(e) => e.target.setCustomValidity("")}
                required
              />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Last Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newMentor.last_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    const isValid = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(value) || value === "";
                    e.target.setCustomValidity(
                      isValid ? "" : "Please Enter a valid Last Name"
                                  );
                  setNewMentor({ ...newMentor, last_name: value });
                }}
                onInput={(e) => e.target.setCustomValidity("")}
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
                  value={newMentor.password}
                  required
                  onChange={(e) => {
                    const value = e.target.value;
                    e.target.setCustomValidity(
                      value.length < 8
                        ? "Password must be at least 8 characters long"
                        : ""
                    );
                    setNewMentor({ ...newMentor, password: value });
                  }}
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      e.target.value.length < 8
                        ? "Password must be at least 8 characters long"
                        : ""
                    )
                  }
                  onInput={(e) => e.target.setCustomValidity("")}
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

      {/* Update Mentor Modal */}
      {showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Mentor</h4>
            <form onSubmit={handleUpdateSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={editMentor.email}
                  onChange={(e) =>
                    setEditMentor({ ...editMentor, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={editMentor.username}
                   onChange={(e) => {
                  const value = e.target.value;
                  const isValid = /^[A-Za-z0-9_]+(?: [A-Za-z0-9_]+)*$/.test(value) || value === "";
                  e.target.setCustomValidity(
                    isValid ? "" : "Please Enter a valid Username"
                  );
                  setEditMentor({ ...editMentor, username: value });
                }}
                onInput={(e) => e.target.setCustomValidity("")}
              />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  First Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editMentor.first_name}
                   onChange={(e) => {
                  const value = e.target.value;
                  const isValid = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(value) || value === "";
                  e.target.setCustomValidity(
                    isValid ? "" : "Please Enter a valid First Name"
                  );
                  setEditMentor({ ...editMentor, first_name: value });
                }}
                onInput={(e) => e.target.setCustomValidity("")}
                required
              />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Last Name<span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editMentor.last_name}
                    onChange={(e) => {
                    const value = e.target.value;
                    const isValid = /^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/.test(value) || value === "";
                    e.target.setCustomValidity(
                      isValid ? "" : "Please Enter a valid Last Name"
                    );
                    setEditMentor({ ...editMentor, last_name: value });
                  }}
                  onInput={(e) => e.target.setCustomValidity("")}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={editMentor.password}
                  onChange={(e) => {
                    const value = e.target.value;
                    e.target.setCustomValidity(
                      value.length > 0 && value.length < 8
                        ? "Password must be at least 8 characters long"
                        : ""
                    );
                    setEditMentor({ ...editMentor, password: value });
                  }}
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      e.target.value.length > 0 && e.target.value.length < 8
                        ? "Password must be at least 8 characters long"
                        : ""
                    )
                  }
                  onInput={(e) => e.target.setCustomValidity("")}
                />
              </div>
              <button type="submit" className="btn btn-primary me-2">
                Update
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUpdateModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
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
