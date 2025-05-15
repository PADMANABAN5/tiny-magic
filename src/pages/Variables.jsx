import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Pagination } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileImport,
  FaFileExport,
} from "react-icons/fa";
import "../styles/variables.css";

function Variables() {
  const [show, setShow] = useState(false);
  const [variables, setVariables] = useState([]);
  const isInitialMount = useRef(true); // Track first render
  const [formData, setFormData] = useState({
    variable: "",
    value: "",
    template: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Load data from localStorage only on first render
  useEffect(() => {
    const savedData = localStorage.getItem("variables");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          setVariables(parsed);
        }
      } catch (err) {
        console.error("Invalid JSON in localStorage:", err);
      }
    }
  }, []);

  // Save to localStorage ONLY after first load (skip during load)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem("variables", JSON.stringify(variables));
  }, [variables]);

  const handleClose = () => {
    setShow(false);
    setIsEditMode(false);
    setFormData({ variable: "", value: "", template: "" });
    setSelectedIndex(null);
  };

  const handleShowAdd = () => {
    setIsEditMode(false);
    setFormData({ variable: "", value: "", template: "" });
    setShow(true);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdd = () => {
    if (formData.variable && formData.value && formData.template) {
      setVariables((prev) => [...prev, formData]);
      handleClose();
    }
  };

  const handleUpdate = () => {
    if (formData.variable && formData.value && formData.template) {
      const updated = [...variables];
      updated[selectedIndex] = formData;
      setVariables(updated);
      handleClose();
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          setVariables(importedData);
        } else {
          alert("Invalid file format. Please upload a valid JSON.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(variables, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "variables.json";
    a.click();
  };

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = variables.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(variables.length / rowsPerPage);

  const changePage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedIndex(null);
  };

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container position-relative">
      <Sidebar />
      <div className="flex-grow-1 p-4" style={{ minHeight: "100vh" }}>
        <h3 className="mb-4 text-center">Manage Variables</h3>

        {/* Buttons Row */}
        <div className="mb-3 d-flex align-items-center gap-2 flex-nowrap">
          <Button
            variant="primary"
            onClick={handleShowAdd}
            style={{ maxWidth: "120px" }}
          >
            <FaPlus className="me-2" />
            Add
          </Button>

          <Button
            variant="info"
            style={{ maxWidth: "120px" }}
            className="d-flex align-items-center justify-content-center"
            onClick={() => document.getElementById("fileInput").click()}
          >
            <FaFileImport className="me-2" />
            Import
            <Form.Control
              id="fileInput"
              type="file"
              accept=".json"
              onChange={handleImport}
              hidden
            />
          </Button>

          <Button
            variant="success"
            onClick={handleExport}
            style={{ maxWidth: "120px" }}
          >
            <FaFileExport className="me-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        <table className="table table-bordered table-striped w-100 text-center">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Value</th>
              <th>Template</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">
                  No variables added.
                </td>
              </tr>
            ) : (
              currentRows.map((item, index) => {
                const globalIndex = index + indexOfFirstRow;
                return (
                  <tr key={globalIndex}>
                    <td>{item.variable}</td>
                    <td>{item.value}</td>
                    <td>{item.template}</td>
                    <td>
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            setSelectedIndex(globalIndex);
                            setFormData(item);
                            setIsEditMode(true);
                            setShow(true);
                          }}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const updated = variables.filter(
                              (_, i) => i !== globalIndex
                            );
                            setVariables(updated);
                            setSelectedIndex(null);
                          }}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === currentPage}
                onClick={() => changePage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => changePage(currentPage + 1)}
            />
          </Pagination>
        )}

        {/* Modal */}
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>
              {isEditMode ? "Edit Variable" : "Add Variable"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId="formVariable">
                <Form.Label>Variable Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter variable name"
                  name="variable"
                  value={formData.variable}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group controlId="formValue" className="mt-3">
                <Form.Label>Value</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter value"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group controlId="formTemplate" className="mt-3">
                <Form.Label>Template</Form.Label>
                <Form.Select
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                >
                  <option value="">Select Template</option>
                  <option value="Template A">Template A</option>
                  <option value="Template B">Template B</option>
                  <option value="Template C">Template C</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={isEditMode ? handleUpdate : handleAdd}
            >
              {isEditMode ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Variables;
