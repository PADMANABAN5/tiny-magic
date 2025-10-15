import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Spinner, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import Orgadminsidebar from "../components/Orgadminsidebar";

const BASE_URL = process.env.REACT_APP_API_LINK;

function ViewModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${BASE_URL}/llm/orgadmin/models`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          setModels(response.data.data);
        } else {
          setError(response.data.message || "Unable to fetch models");
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      }
      setLoading(false);
    }
    fetchModels();
  }, [BASE_URL, token]);

  return (
    <div className="main-layout-container">
      <Orgadminsidebar />

      <main className="content-area container-fluid bg-light">
        <div className="container py-4">
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

          <h3 className="mb-4">Organization Models</h3>
          {loading ? (
            <div className="text-center my-4">
              <Spinner animation="border" />
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Model Name</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">
                        No models found.
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => (
                      <tr key={model.modelid}>
                        <td>{model.model_name}</td>
                        <td>{model.name}</td>
                        <td>{model.description}</td>
                        <td>{model.is_active ? "Active" : "Inactive"}</td>
                        <td>{new Date(model.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ViewModels;
