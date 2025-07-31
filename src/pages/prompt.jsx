import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaHistory } from 'react-icons/fa';
import { Button, Table, Spinner, Alert, Modal, Form,Pagination } from 'react-bootstrap';
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
    console.error(err);
    setError('Failed to load prompts');
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
        window.location.reload(); // Or re-fetch prompts
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to update prompt");
      });
  };

  const handleAssignPrompt = () => {
  if (!selectedPromptId || !selectedOrgId || !selectedBatchId) {
    alert('Please select all fields.');
    return;
  }

  axios.post(`${process.env.REACT_APP_API_LINK}/prompts/batch`, {
    prompt_id: selectedPromptId,
    organization_id: parseInt(selectedOrgId),
    batch_id: parseInt(selectedBatchId),
  }, config)
    .then(() => {
      alert('✅ Prompt assigned successfully!');
      setShowAssignModal(false);
      fetchPrompts();

      // 🔁 Reset modal form values
      setSelectedPromptId(null);
      setSelectedOrgId('');
      setSelectedBatchId('');
      setBatchList([]); // Optional: Reset batch list too
    })
    .catch((err) => {
      console.error(err);
      alert('❌ Failed to assign prompt');
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
      <h3>Global & Assigned Prompts</h3>

      <div className="mt-3 text-end" >
       

<Button
  variant="secondary"
  onClick={() => navigate('/archived')}
  style={{ width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }}
>
  <FaHistory />
</Button>
 <Button
  variant="primary"
  onClick={() => setShowAssignModal(true)}
  style={{ width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
>
  <FaPlus />
</Button>

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


      <Table striped bordered hover responsive className="mt-3">
        <thead>
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
          Edit
        </Button>
      </td>
    </tr>
  ))}
</tbody>

      </Table>
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
      <Modal show={showEditor} onHide={() => setShowEditor(false)} size="lg">
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
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
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
    </div>
    
  );
}
