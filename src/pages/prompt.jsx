import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaHistory , FaEdit } from 'react-icons/fa';
import { Button, Table, Spinner, Alert, Modal, Form,Pagination,Toast, ToastContainer } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; 
import EditablePromptEditor from '../components/EditablePromptEditor.jsx';
import Supersidebar from '../components/Supersidebar';

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
  const [orgList, setOrgList] = useState([]);
  const [batchList, setBatchList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState('');
const [toastBg, setToastBg] = useState('primary'); // 'success', 'warning', 'danger', etc.

const promptsPerPage = 10;

const storedToken = sessionStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };


const indexOfLastPrompt = currentPage * promptsPerPage;
const indexOfFirstPrompt = indexOfLastPrompt - promptsPerPage;
const currentPrompts = filteredPrompts.slice(indexOfFirstPrompt, indexOfLastPrompt);
const totalPages = Math.ceil(filteredPrompts.length / promptsPerPage);


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
  useEffect(() => {
  const filtered = allPrompts.filter(prompt => {
    const matchOrg = selectedOrgId ? prompt.organization_id?.toString() === selectedOrgId.toString() : true;
    const matchBatch = selectedBatchId ? prompt.batch_id?.toString() === selectedBatchId.toString() : true;
    return matchOrg && matchBatch;
  });

  setFilteredPrompts(filtered);
  setCurrentPage(1); // Reset to first page when filter changes
}, [allPrompts, selectedOrgId, selectedBatchId]);


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
          setToastMessage(`⚠️ Bad request: ${errorMessage}`);
          break;
        case 401:
          setToastMessage("⚠️ Unauthorized. Please log in.");
          break;
        case 403:
          setToastMessage("⚠️ Forbidden: You do not have permission.");
          break;
        case 404:
          setToastMessage("⚠️ Prompts not found.");
          break;
        case 409:
          setToastMessage("⚠️ Conflict: A similar prompt may already exist.");
          break;
        case 500:
          setToastMessage("❌ Server error. Please try again later.");
          break;
        default:
          setToastMessage(`⚠️ Failed to fetch prompts. (${errorType || "Unknown error"})`);
      }

      setToastBg("warning");
    } else {
      setToastMessage("⚠️ Network error. Please check your connection.");
      setToastBg("danger");
    }

    setShowToast(true);
    setAllPrompts([]);
    setError("Failed to load prompts.");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchPrompts();
}, []);


  // Fetch organizations
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`, config)
      .then(res => setOrgList(res.data.data || []))
      .catch(err => console.error('Failed to fetch orgs:', err));
  }, []);

  // Fetch batches for selected org
  useEffect(() => {
    if (!selectedOrgId) {
      setBatchList([]);
      setSelectedBatchId('');
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_LINK}/batches?organization_id=${selectedOrgId}`, config)
      .then((res) => {
        setBatchList(res.data.data || []);
        setSelectedBatchId('');
      })
      .catch((err) => {
        console.error('Failed to fetch batches:', err);
        setBatchList([]);
      });
  }, [selectedOrgId]);

  const handleEditClick = (prompt) => {
    setEditPrompt(prompt);
    setUpdatedUserContent(prompt.user_content);
    setShowEditor(true);
  };

  const handleSave = () => {
  axios.put(`${process.env.REACT_APP_API_LINK}/prompts/${editPrompt.prompt_id}`, {
    user_content: updatedUserContent,
    json_content: editPrompt.json_content
  }, config)
    .then(() => {
      setShowEditor(false);
      setToastMessage("✅ Prompt updated successfully!");
      setToastBg("primary");
      setShowToast(true);
      fetchPrompts(); 
    })
    .catch((err) => {
      console.error("Error updating prompt:", err);

      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        let errorMsg = '❌ Something went wrong.';

        switch (status) {
          case 400:
            errorMsg = '⚠️ Bad request. Please check your input.';
            break;
          case 401:
            errorMsg = '⚠️ Unauthorized. Please log in.';
            break;
          case 403:
            errorMsg = '⚠️ Forbidden. You don’t have permission.';
            break;
          case 404:
            errorMsg = '⚠️ Prompt not found.';
            break;
          case 409:
            errorMsg = '⚠️ Conflict. This prompt might already exist.';
            break;
          case 500:
            errorMsg = '⚠️ Server error. Please try again later.';
            break;
          default:
            errorMsg = `❌ Error ${status}: ${err.response.data?.message || err.message}`;
        }

        setToastMessage(errorMsg);
        setToastBg("warning");
        setShowToast(true);
      } else {
        setToastMessage("❌ Network error. Please check your connection.");
        setToastBg("danger");
        setShowToast(true);
      }
    });
};


 const handleAssignPrompt = () => {
  if (!selectedPromptId || !selectedOrgId || !selectedBatchId) {
    setToastMessage("⚠️ Please select all fields.");
    setToastBg("warning");
    setShowToast(true);
    return;
  }

  axios.post(`${process.env.REACT_APP_API_LINK}/prompts/batch`, {
    prompt_id: selectedPromptId,
    organization_id: parseInt(selectedOrgId),
    batch_id: parseInt(selectedBatchId),
  }, config)
    .then(() => {
      setToastMessage("✅ Prompt assigned successfully!");
      setToastBg("primary");
      setShowToast(true);
      setShowAssignModal(false);
      fetchPrompts();
      setSelectedPromptId(null);
      setSelectedOrgId('');
      setSelectedBatchId('');
      setBatchList([]);
    })
    .catch((err) => {
      console.error("Error assigning prompt:", err);

      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        let errorMsg = '❌ Something went wrong.';

        switch (status) {
          case 400:
            errorMsg = '⚠️ Bad request. Please check the selected values.';
            break;
          case 401:
            errorMsg = '⚠️ Unauthorized. Please log in.';
            break;
          case 403:
            errorMsg = '⚠️ Forbidden. You do not have access.';
            break;
          case 404:
            errorMsg = '⚠️ Resource not found.';
            break;
          case 409:
            errorMsg = '⚠️ Prompt already assigned to this batch.';
            break;
          case 500:
            errorMsg = '⚠️ Server error. Try again later.';
            break;
          default:
            errorMsg = `❌ Error ${status}: ${err.response.data?.message || err.message}`;
        }

        setToastMessage(errorMsg);
        setToastBg("warning");
        setShowToast(true);
      } else {
        setToastMessage("❌ Network error. Please check your connection.");
        setToastBg("danger");
        setShowToast(true);
      }
    });
};



  if (loading) return <Spinner animation="border" variant="primary" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="main-layout-container">
      {/* Supersidebar is assumed to be a separate component */}
       <Supersidebar />
      <div className="content-area">
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
      <h3>Global & Assigned Prompts</h3>

      <div className="d-flex justify-content-between " style={{ width: '26%' }}>
       

<Button
  variant="secondary"
  onClick={() => navigate('/archived')}
 style={{ width: '49%' }}
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
      <div className="d-flex gap-3 my-3">
  <Form.Group>
    <Form.Label>Filter by Organization</Form.Label>
    <Form.Select
      value={selectedOrgId}
      onChange={(e) => setSelectedOrgId(e.target.value)}
    >
      <option value="">All Organizations</option>
      {orgList.map(org => (
        <option key={org.organization_id} value={org.organization_id}>
          {org.organization_name}
        </option>
      ))}
    </Form.Select>
  </Form.Group>

  
</div>

<div className="table-responsive">
        <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
          <tr>
            <th>Prompt Type</th>
            <th>Prompt Level</th>
            <th>Organization Name</th>
            <th>Batch Name</th>
            <th>Version</th>
            {/* <th>Source</th> */}
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
          variant="warning"
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

  


      {/* Edit Prompt Modal */}
      <Modal show={showEditor} onHide={() => setShowEditor(false)} size="lg" backdrop="static" >
        <Modal.Header closeButton>
          <Modal.Title>Edit Prompt</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EditablePromptEditor
            initialContent={editPrompt?.user_content || ''}
            onSave={(updatedText) => setUpdatedUserContent(updatedText)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
          <Button variant="success" onClick={handleSave}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* Assign Prompt Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Assign Prompt to Batch</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Select Prompt</Form.Label>
            <Form.Select
              value={selectedPromptId || ''}
              onChange={(e) => setSelectedPromptId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {allPrompts
                .filter(p => p.source === 'Global') // Only global prompts can be reassigned
                .map((prompt) => (
                  <option key={prompt.prompt_id} value={prompt.prompt_id}>
                    {prompt.prompt_type} - v{prompt.version}
                  </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Select Organization</Form.Label>
            <Form.Select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {orgList.map((org) => (
                <option key={org.organization_id} value={org.organization_id}>
                  {org.organization_name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Select Batch</Form.Label>
            <Form.Select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={!selectedOrgId}
            >
              <option value="">-- Select --</option>
              {batchList
                .filter(batch => batch.organization_id?.toString() === selectedOrgId?.toString())
                .map(batch => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_name}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleAssignPrompt}>
            Assign
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
    </div>
    <ToastContainer position="top-end" className="p-3">
  <Toast
    bg={toastBg}
    show={showToast}
    onClose={() => setShowToast(false)}
    delay={3000}
    autohide
  >
    <Toast.Header closeButton>
      <strong className="me-auto">Notice</strong>
    </Toast.Header>
    <Toast.Body className="text-white">{toastMessage}</Toast.Body>
  </Toast>
</ToastContainer>

    </div>
    
  );
}
