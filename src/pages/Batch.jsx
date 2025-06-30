import React, { useState, useEffect } from 'react';
import Supersidebar from '../components/Supersidebar.jsx';

function Batch() {
  const [batchData, setBatchData] = useState({
    batch_name: '',
    organization_name: '',
    isActive: true,
  });

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
  const fetchOrganizations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/organization');
      const data = await res.json();

      // Check if data is wrapped in an object
      const orgList = Array.isArray(data) ? data : data.organizations;

      setOrganizations(orgList || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setOrganizations([]); // fallback to empty array
    }
  };
  fetchOrganizations();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBatchData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('http://localhost:5000/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create batch');
      }

      const data = await response.json();
      console.log('Batch created:', data);
      setSuccess(true);
      setBatchData({ batch_name: '', organization_name: '', isActive: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex' }}>
      <Supersidebar />
      <div style={{
        flex: 1,
        padding: '40px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>📦 Create New Batch</h2>

        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9f9f9',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="batch_name" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              Batch Name:
            </label>
            <input
              type="text"
              id="batch_name"
              name="batch_name"
              value={batchData.batch_name}
              onChange={handleChange}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="organization_name" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              Organization:
            </label>
            <select
              id="organization_name"
              name="organization_name"
              value={batchData.organization_name}
              onChange={handleChange}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                fontSize: '16px'
              }}
            >
              <option value="">-- Select Organization --</option>
              {organizations.map((org, index) => (
                <option key={index} value={org.name}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating...' : 'Create Batch'}
          </button>

          {loading && <p style={{ marginTop: '15px', color: '#555' }}>Loading...</p>}
          {error && <p style={{ marginTop: '15px', color: 'red' }}>Error: {error}</p>}
          {success && <p style={{ marginTop: '15px', color: 'green' }}>Batch created successfully!</p>}
        </form>
      </div>
    </div>
  );
}

export default Batch;
