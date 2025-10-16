import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Spinner, Pagination, Form, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Orgadminsidebar from "../components/Orgadminsidebar";
import "../styles/OrgList.css";

const BASE_URL = process.env.REACT_APP_API_LINK;

function ViewAssignedModels() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${BASE_URL}/llm/orgadmin/assignments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setAssignments(response.data.data);
        } else {
          setError(response.data.message || "Unable to fetch assignments");
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          err.message ||
          "Unable to fetch assignments"
        );
      }
      setLoading(false);
    };
    fetchAssignments();
  }, [token]);

  // Pagination logic
  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentAssignments = assignments.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(assignments.length / itemsPerPage);

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />

      <main className="content-area container-fluid bg-light">
        <div className="container py-4">
          <div style={{ marginBottom: "20px", marginTop: "10px" }}>
            <button
              className="back-button text-white border-0"
              style={{
                background: "#07b7df",
                color: "white",
                borderRadius: "5px",
                minWidth: "60px",
              }}
              onClick={() => navigate(-1)}
            >
              <FaArrowLeft size={20} />
            </button>
          </div>

          <h3 className="mb-3">Assigned Models</h3>

          <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
            <span>Show entries:</span>
            <Form.Select
              style={{ width: "100px" }}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {[5, 10, 20, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Organization</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      <Spinner animation="border" size="sm" /> Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="text-center text-danger">
                      {error}
                    </td>
                  </tr>
                ) : currentAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      No assignments found
                    </td>
                  </tr>
                ) : (
                  currentAssignments.map((a) => (
                    <tr key={a.assignment_id}>
                      <td>{a.model_name || "-"}</td>
                      <td>{a.name}</td>
                      <td>{a.level || "-"}</td>
                      <td>{a.organization_name || "-"}</td>
                      <td>{a.batch_name || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {!loading && !error && totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4 flex-wrap">
              <Pagination>
                <Pagination.First
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                />
                {[...Array(totalPages).keys()].map((i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ViewAssignedModels;
