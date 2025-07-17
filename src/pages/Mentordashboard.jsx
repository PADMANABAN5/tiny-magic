import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Table, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Mentorsidebar from '../components/Mentorsidebar';
import '../styles/MentorDashboard.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const dummyPods = [
  {
    id: 1,
    name: 'Innovators Pod',
    // Original pod-level concepts, can be kept or removed based on your application's needs
    concepts: ['Product Development', 'Market Research', 'Startup Scaling', 'Pitching'],
    mentees: [
      { id: 101, name: 'Alice Smith', username: 'alice.s', email: 'alice.s@example.com', phone: '123-456-7890', joinDate: '2024-01-15', progress: 75, lastActivity: 'Reviewed project proposal', status: 'Active', menteeConcepts: ['Product Development', 'Pitching'] },
      { id: 102, name: 'Charlie Brown', username: 'charlie.b', email: 'charlie.b@example.com', phone: '987-654-3210', joinDate: '2024-02-01', progress: 90, lastActivity: 'Completed final review', status: 'Completed', menteeConcepts: ['Startup Scaling', 'Market Research'] },
      { id: 103, name: 'Frank Green', username: 'frank.g', email: 'frank.g@example.com', phone: '555-111-2222', joinDate: '2024-03-10', progress: 40, lastActivity: 'Initial setup call', status: 'Active', menteeConcepts: ['Product Development'] },
    ],
  },
  {
    id: 2,
    name: 'Growth Hackers Pod',
    concepts: ['Digital Marketing', 'SEO Optimization', 'Content Strategy', 'Analytics'],
    mentees: [
      { id: 201, name: 'Bob Johnson', username: 'bob.j', email: 'bob.j@example.com', phone: '111-222-3333', joinDate: '2024-01-20', progress: 50, lastActivity: 'Scheduled next session', status: 'Active', menteeConcepts: ['Digital Marketing', 'Analytics'] },
      { id: 202, name: 'Eve Adams', username: 'eve.a', email: 'eve.a@example.com', phone: '444-555-6666', joinDate: '2024-02-25', progress: 60, lastActivity: 'Provided feedback on resume', status: 'Active', menteeConcepts: ['Content Strategy'] },
    ],
  },
  {
    id: 3,
    name: 'Future Leaders Pod',
    concepts: ['Leadership Skills', 'Team Management', 'Public Speaking', 'Conflict Resolution'],
    mentees: [
      { id: 301, name: 'Diana Prince', username: 'diana.p', email: 'diana.p@example.com', phone: '777-888-9999', joinDate: '2024-03-05', progress: 30, lastActivity: 'Initial consultation', status: 'Active', menteeConcepts: ['Leadership Skills'] },
    ],
  },
];

// Main Mentordashboard component
function Mentordashboard() {
  const navigate = useNavigate();
  const firstname = sessionStorage.getItem("firstname");
  const lastname = sessionStorage.getItem("lastname");
  const organizationName = sessionStorage.getItem("organization_name") || "Your Organization";
  const email = sessionStorage.getItem("email");

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const fullName = `${capitalize(firstname)} ${capitalize(lastname)}`.trim() || 'User';

  return (
    <div className="app-container">
      <Mentorsidebar />
      <div className="content-area">
        <div className="container mt-4">
          <Card className="shadow-sm mb-3 mt-2 rounded-3 align-items-center" style={{ boxShadow: '0 10px 10px rgba(33, 150, 243, 0.2)' }}>
            <Card.Body className="p-4">
              <h1 className="fs-2 fw-bold text-dark mb-2">
                Welcome, <span className="text-primary">{fullName}</span> 👋 from <span className="text-primary">{organizationName}</span>
              </h1>
              <p className="text-secondary fs-5">
                Manage users, monitor activities, and oversee your organization efficiently. Your central control point.
              </p>
            </Card.Body>
          </Card>

          {/* Pods Section */}
          <h2 className="dashboard-title mt-5">Your Pods</h2>
          <Row>
            {dummyPods.map((pod) => (
              <Col lg={12} className="mb-4" key={pod.id}>
                <Card className="card-custom pod-card">
                  <Card.Header className="card-header-custom">
                    <div className="pod-name">
                      <i data-lucide="users" className="lucide-icon"></i> {pod.name}
                    </div>
                    <span className="mentee-count">{pod.mentees.length} Mentees</span>
                  </Card.Header>
                  <Card.Body>
                    {/* Removed pod-level concepts display if you're now showing mentee-specific concepts */}
                    {/*
                    {pod.concepts && pod.concepts.length > 0 && (
                      <ul className="pod-concepts">
                        {pod.concepts.map((concept, index) => (
                          <li key={index} className="pod-concept-item">
                            {concept}
                          </li>
                        ))}
                      </ul>
                    )}
                    */}

                    <Table responsive hover className="mb-0 pod-mentee-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th> {/* New Column */}
                          <th>Email</th>
                          <th>Concepts</th> {/* Updated Column */}
                          <th>Join Date</th>
                          <th>Progress</th>
                          <th>Last Activity</th>
                          <th>Status</th>
                          <th>Download</th> {/* New Column */}
                        </tr>
                      </thead>
                      <tbody>
                        {pod.mentees.map((mentee) => (
                          <tr key={mentee.id}>
                            <td>{mentee.name}</td>
                            <td>{mentee.username}</td> {/* Display username */}
                            <td>{mentee.email}</td>
                            <td>
                              {mentee.menteeConcepts && mentee.menteeConcepts.length > 0 ? (
                                <ul className="list-unstyled mb-0"> {/* Use list-unstyled for no default list styling */}
                                  {mentee.menteeConcepts.map((concept, idx) => (
                                    <li key={idx}>- {concept}</li>
                                  ))}
                                </ul>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td>{mentee.joinDate}</td>
                            <td>
                              <div style={{ width: 50, height: 50 }}>
                                <CircularProgressbar
                                  value={mentee.progress}
                                  text={`${mentee.progress}%`}
                                  styles={buildStyles({
                                    rotation: 0.25,
                                    strokeLinecap: 'butt',
                                    textSize: '24px',
                                    pathColor: `rgba(62, 152, 199, ${mentee.progress / 100})`,
                                    textColor: '#0d6efd',
                                    trailColor: '#d6d6d6',
                                    backgroundColor: '#3e98c7',
                                  })}
                                />
                              </div>
                            </td>
                            <td>{mentee.lastActivity}</td>
                            <td>
                              <span className={`badge ${mentee.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                                {mentee.status}
                              </span>
                            </td>
                            <td>
                              <Button variant="outline-primary" size="sm">
                                <i data-lucide="download" className="lucide-icon"></i> Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </div>
  );
}

export default Mentordashboard;