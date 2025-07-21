import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Badge,
  Spinner,
  Alert,
  Button,
  Row,
  Col
} from 'react-bootstrap';
import axios from 'axios';
import { FaArrowLeft, FaDownload } from 'react-icons/fa';
import Mentorsidebar from '../components/Mentorsidebar';

function Mentorconcepts() {
  const navigate = useNavigate();
  const email = sessionStorage.getItem('email');
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_LINK}/mentor/pods/${email}/concepts`
        );
        if (response.data.success) {
          setPods(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch pods.');
        }
      } catch (err) {
        setError('Error fetching pods: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email) fetchPods();
  }, [email]);

  if (loading) {
    return (
      <div className="my-5 text-center w-100">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Loading pods...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-5 ms-auto me-4">
        <Alert variant="danger">Error: {error}</Alert>
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="my-5 ms-auto me-4">
        <Alert variant="info">No pods found for this mentor.</Alert>
      </div>
    );
  }

  return (
    <div className="main-layout-container">
      <Mentorsidebar />
      <div className="content-area">
        <div className="container mt-4">
          <Row className="align-items-center justify-content-between mb-4">
            <Col>
              <h2 className="mb-0 fs-3 fw-bold text-dark">
                Your <span className="text-primary">Concepts</span>
              </h2>
            </Col>
            <Col xs="auto">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                style={{ borderRadius: '50px' }}
              >
                <FaArrowLeft className="me-2" /> Back
              </Button>
            </Col>
          </Row>

          <div className="d-flex flex-wrap gap-4">
            {pods.flatMap((pod) =>
  (pod.batch?.concepts || []).map((concept, index) => {
    const orgName = pod.batch?.organization?.organization_name || 'N/A';
    const batchName = pod.batch?.batch_name || 'N/A';

    return (
      <Card
        key={`${pod.pod_id}-${concept.concept_id}-${index}`}
        className="shadow-sm rounded-3 border-primary"
        style={{
          width: '320px',
          cursor: 'default',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.3s ease',
          boxShadow: '0 10px 10px rgba(33, 180, 234, 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow =
            '0 12px 20px rgba(33, 180, 234, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 10px 10px rgba(33, 180, 234, 0.1)';
        }}
      >
        <Card.Header className="fw-bold fs-6 text-white bg-primary d-flex justify-content-between align-items-center">
          <span>{concept.concept_name}</span>
          <Badge bg={pod.is_active ? 'success' : 'secondary'}>
            {pod.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </Card.Header>

        <Card.Body className="d-flex flex-column align-items-start gap-2">
          <div><strong>Pod Name:</strong> {pod.pod_name}</div>
          <div><strong>Organization:</strong> {orgName}</div>
          <div><strong>Batch:</strong> {batchName}</div>
          <Button variant="outline-primary" className="mt-2 w-100">
            <FaDownload className="me-2" />
            Download
          </Button>
        </Card.Body>
      </Card>
    );
  })
)}

          </div>
        </div>
      </div>
    </div>
  );
}

export default Mentorconcepts;
