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
import { FaArrowLeft } from 'react-icons/fa';
import Mentorsidebar from '../components/Mentorsidebar';

function Mentorpods() {
  const navigate = useNavigate();
  const email = sessionStorage.getItem('email');
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_LINK}/mentor/pods/${email}`
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

  const handleCardClick = (podId) => {
    navigate(`/mentorpodusers/${podId}`);
  };

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
                Your <span className="text-primary">Pods</span>
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
            {pods.map((pod) => (
              <Card
                key={pod.pod_id}
                className="shadow-sm rounded-3 border-primary clickable-card"
                style={{
                  width: '300px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.3s ease',
                  boxShadow: '0 10px 10px rgba(33, 180, 234, 0.1)'
                }}
                onClick={() => handleCardClick(pod.pod_id)}
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
                <Card.Header className="fw-bold fs-5 text-white bg-primary text-center">
                  {pod.pod_name}
                  <Badge
                    bg={pod.pod_is_active ? 'success' : 'secondary'}
                    className="ms-2"
                  >
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
        </div>
      </div>
    </div>
  );
}

export default Mentorpods;
