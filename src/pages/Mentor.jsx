import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaArrowLeft,FaPlus,FaEdit } from 'react-icons/fa';
import Supersidebar from '../components/Supersidebar';      
import { Pagination,Toast, ToastContainer } from 'react-bootstrap';
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastBg, setToastBg] = useState('primary');
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

    setToastMessage('✅ Mentor created successfully!');
    setToastBg('primary');
    setShowToast(true);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      setToastMessage('⚠️ Mentor with this email already exists.');
      setToastBg('warning');
      setShowToast(true);
    } else {
      console.error("Error creating mentor:", err);
      alert("Failed to create mentor.");
    }
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

    setToastMessage('✅ Mentor updated successfully!');
    setToastBg('primary');
    setShowToast(true);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      setToastMessage('⚠️ Mentor with this email already exists.');
      setToastBg('danger');
      setShowToast(true);
    } else {
      console.error("Error updating mentor:", err);
      alert("Failed to update mentor.");
    }
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
          {/* Back Button */}
          <div className="d-flex justify-content-start mb-3">
            <button
                        className='back-button bg-primary text-white border-0'
                        onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                      </button>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Mentors</h3>
           <button className="create-btn" onClick={() => setShowModal(true)} style={{ width: '10%' }}>
                         <FaPlus />
                       </button>
          </div>

          

          {loading ? (
            <p>Loading mentors...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : (
            <>
            <div className="table-responsive">
              <table className="table table-striped table-bordered table-hover">
                  <thead className="bg-primary text-white">
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
                            <FaEdit />
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
            </div>
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
                <input
                type="password"
                className="form-control"
                value={newMentor.password}
                required
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.setCustomValidity(
                    value.length < 8 ? 'Password must be at least 8 characters long' : ''
                  );
                  setNewMentor({ ...newMentor, password: value });
                }}
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    e.target.value.length < 8 ? 'Password must be at least 8 characters long' : ''
                  )
                }
                onInput={(e) => e.target.setCustomValidity('')}
              />
              </div>
              <button type="submit" className="btn btn-success me-2" >Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
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
                <input
                type="password"
                className="form-control"
                value={editMentor.password}
                onChange={(e) => {
                  const value = e.target.value;
                  e.target.setCustomValidity(
                    value.length > 0 && value.length < 8 ? 'Password must be at least 8 characters long' : ''
                  );
                  setEditMentor({ ...editMentor, password: value });
                }}
                onInvalid={(e) =>
                  e.target.setCustomValidity(
                    e.target.value.length > 0 && e.target.value.length < 8
                      ? 'Password must be at least 8 characters long'
                      : ''
                  )
                }
                onInput={(e) => e.target.setCustomValidity('')}
              />
              </div>
              <button type="submit" className="btn btn-primary me-2" >Update</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
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
