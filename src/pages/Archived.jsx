import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, Spinner, Alert, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css'; 
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/prompt.css';

function Archived() {
  const [archivedPrompts, setArchivedPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewPrompt, setViewPrompt] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const promptsPerPage = 10;
  const navigate = useNavigate();

  const getToastType = (bg) => {
    switch (bg) {
      case 'primary':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      default:
        return 'info';
    }
  };

  const showToastMsg = (message, bg = "primary") => {
    toast(message, { type: getToastType(bg) });
  };
  
  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  useEffect(() => {
  axios
    .get(`${process.env.REACT_APP_API_LINK}/prompts/archived`, config)
    .then((res) => {
      setArchivedPrompts(res.data.data || []);
      setError(null);
    })
    .catch((err) => {
      console.error("Failed to fetch archived prompts:", err);

      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        let errorMsg = 'Failed to load archived prompts.';

        switch (status) {
          case 400:
            errorMsg = 'Bad request. Something is wrong with the request.';
            break;
          case 401:
            errorMsg = 'Unauthorized. Please log in.';
            break;
          case 403:
            errorMsg = 'Forbidden. Access denied.';
            break;
          case 404:
            errorMsg = 'Archived prompts not found.';
            break;
          case 500:
            errorMsg = 'Server error while fetching prompts.';
            break;
          default:
            errorMsg = `Error ${status}: ${err.response.data?.message || err.message}`;
        }

        setError(errorMsg);
        showToastMsg(errorMsg, 'warning');
      } else {
        setError('Network error. Please check your connection.');
        showToastMsg('Network error. Please check your connection.', 'danger');
      }
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
            
<div className="table-responsive">
        <table className="table table-striped table-bordered table-hover">
                  <thead className="">
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
                        variant="outline-info"
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
            </table>
            </div>
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

          {showViewModal && (
  <div className="popup-overlay" onClick={() => setShowViewModal(false)}>
    <div className="popup-box" onClick={(e) => e.stopPropagation()}>
      <h4 className="mb-3 text-center">View Archived Prompt</h4>

      <div className="mb-3">
        <div
          className="p-3 bg-light border rounded shadow-sm"
          style={{
            minHeight: '60px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <strong>User Content:</strong>
          {viewPrompt && viewPrompt.user_content ? (
            <p className="mb-0 mt-1">{viewPrompt.user_content}</p>
          ) : (
            <p className="text-muted fst-italic mb-0 mt-1">
              No user content available.
            </p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div
          className="p-3 bg-light border rounded shadow-sm"
          style={{
            minHeight: '60px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: '1.4',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          <strong>JSON Content:</strong>
          {viewPrompt && viewPrompt.json_content ? (
            <pre className="mb-0 mt-1"><code>{viewPrompt.json_content}</code></pre>
          ) : (
            <p className="text-muted fst-italic mb-0 mt-1">
              No JSON content available.
            </p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div
          className="p-3 bg-light border rounded shadow-sm"
          style={{
            minHeight: '60px',
            fontFamily: 'Arial, sans-serif',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <strong>Additional Content:</strong>
          {viewPrompt && viewPrompt.additional_content ? (
            <p className="mb-0 mt-1">{viewPrompt.additional_content}</p>
          ) : (
            <p className="text-muted fst-italic mb-0 mt-1">
              No additional content available.
            </p>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-end mt-3">
        <Button variant="secondary" onClick={() => setShowViewModal(false)}>
          Close
        </Button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}

export default Archived;