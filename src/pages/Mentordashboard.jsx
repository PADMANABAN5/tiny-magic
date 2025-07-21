import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Spinner, Alert, Button
} from 'react-bootstrap';
import {
  BookOpen, Key, LineChart, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Mentorsidebar from '../components/Mentorsidebar';
import '../styles/MentorDashboard.css';

function Mentordashboard() {
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const email = sessionStorage.getItem("email");
  const fullName = `${firstname || ''} ${lastname || ''}`.trim() || 'User';

  const [pods, setPods] = useState([]);
  const [conceptsMap, setConceptsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPodsAndConcepts = async () => {
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
        setError('Failed to fetch data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email) fetchPodsAndConcepts();
  }, [email]);

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

          {/* Empty State */}
          {!loading && pods.length === 0 && !error && (
            <Alert variant="info" className="text-center">
              You are not assigned to any pods yet.
            </Alert>
          )}

          {/* Advanced Configuration Section */}
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
