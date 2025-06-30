import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Supersidebar from '../components/Supersidebar.jsx'

function Pods() {
  const [podName, setPodName] = useState('')
  const [batchName, setBatchName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [batchOptions, setBatchOptions] = useState([])
  const [organizationOptions, setOrganizationOptions] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        // ✅ Fetch batches
        const batchesRes = await axios.get('http://localhost:5000/api/batches')
        console.log('Batches Response:', batchesRes.data)
        const batchList = Array.isArray(batchesRes.data)
          ? batchesRes.data
          : batchesRes.data.batches || []
        setBatchOptions(batchList)
      } catch (err) {
        console.error('❌ Error fetching batches:', err)
      }

       try {
      const res = await fetch('http://localhost:5000/api/organization');
      const data = await res.json();

      // Check if data is wrapped in an object
      const orgList = Array.isArray(data) ? data : data.organizations;

      setOrganizationOptions(orgList || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setOrganizationOptions([]); // fallback to empty array
    }
    }

    fetchDropdowns()
  }, [])
 
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await axios.post('http://localhost:5000/api/pods', {
        pod_name: podName,
        batch_name: batchName,
        organization_name: organizationName,
        isActive: true // hardcoded
      })

      setMessage('✅ Pod created successfully!')
      setPodName('')
      setBatchName('')
      setOrganizationName('')

      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('❌ Error creating pod:', err)
      setMessage('❌ Failed to create pod')
    }
  }

  return (
    <>
      <Supersidebar />
      <div className="container mt-4">
        <h2>Create Pod</h2>

        {message && <div className="alert alert-info">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Pod Name</label>
            <input
              type="text"
              className="form-control"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Batch Name</label>
            <select
              className="form-select"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              required
            >
              <option value="">Select a batch</option>
              {batchOptions.map((batch, idx) => (
                <option key={idx} value={batch.batch_name}>
                  {batch.batch_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
  <label className="form-label">Organization Name</label>
  <select
    className="form-select"
    value={organizationName}
    onChange={(e) => setOrganizationName(e.target.value)}
    required
  >
    <option value="">Select an organization</option>
    {organizationOptions.map((org, idx) => (
      <option key={idx} value={org.name}>
        {org.name}
      </option>
    ))}
  </select>
</div>

          <button type="submit" className="btn btn-primary">
            Create Pod
          </button>
        </form>
      </div>
    </>
  )
}

export default Pods
