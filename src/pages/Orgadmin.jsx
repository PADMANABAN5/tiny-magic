import React, { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Badge, Pagination
} from 'react-bootstrap';
import Orgadminsidebar from '../components/Orgadminsidebar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/orgadminusers.css';

function Orgadmin() {
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const organizationName = sessionStorage.getItem("organization_name") || "Your Organization";
  const email = sessionStorage.getItem("email");

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const fullName = `${capitalize(firstname)} ${capitalize(lastname)}`.trim() || 'User';

  const [batchesData, setBatchesData] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 8;

  useEffect(() => {
    if (email) {
      axios
        .get(`${process.env.REACT_APP_API_LINK}/orgadmin/batches/${email}`)
        .then(res => {
          if (res.data.success && Array.isArray(res.data.data)) {
            setBatchesData(res.data.data);
          } else {
            setBatchesData([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch batches", err);
          setBatchesData([]);
        });
    }
  }, [email]);

  useEffect(() => {
    if (email) {
      axios
        .get(`${process.env.REACT_APP_API_LINK}/orgadmin/progress/${email}`)
        .then(res => {
          if (res.data.success && Array.isArray(res.data.data)) {
            setOrgUsers(res.data.data);
          } else {
            setOrgUsers([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch org user progress", err);
          setOrgUsers([]);
        });
    }
  }, [email]);

  const handleCardClick = (batchId) => {
    navigate(`/orgadminpods/${batchId}`);
  };

  // Flatten user data
  const flattenedUsers = orgUsers.flatMap(batch =>
    batch.pods.flatMap(pod =>
      pod.users.map(user => ({
        id: user.user_id,
        name: `${capitalize(user.first_name)} ${capitalize(user.last_name)}`,
        email: user.email,
        batch: batch.batch_name,
        pod: pod.pod_name
      }))
    )
  );

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = flattenedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(flattenedUsers.length / usersPerPage);

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />
      <div className="content-area">
        <div className="container mt-4">

          {/* Welcome */}
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

          {/* User Table */}
          <h2 className="mt-5 mb-3 fs-3 fw-bold text-dark">Organization Users</h2>

          {currentUsers.length > 0 ? (
            <Card className="shadow-sm rounded-3 mb-4">
              <Card.Body>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-primary text-center">
                      <tr>
                        <th>S No:</th>
                        <th>Name</th>
                        <th>Batch</th>
                        <th>Pod</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {currentUsers.map((user, idx) => (
                        <tr key={user.id}>
                          <td>{indexOfFirstUser + idx + 1}</td>
                          <td>{user.name}</td>
                          <td>{user.batch}</td>
                          <td>{user.pod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <Pagination className="justify-content-center">
                  <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                  <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                  {[...Array(totalPages).keys()].map(num => (
                    <Pagination.Item
                      key={num + 1}
                      active={num + 1 === currentPage}
                      onClick={() => setCurrentPage(num + 1)}
                    >
                      {num + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                  <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                </Pagination>

              </Card.Body>
            </Card>
          ) : (
            <Card className="shadow-sm rounded-3">
              <Card.Body>
                <p className="text-muted text-center">No users found for this organization.</p>
              </Card.Body>
            </Card>
          )}

          {/* Batch Cards */}
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

          

        </div>
      </div>
    </div>
  );
}

export default Orgadmin;
