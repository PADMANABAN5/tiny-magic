import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Badge,
  Spinner,
  Alert,
  OverlayTrigger,
  Tooltip,
  Button,
  Row,
  Col,
} from "react-bootstrap";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import Orgadminsidebar from "../components/Orgadminsidebar";
import { useAuth } from "../components/AuthContext";

function Orgadminpods() {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const username = sessionStorage.getItem("username");
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    const fetchPods = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_LINK}/orgadmin/pods/${username}`,
          config
        );
        if (response.data.success) {
          const filtered = response.data.data.filter(
            (pod) => String(pod.batch_id) === String(batchId)
          );
          setPods(filtered);
        } else {
          setError(response.data.message || "Failed to fetch pods.");
        }
      } catch (err) {
        setError("Error fetching pods: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (username && batchId) fetchPods();
  }, [username, batchId]);

  const handleCardClick = (podId) => {
    navigate(`/orgadminusers/${podId}`);
  };

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />
      <div className="content-area">
        <div className="container mt-4">
          {/* Heading and Back Button Row */}
          <Row className="align-items-center justify-content-between mb-4">
            <Col className="d-flex align-items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                style={{ borderRadius: "50px" }}
              >
                <FaArrowLeft className="me-2" /> Back
              </Button>
              <h2 className="mb-0 fs-3 fw-bold text-dark">
                Your <span className="text-primary">Pods</span>
              </h2>
            </Col>
          </Row>

          {/* Conditional Content */}
          {loading ? (
            <div className="my-5 text-center w-100">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Loading pods...</p>
            </div>
          ) : error ? (
            <div className="my-5">
              <Alert variant="danger">Error: {error}</Alert>
            </div>
          ) : pods.length === 0 ? (
            <div className="my-5">
              <Alert variant="info">No pods found for this batch.</Alert>
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-4">
              {pods.map((pod) => {
                const conceptList = pod.batch.concepts || [];

                return (
                  <Card
                    key={pod.pod_id}
                    className="border-0 shadow-lg rounded-4 clickable-card"
                    style={{
                      width: "300px",
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(14px)",
                      border: "1px solid rgba(0, 178, 215, 0.25)",
                      cursor: "pointer",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    }}
                    onClick={() => handleCardClick(pod.pod_id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 28px rgba(0, 178, 215, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 15px rgba(0, 178, 215, 0.1)";
                    }}
                  >
                    {/* Header */}
                    <div
                      className="p-3 rounded-top-4 text-white text-center fw-semibold"
                      style={{
                        background: "linear-gradient(135deg, #00b2d7 0%, #0072ff 100%)",
                      }}
                    >
                      <h5 className="mb-0 text-capitalize">
                        {pod.pod_name}
                        <Badge
                          bg={pod.is_active ? "success" : "secondary"}
                          className="ms-2 rounded-pill px-3 py-1"
                        >
                          {pod.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </h5>
                    </div>

                    {/* Body */}
                    <Card.Body className="text-center px-3 pb-4 pt-3">
                      <h6 className="fw-semibold mb-4 text-muted">Pod Overview</h6>

                      <div className="d-flex flex-column align-items-center gap-3">
                        {/* Mentors */}
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-mentors-${pod.pod_id}`}>
                              <ul className="mb-0 ps-3">
                                {pod.mentors && pod.mentors.length > 0 ? (
                                  pod.mentors.map((m) => (
                                    <li key={m.user_id}>
                                      {m.first_name} {m.last_name}
                                    </li>
                                  ))
                                ) : (
                                  <li>No Mentors</li>
                                )}
                              </ul>
                            </Tooltip>
                          }
                        >
                          <div
                            className="px-3 py-2 rounded-3 fw-medium text-white"
                            style={{
                              background: "linear-gradient(135deg, #43e97b, #38f9d7)",
                              cursor: "pointer",
                            }}
                          >
                            Mentors ({pod.mentors?.length || 0})
                          </div>
                        </OverlayTrigger>

                        {/* Users & Concepts */}
                        <div className="d-flex flex-row gap-3 justify-content-center flex-wrap">
                          <div
                            className="px-3 py-2 rounded-3 fw-medium text-white"
                            style={{
                              background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                            }}
                          >
                            Users: {pod.user_count}
                          </div>

                          <OverlayTrigger
                            placement="top"
                            overlay={
                              <Tooltip id={`tooltip-concepts-${pod.pod_id}`}>
                                <ul className="mb-0 ps-3">
                                  {conceptList.length > 0 ? (
                                    conceptList.map((concept) => (
                                      <li key={concept.concept_id}>
                                        {concept.concept_name}
                                      </li>
                                    ))
                                  ) : (
                                    <li>No Concepts</li>
                                  )}
                                </ul>
                              </Tooltip>
                            }
                          >
                            <div
                              className="px-3 py-2 rounded-3 fw-medium text-dark"
                              style={{
                                background: "linear-gradient(135deg, #f7971e, #ffd200)",
                                cursor: "pointer",
                              }}
                            >
                              Concepts ({conceptList.length})
                            </div>
                          </OverlayTrigger>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Orgadminpods;