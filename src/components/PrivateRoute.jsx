// components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, roles }) => {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role_name");

  if (!token || !roles.includes(role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
