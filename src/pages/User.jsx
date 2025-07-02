import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function User() {
  const [podUsers, setPodUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [pods, setPods] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [newUser, setNewUser] = useState({
    organization_name: '',
    batch_name: '',
    pod_name: '',
    users: [{ user_identifier: '' }]
  });

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/pod-users/all/TestOrg');
      setPodUsers(res.data.data || []);
    } catch (err) {
      console.error('Error fetching pod users:', err);
      setError('Failed to load pod users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [orgRes, batchRes, podRes, userRes] = await Promise.all([
        axios.get('http://localhost:5000/api/organizations'),
        axios.get('http://localhost:5000/api/batches'),
        axios.get('http://localhost:5000/api/pods'),
        axios.get('http://localhost:5000/api/users')
      ]);
      setOrganizations(orgRes.data.data || []);
      setBatches(batchRes.data.data || []);
      setPods(podRes.data.data || []);
      setAllUsers(userRes.data.data || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/pod-users', newUser);
      alert('User added successfully');
      setShowModal(false);
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
      await axios.put(`http://localhost:5000/api/pod-users/${selectedUserId}`, {
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

  useEffect(() => {
    fetchAllUsers();
    fetchDropdownData();
  }, []);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Pod Users</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add User
            </button>
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>Pod User ID</th>
                  <th>User Email</th>
                  <th>Organization</th>
                  <th>Pod</th>
                  <th>Assigned</th>
                  <th>Concepts</th>
                  {/* <th>Action</th> */}
                </tr>
              </thead>
              <tbody>
                {podUsers.length > 0 ? (
                  podUsers.map((user, idx) => (
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
                      {/* <td>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleProgressModal(user.user_id)}
                        >
                          Update Progress
                        </button>
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Add User to Pod</h4>
            <form onSubmit={handleAddUser}>
              <div className="mb-3">
                <label className="form-label">Organization</label>
                <select
                  className="form-control"
                  value={newUser.organization_name}
                  onChange={(e) => setNewUser({ ...newUser, organization_name: e.target.value })}
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
                <label className="form-label">User Email</label>
                <select
                  className="form-control"
                  value={newUser.users[0].user_identifier}
                  onChange={(e) => setNewUser({ ...newUser, users: [{ user_identifier: e.target.value }] })}
                  required
                >
                  <option value="">-- Select User Email --</option>
                  {allUsers.map(user => (
                    <option key={user.user_id} value={user.email}>{user.email}</option>
                  ))}
                </select>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success" style={{ width: '200px' }}>Add</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>Cancel</button>
              </div>
            </form>
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
