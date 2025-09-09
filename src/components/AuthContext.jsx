import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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

  // Auto logout timer ref
  const logoutTimer = useRef(null);

  // ✅ Login function
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

    resetInactivityTimer();
  };
  
  const logout = () => {
    sessionStorage.clear();
    setToken("");
    setRole("");
    setUsername("");
    clearTimeout(logoutTimer.current);
    navigate("/login", { replace: true });
  };

  const resetInactivityTimer = () => {
    clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => {
      logout();
    }, 4 * 60 * 60 * 1000); // 4 hours
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "mousedown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetInactivityTimer));

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
      clearTimeout(logoutTimer.current);
    };
  }, []);

  const verifyToken = async () => {
    const storedToken = sessionStorage.getItem("token");
    const storedRole = sessionStorage.getItem("role_name");
    const storedUsername = sessionStorage.getItem("username");

    if (!storedToken) {
      setIsLoading(false);
      logout();
      return;
    }

    try {
      await axios.get(`${BASE_URL}/users/verify`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });
      setToken(storedToken);
      setRole(storedRole);
      setUsername(storedUsername);
      setIsLoading(false);
      resetInactivityTimer();
    } catch (error) {
      console.error("Token verification failed:", error);
      setIsLoading(false);
      logout();
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