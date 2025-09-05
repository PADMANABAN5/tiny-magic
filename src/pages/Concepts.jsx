import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Supersidebar from "../components/Supersidebar";
import {
  Pagination,
  Toast,
  ToastContainer,
  Accordion,
  Button,
} from "react-bootstrap";
import "../styles/OrgList.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaHistory } from "react-icons/fa";

export default function Concepts() {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState("");
  const [toastBg, setToastBg] = useState("primary");
  const [showToast, setShowToast] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const storedToken = sessionStorage.getItem("token");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAccordionKey, setActiveAccordionKey] = useState("0");
  const cleanTextRegex = /^(?!.*\s{2,})(?!^\s)(?!.*\s$)[A-Za-z0-9().,/* ]*$/;
// Allowed: A–Z, 0–9, spaces, (), /, ., ,, *


  const [originalConcept, setOriginalConcept] = useState({
    concept_title: "",
    concept_description: "",
  });

  const [conceptForm, setConceptForm] = useState({
    concept_name: "",
    concept_content: "",
    concept_enduring_understandings: "",
    concept_essential_questions: "",
    concept_knowledge_skills: "",
    stage_1_content: "",
    stage_2_content: "",
    stage_3_content: "",
    stage_4_content: "",
    stage_5_content: "",
    concept_understanding_rubric: "",
    understanding_skills_rubric: "",
    learning_assessment_dimensions: "",
    download_link: "",
    is_active: true,
  });

  const API_BASE_URL =
    process.env.REACT_APP_API_LINK || "http://localhost:3000/api";
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  // Fetch concepts on component mount
  useEffect(() => {
    fetchConcepts();
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  const fetchConcepts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/concepts`, config);

      if (res.data && Array.isArray(res.data.data)) {
        setConcepts(res.data.data);
      } else {
        setConcepts([]);
        setToastMessage("⚠️ Unexpected data format received from server.");
        setToastBg("warning");
        setShowToast(true);
      }
    } catch (err) {
      console.error("Error fetching concepts:", err);

      if (axios.isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Failed to load concepts.";
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
            setToastMessage("⚠️ Concepts not found.");
            break;
          case 409:
            setToastMessage("⚠️ Conflict: Data inconsistency.");
            break;
          case 500:
            setToastMessage("⚠️ Server error. Please try again later.");
            break;
          default:
            setToastMessage(
              `⚠️ Failed to fetch concepts. (${errorType || "Unknown error"})`
            );
        }
        setToastBg("warning");
      } else {
        setToastMessage("⚠️ Network error. Please check your connection.");
        setToastBg("danger");
      }
      setShowToast(true);
      setConcepts([]);
    } finally {
      setLoading(false);
    }
  };
 const validateCleanText = (e, key) => {
  const { value } = e.target;
  if (["concept_name", "concept_content"].includes(key) && !cleanTextRegex.test(value)) {
    e.target.setCustomValidity(
      "Only letters, numbers, spaces, and () / . , * are allowed (no leading, trailing, or multiple spaces)."
    );
  } else {
    e.target.setCustomValidity("");
  }
  e.target.reportValidity();
};


  const handleAccordionSelect = (selectedKey) => {
    setActiveAccordionKey(selectedKey);
  };

  const openCreateModal = () => {
    setConceptForm({
      concept_name: "",
      concept_content: "",
      concept_enduring_understandings: "",
      concept_essential_questions: "",
      concept_knowledge_skills: "",
      stage_1_content: "",
      stage_2_content: "",
      stage_3_content: "",
      stage_4_content: "",
      stage_5_content: "",
      concept_understanding_rubric: "",
      understanding_skills_rubric: "",
      learning_assessment_dimensions: "",
      download_link: "",
      is_active: true,
    });
    setIsEditMode(false);
    setShowModal(true);
    setSelectedConceptId(null);
    setActiveAccordionKey("0");
  };

  const openEditModal = (concept) => {
    setConceptForm({ ...concept });
    setOriginalConcept({ ...concept });
    setIsEditMode(true);
    setShowModal(true);
    setSelectedConceptId(concept.concept_id);
    setActiveAccordionKey("0");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Client-side validation
    if (!conceptForm.concept_name || !conceptForm.concept_content) {
      setToastBg("warning");
      setToastMessage("⚠️ Concept Name and Content are required.");
      setShowToast(true);
      setIsLoading(false);
      return;
    }

    try {
      if (isEditMode && selectedConceptId) {
        const isFormUnchanged = Object.keys(conceptForm).every(
          (key) => conceptForm[key] === originalConcept[key]
        );
        if (isFormUnchanged) {
          setToastBg("warning");
          setToastMessage("⚠️ No changes detected.");
          setShowToast(true);
          setIsLoading(false);
          return;
        }

        await axios.put(
          `${API_BASE_URL}/concepts/${selectedConceptId}`,
          conceptForm,
          config
        );
        setToastBg("primary");
        setToastMessage("✅ Concept updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/concepts`, conceptForm, config);
        setToastBg("primary");
        setToastMessage("✅ Concept created successfully!");
      }

      setShowModal(false);
      fetchConcepts();
      setShowToast(true);
    } catch (err) {
      console.error("Error saving concept:", err);

      if (axios.isAxiosError(err) && err.response) {
        const errorMessage = err.response.data?.message || "An error occurred";
        const validationErrors = err.response.data?.errors;
        if (validationErrors) {
          setToastMessage(
            `⚠️ ${errorMessage}: ${Object.values(validationErrors).join(", ")}`
          );
        } else {
          switch (err.response.status) {
            case 400:
              setToastMessage("⚠️ Bad request. Please check your input.");
              break;
            case 401:
              setToastMessage("⚠️ Unauthorized. Please log in.");
              break;
            case 403:
              setToastMessage(
                "⚠️ Forbidden: You do not have permission to perform this action."
              );
              break;
            case 409:
              setToastMessage("⚠️ Concept name already exists!");
              break;
            case 500:
              setToastMessage("⚠️ Server error. Please try again later.");
              break;
            default:
              setToastMessage(`⚠️ Unexpected error: ${errorMessage}`);
          }
        }
        setToastBg("warning");
      } else {
        setToastBg("danger");
        setToastMessage("⚠️ Network error. Please check your connection.");
      }
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize filtered concepts for performance
  const filteredConcepts = useMemo(() => {
    return concepts.filter((concept) =>
      concept.concept_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [concepts, searchTerm]);

  // Reset page when itemsPerPage or searchTerm changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentConcepts = filteredConcepts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredConcepts.length / itemsPerPage);
  const handlePageChange = (pageNum) => setCurrentPage(pageNum);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-start mb-3">
            <button
              className="back-button bg-primary text-white border-0"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <FaArrowLeft />
            </button>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Concepts</h3>
            <div
              className="d-flex justify-content-between"
              style={{ width: "26%" }}
            >
              {/* <Button
                variant="secondary"
                onClick={() => navigate("/archivedconcepts")}
                style={{ width: "49%" }}
                aria-label="View archived concepts"
              >
                <FaHistory />
              </Button> */}
              <Button
                variant="primary"
                onClick={() => openCreateModal()}
                style={{ width: "49%",marginLeft:"145px" }}
                aria-label="Create new concept"
              >
                <FaPlus />
              </Button>
            </div>
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
                }}
                aria-label="Select number of entries per page"
              >
                {[5, 10, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex gap-3 mb-3">
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "250px" }}
                placeholder="Search by Concept Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search concepts by name"
              />
            </div>
          </div>

          {loading ? (
            <p>Loading concepts...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th>Concept ID</th>
                      <th>Concept Name</th>
                      <th>Concept Content</th>
                      <th>Status</th>
                      {/* <th>Version</th> */}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConcepts.length > 0 ? (
                      currentConcepts.map((concept) => (
                        <tr key={concept.concept_id}>
                          <td>{concept.concept_id}</td>
                          <td>{concept.concept_name}</td>
                          <td>
                            <span
                              className="single-line-tooltip"
                              title={concept.concept_content}
                            >
                              {concept.concept_content}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${concept.is_active
                                  ? "bg-success"
                                  : "bg-secondary"
                                }`}
                            >
                              {concept.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {/* <td>{concept.version}</td> */}
                          <td>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => openEditModal(concept)}
                              aria-label={`Edit concept ${concept.concept_name}`}
                            >
                              <FaEdit />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">
                          No concepts found.
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
                      aria-label="Go to first page"
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Go to previous page"
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
                            aria-label={`Go to page ${i}`}
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
                      aria-label="Go to next page"
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      aria-label="Go to last page"
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
        <div
          className="modal-overlay"
          role="dialog"
          aria-labelledby="modal-title"
        >
          <div
            className="modal-content modal-lg"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <h4 id="modal-title">
              {isEditMode ? "Update Concept" : "Create New Concept"}
            </h4>
            <button
              type="button"
              className="btn-close position-absolute top-0 end-0 m-3"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            ></button>
            <form onSubmit={handleFormSubmit}>
              <Accordion
                activeKey={activeAccordionKey}
                onSelect={handleAccordionSelect}
              >
                {Object.entries({
                  concept_name: "Concept Name",
                  concept_content: "Concept Content",
                  concept_enduring_understandings: "Enduring Understandings",
                  concept_essential_questions: "Essential Questions",
                  concept_knowledge_skills: "Knowledge & Skills",
                  stage_1_content: "Stage 1 Content",
                  stage_2_content: "Stage 2 Content",
                  stage_3_content: "Stage 3 Content",
                  stage_4_content: "Stage 4 Content",
                  stage_5_content: "Stage 5 Content",
                  concept_understanding_rubric: "Understanding Rubric",
                  understanding_skills_rubric: "Skills Rubric",
                  learning_assessment_dimensions: "Assessment Dimensions",
                  download_link: "Download Link",
                }).map(([key, label], index) => (
                  <Accordion.Item eventKey={index.toString()} key={key}>
                    <Accordion.Header>{label}
                      {[
                        "concept_name",
                        "concept_content"
                      ].includes(key) && (
                          <span style={{ color: "red" }}>*</span>
                        )}
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="mb-3">
                        {/* <label className="form-label" htmlFor={key}>
                          {label}
                        </label> */}
                        <textarea
  className="form-control"
  id={key}
  name={key}
  rows={4}
  value={conceptForm[key] || ""}
  onChange={(e) => {
    setConceptForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
    // ✅ apply only to concept_name & concept_content
    if (["concept_name", "concept_content"].includes(key)) {
      validateCleanText(e, key);
    }
  }}
  required={["concept_name", "concept_content"].includes(key)}
  aria-required={["concept_name", "concept_content"].includes(key)}
  maxLength={["concept_name"].includes(key) ? 30 : 20000}
/>

                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>

              <div className="d-flex justify-content-between mt-3">
                <button
                  type="submit"
                  className="btn btn-success me-2"
                  disabled={isLoading}
                  aria-label={isEditMode ? "Update concept" : "Create concept"}
                >
                  {isLoading ? "Saving..." : isEditMode ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
              </div>
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
