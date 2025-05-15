import React, { useState } from "react";
import { Modal, Button, Form, Pagination } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import "../styles/variables.css"
function Variables() {
  const [show, setShow] = useState(false);
  const [variables, setVariables] = useState([]);
  const [formData, setFormData] = useState({ variable: "", value: "", template: "" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const handleClose = () => {
    setShow(false);
    setIsEditMode(false);
    setFormData({ variable: "", value: "", template: "" });
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

  const handleEdit = () => {
    if (selectedIndex !== null) {
      setFormData(variables[selectedIndex]);
      setIsEditMode(true);
      setShow(true);
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

  const handleDelete = () => {
    if (selectedIndex !== null) {
      const updated = variables.filter((_, i) => i !== selectedIndex);
      setVariables(updated);
      setSelectedIndex(null);
    }
  };

  const handleRowClick = (globalIndex) => {
    setSelectedIndex(globalIndex === selectedIndex ? null : globalIndex);
  };

  // Pagination logic
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
        <h3 className="mb-4" style={{ textAlign: "center" }}>Manage Variables</h3>

        <div className="mb-3 d-flex gap-2">
          <Button variant="primary" onClick={handleShowAdd} style={{width:"15%",marginLeft:"15px"}}><FaPlus /></Button>
          <Button variant="warning" onClick={handleEdit} style={{width:"15%",marginLeft:"15px"}} disabled={selectedIndex === null}><FaEdit /></Button>
          <Button variant="danger" onClick={handleDelete} style={{width:"15%",marginLeft:"15px"}} disabled={selectedIndex === null}><FaTrash /></Button>
        </div>

        <table className="table table-bordered table-striped w-100" style={{ textAlign: "center", border: "1px solidrgb(51, 61, 71)", borderRadius: "5px" }}>
          <thead>
            <tr>
              <th style={{backgroundColor: "skyblue"}}>Variable</th>
              <th style={{backgroundColor: "skyblue"}}>Value</th>
              <th style={{backgroundColor: "skyblue"}}>Template</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.length === 0 ? (
              <tr><td colSpan="3" className="text-center">No variables added.</td></tr>
            ) : (
              currentRows.map((item, index) => {
                const globalIndex = index + indexOfFirstRow;
                return (
                  <tr
                    key={globalIndex}
                    onClick={() => handleRowClick(globalIndex)}
                    style={{
                      backgroundColor: selectedIndex === globalIndex ? "#d9edf7" : "white",
                      cursor: "pointer"
                    }}
                  >
                    <td>{item.variable}</td>
                    <td>{item.value}</td>
                    <td>{item.template}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
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

        {/* Modal */}
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>{isEditMode ? "Edit Variable" : "Add Variable"}</Modal.Title>
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
                  disabled={isEditMode}
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
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="success" onClick={isEditMode ? handleUpdate : handleAdd}>
              {isEditMode ? "Update" : "Add"}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Variables;
