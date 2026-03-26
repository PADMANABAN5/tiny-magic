import React, { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Spinner, Alert, Button, Form, Pagination // Import Form and Pagination
} from 'react-bootstrap';
import {
  BookOpen, Key, LineChart, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas'; // Import html2canvas
import jsPDF from 'jspdf'; // Import jsPDF
import Mentorsidebar from '../components/Mentorsidebar';
import '../styles/MentorDashboard.css';

function Mentordashboard() {
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const email = sessionStorage.getItem("email");
  // Assuming organization_name is available from session storage or fetched otherwise
  const organizationName = sessionStorage.getItem("organization_name") || "Organization";

  const fullName = `${firstname || ''} ${lastname || ''}`.trim() || 'User';

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const [pods, setPods] = useState([]);
  const [conceptsMap, setConceptsMap] = useState({});
  const [mentorProgressReportData, setMentorProgressReportData] = useState([]); // State for mentor's progress report data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states for the progress report table
  const [currentPage, setCurrentPage] = useState(1);
  const [progressItemsPerPage, setProgressItemsPerPage] = useState(10);

  // --- Mock Mentor ID (Replace with dynamic retrieval if available) ---
  // In a real application, mentor_id would likely be fetched from an authentication
  // context or an initial API call, similar to how 'email' is obtained.
  // For now, using a hardcoded ID as per the example API in the prompt.
  const mentorId = 456; 

  // Fetch Pods Data
  useEffect(() => {
    const fetchPodsAndConcepts = async () => {
      setLoading(true);
      setError(null);
      try {
        const podsRes = await axios.get(`${process.env.REACT_APP_API_LINK}/mentor/pods/${email}`);
        const podsData = podsRes.data.data || [];
        setPods(podsData);

        const conceptsRes = await axios.get(`${process.env.REACT_APP_API_LINK}/mentor/pods/${email}/concepts`);
        const conceptsList = conceptsRes.data.data || [];

        const map = {};
        conceptsList.forEach(entry => {
          map[entry.pod_id] = entry.concepts || [];
        });
        setConceptsMap(map);
      } catch (err) {
        setError('Failed to fetch pods or concepts: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email) fetchPodsAndConcepts();
  }, [email]);

  // Fetch Mentor Progress Report Data
  useEffect(() => {
    const fetchMentorProgress = async () => {
      if (mentorId) {
        setLoading(true);
        setError(null);
        try {
          const userId = sessionStorage.getItem("userId"); // Use mentorId directly as userId
          const res = await axios.get(`${process.env.REACT_APP_API_LINK}/reports/progress?mentor_id=${userId}`);
          console.log("✅ Progress data:", res.data.data);
          if (res.data.success && Array.isArray(res.data.data)) {
            setMentorProgressReportData(res.data.data);
          } else {
            setMentorProgressReportData([]);
          }
        } catch (err) {
          console.error("Failed to fetch mentor progress report", err);
          setError("Failed to fetch mentor progress report: " + err.message);
          setMentorProgressReportData([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMentorProgress();
  }, [mentorId]); // Depend on mentorId

  // --- PDF Download Function ---
  const handleDownloadPDF = () => {
    const input = document.getElementById('mentor-progress-report-table'); // Use a unique ID for mentor table

    if (input) {
      const originalStyles = {};
      const cells = input.querySelectorAll('th, td');
      cells.forEach(cell => {
        originalStyles[cell] = {
          border: cell.style.border,
          padding: cell.style.padding,
          textAlign: cell.style.textAlign,
          verticalAlign: cell.style.verticalAlign
        };
        cell.style.border = '1px solid #000'; // Ensure black borders
        cell.style.padding = '8px';           // Ensure consistent padding
        cell.style.textAlign = 'left';        // Ensure consistent alignment
        cell.style.verticalAlign = 'top';     // Align content to top for rowSpan visual
      });

      const headerRow = input.querySelector('thead tr');
      const originalHeaderBg = headerRow ? headerRow.style.backgroundColor : '';
      if (headerRow) {
        headerRow.style.backgroundColor = '#f2f2f2'; // Ensure header background is captured
      }

      html2canvas(input, {
        scale: 2, // Increase scale for better resolution (e.g., 2 or 3)
        logging: true,
        useCORS: true,
        windowWidth: input.scrollWidth, // Capture the full width of the table
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg', 1.0); // Use JPEG for smaller file size, 1.0 quality
        const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape, 'mm' for millimeters, 'a4' for A4 size

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = pdfWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;

        let heightLeft = scaledHeight;
        let position = 0;

        // Add image to the first page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) { // Only add new pages if there's content left
          position = -pdfHeight; // Position for the next slice of the image on the new page
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`mentor_progress_report_${fullName.replace(/\s+/g, '_')}.pdf`); // Dynamic filename

      }).catch(err => {
        console.error("Error generating PDF:", err);
        alert("Failed to generate PDF. Please try again.");
      }).finally(() => {
        // Restore original styles after PDF generation
        cells.forEach(cell => {
          if (originalStyles[cell]) {
            cell.style.border = originalStyles[cell].border;
            cell.style.padding = originalStyles[cell].padding;
            cell.style.textAlign = originalStyles[cell].textAlign;
            cell.style.verticalAlign = originalStyles[cell].verticalAlign;
          }
        });
        if (headerRow) {
          headerRow.style.backgroundColor = originalHeaderBg;
        }
      });
    } else {
      alert("Progress report table element not found for PDF generation.");
    }
  };

  // --- CSV Download Function ---
  const handleDownloadCSV = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_LINK}/reports/progress/download?mentor_id=${mentorId}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`, // using token like orgadmin
          },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fname = fullName.replace(/\s+/g, "_") || "mentor";
      link.setAttribute("download", `mentor_progress_report_${fname}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download CSV report.");
    }
  };

  // --- Pagination Logic for Mentor Progress Report Table ---
  // Group all progress data by user_id first
  const groupedMentorProgressData = mentorProgressReportData.reduce((acc, item) => {
    const userId = item.user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(item);
    return acc;
  }, {});

  // Flatten the grouped data to apply pagination to user groups
  const flattenedGroupedMentorUsers = Object.keys(groupedMentorProgressData).map(userId => ({
    userId: userId,
    entries: groupedMentorProgressData[userId]
  }));

  // Calculate total pages for the progress report table
  const totalProgressPages = Math.ceil(flattenedGroupedMentorUsers.length / progressItemsPerPage);

  // Get current users for the progress report table based on pagination
  const indexOfLastProgressUserGroup = currentPage * progressItemsPerPage;
  const indexOfFirstProgressUserGroup = indexOfLastProgressUserGroup - progressItemsPerPage;
  const currentProgressUserGroups = flattenedGroupedMentorUsers.slice(
    indexOfFirstProgressUserGroup,
    indexOfLastProgressUserGroup
  );

  // Function to change page for progress report
  const handleProgressPageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Function to handle items per page change for progress report
  const handleProgressItemsPerPageChange = (e) => {
    setProgressItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  // Build rows for the current page of the progress report table
  const mentorProgressTableRows = [];

  currentProgressUserGroups.forEach((userGroup, groupIndex) => {
    const userEntries = userGroup.entries;
    const rowSpan = userEntries.length;

    userEntries.forEach((item, index) => {
      if (index === 0) {
        mentorProgressTableRows.push(
          <tr key={`${item.user_id}-${item.id || index}`}> {/* Use item.id if available, otherwise index */}
            <td style={{ padding: '8px', border: '1px solid #ddd' }} rowSpan={rowSpan}>{`${capitalize(item.first_name)} ${capitalize(item.last_name)}`}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }} rowSpan={rowSpan}>{item.email}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.concept_name}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.status}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.current_stage}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.final_weighted_score || 'N/A'}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }} rowSpan={rowSpan}>{item.organization_name || 'N/A'}</td> {/* Assuming 'organization_name' from API */}
            <td style={{ padding: '8px', border: '1px solid #ddd' }} rowSpan={rowSpan}>{item.batch_name}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }} rowSpan={rowSpan}>{item.pod_name}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(item.updated_at).toLocaleString()}</td>
          </tr>
        );
      } else {
        mentorProgressTableRows.push(
          <tr key={`${item.user_id}-${item.id || index}`}> {/* Use item.id if available, otherwise index */}
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.concept_name}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.status}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.current_stage}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.final_weighted_score || 'N/A'}</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(item.updated_at).toLocaleString()}</td>
          </tr>
        );
      }
    });
  });

  return (
    <div className="main-layout-container">
      <Mentorsidebar />
      <div className="content-area">
        <Container className="mt-4">

          {/* Welcome Section */}
          <Card className="shadow-sm mb-4 text-center">
            <Card.Body>
              <h2>Welcome, <span className="text-primary">{fullName}</span> 👋</h2>
              <p className="text-muted">Here are your assigned pods and concepts overview.</p>
            </Card.Body>
          </Card>

          {/* Loader */}
          {loading && (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading your data...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="danger" className="text-center">
              {error}
            </Alert>
          )}

          {/* Empty State for Pods */}
          {!loading && pods.length === 0 && !error && (
            <Alert variant="info" className="text-center">
              You are not assigned to any pods yet.
            </Alert>
          )}

          {/* Mentor Progress Report Section */}
          {!loading && (
            <>
              <h2 className="mt-5 mb-3 fs-3 fw-bold text-dark">Mentor Progress Report</h2>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <span className="me-2">Show entries:</span>
                  <Form.Select
                    value={progressItemsPerPage}
                    onChange={handleProgressItemsPerPageChange}
                    style={{ width: '80px' }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </Form.Select>
                </div>
                {/*<button
                  onClick={handleDownloadPDF}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#008CBA',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Download Progress Report PDF 📄
                </button>*/}
                <button
                  onClick={handleDownloadCSV}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#198754', // Green color similar to standard CSV export buttons
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Download Progress Report CSV 📄
                </button>
              </div>

              {mentorProgressReportData.length > 0 ? (
                <Card className="shadow-sm rounded-3 mb-4">
                  <Card.Body>
                    <div className="table-responsive">
                      <table id="mentor-progress-report-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Full Name</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Concept Name</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Current Stage</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Final Score</th>

                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Organization</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Batch Name</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Pod Name</th>
                            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Updated At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mentorProgressTableRows}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Progress Report Table */}
                    {totalProgressPages > 1 && (
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
                    )}
                  </Card.Body>
                </Card>
              ) : (
                <Card className="shadow-sm rounded-3">
                  <Card.Body>
                    <p className="text-muted text-center">No progress report data found for your mentorship.</p>
                  </Card.Body>
                </Card>
              )}
            </>
          )}

          {/* Advanced Configuration Section (Moved below Progress Report for better flow) */}
          {!loading && pods.length > 0 && (
            <div className="mb-5">
              <div className="d-flex align-items-center mb-4 text-dark text-center">
                <Settings className="me-3 text-info" size={32} />
                <h2 className="fs-3 fw-bold">Advanced Configuration</h2>
              </div>
              <div className="d-flex justify-content-center">
                <Row xs={1} sm={2} md={2} className="g-4 justify-content-center">

                  {/* Concepts Card */}
                  <Col className="d-flex justify-content-center">
                    <Card className="shadow-sm h-100 border-0 rounded-3" style={{ width: '22rem' }}>
                      <Card.Body className="p-4 text-center">
                        <div className="p-3 bg-info-subtle rounded-circle d-inline-flex mb-3">
                          <BookOpen className="text-info" size={32} />
                        </div>
                        <Card.Title className="fs-5 fw-semibold text-dark mb-2">Concepts Overview</Card.Title>
                        <Card.Text className="text-secondary mb-3 fs-6">
                          View and analyze all the concepts you are guiding your pods through. Get insights into completion rate and engagement level.
                        </Card.Text>
                        <Button
                          onClick={() => navigate('/mentorconcepts')}
                          variant="info"
                          className="w-100 py-2 text-white superadmin-button"
                        >
                          <LineChart className="me-2" size={18} /> View Stats
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Pods Card */}
                  <Col className="d-flex justify-content-center">
                    <Card className="shadow-sm h-100 border-0 rounded-3" style={{ width: '22rem' }}>
                      <Card.Body className="p-4 text-center">
                        <div className="p-3 bg-warning-subtle rounded-circle d-inline-flex mb-3">
                          <Key className="text-warning" size={32} />
                        </div>
                        <Card.Title className="fs-5 fw-semibold text-dark mb-2">Manage Pods</Card.Title>
                        <Card.Text className="text-secondary mb-3 fs-6">
                          Access and manage all the pods assigned to you. Configure resources, check assignments, and monitor pod and user activity.
                        </Card.Text>
                        <Button
                          onClick={() => navigate('/mentorpods')}
                          variant="info"
                          className="w-100 py-2 text-white superadmin-button"
                        >
                          <Settings className="me-2" size={18} /> Manage Pods
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>

                </Row>
              </div>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
}

export default Mentordashboard;