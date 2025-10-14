import React, { use, useEffect, useMemo, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Pagination,
  Form,
  Spinner, // Added Spinner for loading state
  Alert, // Added Alert for error messages
  Button, // Added Button for Clear filter
  Dropdown, // Added Dropdown for export options
  ButtonGroup, // Added ButtonGroup for export options
  // InputGroup, // Removed InputGroup
} from "react-bootstrap";
import { FiDownload } from "react-icons/fi";
import Orgadminsidebar from "../components/Orgadminsidebar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import autoTable from "jspdf-autotable"; // Import autoTable for PDF table generation
import { useAuth } from "../components/AuthContext";
// Import react-datepicker and its styles
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import usePreventBack from "../utils/usePreventBack";
import '../styles/orgadmin.css';
// Define common table cell styles for consistency
const baseCell = {
  padding: "8px",
  border: "1px solid #ddd",
  textAlign: "left",
  verticalAlign: "top",
  // Removed whiteSpace: 'nowrap' to allow wrapping in HTML table if needed,
  // but PDF table's overflow: 'linebreak' handles it more robustly.
};
const thStyle = { ...baseCell, fontWeight: "600", backgroundColor: "#f2f2f2" };
const tdStyle = { ...baseCell };

function Orgadmin() {
  usePreventBack("/orgadmin");
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const organizationName =
    sessionStorage.getItem("organization_name") || "Your Organization";
  const username = sessionStorage.getItem("username");

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const fullName =
    `${capitalize(firstname)} ${capitalize(lastname)}`.trim() || "User";

  /* -----------------------------------------------------------
   * State: Batches and Users (existing functionality)
   * --------------------------------------------------------- */
  const [batchesData, setBatchesData] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState(null);

  /* -----------------------------------------------------------
   * State: Progress report data (flat array of records)
   * --------------------------------------------------------- */
  const [progressReportData, setProgressReportData] = useState([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(null);
  const [searchFullName, setSearchFullName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [filterConceptName, setFilterConceptName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterBatchName, setFilterBatchName] = useState("");
  const [filterPodName, setFilterPodName] = useState("");

  /* -----------------------------------------------------------
   * Pagination for Progress Report
   * --------------------------------------------------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const [progressItemsPerPage, setProgressItemsPerPage] = useState(10);

  /* -----------------------------------------------------------
   * Date filter (using Date objects for react-datepicker)
   * --------------------------------------------------------- */
  const [filterStartDate, setFilterStartDate] = useState(null); // Will store Date object or null
  const [filterEndDate, setFilterEndDate] = useState(null); // Will store Date object or null
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const getUniqueValues = (data, property) => {
    const values = new Set();
    data.forEach((item) => {
      if (item[property]) values.add(item[property]);
    });
    return Array.from(values).sort();
  };
  /* -----------------------------------------------------------
   * Fetch Batches Data
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchBatches = async () => {
      if (!username) {
        setBatchesLoading(false);
        setBatchesError("Organization admin username not found in session.");
        return;
      }
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_LINK}/orgadmin/batches/${username}`,
          config
        );
        if (res.data.success && Array.isArray(res.data.data)) {
          setBatchesData(res.data.data);
        } else {
          setBatchesError(res.data.message || "Failed to fetch batches.");
          setBatchesData([]);
        }
      } catch (err) {
        setBatchesError("Error fetching batches: " + err.message);
        setBatchesData([]);
      } finally {
        setBatchesLoading(false);
      }
    };
    fetchBatches();
  }, [username]);

  /* -----------------------------------------------------------
   * Fetch Progress Report Data based on organizationName
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchProgress = async () => {
      if (!organizationName || organizationName === "Your Organization") {
        setProgressLoading(false);
        setProgressError("Organization name not found in session.");
        return;
      }
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_LINK}/reports/progress?organization_name=${organizationName}`
        );
        if (res.data.success && Array.isArray(res.data.data)) {
          setProgressReportData(res.data.data);
        } else {
          setProgressReportData([]);
          setProgressError(
            res.data.message || "Failed to fetch progress report."
          );
        }
      } catch (err) {
        setProgressError("Error fetching progress report: " + err.message);
        setProgressReportData([]);
      } finally {
        setProgressLoading(false);
      }
    };
    fetchProgress();
  }, [organizationName]);

  /* -----------------------------------------------------------
   * Helpers: extract and normalize date from record
   * --------------------------------------------------------- */
  const getDateFromItem = (item) => {
    const dStr =
      item?.updated_at ||
      item?.updatedAt ||
      item?.created_at ||
      item?.createdAt;
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  /* -----------------------------------------------------------
   * Derived: filtered + sorted progress records
   * --------------------------------------------------------- */
  const filteredSortedProgress = useMemo(() => {
    if (!Array.isArray(progressReportData)) return [];

    let startMs = null;
    let endMs = null;

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      startMs = start.getTime();
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      endMs = end.getTime();
    }

    return progressReportData.filter((item) => {
      const d = getDateFromItem(item);
      const ms = d ? d.getTime() : null;

      // Date filter
      if (startMs !== null && ms !== null && ms < startMs) return false;
      if (endMs !== null && ms !== null && ms > endMs) return false;

      // Full Name search
      const itemFullName = `${capitalize(item.first_name)} ${capitalize(
        item.last_name
      )}`.trim();
      if (
        searchFullName &&
        !itemFullName.toLowerCase().includes(searchFullName.toLowerCase())
      ) {
        return false;
      }

      // Email search
      if (
        searchEmail &&
        item.email &&
        !item.email.toLowerCase().includes(searchEmail.toLowerCase())
      ) {
        return false;
      }

      // New filters
      if (filterConceptName && item.concept_name !== filterConceptName)
        return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterStage && item.current_stage !== filterStage) return false;
      if (filterBatchName && item.batch_name !== filterBatchName) return false;
      if (filterPodName && item.pod_name !== filterPodName) return false;

      return true;
    });
  }, [
    progressReportData,
    filterStartDate,
    filterEndDate,
    searchFullName,
    searchEmail,
    filterConceptName,
    filterStatus,
    filterStage,
    filterBatchName,
    filterPodName,
  ]);

  /* -----------------------------------------------------------
   * Pagination for Progress Report Table (now on individual records)
   * --------------------------------------------------------- */
  const totalProgressPages = useMemo(() => {
    return Math.ceil(filteredSortedProgress.length / progressItemsPerPage) || 1;
  }, [filteredSortedProgress.length, progressItemsPerPage]);

  const currentPageProgressData = useMemo(() => {
    const startIdx = (currentPage - 1) * progressItemsPerPage;
    return filteredSortedProgress.slice(
      startIdx,
      startIdx + progressItemsPerPage
    );
  }, [filteredSortedProgress, currentPage, progressItemsPerPage]);

  /* -----------------------------------------------------------
   * Table rows (no grouping, each row is a progress entry)
   * --------------------------------------------------------- */
  const progressTableRows = useMemo(() => {
    return currentPageProgressData.map((item, idx) => {
      const displayName = `${capitalize(item.first_name)} ${capitalize(
        item.last_name
      )}`.trim();
      const updated = getDateFromItem(item)?.toLocaleString() || "";
      const key = `${item.user_id}-${item.id || idx}`; // Unique key for each row

      return (
        <tr key={key}>
          <td style={tdStyle}>{displayName}</td>
          
          <td style={tdStyle}>{item.concept_name}</td>
          <td style={tdStyle}>{item.status}</td>
          <td style={tdStyle}>{item.current_stage}</td>
          <td style={tdStyle}>{item.final_weighted_score || 0}</td>
          <td style={tdStyle}>{item.batch_name}</td>
          <td style={tdStyle}>{item.pod_name}</td>
          <td style={tdStyle}>{updated}</td>
        </tr>
      );
    });
  }, [currentPageProgressData, capitalize, getDateFromItem]); // Added dependencies for useMemo

  /* -----------------------------------------------------------
   * PDF Export (filtered + sorted)
   * --------------------------------------------------------- */
  const handleDownloadPDF = () => {
    if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
      console.log("No progress data to export.");
      return;
    }

    // Changed paper size to A2 (420mm x 594mm) for landscape
    const doc = new jsPDF("l", "mm", "a2");
    doc.setFontSize(20); // Increased font size for A2
    doc.text(`Organization Progress Report: ${organizationName}`, 20, 20); // Adjusted text position for A2

    const head = [
      [
        "Full Name",
        "Concept Name",
        "Status",
        "Current Stage",
        "Batch Name",
        "Pod Name",
        "Exp. Score", // Abbreviated header
        "Int. Score", // Abbreviated header
        "App. Score", // Abbreviated header
        "Per. Score", // Abbreviated header
        "Emp. Score", // Abbreviated header
        "Self-K. Score", // Abbreviated header
        "Ask Q. Score", // Abbreviated header
        "Clar. Amb. Score", // Abbreviated header
        "Sum. Conf. Score", // Abbreviated header
        "Chal. Ideas Score", // Abbreviated header
        "Comp. Con. Score", // Abbreviated header
        "Abs. Con. Score", // Abbreviated header
        "6 Facets Avg",
        "Und. Skills Avg", // Abbreviated header
        "Final Score",
        "Updated At",
      ],
    ];

    const body = filteredSortedProgress.map((item) => {
      const displayName = `${capitalize(item.first_name)} ${capitalize(
        item.last_name
      )}`.trim();
      const d = getDateFromItem(item);
      return [
        displayName,
        item.concept_name || "",
        item.status || "",
        item.current_stage ?? "",
        item.batch_name || "",
        item.pod_name || "",
        item.explanation_score || 0,
        item.interpretation_score || 0,
        item.application_score || 0,
        item.perspective_score || 0,
        item.empathy_score || 0,
        item.self_knowledge_score || 0,
        item.asking_questions_score || 0,
        item.clarifying_ambiguity_score || 0,
        item.summarizing_confirming_score || 0,
        item.challenging_ideas_score || 0,
        item.comparing_concepts_score || 0,
        item.abstract_concrete_score || 0,
        item.six_facets_average || "0.00",
        item.understanding_skills_average || "0.00",
        item.final_weighted_score || 0,
        d ? d.toLocaleString() : "",
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 30, // Adjusted startY for larger paper and title
      styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" }, // Increased font size to 10, adjusted cell padding
      headStyles: {
        fillColor: [242, 242, 242],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      bodyStyles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 40 }, // Full Name
        1: { cellWidth: 40 }, // Concept Name
        2: { cellWidth: 20 }, // Status
        3: { cellWidth: 25 }, // Current Stage
        4: { cellWidth: 30 }, // Explanation Score
        5: { cellWidth: 30 }, // Interpretation Score
        6: { cellWidth: 20 }, // Application Score
        7: { cellWidth: 20 }, // Perspective Score
        8: { cellWidth: 20 }, // Empathy Score
        9: { cellWidth: 20 }, // Self-Knowledge Score
        10: { cellWidth: 20 }, // Asking Questions Score
        11: { cellWidth: 20 }, // Clarifying Ambiguity Score
        12: { cellWidth: 20 }, // Summarizing Confirming Score
        13: { cellWidth: 20 }, // Challenging Ideas Score
        14: { cellWidth: 20 }, // Comparing Concepts Score
        15: { cellWidth: 20 }, // Abstract Concrete Score
        16: { cellWidth: 20 }, // 6 Facets Avg
        17: { cellWidth: 20 }, // Understanding Skills Avg
        18: { cellWidth: 20 }, // Final Score
        19: { cellWidth: 20 }, // Batch Name
        20: { cellWidth: 20 }, // Pod Name
        21: { cellWidth: 45 }, // Updated At
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height
          ? pageSize.height
          : pageSize.getHeight();
        doc.setFontSize(10); // Adjusted font size for page number
        const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
        doc.text(pageStr, data.settings.margin.left, pageHeight - 10); // Adjusted position for page number
      },
    });

    const fname = organizationName.replace(/\s+/g, "_") || "organization";
    doc.save(`organization_progress_report_${fname}.pdf`);
  };

  /* -----------------------------------------------------------
   * Excel Export (filtered + sorted)
   * --------------------------------------------------------- */
  const handleDownloadExcel = () => {
    if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
      console.log("No progress data to export.");
      return;
    }

    const data = filteredSortedProgress.map((item) => {
      const displayName = `${capitalize(item.first_name)} ${capitalize(
        item.last_name
      )}`.trim();
      const d = getDateFromItem(item);
      return {
        "Full Name": displayName,
        "Concept Name": item.concept_name || "",
        Status: item.status || "",
        "Current Stage": item.current_stage ?? "",
        "Batch Name": item.batch_name || "",
        "Pod Name": item.pod_name || "",
        "Explanation Score": item.explanation_score || 0,
        "Interpretation Score": item.interpretation_score || 0,
        "Application Score": item.application_score || 0,
        "Perspective Score": item.perspective_score || 0,
        "Empathy Score": item.empathy_score || 0,
        "Self-Knowledge Score": item.self_knowledge_score || 0,
        "Asking Questions Score": item.asking_questions_score || 0,
        "Clarifying Ambiguity Score": item.clarifying_ambiguity_score || 0,
        "Summarizing Confirming Score": item.summarizing_confirming_score || 0,
        "Challenging Ideas Score": item.challenging_ideas_score || 0,
        "Comparing Concepts Score": item.comparing_concepts_score || 0,
        "Abstract Concrete Score": item.abstract_concrete_score || 0,
        "6 Facets Average": item.six_facets_average || "0.00",
        "Understanding Skills Average":
          item.understanding_skills_average || "0.00",
        "Final Score": item.final_weighted_score || 0,
        "Updated At": d ? d.toLocaleString() : "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "OrgProgress");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    const fname = organizationName.replace(/\s+/g, "_") || "organization";
    saveAs(blob, `organization_progress_report_${fname}.xlsx`);
  };

  /* -----------------------------------------------------------
   * Pagination controls handlers for Progress Report
   * --------------------------------------------------------- */
  const handleProgressPageChange = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalProgressPages) return;
    setCurrentPage(pageNumber);
  };

  const handleProgressItemsPerPageChange = (e) => {
    setProgressItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const renderProgressPagination = () => {
    if (totalProgressPages <= 1) return null;

    // Calculate the range of pages to show (5 pages max)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalProgressPages, currentPage + 2);

    // Adjust if we're near the start or end
    if (currentPage <= 3) {
      endPage = Math.min(5, totalProgressPages);
    } else if (currentPage >= totalProgressPages - 2) {
      startPage = Math.max(totalProgressPages - 4, 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.First
          onClick={() => handleProgressPageChange(1)}
          disabled={currentPage === 1}
        />
        <Pagination.Prev
          onClick={() => handleProgressPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />

        {/* Show first page and ellipsis if needed */}
        {startPage > 1 && (
          <>
            <Pagination.Item onClick={() => handleProgressPageChange(1)}>
              1
            </Pagination.Item>
            {startPage > 2 && <Pagination.Ellipsis disabled />}
          </>
        )}

        {/* Visible page numbers */}
        {pages.map((page) => (
          <Pagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => handleProgressPageChange(page)}
          >
            {page}
          </Pagination.Item>
        ))}

        {/* Show last page and ellipsis if needed */}
        {endPage < totalProgressPages && (
          <>
            {endPage < totalProgressPages - 1 && (
              <Pagination.Ellipsis disabled />
            )}
            <Pagination.Item
              onClick={() => handleProgressPageChange(totalProgressPages)}
            >
              {totalProgressPages}
            </Pagination.Item>
          </>
        )}

        <Pagination.Next
          onClick={() => handleProgressPageChange(currentPage + 1)}
          disabled={currentPage === totalProgressPages}
        />
        <Pagination.Last
          onClick={() => handleProgressPageChange(totalProgressPages)}
          disabled={currentPage === totalProgressPages}
        />
      </Pagination>
    );
  };

  const handleCardClick = (batchId) => {
    navigate(`/orgadminpods/${batchId}`);
  };

  /* -----------------------------------------------------------
   * Loading aggregator
   * --------------------------------------------------------- */
  const pageLoading = batchesLoading || progressLoading;

  // Function to clear all filters
  const handleClearAllFilters = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setSearchFullName("");
    setSearchEmail("");
    setFilterConceptName("");
    setFilterStatus("");
    setFilterStage("");
    setFilterBatchName("");
    setFilterPodName("");
    setCurrentPage(1);
  };

  return (
    <div className="main-layout-containers bg-light">
      <Orgadminsidebar />
      <div className="content-areaa">
        <Container fluid className="main-container-bar">
          {/* Welcome Card */}
          <Card
            className="shadow-sm mb-3 mt-4 border-0 rounded-3"
                     >
            <Card.Body className="">
              <h1 className="fs-3 text-dark mb-2">
                Welcome, <span className="text-primary">{fullName}</span> 👋
                from <span className="text-primary">{organizationName}</span>
              </h1>
              <p className="text-secondary fs-6">
                Manage users, monitor activities, and oversee your organization
                efficiently. Your central control point.
              </p>
            </Card.Body>
          </Card>
          <Card className="border-0 rounded-3 shadow-sm mb-4">
            <Card.Body>
               {pageLoading && (
            <div className="text-center my-5">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Loading data...</p>
            </div>
          )}

          {!pageLoading && (batchesError || progressError) && (
            <Alert variant="danger" className="text-center">
              {batchesError || progressError}
            </Alert>
          )}

          {/* NEW: Progress Report Table */}
          {!pageLoading && !progressError && (
            <>
              <h2 className="fs-4 text-dark" style={{ textAlign: "left" }}>
                Progress Report
              </h2>

              <div className="progress-table-filter d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-3">
                {/* Items per page */}
                <div className="d-flex align-items-center">
                  <span className="me-2">Show entries:</span>
                  <Form.Select
                    value={progressItemsPerPage}
                    onChange={handleProgressItemsPerPageChange}
                    style={{ width: "90px" }}
                    size="sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </Form.Select>
                </div>

                {/* Date Filter - Using react-datepicker */}
                <div className="date-pic d-flex  flex-md-row flex-column align-items-start align-items-md-center gap-2 w-100">

                  <div className="d-flex align-items-md-center date-pick-div">
                    <span className="me-2">Filter by date:</span>
                    <DatePicker
                      selected={filterStartDate}
                      onChange={(date) => {
                        setFilterStartDate(date);
                        setCurrentPage(1);
                      }}
                      selectsStart
                      startDate={filterStartDate}
                      endDate={filterEndDate}
                      placeholderText="Start Date"
                      className="form-control form-control-sm"
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                    <span className="mx-1">to</span>
                    <DatePicker
                      selected={filterEndDate}
                      onChange={(date) => {
                        setFilterEndDate(date);
                        setCurrentPage(1);
                      }}
                      selectsEnd
                      startDate={filterStartDate}
                      endDate={filterEndDate}
                      minDate={filterStartDate}
                      placeholderText="End Date"
                      className="form-control form-control-sm"
                      dateFormat="yyyy-MM-dd"
                      isClearable
                    />
                  </div>

                  {/* Search Inputs (now below date filter) */}
                  <div
                    className="d-flex flex-grow-1 gap-2"
                    style={{ maxWidth: "400px" }}
                  >
                    <Form.Control
                      placeholder="Search by Full Name"
                      value={searchFullName}
                      onChange={(e) => {
                        setSearchFullName(e.target.value);
                        setCurrentPage(1);
                      }}
                      size="sm"
                    />
                    
                  </div>
                </div>

                {(filterStartDate ||
                  filterEndDate ||
                  searchFullName ||
                  searchEmail ||
                  filterConceptName ||
                  filterStatus ||
                  filterStage ||
                  filterBatchName ||
                  filterPodName) && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={handleClearAllFilters}
                  >
                    Clear Filters
                  </Button>
                )}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="primary"
                    size="sm"
                    className="text-white"
                  >
                    <FiDownload className="me-1" /> Download
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={handleDownloadPDF}>
                      Download as PDF
                    </Dropdown.Item>
                    <Dropdown.Item onClick={handleDownloadExcel}>
                      Download as Excel
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {/* Filter summary */}
              <div className="mb-2 small text-muted">
                Showing {currentPageProgressData.length} of{" "}
                {filteredSortedProgress.length} records
                {progressReportData.length !== filteredSortedProgress.length &&
                  ` (filtered from ${progressReportData.length} total)`}
                .{filterConceptName && ` | Concept: ${filterConceptName}`}
                {filterStatus && ` | Status: ${filterStatus}`}
                {filterStage && ` | Stage: ${filterStage}`}
                {filterBatchName && ` | Batch: ${filterBatchName}`}
                {filterPodName && ` | Pod: ${filterPodName}`}
                {filterStartDate &&
                  ` | From: ${filterStartDate.toLocaleDateString()}`}
                {filterEndDate &&
                  ` | To: ${filterEndDate.toLocaleDateString()}`}
              </div>

              <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                {/* Concept Name Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    {filterConceptName || "Concept Name"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <Dropdown.Item
                      active={!filterConceptName}
                      onClick={() => setFilterConceptName("")}
                    >
                      All Concepts
                    </Dropdown.Item>
                    {getUniqueValues(progressReportData, "concept_name").map(
                      (name) => (
                        <Dropdown.Item
                          key={name}
                          active={filterConceptName === name}
                          onClick={() => {
                            setFilterConceptName(name);
                            setCurrentPage(1);
                          }}
                        >
                          {name}
                        </Dropdown.Item>
                      )
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Status Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    {filterStatus || "Status"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <Dropdown.Item
                      active={!filterStatus}
                      onClick={() => setFilterStatus("")}
                    >
                      All Statuses
                    </Dropdown.Item>
                    {getUniqueValues(progressReportData, "status").map(
                      (status) => (
                        <Dropdown.Item
                          key={status}
                          active={filterStatus === status}
                          onClick={() => {
                            setFilterStatus(status);
                            setCurrentPage(1);
                          }}
                        >
                          {status}
                        </Dropdown.Item>
                      )
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Stage Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    {filterStage || "Stage"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <Dropdown.Item
                      active={!filterStage}
                      onClick={() => setFilterStage("")}
                    >
                      All Stages
                    </Dropdown.Item>
                    {getUniqueValues(progressReportData, "current_stage").map(
                      (stage) => (
                        <Dropdown.Item
                          key={stage}
                          active={filterStage === stage}
                          onClick={() => {
                            setFilterStage(stage);
                            setCurrentPage(1);
                          }}
                        >
                          {stage}
                        </Dropdown.Item>
                      )
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Batch Name Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    {filterBatchName || "Batch Name"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <Dropdown.Item
                      active={!filterBatchName}
                      onClick={() => setFilterBatchName("")}
                    >
                      All Batches
                    </Dropdown.Item>
                    {getUniqueValues(progressReportData, "batch_name").map(
                      (name) => (
                        <Dropdown.Item
                          key={name}
                          active={filterBatchName === name}
                          onClick={() => {
                            setFilterBatchName(name);
                            setCurrentPage(1);
                          }}
                        >
                          {name}
                        </Dropdown.Item>
                      )
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* Pod Name Filter */}
                <Dropdown>
                  <Dropdown.Toggle
                    variant="outline-secondary"
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    {filterPodName || "Pod Name"}
                  </Dropdown.Toggle>
                  <Dropdown.Menu
                    style={{ maxHeight: "300px", overflowY: "auto" }}
                  >
                    <Dropdown.Item
                      active={!filterPodName}
                      onClick={() => setFilterPodName("")}
                    >
                      All Pods
                    </Dropdown.Item>
                    {getUniqueValues(progressReportData, "pod_name").map(
                      (name) => (
                        <Dropdown.Item
                          key={name}
                          active={filterPodName === name}
                          onClick={() => {
                            setFilterPodName(name);
                            setCurrentPage(1);
                          }}
                        >
                          {name}
                        </Dropdown.Item>
                      )
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {filteredSortedProgress.length > 0 ? (
              
                    <div>
                    <div className="table-responsive">
                      <table
                        id="progress-report-table"
                        className="table table-hover table-striped table-bordered"
                        
                      >
                        <thead className="">
                          <tr>
                            <th>Full Name</th>
                          
                            <th>Concept Name</th>
                            <th >Status</th>
                            <th >Current Stage</th>
                            <th >Final Score</th>
                            <th >Batch Name</th>
                            <th >Pod Name</th>
                            <th >Updated At</th>
                          </tr>
                        </thead>
                        <tbody>{progressTableRows}</tbody>
                      </table>
                        {renderProgressPagination()}
                    </div>

                  
                    </div>
                
              ) : (
                <Card className="shadow-sm rounded-3 no-progress-card">
                  <Card.Body>
                    <p className="text-muted text-center">
                      No progress report data found for your organization or
                      matching the selected filters.
                    </p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
            </Card.Body>
          </Card>
         

          {/* Batch Cards */}
          {!pageLoading && !batchesError && (
            <>
              <h2 className="mt-4 mb-3 fs-4 text-dark">Your Batches</h2>
            <Row className="g-4">
  {batchesData.length > 0 ? (
    batchesData.map((batch) => (
      <Col key={batch.batch_id} xs={12} md={6} lg={4}>
        <Card
          className="h-100 border-0 shadow-lg rounded-4 clickable-card"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(0, 178, 215, 0.3)",
            cursor: "pointer",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
          }}
          onClick={() => handleCardClick(batch.batch_id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-8px)";
            e.currentTarget.style.boxShadow =
              "0 14px 28px rgba(0, 178, 215, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 6px 15px rgba(0, 178, 215, 0.1)";
          }}
        >
          <div
            className="p-3 rounded-top-4 text-white text-center fw-semibold"
            style={{
              background: "linear-gradient(135deg, rgb(0,178,215) 0%, #00b2d7 100%)",
            }}
          >
            <h5 className="mb-0 text-capitalize">
              {batch.batch_name}
              <Badge
                bg={batch.is_active ? "success" : "secondary"}
                className="ms-2 rounded-pill px-3 py-1"
              >
                {batch.is_active ? "Active" : "Inactive"}
              </Badge>
            </h5>
          </div>

          <Card.Body className="text-center">
            <h6 className="fw-semibold mb-md-4 mb-2 text-muted">Batch Overview</h6>
            <div className="d-flex justify-content-around flex-wrap gap-3">
              <div
                className="px-3 py-2 rounded-3 fw-medium text-white"
                style={{
                  background: "linear-gradient(135deg, rgb(0,178,215), #00a3c4)",
                }}
              >
                Batch Size: {batch.batch_size}
              </div>
              <div
                className="px-3 py-2 rounded-3 fw-medium text-white"
                style={{
                  background: "linear-gradient(135deg, #43e97b, #38f9d7)",
                }}
              >
                Pod Count: {batch.pod_count}
              </div>
              <div
                className="px-3 py-2 rounded-3 fw-medium text-white"
                style={{
                  background: "linear-gradient(135deg, #f7971e, #ffd200)",
                }}
              >
                User Count: {batch.user_count}
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    ))
  ) : (
    <Col xs={12}>
      <Card
        className="text-center p-4 shadow-sm rounded-4 border-0"
        style={{
          background: "rgba(0,178,215,0.05)",
          border: "1px solid rgba(0,178,215,0.2)",
        }}
      >
        <Card.Body>
          <p className="lead mb-0 text-muted">
            No batches found for your organization.
          </p>
        </Card.Body>
      </Card>
    </Col>
  )}
</Row>


            </>
          )}
        </Container>
      </div>
    </div>
  );
}

export default Orgadmin;
