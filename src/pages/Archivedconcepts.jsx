import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Table, Spinner, Alert, Modal, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Supersidebar from '../components/Supersidebar';
//import '../styles/orgadminusers.css';
import { Bold } from 'lucide-react'

function Archivedconcepts() {
      const [archivedConcepts, setArchivedConcepts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewConcept, setViewConcept] = useState(null);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const filteredConcepts = archivedConcepts.filter(concept =>
        concept.concept_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentConcepts = filteredConcepts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredConcepts.length / itemsPerPage);
    const handlePageChange = (pageNum) => setCurrentPage(pageNum);
    const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };
 
    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_LINK}/concepts/archived`, config) // ✅ Updated API URL
            .then(res => setArchivedConcepts(res.data.data || []))
            .catch(err => {
                console.error('Failed to fetch archived concepts:', err);
                setError('Failed to load archived concepts');
            })
            .finally(() => setLoading(false));
    }, []);
 
    if (loading) return <Spinner animation="border" variant="primary" className="m-4" />;
    if (error) return <Alert variant="danger" className="m-4">{error}</Alert>;
 
    return (
        <div className="main-layout-container">
            <Supersidebar />
            <div className="content-area">
                <div className="container mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3>Archived Concepts</h3>
                        <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
                    </div>
                    <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 gap-3">
                        <div className="d-flex align-items-center">
                            <span className="me-2">Show entries:</span>
                            <select
                                className="form-select"
                                style={{ width: '100px' }}
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(parseInt(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                {[5, 10, 20, 50, 100].map((num) => (
                                    <option key={num} value={num}>{num}</option>
                                ))}
                            </select>
                        </div>
 
                        <div className="d-flex gap-3 mb-3">
                            <input
                                type="text"
                                className="form-control"
                                style={{ maxWidth: '250px' }}
                                placeholder="Search by Concept Name..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>
                    {currentConcepts.length === 0 ? (
                        <Alert variant="info" className="mt-4">
                            No archived concepts available.
                        </Alert>
                    ) : (
                        <Table striped bordered hover responsive className="mt-3">
                            <thead className="bg-primary text-white">
                                <tr>
                                    <th>Concept Name</th>
                                    <th>Version</th>
                                    <th>Archived At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    {currentConcepts.map((concept) => (
                        <tr key={concept.archive_id}>
                        <td>{concept.concept_name || '—'}</td>
                        <td>{concept.version || '—'}</td>
                        <td>{concept.archived_at ? new Date(concept.archived_at).toLocaleString() : '—'}</td>
                        <td>
                            <Button
                            variant="info"
                            size="sm"
                            onClick={() => {
                                setViewConcept(concept);
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
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center mt-4">
                            <Pagination>
                                <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                                <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
 
                                {(() => {
                                    const pageNumbers = [];
                                    const visiblePages = 5;
                                    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
                                    let endPage = startPage + visiblePages - 1;
 
                                    if (endPage > totalPages) {
                                        endPage = totalPages;
                                        startPage = Math.max(1, endPage - visiblePages + 1);
                                    }
 
                                    for (let i = startPage; i <= endPage; i++) {
                                        pageNumbers.push(
                                            <Pagination.Item
                                                key={i}
                                                active={i === currentPage}
                                                onClick={() => handlePageChange(i)}
                                            >
                                                {i}
                                            </Pagination.Item>
                                        );
                                    }
 
                                    return pageNumbers;
                                })()}
 
                                <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                                <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                            </Pagination>
                        </div>
                    )}
 
                   {showViewModal && (
    <div
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050,
        }}
        
    >
        <div
            style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '800px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
            {/* Header */}
            <div
                style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #ddd',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <h2 style={{ margin: 0 }}>View Archived Concept</h2>
                <button
                    onClick={() => setShowViewModal(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#666',
                    }}
                >
                    &times;
                </button>
            </div>

            {/* Body */}
            <div
                style={{
                    padding: '1.5rem',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '1px solid #ddd',
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
                {viewConcept?.download_link && (
                    <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                        <a
                            href={viewConcept.download_link}
                             target="_blank"
                             rel="noopener noreferrer"
                            style={{
                                backgroundColor: '#0d6efd',
                                color: '#fff',
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                textDecoration: 'none',
                            }}
                        >
                            Download
                        </a>
                    </div>
                )}

                {viewConcept ? (
                    Object.entries(viewConcept)
                        .filter(([key]) =>
                            ![
                                'archive_id',
                                'concept_id',
                                'is_active',
                                'created_at',
                                'updated_at',
                                'archived_at',
                                'version',
                                'download_link',
                            ].includes(key)
                        )
                        .map(([key, value]) => (
                            <div key={key} style={{ marginBottom: '0.75rem' }}>
                                <strong style={{ textTransform: 'capitalize', color: '#333' }}>
                                    {key.replace(/_/g, ' ')}:
                                </strong>
                                <span style={{ paddingLeft: '1rem', color: '#000' }}>
                                    {typeof value === 'string' || typeof value === 'number'
                                        ? value
                                        : <code>{JSON.stringify(value, null, 2)}</code>}
                                </span>
                            </div>
                        ))
                ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No concept data to display.</p>
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: '1rem',
                    textAlign: 'right',
                }}
            >
                <button
                    onClick={() => setShowViewModal(false)}
                    style={{
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
)}


                </div>
            </div>
        </div>
    );
}

export default Archivedconcepts