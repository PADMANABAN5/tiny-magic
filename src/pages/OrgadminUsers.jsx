import React, { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Spinner, Alert,
  Pagination, Table, Badge, OverlayTrigger, Popover, Button
} from 'react-bootstrap';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import Orgadminsidebar from '../components/Orgadminsidebar';
import '../styles/orgadminusers.css';

function OrgadminUsers() {
  const { podId } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [podInfo, setPodInfo] = useState(null);
  const usersPerPage = 6;
  const email = sessionStorage.getItem("email");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_LINK}/pods/${podId}`);
        if (res.data.success) {
          const podData = res.data.data;
          setUsers(podData.orgusers || []);
          setPodInfo({
            batchName: podData.batch?.batch_name || 'N/A',
            podName: podData.pod_name || 'N/A',
            mentor: `${podData.mentor?.first_name || ''} ${podData.mentor?.last_name || ''}`,
            concepts: podData.batch?.concepts || []
          });
        } else {
          setError(res.data.message || 'Failed to fetch pod data.');
        }
      } catch (err) {
        setError('Error fetching users: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email && podId) fetchUsers();
  }, [email, podId]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />
      <div className="content-area">
        <div className="container mt-4">
          {/* Heading + Back Button Row */}
          <Row className="align-items-center justify-content-between mb-4">
            <Col>
              <h2 className="mb-0 text-primary">
                Users in Pod: <span className="text-dark fw-bold">{podInfo?.podName || podId}</span>
              </h2>
            </Col>
            <Col xs="auto">
              <Button variant="secondary" onClick={() => navigate(-1)} style={{ borderRadius: '50px' }}>
                <FaArrowLeft className="me-2" /> Back
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="d-flex justify-content-center align-items-center my-5" style={{ minHeight: '200px' }}>
              <Spinner animation="border" role="status" className="me-2" />
              <span className="text-muted fs-5">Loading data...</span>
            </div>
          ) : error ? (
            <Alert variant="danger" className="text-center py-3">{error}</Alert>
          ) : (
            <Row className="g-4 justify-content-center">
              {/* Pod Info Card */}
              <Col xs={12} md={4} className="mb-4 mb-md-0">
                <Card className="shadow-sm rounded-4 border-primary bg-white w-100">
                  <Card.Header className="bg-primary text-white rounded-top-4 py-3">
                    <h4 className="mb-0 text-center fw-bold">{podInfo?.podName || 'N/A'}</h4>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <strong className="me-2">Batch:</strong>
                      <Badge bg="secondary" className="px-3 py-2 rounded-pill">
                        {podInfo?.batchName}
                      </Badge>
                    </div>

                    <div className="d-flex align-items-center mb-3">
                      <strong className="me-2">Mentor:</strong>
                      <Badge bg="success" className="px-3 py-2 rounded-pill">
                        {podInfo?.mentor}
                      </Badge>
                    </div>

                    {podInfo?.concepts?.length > 0 ? (
                      <div className="d-flex align-items-center mb-2">
                        <strong className="me-2">Concepts:</strong>
                        <OverlayTrigger
                          trigger="click"
                          placement="bottom"
                          overlay={<Popover id="popover-concepts">
                            <Popover.Header as="h3">Concepts</Popover.Header>
                            <Popover.Body>
                              <ul className="mb-0 ps-3">
                                {podInfo.concepts.map((concept, idx) => (
                                  <li key={idx}>{concept.concept_name}</li>
                                ))}
                              </ul>
                            </Popover.Body>
                          </Popover>}
                          rootClose
                        >
                          <Badge bg="info" className="px-3 py-2 rounded-pill" style={{ cursor: 'pointer' }}>
                            {podInfo.concepts.length} Concept{podInfo.concepts.length > 1 ? 's' : ''}
                          </Badge>
                        </OverlayTrigger>
                      </div>
                    ) : (
                      <p className="text-muted fst-italic mb-2">No concepts found for this batch.</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Users Table */}
              <Col xs={12} md={8}>
                <Card className="shadow-sm border-0 rounded-3">
                  <Card.Body className="p-0">
                    {currentUsers.length > 0 ? (
                      <Table responsive bordered hover className="mb-0 w-100 overflow-hidden custom-table">
                        <caption className="text-center fw-medium text-white p-2 bg-primary caption-top" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}>
                          List of Users in this Pod
                        </caption>
                        <thead className="bg-primary text-white">
                          <tr>
                            <th className="py-3 text-center" style={{ width: '5%' }}>S.No</th>
                            <th className="py-3" style={{ width: '20%' }}>First Name</th>
                            <th className="py-3" style={{ width: '20%' }}>Last Name</th>
                            <th className="py-3" style={{ width: '30%' }}>Email</th>
                            <th className="py-3 text-center" style={{ width: '25%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentUsers.map((user, index) => (
                            <tr key={user.user_id}>
                              <td className="text-center">{indexOfFirstUser + index + 1}</td>
                              <td>{user.first_name}</td>
                              <td>{user.last_name}</td>
                              <td>{user.email}</td>
                              <td>
                                <button
                                  className="btn btn-outline-primary w-100 text-white"
                                  onClick={() => navigate(`/orgadminuserprogress/${user.user_id}`)}
                                >
                                  View Progress
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info" className="m-3 text-center py-3">No users found for this pod.</Alert>
                    )}
                  </Card.Body>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-4 justify-content-center">
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Pagination.Item key={page} active={page === currentPage} onClick={() => handlePageChange(page)}>
                        {page}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                    <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                  </Pagination>
                )}
              </Col>
            </Row>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrgadminUsers;
