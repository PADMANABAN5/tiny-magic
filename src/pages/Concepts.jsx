import React, { useState } from 'react';
import axios from 'axios';
import '../styles/Concepts.css';
import Supersidebar from '../components/Supersidebar.jsx';

function Concepts() {
  // State to hold all form data
  const [formData, setFormData] = useState({
    concept_name: '',
    concept_content: '',
    concept_enduring_understandings: '',
    concept_essential_questions: '',
    concept_knowledge_skills: '',
    stage_1_content: '',
    stage_2_content: '',
    stage_3_content: '',
    stage_4_content: '',
    stage_5_content: '',
    concept_understanding_rubric: '',
    understanding_skills_rubric: '',
    learning_assessment_dimensions: '',
    isActive: true, // This can be a checkbox
  });

  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState(null); // 'success' or 'error'

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    
    setLoading(true);
    setAlertMessage(null); // Clear previous alerts

    try {
      // Make the POST request with the form data
      const response = await axios.post('http://localhost:5000/api/concepts', formData);

      // On success
      console.log('Concept created successfully:', response.data);
      setAlertMessage('Concept created successfully!');
      setAlertType('success');
      window.alert('Concept created successfully!');

      // Optionally, reset the form after successful submission
      setFormData({
        concept_name: '',
        concept_content: '',
        concept_enduring_understandings: '',
        concept_essential_questions: '',
        concept_knowledge_skills: '',
        stage_1_content: '',
        stage_2_content: '',
        stage_3_content: '',
        stage_4_content: '',
        stage_5_content: '',
        concept_understanding_rubric: '',
        understanding_skills_rubric: '',
        learning_assessment_dimensions: '',
        isActive: true,
      });

    } catch (error) {
      // On failure
      console.error('Failed to create concept:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setAlertMessage(`Failed to create concept: ${errorMessage}`);
      setAlertType('error');
      window.alert(`Failed to create concept: ${errorMessage}`);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Supersidebar/>
    <div className="concepts-container">
      <h2>Create New Concept</h2>

      {/* Alert message display */}
      {alertMessage && (
        <div className={`alert-message ${alertType}`}>
          {alertMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="concepts-form">
        <div className="form-group">
          <label htmlFor="concept_name">Concept Name:</label>
          <input
            type="text"
            id="concept_name"
            name="concept_name"
            value={formData.concept_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="concept_content">Concept Content:</label>
          <textarea
            id="concept_content"
            name="concept_content"
            value={formData.concept_content}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="concept_enduring_understandings">Enduring Understandings:</label>
          <textarea
            id="concept_enduring_understandings"
            name="concept_enduring_understandings"
            value={formData.concept_enduring_understandings}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="concept_essential_questions">Essential Questions:</label>
          <textarea
            id="concept_essential_questions"
            name="concept_essential_questions"
            value={formData.concept_essential_questions}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="concept_knowledge_skills">Knowledge & Skills:</label>
          <textarea
            id="concept_knowledge_skills"
            name="concept_knowledge_skills"
            value={formData.concept_knowledge_skills}
            onChange={handleChange}
          />
        </div>
        
        {/* Stages content */}
        <h3>Stages of Learning:</h3>
        {[1, 2, 3, 4, 5].map((stage) => (
          <div key={`stage_${stage}`} className="form-group">
            <label htmlFor={`stage_${stage}_content`}>Stage {stage} Content:</label>
            <input
              type="text"
              id={`stage_${stage}_content`}
              name={`stage_${stage}_content`}
              value={formData[`stage_${stage}_content`]}
              onChange={handleChange}
            />
          </div>
        ))}
        
        {/* Rubrics and assessment */}
        <div className="form-group">
          <label htmlFor="concept_understanding_rubric">Understanding Rubric:</label>
          <input
            type="text"
            id="concept_understanding_rubric"
            name="concept_understanding_rubric"
            value={formData.concept_understanding_rubric}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="understanding_skills_rubric">Skills Rubric:</label>
          <input
            type="text"
            id="understanding_skills_rubric"
            name="understanding_skills_rubric"
            value={formData.understanding_skills_rubric}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="learning_assessment_dimensions">Assessment Dimensions:</label>
          <input
            type="text"
            id="learning_assessment_dimensions"
            name="learning_assessment_dimensions"
            value={formData.learning_assessment_dimensions}
            onChange={handleChange}
          />
        </div>

        {/* isActive checkbox */}
        <div className="form-group form-group-checkbox">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
          />
          <label htmlFor="isActive">Is Active</label>
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Create Concept'}
        </button>
      </form>
    </div>
    </>
  );
}

export default Concepts;