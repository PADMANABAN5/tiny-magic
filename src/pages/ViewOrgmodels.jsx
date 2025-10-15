import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Spinner, Pagination, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Orgadminsidebar from "../components/Orgadminsidebar";

const BASE_URL = process.env.REACT_APP_API_LINK;

function ViewOrgModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchModels = async () => { 
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${BASE_URL}/llm/orgadmin/organization-models`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setModels(response.data.data);
        } else {
          setError(response.data.message || "Unable to fetch models");
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          err.message ||
          "Unable to fetch models"
        );
      }
      setLoading(false);
    };
    fetchModels();
  }, [BASE_URL, token]);

  // Search + Pagination
  const filteredModels = models.filter((model) =>
    (model.model_name || model.name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const idxLast = currentPage * itemsPerPage;
  const idxFirst = idxLast - itemsPerPage;
  const currentModels = filteredModels.slice(idxFirst, idxLast);
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />

      <main className="content-area container-fluid bg-light">
        <div className="container py-4">
          {/* Back Button */}
          <div style={{ marginBottom: "20px", marginTop: "10px" }}>
            <button
              className="btn"
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

          <h3 className="mb-3">Organization-Specific Models</h3>

          {/* Controls: Entries per page + Search */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div className="d-flex align-items-center">
              <span className="me-2">Show entries:</span>
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

            <input
              type="text"
              className="form-control"
              style={{ maxWidth: "250px" }}
              placeholder="Search by Model Name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Table Section */}
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Name</th>
                  <th>API Key</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      <Spinner animation="border" size="sm" /> Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="text-center text-danger">
                      {error}
                    </td>
                  </tr>
                ) : currentModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No models found
                    </td>
                  </tr>
                ) : (
                  currentModels.map((model) => (
                    <tr key={model.model_id}>
                      <td>{model.model_name}</td>
                      <td>{model.name}</td>
                      <td
                        style={{
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {model.apikey}
                      </td>
                      <td>{model.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
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

export default ViewOrgModels;
