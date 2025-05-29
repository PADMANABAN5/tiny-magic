import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/sidebar.css";
import {
  FaTachometerAlt,
  FaBook,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";

function Sidebar() {
  const location = useLocation();
  const username = sessionStorage.getItem("username");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-light fixed-top border-bottom shadow-sm px-3">
      <div className="container-fluid">
        <span className="navbar-brand d-flex align-items-center">
          <FaUser className="me-2" />
          <strong>{username}</strong>
        </span>

        <div className="collapse navbar-collapse justify-content-end">
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link
                to="/dashboard"
                className={`nav-link d-flex align-items-center ${location.pathname === "/dashboard" ? "active" : ""}`}
              >
                <FaTachometerAlt className="me-2" style={{ fontSize: "16px" }} />
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to="/prompt"
                className={`nav-link d-flex align-items-center ${location.pathname === "/prompt" ? "active" : ""}`}
              >
                <FaBook className="me-2" style={{ fontSize: "16px" }} />
                Prompts
              </Link>
            </li> 
            <Link
              to="/"
              className="nav-link d-flex align-items-center"
              onClick={() => { 
                sessionStorage.removeItem("chatHistory");
                sessionStorage.clear();
               
              }}
            >
              <FaSignOutAlt className="me-2" style={{ fontSize: "16px" }} />
              Log Out
            </Link>

          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
