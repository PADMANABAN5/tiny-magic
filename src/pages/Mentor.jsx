import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';
import Supersidebar from '../components/Supersidebar';
import { Pagination } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../styles/OrgList.css';

export default function Mentor() {
  const [mentors, setMentors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newMentor, setNewMentor] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [editMentor, setEditMentor] = useState({
    user_id: '',
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_LINK}/users/role/mentor`);
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
      await axios.post(`${process.env.REACT_APP_API_LINK}/users/mentor`, newMentor);
      setShowModal(false);
      setNewMentor({ email: '', first_name: '', last_name: '', password: '' });
      fetchMentors();
    } catch (err) {
      console.error("Error creating mentor:", err);
      alert("Failed to create mentor.");
    }
  };

  const handleUpdateClick = (mentor) => {
    setEditMentor({
      user_id: mentor.user_id,
      email: mentor.email,
      username: mentor.username || '',
      first_name: mentor.first_name,
      last_name: mentor.last_name,
      password: ''
    });
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${process.env.REACT_APP_API_LINK}/users/${editMentor.user_id}`, editMentor);
      setShowUpdateModal(false);
      fetchMentors();
    } catch (err) {
      console.error("Error updating mentor:", err);
      alert("Failed to update mentor.");
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMentors = mentors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(mentors.length / itemsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

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

          {/* Back Button */}
          <div className="d-flex justify-content-start mb-3">
            <button className="btn btn-outline-secondary text-white" onClick={() => navigate(-1)} style={{width: '10%'}}>
              <FaArrowLeft/>
            </button>
          </div>

          {loading ? (
            <p>Loading mentors...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMentors.length > 0 ? (
                    currentMentors.map((mentor) => (
                      <tr key={mentor.user_id}>
                        <td>{mentor.email}</td>
                        <td>{mentor.username || '-'}</td>
                        <td>{mentor.first_name}</td>
                        <td>{mentor.last_name}</td>
                        <td>
                          <button className="btn btn-sm btn-warning" onClick={() => handleUpdateClick(mentor)}>
                            Update
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center">No mentors found.</td>
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

      {/* Add Mentor Modal */}
      {showModal && (
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create New Mentor</h4>
            <form onSubmit={handleCreateMentor}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={newMentor.email}
                  onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" value={newMentor.first_name}
                  onChange={(e) => setNewMentor({ ...newMentor, first_name: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" value={newMentor.last_name}
                  onChange={(e) => setNewMentor({ ...newMentor, last_name: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={newMentor.password}
                  onChange={(e) => setNewMentor({ ...newMentor, password: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-success me-2" style={{ width: '200px' }}>Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ width: '200px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Update Mentor Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Update Mentor</h4>
            <form onSubmit={handleUpdateSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={editMentor.email}
                  onChange={(e) => setEditMentor({ ...editMentor, email: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" className="form-control" value={editMentor.username}
                  onChange={(e) => setEditMentor({ ...editMentor, username: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">First Name</label>
                <input type="text" className="form-control" value={editMentor.first_name}
                  onChange={(e) => setEditMentor({ ...editMentor, first_name: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-control" value={editMentor.last_name}
                  onChange={(e) => setEditMentor({ ...editMentor, last_name: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password (optional)</label>
                <input type="password" className="form-control" value={editMentor.password}
                  onChange={(e) => setEditMentor({ ...editMentor, password: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary me-2" style={{ width: '200px' }}>Update</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)} style={{ width: '200px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
