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
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import autoTable from 'jspdf-autotable';
import Mentorsidebar from '../components/Mentorsidebar';

// Import react-datepicker and its styles
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css'; // This is the default stylesheet

function Mentorpods() {
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

  /* -----------------------------------------------------------
   * Date filter (using Date objects for react-datepicker)
   * --------------------------------------------------------- */
  const [filterStartDate, setFilterStartDate] = useState(null); // Will store Date object or null
  const [filterEndDate, setFilterEndDate] = useState(null);   // Will store Date object or null

  /* -----------------------------------------------------------
   * Fetch pods
   * --------------------------------------------------------- */
  useEffect(() => {
    const fetchPods = async () => {
      if (!email) {
        setPodsLoading(false);
        setPodsError('Mentor email not found in session.');
        return;
      }
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_LINK}/mentor/pods/${email}`);
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

    // Build inclusive date range boundaries (local timezone)
    let startMs = null;
    let endMs = null;

    if (filterStartDate) {
      // Set to the start of the day in local time
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      startMs = start.getTime();
    }
    if (filterEndDate) {
      // Set to the end of the day in local time
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      endMs = end.getTime();
    }

    // Filter
    const filtered = progressData.filter((item) => {
      const d = getDateFromItem(item);
      if (!d) return true; // include undated items
      const ms = d.getTime();
      if (startMs !== null && ms < startMs) return false;
      if (endMs !== null && null && ms > endMs) return false;
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
  }, [progressData, filterStartDate, filterEndDate]); // Dependencies are now Date objects

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
      alert('No progress data to export.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text(`Mentor Progress Report: ${fullName}`, 14, 16);

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
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 35 },
      },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.setFontSize(8);
        const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
        doc.text(pageStr, data.settings.margin.left, pageHeight - 5);
      },
    });

    const fname = fullName.replace(/\s+/g, '_') || 'mentor';
    doc.save(`mentor_progress_report_${fname}.pdf`);
  };
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MentorProgress');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fname = fullName.replace(/\s+/g, '_') || 'mentor';
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
    return (
      <Pagination className="justify-content-center mt-3">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        {[...Array(totalPages).keys()].map((num) => (
          <Pagination.Item
            key={num + 1}
            active={num + 1 === currentPage}
            onClick={() => handlePageChange(num + 1)}
          >
            {num + 1}
          </Pagination.Item>
        ))}
        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  /* -----------------------------------------------------------
   * Loading aggregator
   * --------------------------------------------------------- */
  const pageLoading = podsLoading || progressLoading;

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

              {/* Controls Row */}
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
                    className="form-control form-control-sm" // Apply Bootstrap styling
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
                    className="form-control form-control-sm" // Apply Bootstrap styling
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
                Showing {currentPageData.length} of {filteredSortedProgress.length} filtered record(s)
                {progressData.length !== filteredSortedProgress.length && ` (out of ${progressData.length} total)`}.
              </div>

              {progressData.length > 0 ? (
                <Card className="shadow-sm rounded-3 mb-4">
                  <Card.Body>
                    <div className="table-responsive">
                      <table
                        id="mentor-progress-report-table"
                        style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}
                      >
                        <thead>
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
                        <tbody>{mentorProgressTableRows}</tbody>
                      </table>
                    </div>
                    {renderPagination()}
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
            <div className="d-flex flex-wrap gap-4">
              {pods.map((pod) => (
                <Card
                  key={pod.pod_id}
                  className="shadow-sm rounded-3 border-primary clickable-card"
                  style={{
                    width: '300px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.3s ease',
                    boxShadow: '0 10px 10px rgba(33, 180, 234, 0.1)',
                  }}
                  onClick={() => navigate(`/mentorpodusers/${pod.pod_id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 12px 20px rgba(33, 180, 234, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 10px 10px rgba(33, 180, 234, 0.1)';
                  }}
                >
                  <Card.Header className="fw-bold fs-5 text-white bg-primary text-center">
                    {pod.pod_name}
                    <Badge bg={pod.pod_is_active ? 'success' : 'secondary'} className="ms-2">
                      {pod.pod_is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Card.Header>

                  <Card.Body>
                    <Card.Title className="text-center mb-3">Pod Details</Card.Title>

                    <div className="d-flex flex-column gap-2 align-items-center">
                      <Badge bg="info" className="p-2 text-wrap text-center">
                        Organization: {pod.organization_name}
                      </Badge>

                      <Badge bg="secondary" className="p-2 text-wrap text-center">
                        Batch: {pod.batch_name}
                      </Badge>

                      <Badge bg="warning" className="p-2 text-wrap text-center text-dark">
                        Batch Size: {pod.batch_size}
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
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
const thStyle = { ...baseCell, fontWeight: '600', backgroundColor: '#f2f2f2' };
const tdStyle = { ...baseCell };

export default Mentorpods;