import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/sidebar.css";
import {
  FaTachometerAlt,
  FaBook,
  FaSignOutAlt,
  FaUser,
  FaCaretDown,
} from "react-icons/fa";

function Sidebar() {
  const location = useLocation();
  const username = sessionStorage.getItem("email");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDropdown, setShowDropdown] = useState(false);

  // Function to shorten username
  const getShortenedUsername = (email) => {
    if (!email) return "User";
    const parts = email.split("@");
    return parts[0]; // Returns only the part before @
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-light fixed-top border-bottom shadow-sm px-3">
      <div className="container-fluid"> 
        <Link to="/dashboard" className="navbar-brand d-flex align-items-center">
          <div className="logo-container">
            <img src="/logo.png" alt="Logo" className="logo-image" /> 
          </div>
        </Link>
 
        <div className="ms-auto">
          <div className="dropdown">
            <button
              className="btn btn-outline-secondary d-flex align-items-center"
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
            >
              <FaUser className="me-2 text-white" />
              <span className="text-white">{getShortenedUsername(username)}</span>
              <FaCaretDown className="ms-2 text-white" />
            </button>
            
            {showDropdown && (
              <ul className="dropdown-menu dropdown-menu-end show">
                <li>
                  <Link
                    to="/dashboard"
                    className={`dropdown-item d-flex align-items-center ${
                      location.pathname === "/dashboard" ? "active" : ""
                    }`}
                    onClick={() => setShowDropdown(false)}
                  >
                    <FaTachometerAlt className="me-2" style={{ fontSize: "16px" }} />
                    Dashboard
                  </Link>
                  <Link
                    to="/conversationhistory"
                    className={`dropdown-item d-flex align-items-center ${
                      location.pathname === "/conversationhistory" ? "active" : ""
                    }`}
                    onClick={() => setShowDropdown(false)}
                  >
                    <FaTachometerAlt className="me-2" style={{ fontSize: "16px" }} />
                    History
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link
                    to="/login"
                    className="dropdown-item d-flex align-items-center text-danger"
                    onClick={() => {
                      sessionStorage.removeItem("chatHistory");
                      sessionStorage.clear();
                      setShowDropdown(false);
                    }}
                  >
                    <FaSignOutAlt className="me-2" style={{ fontSize: "16px" }} />
                    Log Out
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;