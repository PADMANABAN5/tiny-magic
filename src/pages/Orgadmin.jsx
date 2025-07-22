import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Pagination,
  Form,
  Spinner, // Added Spinner for loading state
  Alert,   // Added Alert for error messages
  Button,  // Added Button for Clear filter
  Dropdown, // Added Dropdown for export options
  ButtonGroup, // Added ButtonGroup for export options
} from 'react-bootstrap';
import Orgadminsidebar from '../components/Orgadminsidebar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable'; // Import autoTable for PDF table generation

// Import react-datepicker and its styles
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Define common table cell styles for consistency
const baseCell = {
  padding: '8px',
  border: '1px solid #ddd',
  textAlign: 'left',
  verticalAlign: 'top',
  whiteSpace: 'nowrap', // Prevent wrapping in table cells
};
const thStyle = { ...baseCell, fontWeight: '600', backgroundColor: '#f2f2f2' };
const tdStyle = { ...baseCell };

function Orgadmin() {
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const organizationName = sessionStorage.getItem("organization_name") || "Your Organization";
  const email = sessionStorage.getItem("email");

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const fullName = `${capitalize(firstname)} ${capitalize(lastname)}`.trim() || 'User';

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

  /* -----------------------------------------------------------
   * Pagination for Progress Report
   * --------------------------------------------------------- */
  const [currentPage, setCurrentPage] = useState(1);
  const [progressItemsPerPage, setProgressItemsPerPage] = useState(10);

  /* -----------------------------------------------------------
   * Date filter (using Date objects for react-datepicker)
   * --------------------------------------------------------- */
  const [filterStartDate, setFilterStartDate] = useState(null); // Will store Date object or null
  const [filterEndDate, setFilterEndDate] = useState(null);   // Will store Date object or null

  /* -----------------------------------------------------------
   * Fetch Batches Data
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchBatches = async () => {
      if (!email) {
        setBatchesLoading(false);
        setBatchesError('Organization admin email not found in session.');
        return;
      }
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_LINK}/orgadmin/batches/${email}`);
        if (res.data.success && Array.isArray(res.data.data)) {
          setBatchesData(res.data.data);
        } else {
          setBatchesError(res.data.message || 'Failed to fetch batches.');
          setBatchesData([]);
        }
      } catch (err) {
        setBatchesError('Error fetching batches: ' + err.message);
        setBatchesData([]);
      } finally {
        setBatchesLoading(false);
      }
    };
    fetchBatches();
  }, [email]);

  /* -----------------------------------------------------------
   * Fetch Progress Report Data based on organizationName
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchProgress = async () => {
      if (!organizationName || organizationName === "Your Organization") {
        setProgressLoading(false);
        setProgressError('Organization name not found in session.');
        return;
      }
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_LINK}/reports/progress?organization_name=${organizationName}`);
        if (res.data.success && Array.isArray(res.data.data)) {
          setProgressReportData(res.data.data);
        } else {
          setProgressReportData([]);
          setProgressError(res.data.message || 'Failed to fetch progress report.');
        }
      } catch (err) {
        setProgressError('Error fetching progress report: ' + err.message);
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
    const dStr = item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt;
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

    const filtered = progressReportData.filter((item) => {
      const d = getDateFromItem(item);
      if (!d) return true; // Include items without a valid date
      const ms = d.getTime();
      if (startMs !== null && ms < startMs) return false;
      if (endMs !== null && ms > endMs) return false;
      return true;
    });

    // Sort DESC by date (latest first); undated items go last
    filtered.sort((a, b) => {
      const da = getDateFromItem(a);
      const db = getDateFromItem(b);
      const ams = da ? da.getTime() : 0;
      const bms = db ? db.getTime() : 0;
      return bms - ams;
    });

    return filtered;
  }, [progressReportData, filterStartDate, filterEndDate]);

  /* -----------------------------------------------------------
   * Pagination for Progress Report Table (now on individual records)
   * --------------------------------------------------------- */
  const totalProgressPages = useMemo(() => {
    return Math.ceil(filteredSortedProgress.length / progressItemsPerPage) || 1;
  }, [filteredSortedProgress.length, progressItemsPerPage]);

  const currentPageProgressData = useMemo(() => {
    const startIdx = (currentPage - 1) * progressItemsPerPage;
    return filteredSortedProgress.slice(startIdx, startIdx + progressItemsPerPage);
  }, [filteredSortedProgress, currentPage, progressItemsPerPage]);


  /* -----------------------------------------------------------
   * Table rows (no grouping, each row is a progress entry)
   * --------------------------------------------------------- */
  const progressTableRows = useMemo(() => {
    return currentPageProgressData.map((item, idx) => {
      const displayName = `${capitalize(item.first_name)} ${capitalize(item.last_name)}`.trim();
      const updated = getDateFromItem(item)?.toLocaleString() || '';
      const key = `${item.user_id}-${item.id || idx}`; // Unique key for each row

      return (
        <tr key={key}>
          <td style={tdStyle}>{displayName}</td>
          <td style={tdStyle}>{item.email}</td>
          <td style={tdStyle}>{item.concept_name}</td>
          <td style={tdStyle}>{item.status}</td>
          <td style={tdStyle}>{item.current_stage}</td>
          <td style={tdStyle}>{item.batch_name}</td>
          <td style={tdStyle}>{item.pod_name}</td>
          <td style={tdStyle}>{updated}</td>
        </tr>
      );
    });
  }, [currentPageProgressData]);

  /* -----------------------------------------------------------
   * PDF Export (filtered + sorted)
   * --------------------------------------------------------- */
  const handleDownloadPDF = () => {
    if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
      alert('No progress data to export.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape, millimeters, A4
    doc.setFontSize(14);
    doc.text(`Organization Progress Report: ${organizationName}`, 14, 16);

    const head = [[
      'Full Name',
      'Email',
      'Concept Name',
      'Status',
      'Current Stage',
      'Batch Name',
      'Pod Name',
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
        d ? d.toLocaleString() : '',
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: {
        fillColor: [242, 242, 242],
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      bodyStyles: { lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 35 }, // Full Name
        1: { cellWidth: 45 }, // Email
        2: { cellWidth: 35 }, // Concept Name
        3: { cellWidth: 20 }, // Status
        4: { cellWidth: 25 }, // Current Stage
        5: { cellWidth: 25 }, // Batch Name
        6: { cellWidth: 25 }, // Pod Name
        7: { cellWidth: 35 }, // Updated At
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
        doc.text(pageStr, data.settings.margin.left, pageHeight - 5);
      },
    });

    const fname = organizationName.replace(/\s+/g, '_') || 'organization';
    doc.save(`organization_progress_report_${fname}.pdf`);
  };

  /* -----------------------------------------------------------
   * Excel Export (filtered + sorted)
   * --------------------------------------------------------- */
  const handleDownloadExcel = () => {
    if (!filteredSortedProgress || filteredSortedProgress.length === 0) {
      alert('No progress data to export.');
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
        'Updated At': d ? d.toLocaleString() : '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OrgProgress');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fname = organizationName.replace(/\s+/g, '_') || 'organization';
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
    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.First onClick={() => handleProgressPageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handleProgressPageChange(currentPage - 1)} disabled={currentPage === 1} />
        {[...Array(totalProgressPages).keys()].map(num => (
          <Pagination.Item
            key={num + 1}
            active={num + 1 === currentPage}
            onClick={() => handleProgressPageChange(num + 1)}
          >
            {num + 1}
          </Pagination.Item>
        ))}
        <Pagination.Next onClick={() => handleProgressPageChange(currentPage + 1)} disabled={currentPage === totalProgressPages} />
        <Pagination.Last onClick={() => handleProgressPageChange(totalProgressPages)} disabled={currentPage === totalProgressPages} />
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

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />
      <div className="content-area">
        <Container className="mt-4">

          {/* Welcome Card */}
          <Card className="shadow-sm mb-3 mt-2 rounded-3" style={{ boxShadow: '0 10px 10px rgba(33, 150, 243, 0.2)' }}>
            <Card.Body className="p-4">
              <h1 className="fs-2 fw-bold text-dark mb-2">
                Welcome, <span className="text-primary">{fullName}</span> 👋 from <span className="text-primary">{organizationName}</span>
              </h1>
              <p className="text-secondary fs-5">
                Manage users, monitor activities, and oversee your organization efficiently. Your central control point.
              </p>
            </Card.Body>
          </Card>

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
              <h2 className="mt-5 mb-3 fs-3 fw-bold text-dark">Progress Report</h2>

              <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-3">
                {/* Items per page */}
                <div className="d-flex align-items-center">
                  <span className="me-2">Show entries:</span>
                  <Form.Select
                    value={progressItemsPerPage}
                    onChange={handleProgressItemsPerPageChange}
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
                <div className="d-flex align-items-center flex-wrap gap-2">
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
                  {(filterStartDate || filterEndDate) && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        setFilterStartDate(null);
                        setFilterEndDate(null);
                        setCurrentPage(1);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Download Buttons */}
                <Dropdown as={ButtonGroup}>
                  <Button variant="info" size="sm" className="text-white" onClick={handleDownloadPDF}>
                    Download PDF 📄
                  </Button>
                  <Dropdown.Toggle split variant="info" size="sm" className="text-white" />
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={handleDownloadPDF}>Download as PDF</Dropdown.Item>
                    <Dropdown.Item onClick={handleDownloadExcel}>Download as Excel</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {/* Filter summary */}
              <div className="mb-2 small text-muted">
                Showing {currentPageProgressData.length} of {filteredSortedProgress.length} filtered record(s)
                {progressReportData.length !== filteredSortedProgress.length && ` (out of ${progressReportData.length} total)`}.
              </div>

              {filteredSortedProgress.length > 0 ? (
                <Card className="shadow-sm rounded-3 mb-4">
                  <Card.Body>
                    <div className="table-responsive">
                      <table id="progress-report-table" className="table table-striped table-bordered table-hover" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead className="bg-primary text-white">
                          <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={thStyle}>Full Name</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Concept Name</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Current Stage</th>
                            <th style={thStyle}>Batch Name</th>
                            <th style={thStyle}>Pod Name</th>
                            <th style={thStyle}>Updated At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {progressTableRows}
                        </tbody>
                      </table>
                    </div>

                    {renderProgressPagination()}
                  </Card.Body>
                </Card>
              ) : (
                <Card className="shadow-sm rounded-3">
                  <Card.Body>
                    <p className="text-muted text-center">No progress report data found for your organization or matching the selected filters.</p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}

          {/* Batch Cards */}
          {!pageLoading && !batchesError && (
            <>
              <h2 className="mt-4 mb-3 fs-3 fw-bold text-dark">Your Batches</h2>
              <Row className="g-4">
                {batchesData.length > 0 ? (
                  batchesData.map((batch) => (
                    <Col key={batch.batch_id} xs={12} md={6} lg={4}>
                      <Card
                        border="primary"
                        className="h-100 shadow-sm rounded-3 clickable-card"
                        style={{
                          backgroundColor: '#fff',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease-in-out, boxShadow 0.3s ease',
                          boxShadow: '0 4px 20px rgba(33, 180, 234, 0.3)'
                        }}
                        onClick={() => handleCardClick(batch.batch_id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.03)';
                          e.currentTarget.style.boxShadow = '0 12px 20px rgba(33, 180, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 10px 10px rgba(33, 180, 234, 0.1)';
                        }}
                      >
                        <Card.Header className="fw-bold fs-5 bg-primary text-center text-white">
                          {batch.batch_name}
                          <Badge bg={batch.is_active ? "success" : "secondary"} className="ms-2">
                            {batch.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </Card.Header>
                        <Card.Body>
                          <Card.Title className="text-center">Batch Overview</Card.Title>
                          <div className="d-flex gap-2 justify-content-around flex-wrap">
                            <Badge bg="info" className="p-2">Batch Size: {batch.batch_size}</Badge>
                            <Badge bg="success" className="p-2">Pod Count: {batch.pod_count}</Badge>
                            <Badge bg="warning" text="dark" className="p-2">User Count: {batch.user_count}</Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                ) : (
                  <Col xs={12}>
                    <Card className="text-center p-3 shadow-sm rounded-3">
                      <Card.Body>
                        <p className="lead mb-0">No batches found for your organization.</p>
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
