import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';
import '../styles/OrgList.css';

export default function Mentor() {
  const [mentors, setMentors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newMentor, setNewMentor] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/users/role/mentor");

      if (res.data && Array.isArray(res.data.data)) {
        setMentors(res.data.data);
      } else {
        setError("Unexpected data format received from server.");
        setMentors([]);
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setError("Failed to load mentors.");
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMentor = async (e) => {
    e.preventDefault();

    const { email, first_name, last_name, password } = newMentor;

    if (!email || !first_name || !last_name || !password) {
      alert("All fields are required.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/users/mentor", newMentor);
      setShowModal(false);
      setNewMentor({ email: '', first_name: '', last_name: '', password: '' });
      fetchMentors();
    } catch (err) {
      console.error("Error creating mentor:", err);
      alert("Failed to create mentor.");
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  return (
    <div className="main-layout-container">
      <Supersidebar />
      <div className="content-area">
        <div className="container mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Mentors</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ width: '200px' }}>
              Add Mentor
            </button>
          </div>

          {loading ? (
            <p>Loading mentors...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                </tr>
              </thead>
              <tbody>
                {mentors.length > 0 ? (
                  mentors.map((mentor) => (
                    <tr key={mentor.user_id}>
                      <td>{mentor.user_id}</td>
                      <td>{mentor.email}</td>
                      <td>{mentor.first_name}</td>
                      <td>{mentor.last_name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">No mentors found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Mentor</h4>
            <form onSubmit={handleCreateMentor}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  value={newMentor.email}
                  onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="first_name" className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="first_name"
                  value={newMentor.first_name}
                  onChange={(e) => setNewMentor({ ...newMentor, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="last_name" className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="last_name"
                  value={newMentor.last_name}
                  onChange={(e) => setNewMentor({ ...newMentor, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={newMentor.password}
                  onChange={(e) => setNewMentor({ ...newMentor, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-success me-2" style={{ width: '200px' }}>Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
