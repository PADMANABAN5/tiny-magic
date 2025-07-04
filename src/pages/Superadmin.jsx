import React from 'react';
import { BrowserRouter as Router, useNavigate } from 'react-router-dom'; // Import BrowserRouter
import {
  Building2, User, Users, LineChart, Settings, LayoutGrid, Mail, Database, ShieldCheck,
  Monitor, BookOpen, Clock
} from 'lucide-react'; 
import Supersidebar from '../components/Supersidebar'; // Import the sidebar component
import { Container, Row, Col, Card, Button, Nav, Navbar } from 'react-bootstrap'; // React-Bootstrap components
function Superadmin() {
  const username = sessionStorage.getItem("username");
  const navigate = useNavigate();

  return (
    <div className="d-flex bg-light min-vh-100">
      <Supersidebar /> {/* Sidebar component for navigation */}

      {/* Main Content Area */}
      <Container fluid className="p-4 p-md-5"> {/* Adjust margin for fixed sidebar */}
        {/* Header Section */}
        <Card className="shadow-sm mb-3 mt-4 border-0 rounded-3">
          <Card.Body className="p-4">
            <h1 className="fs-2 fw-bold text-dark mb-2">
              Welcome, <span className="text-primary">{username || 'Super Admin'}</span>!
            </h1>
            <p className="text-secondary fs-5">
              Manage platform-wide settings, organizations, and admin controls. Your central hub for ultimate control.
            </p>
          </Card.Body>
        </Card>

        {/* Core Management Sections */}
        <div className="mb-5">
          <div className="d-flex align-items-center mb-4 text-dark">
            <Settings className="me-3 text-primary" size={32} />
            <h2 className="fs-3 fw-bold">Core Management</h2>
          </div>
          <Row xs={1} sm={2} lg={4} className="g-4">
            {/* Organizations Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-primary-subtle rounded-circle d-inline-flex mb-3">
                    <Building2 className="text-primary" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Organizations</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    View, create, edit, and manage all registered organizations on the platform. Control their access and features.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/organization')}
                    variant="primary"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2"
                  >
                    <Monitor className="me-2" size={18} /> View Organizations
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Mentors Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-success-subtle rounded-circle d-inline-flex mb-3">
                    <User className="text-success" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Mentors</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Create, manage, and assign roles to mentors. Control their permissions and access rights.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/mentor')}
                    variant="success"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2"
                  >
                    <Users className="me-2" size={18} /> Manage Mentors
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Organization Users Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-warning-subtle rounded-circle d-inline-flex mb-3">
                    <Users className="text-warning" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Organization Users</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                   Add and view users within organizations. Oversee user accounts and their roles to maintain a structured environment.

                  </Card.Text>
                  <Button
                    onClick={() => navigate('/addusers')}
                    variant="warning"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2 text-white"
                  >
                    <User className="me-2" size={18} /> Add Users
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Organization Admins Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-danger-subtle rounded-circle d-inline-flex mb-3">
                    <ShieldCheck className="text-danger" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Organization Admins</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Add and manage organization-level administrators. Assign specific permissions to ensure secure.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/addorgadmin')}
                    variant="danger"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2"
                  >
                    <User className="me-2" size={18} /> Manage Admins
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Advanced Configuration Section */}
        <div className="mb-5">
          <div className="d-flex align-items-center mb-4 text-dark">
            <Settings className="me-3 text-info" size={32} />
            <h2 className="fs-3 fw-bold">Advanced Configuration</h2>
          </div>
          <Row xs={1} sm={2} lg={4} className="g-4">
            {/* Concepts Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-info-subtle rounded-circle d-inline-flex mb-3">
                    <BookOpen className="text-info" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Concepts</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Get comprehensive insights into platform usage, user activity, and performance metrics.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/concepts')}
                    variant="info"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2 text-white"
                  >
                    <LineChart className="me-2" size={18} /> View Stats
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Batch Management Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-secondary-subtle rounded-circle d-inline-flex mb-3">
                    <LayoutGrid className="text-secondary" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Batch Management</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Manage all aspects of batch creation, modification, and deletion. Streamline processes for data handling.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/batch')}
                    variant="secondary"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2"
                  >
                    <Clock className="me-2" size={18} /> Manage Batch
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* Pods Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-warning-subtle rounded-circle d-inline-flex mb-3">
                    <Mail className="text-warning" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">Pods</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Set up and manage platform pods, including configuration and resource allocation.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/pods')}
                    variant="warning"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2 text-white"
                  >
                    <Settings className="me-2" size={18} /> Manage Pods
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            {/* User Management Card */}
            <Col>
              <Card className="shadow-sm h-100 border-0 rounded-3">
                <Card.Body className="p-4">
                  <div className="p-3 bg-success-subtle rounded-circle d-inline-flex mb-3">
                    <Database className="text-success" size={32} />
                  </div>
                  <Card.Title className="fs-5 fw-semibold text-dark mb-2">User Management</Card.Title>
                  <Card.Text className="text-secondary mb-4 fs-6">
                    Manage all individual user accounts across all organizations by adding them into their respective pods.
                  </Card.Text>
                  <Button
                    onClick={() => navigate('/users')}
                    variant="success"
                    className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2"
                  >
                    <Users className="me-2" size={18} /> Manage Users
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
}
export default Superadmin;