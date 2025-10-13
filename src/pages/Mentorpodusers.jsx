import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Pagination,
  Table,
  Badge,
  OverlayTrigger,
  Popover,
  Button,
} from "react-bootstrap";
import axios from "axios";
import { FaArrowLeft } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import Mentorsidebar from "../components/Mentorsidebar";
import "../styles/orgadminusers.css";
import { useAuth } from "../components/AuthContext.jsx";

function Mentorpodusers() {
  const { podId } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [podInfo, setPodInfo] = useState(null);
  const usersPerPage = 6;
  const email = sessionStorage.getItem("email");
  const { token } = useAuth();

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_LINK}/pods/${podId}`,
          config
        );
        if (res.data.success) {
          const podData = res.data.data;
          setUsers(podData.orgusers || []);
          setPodInfo({
            batchName: podData.batch?.batch_name || "N/A",
            podName: podData.pod_name || "N/A",
            mentors: podData.mentors || [],

            concepts: podData.batch?.concepts || [],
          });
        } else {
          setError(res.data.message || "Failed to fetch pod data.");
        }
      } catch (err) {
        setError("Error fetching users: " + err.message);
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
      <Mentorsidebar />
      <div className="content-area">
        <div className="container mt-4">
          {/* Heading + Back Button Row */}
          <Row className="align-items-center justify-content-between mb-4">
            <Col>
              <h2 className="mb-0 text-primary">
                Users in Pod:{" "}
                <span className="text-dark fw-bold">
                  {podInfo?.podName || podId}
                </span>
              </h2>
            </Col>
            <Col xs="auto">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                style={{ borderRadius: "50px" }}
              >
                <FaArrowLeft className="me-2" /> Back
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div
              className="d-flex justify-content-center align-items-center my-5"
              style={{ minHeight: "200px" }}
            >
              <Spinner animation="border" role="status" className="me-2" />
              <span className="text-muted fs-5">Loading data...</span>
            </div>
          ) : error ? (
            <Alert variant="danger" className="text-center py-3">
              {error}
            </Alert>
          ) : (
            <Row className="g-4 justify-content-center">
              {/* Pod Info Card */}
              <Col xs={12} md={4} className="mb-4 mb-md-0">
                <Card
                  className="border-0 shadow-lg rounded-4 bg-white w-100"
                  style={{
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(0, 178, 215, 0.25)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                >
                  {/* HEADER */}
                  <Card.Header
                    className="text-white rounded-top-4  text-center fw-bold"
                    style={{
                      background:
                        "linear-gradient(135deg, #00b2d7 0%, #0072ff 100%)",
                      fontSize: "1.5rem",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {podInfo?.podName || "N/A"}
                  </Card.Header>

                  {/* BODY */}
                  <Card.Body className="pod-card-body">
  <Card.Title className="text-center mb-3 pod-title">Pod Details</Card.Title>

  <div className="pod-info-container d-flex flex-column align-items-center">
    {/* Organization Row */}
    <div className="pod-top-row">
      <Badge bg="info" className="p-2 text-wrap text-center org-badge">
        Batch: {podInfo?.batchName || "N/A"}
      </Badge>
    </div>

    {/* Mentors and Concepts Row */}
    <div className="pod-bottom-row">
      <OverlayTrigger
        trigger="click"
        placement="bottom"
        overlay={
          <Popover id="popover-mentors">
            <Popover.Header as="h3">
                              {podInfo?.mentors?.length || 0} Mentor
                              {podInfo?.mentors?.length > 1 ? "s" : ""}
                            </Popover.Header>
            <Popover.Body>
                              <ul className="mb-0 ps-3">
                                {podInfo?.mentors?.length > 0 ? (
                                  podInfo.mentors.map((mentor, idx) => (
                                    <li key={idx}>
                                      {mentor.first_name} {mentor.last_name}
                                    </li>
                                  ))
                                ) : (
                                  <li>No Mentors</li>
                                )}
                              </ul>
                            </Popover.Body>
          </Popover>
        }
        rootClose
      >
        <Badge
          bg="secondary"
          className="p-2 text-wrap text-center batch-badge"
          style={{ cursor: "pointer" }}
        >
          Mentors: {podInfo?.mentors?.length || 0}
        </Badge>
      </OverlayTrigger>

      {podInfo?.concepts?.length > 0 ? (
        <OverlayTrigger
          trigger="click"
          placement="bottom"
          overlay={
            <Popover id="popover-concepts">
              <Popover.Header as="h3">Concepts</Popover.Header>
                              <Popover.Body>
                                <ul className="mb-0 ps-3">
                                  {podInfo.concepts.map((concept, idx) => (
                                    <li key={idx}>{concept.concept_name}</li>
                                  ))}
                                </ul>
                              </Popover.Body>
            </Popover>
          }
          rootClose
        >
          <Badge
            bg="warning"
            className="p-2 text-wrap text-center text-dark batchsize-badge"
            style={{ cursor: "pointer" }}
          >
            Concepts: {podInfo.concepts.length}
          </Badge>
        </OverlayTrigger>
      ) : (
        <Badge
          bg="warning"
          className="p-2 text-wrap text-center text-dark batchsize-badge"
        >
          No Concepts
        </Badge>
      )}
    </div>
  </div>
</Card.Body>

                </Card>
              </Col>

              {/* Users Table */}
              <Col xs={12} md={8}>
                <Card className="shadow-sm border-0 rounded-3">
                  <Card.Body className="p-0">
                    {currentUsers.length > 0 ? (
                      <Table
                        responsive
                        bordered
                        hover
                        className="mb-0 w-100 overflow-hidden custom-table"
                      >
                        <caption
                          className="text-center fw-medium text-white p-2 bg-primary caption-top"
                          style={{
                            borderTopLeftRadius: "0.5rem",
                            borderTopRightRadius: "0.5rem",
                          }}
                        >
                          List of Users in this Pod
                        </caption>
                        <thead className=" text-white">
                          <tr>
                            <th
                              className="py-3 text-center"
                              style={{ width: "5%" }}
                            >
                              S.No
                            </th>
                            <th className="py-3" style={{ width: "20%" }}>
                              First Name
                            </th>
                            <th className="py-3" style={{ width: "20%" }}>
                              Last Name
                            </th>
                            
                            <th
                              className="py-3 text-center"
                              style={{ width: "25%" }}
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentUsers.map((user, index) => (
                            <tr key={user.user_id}>
                              <td className="text-center">
                                {indexOfFirstUser + index + 1}
                              </td>
                              <td>{user.first_name}</td>
                              <td>{user.last_name}</td>
                              
                              <td>
                                <button
  className="btn btn-outline-primary w-100 btn-sm"
  style={{ borderRadius: "18px" }}
  onClick={() =>
    navigate(`/mentorpodusersprogress/${user.user_id}`)
  }
>
  View Progress
</button>

                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info" className="m-3 text-center py-3">
                        No users found for this pod.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-4 justify-content-center">
                    <Pagination.First
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <Pagination.Item
                          key={page}
                          active={page === currentPage}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Pagination.Item>
                      )
                    )}
                    <Pagination.Next
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    />
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

export default Mentorpodusers;
