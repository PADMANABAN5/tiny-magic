import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css';

export default function User() {
  const [podUsers, setPodUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]); // All batches from API
  const [pods, setPods] = useState([]);     // All pods from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSelectUsersModal, setShowSelectUsersModal] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [progressText, setProgressText] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [unassignedOrgUsers, setUnassignedOrgUsers] = useState([]);
  const [tempSelectedUserEmails, setTempSelectedUserEmails] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // States for filtered dropdown options
  const [filteredBatches, setFilteredBatches] = useState([]);
  const [filteredPods, setFilteredPods] = useState([]);

  // Form state for adding new user(s)
  const [newUser, setNewUser] = useState({
    organization_name: '',
    batch_name: '', // Kept for display/potentially backend
    batch_id: '',   // Crucial for filtering pods
    pod_name: '',   // Kept for display/potentially backend
    pod_id: '',     // Crucial for adding pod user
    users: [],      // Array of user emails
  });

  // --- API Fetching Functions ---

  const fetchOrganizations = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/organizations`);
      setOrganizations(res.data.data || []);
      return res.data.data || [];
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
      return [];
    }
  };

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const orgs = await fetchOrganizations(); // Ensure organizations are fetched first

      if (orgs.length === 0) {
        setPodUsers([]);
        setLoading(false);
        return;
      }

      // Fetch pod users for each organization
      const userPromises = orgs.map(org =>
        axios.get(`${process.env.REACT_APP_API_LINK}/pod-users/all/${org.organization_identifier || org.organization_name}`)
      );

      const results = await Promise.all(userPromises);
      const allPodUsers = results.flatMap(res => res.data.data || []);
      setPodUsers(allPodUsers);

    } catch (err) {
      console.error('Error fetching pod users:', err);
      setError('Failed to load pod users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBatchesAndPods = async () => {
    try {
      const [batchRes, podRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_LINK}/batches`),
        axios.get(`${process.env.REACT_APP_API_LINK}/pods`),
      ]);
      setBatches(batchRes.data.data || []);
      setPods(podRes.data.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data (batches/pods):', err);
    }
  };

  const fetchUnassignedUsersForOrg = async (organizationName) => {
    if (!organizationName) {
      setUnassignedOrgUsers([]);
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/pod-users/unassigned/${organizationName}`);
      setUnassignedOrgUsers(res.data.data || []);
    } catch (err) {
      console.error(`Error fetching unassigned users for ${organizationName}:`, err);
      setUnassignedOrgUsers([]);
    }
  };

  // --- Event Handlers ---

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUser.users.length === 0) {
      alert('Please select at least one user.');
      return;
    }
    if (!newUser.organization_name || !newUser.batch_id || !newUser.pod_id) {
      alert('Please ensure Organization, Batch, and Pod are selected.');
      return;
    }

    try {
      const usersToAssign = newUser.users.map(email => ({ user_identifier: email }));
      await axios.post(`${process.env.REACT_APP_API_LINK}/pod-users`, {
        organization_name: newUser.organization_name,
        batch_name: newUser.batch_name,
        pod_name: newUser.pod_name,
        batch_id: newUser.batch_id, // Send the IDs for robust backend assignment
        pod_id: newUser.pod_id,
        users: usersToAssign,
      });
      alert('User(s) added successfully');
      setShowAddUserModal(false);
      // Reset form state completely
      setNewUser({ organization_name: '', batch_name: '', batch_id: '', pod_name: '', pod_id: '', users: [] });
      setTempSelectedUserEmails([]);
      fetchAllUsers(); // Refresh the main user list
    } catch (err) {
      console.error('Error adding user:', err);
      alert(`Failed to add user: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleProgressModal = (userId) => {
    setSelectedUserId(userId);
    setProgressText('');
    setShowProgressModal(true);
  };

  const handleInlineProgressUpdate = async () => {
    try {
      const formattedProgress = JSON.parse(progressText); // Ensure it's valid JSON
      await axios.put(`${process.env.REACT_APP_API_LINK}/pod-users/${selectedUserId}`, {
        progress: formattedProgress
      });
      alert('Progress updated successfully');
      setShowProgressModal(false);
      fetchAllUsers(); // Refresh data after update
    } catch (err) {
      console.error('Error updating progress:', err);
      alert(`Failed to update progress: ${err.message}. Please ensure JSON format is correct.`);
    }
  };

  const openSelectUsersModal = () => {
    if (!newUser.organization_name) {
      alert('Please select an Organization first to load unassigned users.');
      return;
    }
    setTempSelectedUserEmails([...newUser.users]); // Initialize temp selections
    setUserSearchTerm(''); // Clear search bar
    setShowSelectUsersModal(true);
  };

  const handleUserCheckboxChange = (email) => {
    setTempSelectedUserEmails(prevSelected =>
      prevSelected.includes(email)
        ? prevSelected.filter(e => e !== email)
        : [...prevSelected, email]
    );
  };

  const confirmUserSelection = () => {
    setNewUser(prevNewUser => ({
      ...prevNewUser,
      users: tempSelectedUserEmails,
    }));
    setShowSelectUsersModal(false);
  };

  // --- Filtering and Pagination ---

  const filteredUnassignedUsers = unassignedOrgUsers.filter(user =>
    (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) // Added null check for user.email
  );

  const assignedUsers = podUsers.filter(user => user.assigned);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = assignedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(assignedUsers.length / itemsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // --- useEffect Hooks ---

  // Initial data fetch for all assigned users and dropdown data
  useEffect(() => {
    fetchAllUsers();
    fetchAllBatchesAndPods(); // Fetch all batches and pods once
  }, []);

  // Effect to filter batches when organization_name changes
  useEffect(() => {
    if (newUser.organization_name && batches.length > 0) {
      const newFilteredBatches = batches.filter(
        batch => batch.organization_name === newUser.organization_name
      );
      setFilteredBatches(newFilteredBatches);
    } else {
      setFilteredBatches([]);
    }
    // Reset batch and pod when organization changes
    setNewUser(prev => ({
      ...prev,
      batch_name: '', batch_id: '',
      pod_name: '', pod_id: '',
      users: [] // Clear users as unassigned users depend on org
    }));
    setUnassignedOrgUsers([]); // Clear unassigned users
    setTempSelectedUserEmails([]); // Clear temp selections
  }, [newUser.organization_name, batches]); // Depend on organization_name and all batches

  // Effect to filter pods when batch_id changes
  useEffect(() => {
    console.log("Filtering Pods - Selected Batch ID:", newUser.batch_id);
    console.log("All Pods in state:", pods); // Important debug check

    if (newUser.batch_id && pods.length > 0) {
      // Ensure strict equality and type matching (e.g., if IDs are numbers from backend)
      const newFilteredPods = pods.filter(
        pod => String(pod.batch_id) === String(newUser.batch_id) // Robust comparison
      );
      setFilteredPods(newFilteredPods);
      console.log("Filtered Pods:", newFilteredPods); // See what made it through the filter
    } else {
      setFilteredPods([]);
      console.log("Filtered Pods: [] (No batch ID selected or no pods in state)");
    }
    // Reset pod when batch changes
    setNewUser(prev => ({ ...prev, pod_name: '', pod_id: '' }));
  }, [newUser.batch_id, pods]); // Depend on selected batch_id and all pods

  // Effect to fetch unassigned users for the selected organization
  useEffect(() => {
    if (newUser.organization_name) {
      fetchUnassignedUsersForOrg(newUser.organization_name);
    } else {
      setUnassignedOrgUsers([]);
      // No need to clear newUser.users here, it's done on org change
    }
  }, [newUser.organization_name]); // Depend on organization_name

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Assigned Pod Users</h3>
            <button className="btn btn-primary" onClick={() => {
              setShowAddUserModal(true);
              // Full reset for Add User Modal
              setNewUser({ organization_name: '', batch_name: '', batch_id: '', pod_name: '', pod_id: '', users: [] });
              setUnassignedOrgUsers([]);
              setTempSelectedUserEmails([]);
              setFilteredBatches([]); // Clear previous filtered batches
              setFilteredPods([]);     // Clear previous filtered pods
            }} style={{ width: '200px' }}>
              Add User
            </button>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>Pod User ID</th>
                    <th>User Email</th>
                    <th>Organization</th>
                    <th>Pod</th>
                    <th>Assigned</th>
                    <th>Concepts</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((user, idx) => (
                      <tr key={idx}>
                        <td>{user.pod?.pod_user_id || '—'}</td>
                        <td>{user.email || '—'}</td> {/* Added null check */}
                        <td>{user.batch?.organization_name || '—'}</td>
                        <td>{user.pod?.pod_name || '—'}</td>
                        <td>{user.assigned ? 'Yes' : 'No'}</td>
                        <td>
                          {user.batch?.concepts?.length ? (
                            <ul className="mb-0">
                              {user.batch.concepts.map((concept) => (
                                <li key={concept.concept_id}>{concept.concept_name}</li>
                              ))}
                            </ul>
                          ) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">No assigned users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                    <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                    {[...Array(totalPages).keys()].map((num) => (
                      <Pagination.Item
                        key={num + 1}
                        active={num + 1 === currentPage}
                        onClick={() => handlePageChange(num + 1)}
                      >
                        {num + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                    <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add User Main Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Add User(s) to Pod</h4>
            <form onSubmit={handleAddUser}>
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <select
                  className="form-control"
                  value={newUser.organization_name}
                  onChange={(e) => {
                    const selectedOrgName = e.target.value;
                    setNewUser(prev => ({
                      ...prev,
                      organization_name: selectedOrgName,
                      batch_name: '', batch_id: '', // Reset batch and pod related fields
                      pod_name: '', pod_id: '',
                      users: []
                    }));
                  }}
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map(org => (
                    <option key={org.organization_id} value={org.organization_name}>{org.organization_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Batch</label>
                <select
                  className="form-control"
                  value={newUser.batch_id} // Bind to batch_id for selection
                  onChange={(e) => {
                    const selectedBatchId = e.target.value;
                    const selectedBatch = filteredBatches.find(batch => String(batch.batch_id) === String(selectedBatchId));
                    setNewUser(prev => ({
                      ...prev,
                      batch_id: selectedBatchId,
                      batch_name: selectedBatch ? selectedBatch.batch_name : '',
                      pod_name: '', // Reset pod
                      pod_id: ''    // Reset pod_id
                    }));
                  }}
                  required
                  disabled={!newUser.organization_name}
                >
                  <option value="">-- Select Batch --</option>
                  {filteredBatches.map(batch => (
                    <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Pod</label>
                <select
                  className="form-control"
                  value={newUser.pod_id} // Bind to pod_id for selection
                  onChange={(e) => {
                    const selectedPodId = e.target.value;
                    const selectedPod = filteredPods.find(pod => String(pod.pod_id) === String(selectedPodId));
                    setNewUser(prev => ({
                      ...prev,
                      pod_id: selectedPodId,
                      pod_name: selectedPod ? selectedPod.pod_name : ''
                    }));
                  }}
                  required
                  disabled={!newUser.batch_id} // Depends on batch_id being selected
                >
                  <option value="">-- Select Pod --</option>
                  {filteredPods.map(pod => (
                    <option key={pod.pod_id} value={pod.pod_id}>{pod.pod_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Selected User Email(s)</label>
                <div className="d-flex align-items-center border p-2 rounded">
                  <span className="flex-grow-1 text-muted">
                    {newUser.users.length > 0 ? newUser.users.join(', ') : 'No users selected'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-info btn-sm ms-2"
                    onClick={openSelectUsersModal}
                    disabled={!newUser.organization_name}
                    style={{ width: '150px' }}
                  >
                    Select Users
                  </button>
                </div>
                {newUser.users.length === 0 && (
                  <small className="text-danger mt-1">Please select at least one user.</small>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" style={{ width: '200px' }}>Add</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)} style={{ width: '200px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Users Modal */}
      {showSelectUsersModal && (
        <div className="modal-overlay" onClick={() => setShowSelectUsersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Select Unassigned Users for {newUser.organization_name}</h4>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search user email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <div className="user-list-container" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
              {filteredUnassignedUsers.length > 0 ? (
                <ul className="list-group">
                  {filteredUnassignedUsers.map(user => (
                    <li key={user.user_id} className="list-group-item d-flex align-items-center">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        id={`user-${user.user_id}`}
                        checked={tempSelectedUserEmails.includes(user.email)}
                        onChange={() => handleUserCheckboxChange(user.email)}
                      />
                      <label htmlFor={`user-${user.user_id}`} className="form-check-label flex-grow-1">
                        {user.email}
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted">
                  {newUser.organization_name ? 'No unassigned users found for this organization or matching your search.' : 'Select an organization first.'}
                </p>
              )}
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-success" onClick={confirmUserSelection} style={{ width: '200px' }}>
                Add Selected Users ({tempSelectedUserEmails.length})
              </button>
              <button className="btn btn-secondary" onClick={() => setShowSelectUsersModal(false)} style={{ width: '200px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {showProgressModal && (
        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Progress</h4>
            <textarea
              className="form-control mb-3"
              placeholder='[{"concept_id":1,"status":"completed"}]'
              value={progressText}
              onChange={(e) => setProgressText(e.target.value)}
              rows={6}
            ></textarea>
            <div className="d-flex gap-2">
              <button className="btn btn-warning" onClick={handleInlineProgressUpdate} style={{ width: '200px' }}>Update</button>
              <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)} style={{ width: '200px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}