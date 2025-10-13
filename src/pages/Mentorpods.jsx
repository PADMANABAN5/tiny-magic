import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  Badge,
  Spinner,
  Alert,
  Button,
  Row,
  Col,
  Form,
  Pagination,
    Dropdown,
  ButtonGroup,
} from 'react-bootstrap';
import {
  
  FiDownload
 
} from "react-icons/fi";
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import Mentorsidebar from '../components/Mentorsidebar';
import usePreventBack from '../utils/usePreventBack.js';
import { useAuth } from '../components/AuthContext.jsx';
// Import react-datepicker and its styles
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // This is the default stylesheet
import "../styles/Mentor.css";
 const storedToken = sessionStorage.getItem("token");
 
  
function Mentorpods() {
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  usePreventBack("/mentorpods");
  const navigate = useNavigate();

  /* -----------------------------------------------------------
   * Session user info
   * --------------------------------------------------------- */
  const firstname = sessionStorage.getItem('firstname') || '';
  const lastname = sessionStorage.getItem('lastname') || '';
  const email = sessionStorage.getItem('email') || '';
  const mentorId = sessionStorage.getItem('userId') || sessionStorage.getItem('mentor_id') || '';
  const fullName = `${firstname} ${lastname}`.trim() || 'User';

  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '');

  /* -----------------------------------------------------------
   * State: Pods
   * --------------------------------------------------------- */
  const [pods, setPods] = useState([]);
  const [podsLoading, setPodsLoading] = useState(true);
  const [podsError, setPodsError] = useState(null);

  /* -----------------------------------------------------------
   * State: Progress data (flat array of records)
   * --------------------------------------------------------- */
  const [progressData, setProgressData] = useState([]);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState(null);

  /* -----------------------------------------------------------
   * Pagination
   * --------------------------------------------------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchFullName, setSearchFullName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [filterConceptName, setFilterConceptName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterBatchName, setFilterBatchName] = useState('');
  const [filterPodName, setFilterPodName] = useState('');
    /* -----------------------------------------------------------
   * Date filter (using Date objects for react-datepicker)
   * --------------------------------------------------------- */
  const [filterStartDate, setFilterStartDate] = useState(null); // Will store Date object or null
  const [filterEndDate, setFilterEndDate] = useState(null);   // Will store Date object or null
  const [currentPodPage, setCurrentPodPage] = useState(1);
  const podsPerPage = 8;
  const totalPodPages = Math.ceil(pods.length / podsPerPage);
const currentPagePods = pods.slice(
  (currentPodPage - 1) * podsPerPage,
  currentPodPage * podsPerPage
);
const getUniqueValues = (data, property) => {
  const values = new Set();
  data.forEach(item => {
    if (item[property]) values.add(item[property]);
  });
  return Array.from(values).sort();
};
  useEffect(() => {
    const fetchPods = async () => {
      if (!email) {
        setPodsLoading(false);
        setPodsError('Mentor email not found in session.');
        return;
      }
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_LINK}/mentor/pods/${email}`, config);
        if (response?.data?.success) {
          setPods(response.data.data || []);
        } else {
          setPodsError(response?.data?.message || 'Failed to fetch pods.');
        }
      } catch (err) {
        setPodsError('Error fetching pods: ' + err.message);
      } finally {
        setPodsLoading(false);
      }
    };
    fetchPods();
  }, [email]);

  /* -----------------------------------------------------------
   * Fetch mentor progress report data
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchProgress = async () => {
      if (!mentorId) {
        setProgressLoading(false);
        setProgressError('Mentor ID not found in session.');
        return;
      }
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_LINK}/reports/progress?mentor_id=${mentorId}`);
        if (res?.data?.success && Array.isArray(res?.data?.data)) {
          setProgressData(res.data.data);
        } else {
          setProgressData([]);
        }
      } catch (err) {
        setProgressError('Error fetching mentor progress report: ' + err.message);
        setProgressData([]);
      } finally {
        setProgressLoading(false);
      }
    };
    fetchProgress();
  }, [mentorId]);

  /* -----------------------------------------------------------
   * Helpers: extract and normalize date from record
   * --------------------------------------------------------- */
  const getDateFromItem = (item) => {
    const dStr = item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt;
    if (!dStr) return null;
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper to format Date object to YYYY-MM-DD string
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /* -----------------------------------------------------------
   * Derived: filtered + sorted progress records
   * --------------------------------------------------------- */
  const filteredSortedProgress = useMemo(() => {
  if (!Array.isArray(progressData)) return [];

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

  return progressData.filter((item) => {
    const d = getDateFromItem(item);
    const ms = d ? d.getTime() : null;

    // Date filter
    if (startMs !== null && ms !== null && ms < startMs) return false;
    if (endMs !== null && ms !== null && ms > endMs) return false;

    // Full Name search
    const itemFullName = `${capitalize(item.first_name)} ${capitalize(item.last_name)}`.trim();
    if (searchFullName && !itemFullName.toLowerCase().includes(searchFullName.toLowerCase())) {
      return false;
    }

    // Email search
    if (searchEmail && item.email && !item.email.toLowerCase().includes(searchEmail.toLowerCase())) {
      return false;
    }

    // New filters
    if (filterConceptName && item.concept_name !== filterConceptName) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterStage && item.current_stage !== filterStage) return false;
    if (filterBatchName && item.batch_name !== filterBatchName) return false;
    if (filterPodName && item.pod_name !== filterPodName) return false;

    return true;
  });
}, [progressData, filterStartDate, filterEndDate, searchFullName, searchEmail, 
    filterConceptName, filterStatus, filterStage, filterBatchName, filterPodName]);
  /* -----------------------------------------------------------
   * Pagination derived from filteredSortedProgress
   * --------------------------------------------------------- */
  const totalPages = useMemo(() => {
    return Math.ceil(filteredSortedProgress.length / itemsPerPage) || 1;
  }, [filteredSortedProgress.length, itemsPerPage]);

  const currentPageData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSortedProgress.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSortedProgress, currentPage, itemsPerPage]);

  /* -----------------------------------------------------------
   * Table rows (ungrouped)
   * --------------------------------------------------------- */
  const mentorProgressTableRows = useMemo(() => {
    return currentPageData.map((item, idx) => {
      const displayName = `${capitalize(item.first_name)} ${capitalize(item.last_name)}`.trim();
      const updated = (() => {
        const d = getDateFromItem(item);
        return d ? d.toLocaleString() : '';
      })();
      const key = `${item.id ?? item.user_id ?? item.email ?? idx}-${idx}`;
      return (
        <tr key={key}>
          <td style={tdStyle}>{displayName}</td>
          <td style={tdStyle}>{item.email}</td>
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
  }, [currentPageData]);

  /* -----------------------------------------------------------
   * PDF Export (filtered + sorted)
   * --------------------------------------------------------- */
  const handleDownloadPDF = () => {
      if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
        console.log('No progress data to export.');
        return;
      }
  
      // Changed paper size to A2 (420mm x 594mm) for landscape
      const doc = new jsPDF('l', 'mm', 'a2');
      doc.setFontSize(20); // Increased font size for A2
      doc.text(`Mentor Progress Report: ${fullName}`, 20, 20); // Adjusted text position for A2

      const head = [[
        'Full Name',
        'Email',
        'Concept Name',
        'Status',
        'Current Stage',
        'Batch Name',
        'Pod Name',
        'Exp. Score', // Abbreviated header
        'Int. Score', // Abbreviated header
        'App. Score', // Abbreviated header
        'Per. Score', // Abbreviated header
        'Emp. Score', // Abbreviated header
        'Self-K. Score', // Abbreviated header
        'Ask Q. Score', // Abbreviated header
        'Clar. Amb. Score', // Abbreviated header
        'Sum. Conf. Score', // Abbreviated header
        'Chal. Ideas Score', // Abbreviated header
        'Comp. Con. Score', // Abbreviated header
        'Abs. Con. Score', // Abbreviated header
        '6 Facets Avg',
        'Und. Skills Avg', // Abbreviated header
        'Final Score',
        'Updated At',
      ]];
  
      const body = filteredSortedProgress.map((item) => {
        const displayName = `${capitalize(item.first_name)} ${capitalize(item.last_name)}`.trim();
        const d = getDateFromItem(item);
        return [
          displayName,
          item.email || '',
          item.concept_name || '',
          item.status || '',
          item.current_stage ?? '',
          item.batch_name || '',
          item.pod_name || '',
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
          item.six_facets_average || '0.00',
          item.understanding_skills_average || '0.00',
          item.final_weighted_score || 0,
          d ? d.toLocaleString() : '',
        ];
      });
  
      autoTable(doc, {
        head,
        body,
        startY: 30, // Adjusted startY for larger paper and title
        styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' }, // Increased font size to 10, adjusted cell padding
        headStyles: {
          fillColor: [242, 242, 242],
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        bodyStyles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 40 }, // Full Name
          1: { cellWidth: 50 }, // Email
          2: { cellWidth: 40 }, // Concept Name
          3: { cellWidth: 20 }, // Status
          4: { cellWidth: 25 }, // Current Stage
          5: { cellWidth: 30 }, // Explanation Score
          6: { cellWidth: 30 }, // Interpretation Score
          7: { cellWidth: 20 }, // Application Score
          8: { cellWidth: 20 }, // Perspective Score
          9: { cellWidth: 20 }, // Empathy Score
          10: { cellWidth: 20 }, // Self-Knowledge Score
          11: { cellWidth: 20 }, // Asking Questions Score
          12: { cellWidth: 20 }, // Clarifying Ambiguity Score
          13: { cellWidth: 20 }, // Summarizing Confirming Score
          14: { cellWidth: 20 }, // Challenging Ideas Score
          15: { cellWidth: 20 }, // Comparing Concepts Score
          16: { cellWidth: 20 }, // Abstract Concrete Score
          17: { cellWidth: 20 }, // 6 Facets Avg
          18: { cellWidth: 20 }, // Understanding Skills Avg
          19: { cellWidth: 20 }, // Final Score
          20: { cellWidth: 20 }, // Batch Name
          21: { cellWidth: 20 }, // Pod Name
          22: { cellWidth: 45 }, // Updated At
        },
        didDrawPage: (data) => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.setFontSize(10); // Adjusted font size for page number
          const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
          doc.text(pageStr, data.settings.margin.left, pageHeight - 10); // Adjusted position for page number
        },
      });
  
      const fname = fullName.replace(/\s+/g, '_') || 'organization';
      doc.save(`mentor_progress_report_${fname}.pdf`);
    };
  
    /* -----------------------------------------------------------
     * Excel Export (filtered + sorted)
     * --------------------------------------------------------- */
    const handleDownloadExcel = () => {
      if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
        console.log('No progress data to export.');
        return;
      }
  
      const data = filteredSortedProgress.map((item) => {
        const displayName = `${capitalize(item.first_name)} ${capitalize(item.last_name)}`.trim();
        const d = getDateFromItem(item);
        return {
          'Full Name': displayName,
          'Email': item.email || '',
          'Concept Name': item.concept_name || '',
          'Status': item.status || '',
          'Current Stage': item.current_stage ?? '',
          'Batch Name': item.batch_name || '',
          'Pod Name': item.pod_name || '',
          'Explanation Score': item.explanation_score || 0,
          'Interpretation Score': item.interpretation_score || 0,
          'Application Score': item.application_score || 0,
          'Perspective Score': item.perspective_score || 0,
          'Empathy Score': item.empathy_score || 0,
          'Self-Knowledge Score': item.self_knowledge_score || 0,
          'Asking Questions Score': item.asking_questions_score || 0,
          'Clarifying Ambiguity Score': item.clarifying_ambiguity_score || 0,
          'Summarizing Confirming Score': item.summarizing_confirming_score || 0,
          'Challenging Ideas Score': item.challenging_ideas_score || 0,
          'Comparing Concepts Score': item.comparing_concepts_score || 0,
          'Abstract Concrete Score': item.abstract_concrete_score || 0,
          '6 Facets Average': item.six_facets_average || '0.00',
          'Understanding Skills Average': item.understanding_skills_average || '0.00',
          'Final Score': item.final_weighted_score || 0,
          'Updated At': d ? d.toLocaleString() : '',
        };
      });
  
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'OrgProgress');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  
      const fname = fullName.replace(/\s+/g, '_') || 'organization';
      saveAs(blob, `mentor_progress_report_${fname}.xlsx`);
    };
  

  
  /* -----------------------------------------------------------
   * Pagination controls handlers
   * --------------------------------------------------------- */
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  const handleItemsPerPageChange = (e) => {
    const v = Number(e.target.value);
    setItemsPerPage(v);
    setCurrentPage(1);
  };

  const renderPagination = () => {
  if (totalPages <= 1) return null;

  // Calculate the range of pages to show (5 pages max)
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  // Adjust if we're near the start or end
  if (currentPage <= 3) {
    endPage = Math.min(5, totalPages);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(totalPages - 4, 1);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <Pagination className="justify-content-center mt-3">
      <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
      <Pagination.Prev
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
      
      {/* Show first page and ellipsis if needed */}
      {startPage > 1 && (
        <>
          <Pagination.Item onClick={() => handlePageChange(1)}>
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
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      ))}
      
      {/* Show last page and ellipsis if needed */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <Pagination.Ellipsis disabled />}
          <Pagination.Item onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </Pagination.Item>
        </>
      )}
      
      <Pagination.Next
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
      <Pagination.Last
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
  );
};

  /* -----------------------------------------------------------
   * Loading aggregator
   * --------------------------------------------------------- */
  const pageLoading = podsLoading || progressLoading;
  const handleClearAllFilters = () => {
  setFilterStartDate(null);
  setFilterEndDate(null);
  setSearchFullName('');
  setSearchEmail('');
  setFilterConceptName('');
  setFilterStatus('');
  setFilterStage('');
  setFilterBatchName('');
  setFilterPodName('');
  setCurrentPage(1);
};

  /* -----------------------------------------------------------
   * Render
   * --------------------------------------------------------- */
  return (
    <div className="main-layout-container">
      <Mentorsidebar />
      <div className="content-area">
        <Container className="mt-4">
          {/* Welcome Section */}
          <Card className="shadow-sm mb-4 text-center">
            <Card.Body>
              <h2>
                Welcome, <span className="text-primary">{fullName}</span> 👋
              </h2>
              <p className="text-muted mb-0">Here is the progress overview for your mentees and pods.</p>
            </Card.Body>
          </Card>

          {pageLoading && (
            <div className="text-center my-5">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Loading data...</p>
            </div>
          )}

          {!pageLoading && (podsError || progressError) && (
            <Alert variant="danger" className="text-center">
              {podsError || progressError}
            </Alert>
          )}

          {/* Progress Report Table */}
          {!pageLoading && !progressError && (
            <>
              <h2 className="mt-5 mb-3 fs-3 fw-bold text-dark">Mentor Progress Report</h2>

              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-3">
  {/* Items per page */}
  <div className="d-flex align-items-center">
    <span className="me-2">Show entries:</span>
    <Form.Select
      value={itemsPerPage}
      onChange={handleItemsPerPageChange}
      style={{ width: '90px' }}
      size="sm"
    >
      <option value="5">5</option>
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="50">50</option>
    </Form.Select>
  </div>

  {/* Date Filter - Using react-datepicker */}
  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2">
    <div className="d-flex align-items-center">
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

    {/* Search Inputs */}
    <div className="d-flex flex-grow-1 gap-2" style={{ maxWidth: '400px' }}>
      <Form.Control
        placeholder="Search by Full Name"
        value={searchFullName}
        onChange={(e) => {
          setSearchFullName(e.target.value);
          setCurrentPage(1);
        }}
        size="sm"
      />
      <Form.Control
        placeholder="Search by Email"
        value={searchEmail}
        onChange={(e) => {
          setSearchEmail(e.target.value);
          setCurrentPage(1);
        }}
        size="sm"
      />
    </div>
  </div>

  {/* Clear All Filters Button */}
  {(filterStartDate || filterEndDate || searchFullName || searchEmail || 
    filterConceptName || filterStatus || filterStage || filterBatchName || filterPodName) && (
    <Button variant="outline-danger" size="sm" onClick={handleClearAllFilters}>
      Clear Filters
    </Button>
  )}

  <Dropdown>
    <Dropdown.Toggle variant="primary" size="sm" className="text-white">
      <FiDownload className="me-1" /> Download
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={handleDownloadPDF}>Download as PDF</Dropdown.Item>
      <Dropdown.Item onClick={handleDownloadExcel}>Download as Excel</Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>
</div>

             {/* Filter summary */}
<div className="mb-2 small text-muted">
  Showing {currentPageData.length} of {filteredSortedProgress.length} records
  {progressData.length !== filteredSortedProgress.length &&
    ` (filtered from ${progressData.length} total)`}.
  {filterConceptName && ` | Concept: ${filterConceptName}`}
  {filterStatus && ` | Status: ${filterStatus}`}
  {filterStage && ` | Stage: ${filterStage}`}
  {filterBatchName && ` | Batch: ${filterBatchName}`}
  {filterPodName && ` | Pod: ${filterPodName}`}
  {filterStartDate && ` | From: ${filterStartDate.toLocaleDateString()}`}
  {filterEndDate && ` | To: ${filterEndDate.toLocaleDateString()}`}
</div>
<div className="d-flex flex-wrap gap-2 mb-3">
  {/* Concept Name Filter */}
  <Dropdown>
    <Dropdown.Toggle variant="outline-secondary" size="sm">
      {filterConceptName || 'Concept Name'}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setFilterConceptName('')}>All</Dropdown.Item>
      {getUniqueValues(progressData, 'concept_name').map(name => (
        <Dropdown.Item key={name} onClick={() => {
          setFilterConceptName(name);
          setCurrentPage(1);
        }}>
          {name}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>

  {/* Status Filter */}
  <Dropdown>
    <Dropdown.Toggle variant="outline-secondary" size="sm">
      {filterStatus || 'Status'}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setFilterStatus('')}>All</Dropdown.Item>
      {getUniqueValues(progressData, 'status').map(status => (
        <Dropdown.Item key={status} onClick={() => {
          setFilterStatus(status);
          setCurrentPage(1);
        }}>
          {status}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>

  {/* Stage Filter */}
  <Dropdown>
    <Dropdown.Toggle variant="outline-secondary" size="sm">
      {filterStage || 'Stage'}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setFilterStage('')}>All</Dropdown.Item>
      {getUniqueValues(progressData, 'current_stage').map(stage => (
        <Dropdown.Item key={stage} onClick={() => {
          setFilterStage(stage);
          setCurrentPage(1);
        }}>
          {stage}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>

  {/* Batch Name Filter */}
  <Dropdown>
    <Dropdown.Toggle variant="outline-secondary" size="sm">
      {filterBatchName || 'Batch Name'}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setFilterBatchName('')}>All</Dropdown.Item>
      {getUniqueValues(progressData, 'batch_name').map(name => (
        <Dropdown.Item key={name} onClick={() => {
          setFilterBatchName(name);
          setCurrentPage(1);
        }}>
          {name}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>

  {/* Pod Name Filter */}
  <Dropdown>
    <Dropdown.Toggle variant="outline-secondary" size="sm">
      {filterPodName || 'Pod Name'}
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setFilterPodName('')}>All</Dropdown.Item>
      {getUniqueValues(progressData, 'pod_name').map(name => (
        <Dropdown.Item key={name} onClick={() => {
          setFilterPodName(name);
          setCurrentPage(1);
        }}>
          {name}
        </Dropdown.Item>
      ))}
    </Dropdown.Menu>
  </Dropdown>
</div>

              {progressData.length > 0 ? (
                <Card className="shadow-sm rounded-3 mb-4">
                  <Card.Body>
                    <div className="table-responsive">
                      <table 
                        className="table table-striped table-bordered table-hover"
                        id="mentor-progress-report-table"
                        style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}
                      >
                        <thead className="">
                          <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={thStyle}>Full Name</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Concept Name</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Current Stage</th>
                            <th style={thStyle}>Final Score</th>
                            <th style={thStyle}>Batch Name</th>
                            <th style={thStyle}>Pod Name</th>
                            <th style={thStyle}>Updated At</th>
                          </tr>
                        </thead>
                        <tbody>{mentorProgressTableRows}</tbody>
                      </table>
                    </div>
                    <div className="mentor-progress-pagination">
  {renderPagination()}
</div>
                  </Card.Body>
                </Card>
              ) : (
                <Card className="shadow-sm rounded-3 mb-4">
                  <Card.Body>
                    <p className="text-muted text-center mb-0">No progress report data found.</p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}

          {/* Pods Section */}
          <Row className="align-items-center justify-content-between mb-4 mt-5">
            <Col>
              <h2 className="mb-0 fs-3 fw-bold text-dark">
                Your <span className="text-primary">Pods</span>
              </h2>
            </Col>
          </Row>

          {!pageLoading && podsError && (
            <Alert variant="danger" className="my-5 ms-auto me-4 w-100">
              Error: {podsError}
            </Alert>
          )}

          {!pageLoading && !podsError && pods.length === 0 && (
            <Alert variant="info" className="my-5 ms-auto me-4 w-100">
              No pods found for this mentor.
            </Alert>
          )}

          {!pageLoading && !podsError && pods.length > 0 && (
  <>
    <div className="row">
      {currentPagePods.map((pod) => (
        
                      
                      <Col xs={12} md={6} className="mb-3">
     <Card
  key={pod.pod_id}
   className="border-0 shadow-lg rounded-4 bg-white w-100"
                  style={{
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(0, 178, 215, 0.25)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
  onClick={() => navigate(`/mentorpodusers/${pod.pod_id}`)}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'scale(1.03)';
    e.currentTarget.style.boxShadow = '0 14px 22px rgba(33, 180, 234, 0.3)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = '0 10px 10px rgba(33, 180, 234, 0.1)';
  }}
>
  {/* Card Header */}
  <Card.Header  className="text-white rounded-top-4 text-center fw-bold"
                    style={{
                      background:
                        "linear-gradient(135deg, #00b2d7 0%, #0072ff 100%)",
                      fontSize: "1.5rem",
                      letterSpacing: "0.5px",
                    }}>
    <h5 className="mb-0 fw-bold">{pod.pod_name}</h5>
    <Badge
      bg={pod.pod_is_active ? 'success' : 'secondary'}
      className="ms-2 rounded-pill px-3 py-1"
    >
      {pod.pod_is_active ? 'Active' : 'Inactive'}
    </Badge>
  </Card.Header>

  {/* Card Body */}
  <Card.Body className="p-4">
    <Card.Title className="text-center fw-semibold text-primary mb-3">
      Pod Details
    </Card.Title>

    <div className="d-flex flex-column gap-3 align-items-start">
      <div className="d-flex align-items-center">
        <strong className="me-2">Organization:</strong>
        <Badge bg="info" className="px-3 py-2 rounded-pill">
          {pod.organization_name}
        </Badge>
      </div>

      <div className="d-flex align-items-center">
        <strong className="me-2">Batch:</strong>
        <Badge bg="secondary" className="px-3 py-2 rounded-pill">
          {pod.batch_name}
        </Badge>
      </div>

      <div className="d-flex align-items-center">
        <strong className="me-2">Batch Size:</strong>
        <Badge bg="warning" className="px-3 py-2 rounded-pill text-dark">
          {pod.batch_size}
        </Badge>
      </div>
    </div>
  </Card.Body>
</Card>
</Col>
                  
      ))}
    </div>

    {totalPodPages > 1 && (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.First onClick={() => setCurrentPodPage(1)} disabled={currentPodPage === 1} />
          <Pagination.Prev onClick={() => setCurrentPodPage((p) => Math.max(1, p - 1))} disabled={currentPodPage === 1} />
          {[...Array(totalPodPages)].map((_, idx) => (
            <Pagination.Item
              key={idx + 1}
              active={idx + 1 === currentPodPage}
              onClick={() => setCurrentPodPage(idx + 1)}
            >
              {idx + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => setCurrentPodPage((p) => Math.min(totalPodPages, p + 1))} disabled={currentPodPage === totalPodPages} />
          <Pagination.Last onClick={() => setCurrentPodPage(totalPodPages)} disabled={currentPodPage === totalPodPages} />
        </Pagination>
      </div>
    )}
  </>
)}

        </Container>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * Table cell styles
 * ----------------------------------------------------------- */
const baseCell = {
  padding: '8px',
  border: '1px solid #ddd',
  textAlign: 'left',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
};
const thStyle = { ...baseCell, fontWeight: '600', backgroundColor: '#fff' };
const tdStyle = { ...baseCell };

export default Mentorpods;