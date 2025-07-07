import React, { useEffect, useState } from 'react';
import { useParams,useNavigate } from 'react-router-dom';
import { FaDownload,FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import { Spinner, Alert, Card, Row, Col, Badge, Button } from 'react-bootstrap';
import Orgadminsidebar from '../components/Orgadminsidebar';
import '../styles/orgadminusers.css';

function Orgadminuserprogress() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_LINK}/pod-users/user/id/${userId}`
        );

        if (response.data.success) {
          setUserData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch user progress.');
        }
      } catch (err) {
        if (err.response) {
          // Server responded with a status outside the 2xx range
          console.error('Server error:', err.response.data);
          setError(`Server error: ${err.response.data.message || 'Unknown error'}`);
        } else if (err.request) {
          // Request was made but no response
          console.error('Network error:', err.request);
          setError('Network error: No response from server.');
        } else {
          // Something else went wrong
          console.error('Error:', err.message);
          setError('Error: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProgress();
    }
  }, [userId]);

  const getStatusVariant = (status) => {
    switch (status) {
      case 'not started':
        return 'danger';
      case 'in progress':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const handleDownload = (conceptId, conceptName) => {
    console.log(`Download button clicked for Concept ID: ${conceptId}, Name: ${conceptName}`);
    alert(`Initiating download for ${conceptName}. (This is a placeholder action)`);
  };

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />
      <div className="content-area">
        <div className="container mt-4">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
              <Spinner animation="border" role="status" className="me-2" />
              <span className="text-muted fs-5">Loading progress...</span>
            </div>
          ) : error ? (
            <Alert variant="danger" className="text-center">{error}</Alert>
          ) : (
            <><Row className="justify-content-start mb-3">
                  <Col xs="auto">
                    <Button variant="secondary" onClick={() => navigate(-1)} style={{ borderRadius: '50px' }}>
                      <FaArrowLeft className="me-2" /> Back
                    </Button>
                  </Col>
                </Row><Row className="justify-content-center">

                    <Col md={10}>
                      <Card className="shadow-sm rounded-4 border-primary mb-4">
                        <Card.Header className="bg-primary text-white text-center py-3 rounded-top-4">
                          <h4 className="mb-0 fw-bold">
                            Progress of {userData.user.first_name} {userData.user.last_name}
                          </h4>
                        </Card.Header>
                        <Card.Body>
                          <p><strong>Email:</strong> {userData.user.email}</p>
                          <p><strong>Pod:</strong> <Badge bg="info">{userData.pod?.pod_name || 'N/A'}</Badge></p>
                          <p><strong>Batch:</strong> <Badge bg="secondary">{userData.batch?.batch_name || 'N/A'}</Badge></p>
                          <p><strong>Mentor:</strong> {userData.pod?.mentor?.first_name} {userData.pod?.mentor?.last_name} ({userData.pod?.mentor?.email})</p>
                        </Card.Body>
                      </Card>

                      {userData.progress && userData.progress.length > 0 ? (
                        <>
                          <h5 className="mb-3">Concept Progress</h5>
                          <Row xs={1} md={2} lg={3} className="g-4">
                            {userData.progress.map((prog) => {
                              const concept = userData.batch?.concepts.find(c => c.concept_id === prog.concept_id);
                              const conceptName = concept?.concept_name || `Concept ${prog.concept_id}`;
                              const statusText = prog.status.charAt(0).toUpperCase() + prog.status.slice(1);

                              return (
                                <Col key={prog.concept_id}>
                                  <Card className="h-100 shadow-sm rounded-3 border-secondary">
                                    <Card.Header className="fw-bold bg-primary text-white">
                                      {conceptName}
                                    </Card.Header>
                                    <Card.Body className="d-flex flex-column justify-content-between">
                                      <div className="d-flex justify-content-between align-items-center mt-auto">
                                        <div>
                                          <strong>Status: </strong>
                                          <Badge bg={getStatusVariant(prog.status)} className="fs-6">
                                            {statusText}
                                          </Badge>
                                        </div>
                                        <Button
                                          variant="primary"
                                          className="d-flex align-items-center justify-content-center"
                                          style={{ width: '40px', height: '40px' }}
                                          onClick={() => handleDownload(prog.concept_id, conceptName)}
                                        >
                                          <FaDownload />
                                        </Button>
                                      </div>
                                    </Card.Body>
                                  </Card>
                                </Col>
                              );
                            })}
                          </Row>
                        </>
                      ) : (
                        <Alert variant="info" className="text-center">No concept progress data available for this user.</Alert>
                      )}
                    </Col>
                  </Row></>
          )}
        </div>
      </div>
    </div>
  );
}

export default Orgadminuserprogress;
