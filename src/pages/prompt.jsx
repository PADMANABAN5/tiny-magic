import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaPlus, FaHistory } from 'react-icons/fa';
import { Button, Table, Spinner, Alert, Modal, Form } from 'react-bootstrap';
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


  // Fetch all prompts (global + assigned)
 const fetchPrompts = async () => {
  try {
    const [globalRes, allRes] = await Promise.all([
      axios.get(`${process.env.REACT_APP_API_LINK}/prompts/global`),
      axios.get(`${process.env.REACT_APP_API_LINK}/prompts/batch`),
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
    axios.get(`${process.env.REACT_APP_API_LINK}/organizations/active`)
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
      .get(`${process.env.REACT_APP_API_LINK}/batches?organization_id=${selectedOrgId}`)
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
    })
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
  })
    .then(() => {
      alert('✅ Prompt assigned successfully!');
      setShowAssignModal(false);
      fetchPrompts(); // 🔄 Refresh table without full reload
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

      <div className="mt-3 text-end">
        <Button variant="secondary" onClick={() => navigate('/archived')} style={{ marginRight: '10px' }}>
            <FaHistory className="me-2" /> 
  </Button>
        <Button variant="primary" onClick={() => setShowAssignModal(true)}>
            <FaPlus className="me-2" /> 
        </Button>
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
          {allPrompts.map((prompt) => (
            <tr key={prompt.prompt_id}>
              <td>{prompt.prompt_type}</td>
              <td>{prompt.prompt_level}</td>
              <td>{prompt.organization_name || '—'}</td>
              <td>{prompt.batch_name || '—'}</td>
              <td>{prompt.version}</td>
              {/* <td>{prompt.source}</td> */}
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
