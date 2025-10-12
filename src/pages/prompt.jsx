import React, { useEffect, useState } from 'react';
import axios  from 'axios';
import { FaPlus, FaHistory, FaEdit } from 'react-icons/fa';
import { Button, Table, Spinner, Alert, Modal, Form, Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import EditablePromptEditor from '../components/EditablePromptEditor.jsx';
import Supersidebar from '../components/Supersidebar';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/prompt.css';
 
export default function Prompt() {
  const navigate = useNavigate();
  const [allPrompts, setAllPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editPrompt, setEditPrompt] = useState(null);
  const [updatedUserContent, setUpdatedUserContent] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
 
  // Filter states
  const [selectedOrgIdFilter, setSelectedOrgIdFilter] = useState(''); // New state for filter
  const [selectedBatchIdFilter, setSelectedBatchIdFilter] = useState(''); // New state for filter
  const [batchListForFilter, setBatchListForFilter] = useState([]);
  

 
  // Modal states
  const [modalSelectedOrgId, setModalSelectedOrgId] = useState(''); // New state for modal
  const [modalSelectedBatchId, setModalSelectedBatchId] = useState(''); // New state for modal's batch
 
  const [orgList, setOrgList] = useState([]);
  const [batchListForModal, setBatchListForModal] = useState([]); // Separate batch list for modal to avoid conflicts
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const promptsPerPage = 10;
 
  const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

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
 
  const indexOfLastPrompt = currentPage * promptsPerPage;
  const indexOfFirstPrompt = indexOfLastPrompt - promptsPerPage;
  const currentPrompts = filteredPrompts.slice(indexOfFirstPrompt, indexOfLastPrompt);
  const totalPages = Math.ceil(filteredPrompts.length / promptsPerPage);
  const [originalPrompt, setOriginalPrompt] = useState(null);
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
  const allowCopyPaste = (e) => {
     e.stopPropagation(); // Prevent global event handlers from blocking
  };
  // Effect for filtering prompts based on filter dropdowns
  useEffect(() => {
    const filtered = allPrompts.filter(prompt => {
      const matchOrg = selectedOrgIdFilter ? prompt.organization_id?.toString() === selectedOrgIdFilter.toString() : true;
      const matchBatch = selectedBatchIdFilter ? prompt.batch_id?.toString() === selectedBatchIdFilter.toString() : true;
      return matchOrg && matchBatch;
    });
 
    setFilteredPrompts(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [allPrompts, selectedOrgIdFilter, selectedBatchIdFilter]); // Dependencies updated for filters
 
 
  // Fetch all prompts (global + assigned)
  const fetchPrompts = async () => {
    try {
      const [globalRes, allRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_LINK}/prompts/global`, config),
        axios.get(`${process.env.REACT_APP_API_LINK}/prompts/batch`, config),
      ]);
 
      const globalData = globalRes.data.data.map(p => ({ ...p, source: 'Global' }));
      const assignedData = allRes.data.data
        .filter(p => p.organization_name && p.batch_name)
        .map(p => ({ ...p, source: 'Assigned' }));
 
      setAllPrompts([...globalData, ...assignedData]);
    } catch (err) {
      console.error("Error fetching prompts:", err);
 
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Failed to load prompts.";
        const errorType = err.response?.status;
 
        switch (errorType) {
          case 400:
            showToastMsg(`Bad request: ${errorMessage}`);
            break;
          case 401:
            showToastMsg("Unauthorized. Please log in.");
            break;
          case 403:
            showToastMsg("Forbidden: You do not have permission.");
            break;
          case 404:
            showToastMsg("Prompts not found.");
            break;
          case 409:
            showToastMsg("Conflict: A similar prompt may already exist.");
            break;
          case 500:
            showToastMsg("Server error. Please try again later.");
            break;
          default:
            showToastMsg(`Failed to fetch prompts. (${errorType || "Unknown error"})`);
        }
      } else {
        showToastMsg("Network error. Please check your connection.", "danger");
      }

      setAllPrompts([]);
      setError("Failed to load prompts.");
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchPrompts();
  }, []);
 
 
  // Fetch organizations (used by both filter and modal)
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`, config)
      .then(res => setOrgList(res.data.data || []))
      .catch(err => console.error('Failed to fetch orgs:', err));
  }, []);
 
  // Fetch batches for selected org in the MODAL
  useEffect(() => {
    if (!modalSelectedOrgId) { // This now specifically reacts to the modal's org selection
      setBatchListForModal([]);
      setModalSelectedBatchId('');
      return;
    }
 
    axios
      .get(`${process.env.REACT_APP_API_LINK}/batches?organization_id=${modalSelectedOrgId}`, config)
      .then((res) => {
        setBatchListForModal(res.data.data || []); // Populate the modal's batch list
        setModalSelectedBatchId(''); // Reset batch when org changes
      })
      .catch((err) => {
        console.error('Failed to fetch batches for modal:', err);
        setBatchListForModal([]);
      });
  }, [modalSelectedOrgId]); // Dependency now `modalSelectedOrgId`
 
  const handleEditClick = (prompt) => {
    setEditPrompt(prompt);
    setOriginalPrompt(prompt); // NEW
    setUpdatedUserContent(prompt.user_content);
    setShowEditor(true);
  };
  useEffect(() => {
  if (!selectedOrgIdFilter) {
    setBatchListForFilter([]);
    setSelectedBatchIdFilter('');
    return;
  }

  axios
    .get(`${process.env.REACT_APP_API_LINK}/batches?organization_id=${selectedOrgIdFilter}`, config)
    .then((res) => {
      setBatchListForFilter(res.data.data || []);
    })
    .catch((err) => {
      console.error('Failed to fetch batches for filter:', err);
      setBatchListForFilter([]);
    });
}, [selectedOrgIdFilter]);
 
  const handleSave = () => {
  if (
    updatedUserContent.trim() === originalPrompt?.user_content?.trim()
  ) {
    showToastMsg('No changes detected', 'warning');

    return;
  }
 
  axios.put(`${process.env.REACT_APP_API_LINK}/prompts/${editPrompt.prompt_id}`, {
    user_content: updatedUserContent,
    json_content: editPrompt.json_content // Keep json_content as is
  }, config)
    .then(() => {
      setShowEditor(false);
      showToastMsg("Prompt updated successfully!", "primary");
      fetchPrompts();
    })
    .catch((err) => {
      console.error("Error updating prompt:", err);
 
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        let errorMsg = 'Something went wrong.';

        switch (status) {
          case 400:
            errorMsg = 'Bad request. Please check your input.';
            break;
          case 401:
            errorMsg = 'Unauthorized. Please log in.';
            break;
          case 403:
            errorMsg = 'Forbidden. You don’t have permission.';
            break;
          case 404:
            errorMsg = 'Prompt not found.';
            break;
          case 409:
            errorMsg = 'Conflict. This prompt might already exist.';
            break;
          case 500:
            errorMsg = 'Server error. Please try again later.';
            break;
          default:
            errorMsg = `Error ${status}: ${err.response.data?.message || err.message}`;
        }

        showToastMsg(errorMsg, "warning");
      } else {
        showToastMsg("Network error. Please check your connection.", "danger");
      }
    });
};
 
 useEffect(() => {
  // If an org is selected, load its batches
  if (selectedOrgIdFilter) {
    axios
      .get(`${process.env.REACT_APP_API_LINK}/batches?organization_id=${selectedOrgIdFilter}`, config)
      .then((res) => setBatchListForFilter(res.data.data || []))
      .catch((err) => {
        console.error('Failed to fetch batches:', err);
        setBatchListForFilter([]);
      });
  } else {
    // If no org selected, load all batches
    axios
      .get(`${process.env.REACT_APP_API_LINK}/batches`, config)
      .then((res) => setBatchListForFilter(res.data.data || []))
      .catch((err) => {
        console.error('Failed to fetch all batches:', err);
        setBatchListForFilter([]);
      });
  }
}, [selectedOrgIdFilter]);
 
  const handleAssignPrompt = () => {
    // Use modal-specific state variables for assignment
    if (!selectedPromptId || !modalSelectedOrgId || !modalSelectedBatchId) {
      showToastMsg("Please select all fields.", "warning");
      return;
    }
 
    axios.post(`${process.env.REACT_APP_API_LINK}/prompts/batch`, {
      prompt_id: selectedPromptId,
      organization_id: parseInt(modalSelectedOrgId), // Use modal's selected org
      batch_id: parseInt(modalSelectedBatchId),   // Use modal's selected batch
    }, config)
      .then(() => {
        showToastMsg("Prompt assigned successfully!", "primary");
        setShowAssignModal(false);
        fetchPrompts();
        // Reset modal states after successful assignment
        setSelectedPromptId(null);
        setModalSelectedOrgId('');
        setModalSelectedBatchId('');
        setBatchListForModal([]); // Clear modal batch list as well
      })
      .catch((err) => {
        console.error("Error assigning prompt:", err);
 
        if (axios.isAxiosError(err) && err.response) {
          const status = err.response.status;
          let errorMsg = 'Something went wrong.';

          switch (status) {
            case 400:
              errorMsg = 'Selected prompt type already exists for this batch.';
              break;
            case 401:
              errorMsg = 'Unauthorized. Please log in.';
              break;
            case 403:
              errorMsg = 'Forbidden. You do not have access.';
              break;
            case 404:
              errorMsg = 'Resource not found.';
              break;
            case 409:
              errorMsg = 'Prompt already assigned to this batch.';
              break;
            case 500:
              errorMsg = 'Server error. Try again later.';
              break;
            default:
              errorMsg = `Error ${status}: ${err.response.data?.message || err.message}`;
          }

          showToastMsg(errorMsg, "warning");
        } else {
          showToastMsg("Network error. Please check your connection.", "danger");
        }
      });
  };
 
  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
 
  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container">
          <div className="mb-3 global-promt-container">
            <h3>Global & Assigned Prompts</h3>
 
            <div className="btn-sec">
              <Button
                variant="secondary"
                onClick={() => navigate('/archived')}
                style={{ width: '49%', marginRight: '2%' }}
              >
                <FaHistory />
              </Button>
               <Button
                variant="primary"
                onClick={() => setShowAssignModal(true)}
                style={{ width: '49%' }}
              >
                <FaPlus />
              </Button> 
            </div>
          </div>
 
         {/* Filter Section */}
<div className="d-flex gap-3 my-3">
  <Form.Group>
   
    <Form.Select
      value={selectedOrgIdFilter}
      onChange={(e) => {
        setSelectedOrgIdFilter(e.target.value);
        setSelectedBatchIdFilter(''); // Reset batch when org changes
      }}
    >
      <option value="">All Organizations</option>
      {orgList.map(org => (
        <option key={org.organization_id} value={org.organization_id}>
          {org.organization_name}
        </option>
      ))}
    </Form.Select>
  </Form.Group>

  {/* 🔹 Always show Batch Filter */}
  <Form.Group>
    
    <Form.Select
      value={selectedBatchIdFilter}
      onChange={(e) => setSelectedBatchIdFilter(e.target.value)}
    >
      <option value="">All Batches</option>
      {batchListForFilter.map(batch => (
        <option key={batch.batch_id} value={batch.batch_id}>
          {batch.batch_name}
        </option>
      ))}
    </Form.Select>
  </Form.Group>
</div>

 
          <div className="table-responsive">
            <table className="table table-hover table-striped table-bordered">
              <thead className="">
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
                {currentPrompts.map((prompt) => (
                  <tr key={prompt.prompt_id}>
                    <td>{prompt.prompt_type}</td>
                    <td>{prompt.prompt_level}</td>
                     <td>{prompt.organization_name || '—'}</td>
                    <td>{prompt.batch_name || '—'}</td> 
                    <td>{prompt.version}</td>
                    <td>
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditClick(prompt)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="d-flex justify-content-center my-4">
              <Pagination>
                <Pagination.Prev
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                />
                {getPaginationItems()}
                <Pagination.Next
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                />
              </Pagination>
            </div>
          )}
 
 
          {showEditor && (
  <div className="popup-overlay" >
    <div className="popup-box" onClick={(e) => e.stopPropagation()}>
      <h4 className="mb-3 text-center">Edit Prompt</h4>

      <EditablePromptEditor
        initialContent={editPrompt?.user_content || ''}
        onSave={(updatedText) => setUpdatedUserContent(updatedText)}
      />

      <div className="d-flex justify-content-end gap-2 mt-3">
        <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
        <Button variant="success" onClick={handleSave}>Save</Button>
      </div>
    </div>
  </div>
)}
         {showAssignModal && (
  <div className="popup-overlay" >
    <div className="popup-box" onClick={(e) => e.stopPropagation()}>
      <h4 className="mb-3 text-center">Assign Prompt to Batch</h4>

      <Form.Group className="mb-3">
        <Form.Label>Select Prompt <span className="text-danger">*</span></Form.Label>
        <Form.Select
          value={selectedPromptId || ''}
          onChange={(e) => setSelectedPromptId(e.target.value)}
        >
          <option value="">-- Select --</option>
          {allPrompts
            .filter(p => p.source === 'Global')
            .map((p) => (
              <option key={p.prompt_id} value={p.prompt_id}>
                {p.prompt_type} - v{p.version}
              </option>
            ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Select Organization <span className="text-danger">*</span></Form.Label>
        <Form.Select
          value={modalSelectedOrgId}
          onChange={(e) => setModalSelectedOrgId(e.target.value)}
        >
          <option value="">-- Select --</option>
          {orgList.map(org => (
            <option key={org.organization_id} value={org.organization_id}>
              {org.organization_name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Select Batch <span className="text-danger">*</span></Form.Label>
        <Form.Select
          value={modalSelectedBatchId}
          onChange={(e) => setModalSelectedBatchId(e.target.value)}
          disabled={!modalSelectedOrgId}
        >
          <option value="">-- Select --</option>
          {batchListForModal
            .filter(batch => batch.organization_id?.toString() === modalSelectedOrgId?.toString())
            .map(batch => (
              <option key={batch.batch_id} value={batch.batch_id}>
                {batch.batch_name}
              </option>
            ))}
        </Form.Select>
      </Form.Group>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
        <Button variant="success" onClick={handleAssignPrompt}>Assign</Button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}