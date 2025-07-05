import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import '../styles/OrgList.css'; // Assuming this CSS file is relevant for styling modals

export default function User() {
  const [podUsers, setPodUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false); // Renamed for clarity
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showSelectUsersModal, setShowSelectUsersModal] = useState(false); // New modal for selecting users
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [unassignedOrgUsers, setUnassignedOrgUsers] = useState([]); // Unassigned users for the current org
  const [tempSelectedUserEmails, setTempSelectedUserEmails] = useState([]); // Temporary selections in the user selection modal
  const [userSearchTerm, setUserSearchTerm] = useState(''); // For searching unassigned users

  const [newUser, setNewUser] = useState({
    organization_name: '',
    batch_name: '',
    pod_name: '',
    users: [], // This will store the final selected emails
  });

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
      const orgs = await fetchOrganizations();

      if (orgs.length === 0) {
        setPodUsers([]);
        setLoading(false);
        return;
      }

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

  const fetchDropdownData = async () => {
    try {
      const [batchRes, podRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_LINK}/batches`),
        axios.get(`${process.env.REACT_APP_API_LINK}/pods`),
      ]);
      setBatches(batchRes.data.data || []);
      setPods(podRes.data.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newUser.users.length === 0) {
      alert('Please select at least one user.');
      return;
    }

    try {
      const usersToAssign = newUser.users.map(email => ({ user_identifier: email }));
      await axios.post(`${process.env.REACT_APP_API_LINK}/pod-users`, {
        ...newUser,
        users: usersToAssign,
      });
      alert('User(s) added successfully');
      setShowAddUserModal(false);
      setNewUser({ organization_name: '', batch_name: '', pod_name: '', users: [] }); // Reset form
      setTempSelectedUserEmails([]); // Clear temp selections
      fetchAllUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      alert('Failed to add user');
    }
  };

  const handleProgressModal = (userId) => {
    setSelectedUserId(userId);
    setProgressText('');
    setShowProgressModal(true);
  };

  const handleInlineProgressUpdate = async () => {
    try {
      const formattedProgress = JSON.parse(progressText);
      await axios.put(`${process.env.REACT_APP_API_LINK}/pod-users/${selectedUserId}`, {
        progress: formattedProgress
      });
      alert('Progress updated successfully');
      setShowProgressModal(false);
      fetchAllUsers();
    } catch (err) {
      console.error('Error updating progress:', err);
      alert('Failed to update progress');
    }
  };

  // Handler for opening the "Select Users" modal
  const openSelectUsersModal = () => {
    if (!newUser.organization_name) {
      alert('Please select an Organization first to load unassigned users.');
      return;
    }
    // Initialize tempSelectedUserEmails with currently selected users
    setTempSelectedUserEmails([...newUser.users]);
    setUserSearchTerm(''); // Clear search term when opening modal
    setShowSelectUsersModal(true);
  };

  // Handler for checkbox changes in "Select Users" modal
  const handleUserCheckboxChange = (email) => {
    setTempSelectedUserEmails(prevSelected =>
      prevSelected.includes(email)
        ? prevSelected.filter(e => e !== email)
        : [...prevSelected, email]
    );
  };

  // Handler for confirming user selections from the modal
  const confirmUserSelection = () => {
    setNewUser(prevNewUser => ({
      ...prevNewUser,
      users: tempSelectedUserEmails,
    }));
    setShowSelectUsersModal(false);
  };

  // Filter unassigned users based on search term
  const filteredUnassignedUsers = unassignedOrgUsers.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchAllUsers();
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (newUser.organization_name) {
      fetchUnassignedUsersForOrg(newUser.organization_name);
    } else {
      setUnassignedOrgUsers([]);
      setNewUser(prev => ({ ...prev, users: [] })); // Clear selected users if org is cleared
    }
  }, [newUser.organization_name]);

  const assignedUsers = podUsers.filter(user => user.assigned);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = assignedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(assignedUsers.length / itemsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Assigned Pod Users</h3>
            <button className="btn btn-primary" onClick={() => {
              setShowAddUserModal(true);
              setNewUser({ organization_name: '', batch_name: '', pod_name: '', users: [] }); // Reset form
              setUnassignedOrgUsers([]); // Clear unassigned users
              setTempSelectedUserEmails([]); // Clear temp selections
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
                        <td>{user.email}</td>
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
                    setNewUser({ ...newUser, organization_name: e.target.value, batch_name: '', pod_name: '', users: [] });
                    setTempSelectedUserEmails([]); // Clear temp selections on org change
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
                  value={newUser.batch_name}
                  onChange={(e) => setNewUser({ ...newUser, batch_name: e.target.value })}
                  required
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map(batch => (
                    <option key={batch.batch_id} value={batch.batch_name}>{batch.batch_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Pod</label>
                <select
                  className="form-control"
                  value={newUser.pod_name}
                  onChange={(e) => setNewUser({ ...newUser, pod_name: e.target.value })}
                  required
                >
                  <option value="">-- Select Pod --</option>
                  {pods.map(pod => (
                    <option key={pod.pod_id} value={pod.pod_name}>{pod.pod_name}</option>
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
                    disabled={!newUser.organization_name} // Disable until an organization is selected
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

      {/* Update Progress Modal (remains the same) */}
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