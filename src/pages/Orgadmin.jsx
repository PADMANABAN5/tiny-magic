import React, { useEffect, useState } from 'react';
import {
  Container, Row, Col, Card, Button, Badge
} from 'react-bootstrap';
import {
  User, Users, Building2, BarChart2, Settings, Key, CreditCard, Bell, FileText,
  ClipboardList, ShieldCheck, Megaphone, Plus, Download, Info, LayoutGrid
} from 'lucide-react';
import Orgadminsidebar from '../components/Orgadminsidebar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/orgadminusers.css';

function Orgadmin() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("username");
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
const fullName = `${capitalize(firstname)} ${capitalize(lastname)}`.trim() || 'User';
  const organizationName = sessionStorage.getItem("organization_name") || "Your Organization";
  const email = sessionStorage.getItem("email");

  const [batchesData, setBatchesData] = useState([]);

  useEffect(() => {
    if (email) {
      axios
        .get(`${process.env.REACT_APP_API_LINK}/orgadmin/batches/${email}`)
        .then(res => {
          if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            setBatchesData(res.data.data);
          } else {
            setBatchesData([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch batch info", err);
          setBatchesData([]);
        });
    }
  }, [email]);

  const handleCardClick = (batchId) => {
    navigate(`/orgadminpods/${batchId}`);
  };

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />

      <div className="content-area">
        <div className="container mt-4">
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

          {/* --- Batch Information Cards --- */}
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
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.3s ease',
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
                        <Badge bg="info" className="p-2">
                          Batch Size: {batch.batch_size}
                        </Badge>
                        <Badge bg="success" className="p-2">
                          Pod Count: {batch.pod_count}
                        </Badge>
                        <Badge bg="warning" text="dark" className="p-2">
                          User Count: {batch.user_count}
                        </Badge>
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
          {/* --- End Batch Information Cards --- */}
        </div>
      </div>
    </div>
  );
}

export default Orgadmin;
