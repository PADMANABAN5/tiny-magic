import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios'; // You'll need to install axios: npm install axios
import Orgadminsidebar from '../components/Orgadminsidebar';
function OrgadminBatch() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const email = sessionStorage.getItem("email"); 

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/orgadmin/batches/${email}`);
                if (response.data.success) {
                    setBatches(response.data.data);
                } else {
                    setError(response.data.message || 'Failed to fetch batches.');
                }
            } catch (err) {
                setError('Error fetching data: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();
    }, []);

    if (loading) {
        return (
            <Container className="my-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
                <p className="mt-2">Loading batches...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="my-5">
                <Alert variant="danger">
                    Error: {error}
                </Alert>
            </Container>
        );
    }

    if (batches.length === 0) {
        return (
            <Container className="my-5">
                <Alert variant="info">
                    No batches found for this organization.
                </Alert>
            </Container>
        );
    }

    return (
        <div className="main-layout-container">
      {/* Sidebar component for navigation */}
      <Orgadminsidebar />
        <div className="content-area">
      <div className="container mt-4">
            <h2 className="mb-4 text-center" style={{marginTop:'20px'}}>Organization Batches</h2>
            <Row xs={1} md={1} lg={1} className="g-4">
                {batches.map((batch) => (
                    <Col key={batch.batch_id}>
                        <Card className="shadow-sm">
                            <Card.Header as="h5" className="bg-primary text-white">
                                {batch.batch_name}
                                <Badge bg={batch.is_active ? "success" : "secondary"} className="ms-3">
                                    {batch.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                <Card.Text>
                                    <strong>Organization:</strong> {batch.organization_name} <br />
                                    <strong>Batch Size:</strong> {batch.batch_size} <br />
                                    <strong>Users Enrolled:</strong> {batch.user_count} <br />
                                    <strong>Pods Deployed:</strong> {batch.pod_count} <br />
                                    <strong>Created At:</strong> {new Date(batch.created_at).toLocaleDateString()}
                                </Card.Text>

                                {batch.concepts && batch.concepts.length > 0 && (
                                    <div className="mt-4">
                                        <h6 className="mb-3 text-muted">Associated Concepts ({batch.concept_count})</h6>
                                        <ListGroup variant="flush">
                                            {batch.concepts.map((concept) => (
                                                <ListGroup.Item key={concept.concept_id} className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <strong>{concept.concept_name}</strong>
                                                        <p className="mb-1 text-muted"><small>{concept.concept_content}</small></p>
                                                        <ul className="list-unstyled mb-0">
                                                            <li><small><strong>Enduring Understandings:</strong> {concept.concept_enduring_understandings}</small></li>
                                                            <li><small><strong>Essential Questions:</strong> {concept.concept_essential_questions}</small></li>
                                                            <li><small><strong>Knowledge & Skills:</strong> {concept.concept_knowledge_skills}</small></li>
                                                        </ul>
                                                        <div className="mt-2">
                                                            <Badge bg="info" className="me-1">Stage 1: {concept.stage_1_content}</Badge>
                                                            <Badge bg="info" className="me-1">Stage 2: {concept.stage_2_content}</Badge>
                                                            <Badge bg="info" className="me-1">Stage 3: {concept.stage_3_content}</Badge>
                                                            <Badge bg="info" className="me-1">Stage 4: {concept.stage_4_content}</Badge>
                                                            <Badge bg="info">Stage 5: {concept.stage_5_content}</Badge>
                                                        </div>
                                                        <p className="mt-2 mb-0"><small><strong>Understanding Rubric:</strong> {concept.concept_understanding_rubric}</small></p>
                                                        <p className="mb-0"><small><strong>Skills Rubric:</strong> {concept.understanding_skills_rubric}</small></p>
                                                        <p className="mb-0"><small><strong>Assessment Dimensions:</strong> {concept.learning_assessment_dimensions}</small></p>
                                                    </div>
                                                    <Badge bg={concept.is_active ? "success" : "secondary"}>
                                                        {concept.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </div>
                                )}
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

export default OrgadminBatch;