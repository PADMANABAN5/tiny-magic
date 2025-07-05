import React, { useEffect, useState } from 'react'
import axios from 'axios'

function Assign() {
  const [pods, setPods] = useState([])
  const [batches, setBatches] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [concepts, setConcepts] = useState([])
  const [mentors, setMentors] = useState([])
  const [orgUsers, setOrgUsers] = useState([])

  const [conceptAssign, setConceptAssign] = useState({})
  const [mentorAssign, setMentorAssign] = useState({})
  const [orgUserAssign, setOrgUserAssign] = useState({})

  useEffect(() => {
    // Replace with your actual endpoints
    axios.get(`${process.env.REACT_APP_API_LINK}/pods`).then(res => setPods(res.data))
    axios.get(`${process.env.REACT_APP_API_LINK}/batches`).then(res => setBatches(res.data))
    axios.get(`${process.env.REACT_APP_API_LINK}/organizations`).then(res => setOrganizations(res.data))
    axios.get(`${process.env.REACT_APP_API_LINK}/concepts`).then(res => setConcepts(res.data))
    axios.get(`${process.env.REACT_APP_API_LINK}/mentors`).then(res => setMentors(res.data))
    axios.get(`${process.env.REACT_APP_API_LINK}/orgusers`).then(res => setOrgUsers(res.data))
  }, [])

  const handleConceptAssign = async () => {
    await axios.post(`${process.env.REACT_APP_API_LINK}/batch-concepts`, conceptAssign)
    alert('Concept assigned to batch')
  }

  const handleMentorAssign = async () => {
    await axios.post(`${process.env.REACT_APP_API_LINK}/pod-mentors`, mentorAssign)
    alert('Mentor assigned to pod')
  }

  const handleOrgUserAssign = async () => {
    await axios.post(`${process.env.REACT_APP_API_LINK}/pod-users`, orgUserAssign)
    alert('User assigned to pod')
  }

  const renderDropdown = (label, options, name, state, setState, keyField = 'name') => (
    <div style={{ marginBottom: '10px' }}>
      <label>{label}: </label>
      <select
        value={state[name] || ''}
        onChange={e => setState(prev => ({ ...prev, [name]: e.target.value }))}
      >
        <option value=''>Select</option>
        {options.map(opt => (
          <option key={opt[keyField] || opt.email} value={opt[keyField] || opt.email}>
            {opt[keyField] || opt.email}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div style={{ padding: '20px' }}>
      <h2>Assign Concept to Batch</h2>
      {renderDropdown('Batch', batches, 'batch_name', conceptAssign, setConceptAssign)}
      {renderDropdown('Organization', organizations, 'organization_name', conceptAssign, setConceptAssign)}
      {renderDropdown('Concept', concepts, 'concept_name', conceptAssign, setConceptAssign)}
      <button onClick={handleConceptAssign}>Assign Concept</button>

      <hr />

      <h2>Assign Mentor to Pod</h2>
      {renderDropdown('Pod', pods, 'pod_name', mentorAssign, setMentorAssign)}
      {renderDropdown('Batch', batches, 'batch_name', mentorAssign, setMentorAssign)}
      {renderDropdown('Organization', organizations, 'organization_name', mentorAssign, setMentorAssign)}
      {renderDropdown('Mentor Email', mentors, 'mentor_email', mentorAssign, setMentorAssign, 'email')}
      <button onClick={handleMentorAssign}>Assign Mentor</button>

      <hr />

      <h2>Assign OrgUser to Pod</h2>
      {renderDropdown('Pod', pods, 'pod_name', orgUserAssign, setOrgUserAssign)}
      {renderDropdown('Batch', batches, 'batch_name', orgUserAssign, setOrgUserAssign)}
      {renderDropdown('Organization', organizations, 'organization_name', orgUserAssign, setOrgUserAssign)}
      {renderDropdown('OrgUser Email', orgUsers, 'email', orgUserAssign, setOrgUserAssign, 'email')}
      <button onClick={handleOrgUserAssign}>Assign OrgUser</button>
    </div>
  )
}

export default Assign
