import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Pagination, Table } from 'react-bootstrap';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Orgadminsidebar from '../components/Orgadminsidebar';

function OrgadminUsers() {
  const { podId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const email = sessionStorage.getItem("email");
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        
        const res = await axios.get(`${process.env.REACT_APP_API_LINK}/orgadmin/users/${email}`);
        if (res.data.success) {
          const filtered = res.data.data.filter(user => String(user.pod_id) === String(podId));
          setUsers(filtered);
        } else {
          setError(res.data.message || 'Failed to fetch users.');
        }
      } catch (err) {
        setError('Error fetching users: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email && podId) fetchUsers();
  }, [email, podId]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Orgadminsidebar />
      <Container fluid className="p-4 p-md-5">
        <h2 className="mb-4 text-center">Users Assigned to Pod ID: {podId}</h2>

        {loading ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status" />
            <p className="mt-2">Loading users...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : users.length === 0 ? (
          <Alert variant="info">No users found for this pod.</Alert>
        ) : (
          <>
            <Row className="justify-content-center">
              <Col xs={12} md={10}>
                <Card className="shadow-sm w-100">
                  <Card.Body>
                    <Table responsive bordered hover className="mb-0" style={{ minWidth: '800px' }}>
                      <thead className="table-primary">
                        <tr>
                          <th>#</th>
                          <th>First Name</th>
                          <th>Last Name</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentUsers.map((user, index) => (
                          <tr key={user.user_id}>
                            <td>{indexOfFirstUser + index + 1}</td>
                            <td>{user.first_name}</td>
                            <td>{user.last_name}</td>
                            <td>{user.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {totalPages > 1 && (
              <Pagination className="mt-4 justify-content-center">
                <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Pagination.Item key={page} active={page === currentPage} onClick={() => handlePageChange(page)}>
                    {page}
                  </Pagination.Item>
                ))}
                <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
              </Pagination>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default OrgadminUsers;
