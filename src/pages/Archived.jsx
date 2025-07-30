import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, Spinner, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import EditablePromptEditor from '../components/EditablePromptEditor.jsx';

function Archived() {
  const [archivedPrompts, setArchivedPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPrompt, setViewPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_LINK}/api/prompts/archived`)
      .then(res => setArchivedPrompts(res.data.data || []))
      .catch(err => {
        console.error('Failed to fetch archived prompts:', err);
        setError('Failed to load archived prompts');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner animation="border" variant="primary" className="m-4" />;
  if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center">
        <h3>Archived Prompts</h3>
        <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
      </div>

      {archivedPrompts.length === 0 ? (
        <Alert variant="info" className="mt-4">
          No archived prompts available.
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="mt-3">
          <thead>
            <tr>
              <th>Prompt Type</th>
              <th>Prompt Level</th>
              <th>Organization Name</th>
              <th>Batch Name</th>
              <th>Version</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {archivedPrompts.map((prompt) => (
              <tr key={prompt.prompt_id}>
                <td>{prompt.prompt_type}</td>
                <td>{prompt.prompt_level}</td>
                <td>{prompt.organization_name || '—'}</td>
                <td>{prompt.batch_name || '—'}</td>
                <td>{prompt.version}</td>
                <td>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => {
                      setViewPrompt(prompt);
                      setShowViewModal(true);
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* View Prompt Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>View Archived Prompt</Modal.Title>
        </Modal.Header>
        <Modal.Body>
      <div
          className="p-4 bg-light border rounded shadow-sm" // Increased padding, added shadow
          style={{
            minHeight: '120px', // Slightly increased minHeight
            maxHeight: '400px', // Increased maxHeight for more content
            overflowY: 'auto',
            fontFamily: 'Arial, sans-serif', // Changed to a more readable font
            fontSize: '1rem', // Standard font size
            lineHeight: '1.6', // Improved line spacing
            color: '#333', // Softer text color
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', // Ensure long words wrap
          }}
        >
          {viewPrompt?.user_content ? (
            <p className="mb-0">{viewPrompt.user_content}</p> // Wrap in a paragraph for better spacing
          ) : (
            <p className="text-muted fst-italic mb-0">No content available for this prompt.</p> // Better no-content message
          )}
        </div>


        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Archived;
