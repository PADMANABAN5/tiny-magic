import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, Spinner, Alert, Modal, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css'; 
function Archived() {
  const [archivedPrompts, setArchivedPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPrompt, setViewPrompt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const promptsPerPage = 10;
  const navigate = useNavigate();
  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_LINK}/prompts/archived`, config)
      .then((res) => setArchivedPrompts(res.data.data || []))
      .catch((err) => {
        console.error('Failed to fetch archived prompts:', err);
        setError('Failed to load archived prompts');
      })
      .finally(() => setLoading(false));
  }, []);

  const indexOfLastPrompt = currentPage * promptsPerPage;
  const indexOfFirstPrompt = indexOfLastPrompt - promptsPerPage;
  const currentPrompts = archivedPrompts.slice(indexOfFirstPrompt, indexOfLastPrompt);
  const totalPages = Math.ceil(archivedPrompts.length / promptsPerPage);

  const getPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(currentPage - Math.floor(maxVisible / 2), 1);
    let endPage = startPage + maxVisible - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxVisible + 1, 1);
    }

    for (let number = startPage; number <= endPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return items;
  };

  if (loading) return <Spinner animation="border" variant="primary" className="m-4" />;
  if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center">
            <h3>Archived Prompts</h3>
            <Button variant="secondary" onClick={() => navigate(-1)} aria-label="Go back">
              ← Back
            </Button>
          </div>

          {currentPrompts.length === 0 ? (
            <Alert variant="info" className="mt-4">
              No archived prompts available.
            </Alert>
          ) : (
            <Table
              striped
              bordered
              hover
              responsive
              className="mt-3"
              aria-label="Archived Prompts Table"
            >
              <thead>
                <tr>
                  <th scope="col">Prompt Type</th>
                  <th scope="col">Prompt Level</th>
                  <th scope="col">Organization Name</th>
                  <th scope="col">Batch Name</th>
                  <th scope="col">Version</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPrompts.map((prompt) => (
                  <tr key={prompt.prompt_id} aria-label={`Prompt ${prompt.prompt_type}`}>
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
                        aria-label={`View prompt ${prompt.prompt_type}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="d-flex justify-content-center my-4">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                />
                {getPaginationItems()}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                />
              </Pagination>
            </div>
          )}

          <Modal
            show={showViewModal}
            onHide={() => setShowViewModal(false)}
            size="lg"
            key={viewPrompt?.prompt_id || 'modal'}
          >
            <Modal.Header closeButton>
              <Modal.Title>View Archived Prompt</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div
                className="p-4 bg-light border rounded shadow-sm"
                style={{
                  minHeight: '120px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {viewPrompt && viewPrompt.user_content ? (
                  <p className="mb-0">{viewPrompt.user_content}</p>
                ) : (
                  <p className="text-muted fst-italic mb-0">
                    No content available for this prompt.
                  </p>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    </div>
  );
}

export default Archived;