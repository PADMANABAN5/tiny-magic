// components/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_LINK;

const PrivateRoute = ({ children, roles }) => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/users/verify`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = res.data.data;
        setUserRole(user.role);
      } catch (error) {
        console.error("❌ Verification failed:", error.message);
        sessionStorage.clear(); // clear bad token
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  if (loading) return <div>🔐 Verifying access...</div>;

  if (!userRole || !roles.includes(userRole)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
