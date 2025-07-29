import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(sessionStorage.getItem("token") || "");
  const [role, setRole] = useState(sessionStorage.getItem("role_name") || "");
  const [username, setUsername] = useState(sessionStorage.getItem("username") || "");
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_API_LINK;

  // ✅ Login function – sets sessionStorage and state
  const login = (user) => {
    sessionStorage.setItem("token", user.token || "");
    sessionStorage.setItem("email", user.email || "");
    sessionStorage.setItem("username", user.username);
    sessionStorage.setItem("userId", user.user_id);
    sessionStorage.setItem("role_name", user.role);
    sessionStorage.setItem("organization_name", user.organization_name || "");
    sessionStorage.setItem("selectedModel", "gpt4o");
    sessionStorage.setItem("firstname", user.first_name || "");
    sessionStorage.setItem("lastname", user.last_name || "");

    setToken(user.token);
    setRole(user.role);
    setUsername(user.username);
  };

  // 🔓 Logout – clear session and navigate to login
  const logout = () => {
    sessionStorage.clear();
    setToken("");
    setRole("");
    setUsername("");
    navigate("/login");
  };

  // 🔐 Verify token on mount
  const verifyToken = async () => {
    const storedToken = sessionStorage.getItem("token");
    if (!storedToken) {
      logout();
      setIsLoading(false);
      return;
    }

    try {
      await axios.get(`${BASE_URL}/users/verify`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
      setIsLoading(false);
    } catch (error) {
      console.error("Token verification failed:", error);
      logout(); // 🔴 Auto logout on invalid token
    }
  };

  useEffect(() => {
    verifyToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        username,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
