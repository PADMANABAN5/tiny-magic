import React from 'react'
import { useNavigate } from 'react-router-dom' 
import { Card, Row, Col, Button } from 'react-bootstrap'
import {FaPlus,FaTasks} from 'react-icons/fa'
import Supersidebar from '../components/Supersidebar'
import '../styles/superadmin.css'

function Models_management() {
  const navigate = useNavigate(); 
    
  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div>
            <Row className="g-4">
              <Col xs={12} md={6}>
                <Card className="shadow-sm h-100 border-0 rounded-3">
                  <Card.Body className="p-4">
                    <div className="p-3 bg-gradient-Orange rounded-circle d-inline-flex mb-3">
                      <FaPlus className="text-Green" size={32} />
                    </div>
                    <Card.Title className="fs-5 fw-semibold text-dark mb-2">Add Models</Card.Title>
                    <Card.Text className="text-secondary mb-4 fs-6">
                      Add and Update Your OpenAi Models
                    </Card.Text>
                    <Button
                      onClick={() => navigate('/organization')} 
                      variant="info"
                      className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2 text-white superadmin-button"
                    >
                      <FaPlus className="me-2" size={18} /> Add Models
                    </Button>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12} md={6}>
                <Card className="shadow-sm h-100 border-0 rounded-3">
                  <Card.Body className="p-4">
                    <div className="p-3 bg-gradient-green rounded-circle d-inline-flex mb-3">
                      <FaTasks  className="text-blue" size={32} />
                    </div>
                    <Card.Title className="fs-5 fw-semibold text-dark mb-2">Assign Models</Card.Title>
                    <Card.Text className="text-secondary mb-4 fs-6">
                      Assign your OpenAi models to respective Levels
                    </Card.Text>
                    <Button
                      onClick={() => navigate('/mentor')}
                      variant="info"
                      className="w-100 d-flex align-items-center justify-content-center py-2 rounded-2 text-white superadmin-button"
                    >
                      <FaTasks className="me-2" size={18} /> Assign Models
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Models_management