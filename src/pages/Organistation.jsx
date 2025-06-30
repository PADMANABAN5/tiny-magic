import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Supersidebar from '../components/Supersidebar';

export default function OrgList() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchOrganizations = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await axios.get('http://localhost:5000/api/organization');
      setOrgs(res.data.organizations || res.data);
      setMessage('Organizations loaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load organizations.');
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return (
    <>
      <Supersidebar />
      <div className="w-full py-10 px-4 sm:px-6 lg:px-12 bg-white shadow-lg rounded-none border-t border-gray-200" style={{ maxWidth: '100%', margin: '0 auto' }}>
        <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-10 tracking-tight">
          🏢 Organization Dashboard
        </h2>

      {/* Status messages */}
      {loading && (
        <div className="flex items-center justify-center p-4 mb-6 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg animate-pulse">
          <span className="text-blue-600 font-medium mr-2">Loading...</span>
          <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      )}

      {message && (
        <div className="flex items-center p-4 mb-6 bg-green-50 text-green-700 border border-green-200 rounded-lg shadow-sm">
          <svg className="w-6 h-6 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg shadow-sm">
          <svg className="w-6 h-6 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Full Width Responsive Grid */}
      {orgs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-h-[75vh] overflow-y-auto pr-1">
          {orgs.map((org, idx) => (
            <div
              key={idx}
              className="w-full bg-white p-6 rounded-xl border border-gray-300 shadow-md hover:shadow-xl transition-transform transform hover:scale-[1.02]"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{org.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{org.description}</p>

              {(org.max_users_per_batch || org.max_users_per_pod) && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-700 space-y-1">
                  {org.max_users_per_batch && (
                    <p><span className="font-semibold">Max Users/Batch:</span> {org.max_users_per_batch}</p>
                  )}
                  {org.max_users_per_pod && (
                    <p><span className="font-semibold">Max Users/Pod:</span> {org.max_users_per_pod}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && !error && (
          <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl mt-10">
            <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m0 14v1m8-8h1M4 12H3m15.364-6.364l.707.707M5.636 18.364l-.707-.707M18.364 18.364l.707-.707M5.636 5.636l-.707.707" />
            </svg>
            <p className="text-lg text-gray-500 font-medium">No organizations available.</p>
          </div>
        )
      )}
    </div>
    </>
  );
}
