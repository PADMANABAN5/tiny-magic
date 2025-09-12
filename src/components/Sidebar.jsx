import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/sidebar.css";
import {
  FaTachometerAlt,
  FaBook,
  FaSignOutAlt,
  FaUser,
  FaCaretDown,
  FaHistory,
  FaChartLine,
  FaChartBar
} from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Sidebar({ isProcessingAssessment , isLoading }) {
  const location = useLocation();
  const navigate = useNavigate();
  const username = sessionStorage.getItem("email");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHistorySubmenu, setShowHistorySubmenu] = useState(false);
  
  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("token"); // store your login token here
      await axios.post(
        "http://localhost:5000/api/users/logout",
        {},
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      console.log("✅ Logged out from server");

      // Clear session storage
      sessionStorage.clear();

      // Redirect to login page
      navigate("/login");
    } catch (error) {
      console.error("❌ Logout failed:", error.response?.data || error.message);
      toast.error("Logout failed, please try again.", { autoClose: 3000 });
      // Even if API fails, clear storage & redirect
      sessionStorage.clear();
      navigate("/login");
    }
  };
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
        <Link to="/dashboard" className={`navbar-brand d-flex align-items-center`}
          onClick={(e) => isProcessingAssessment && e.preventDefault()}
        >
          <div className="logo-container">
            <img src="/logo.png" alt="Logo" className="logo-image" /> 
          </div>
        </Link>

        <div className="page-title mx-auto">
  {(() => {
    switch (location.pathname) {
      case "/dashboard":
        return "Training Mode";
      case "/practice":
        return "Practice Mode";
      case "/conversationhistory":
        return "Training History";
      case "/practicehistory":
        return "Practice History";
      default:
        return "";
    }
  })()}
</div>
 
        <div className="ms-auto">
          <div className="dropdown">
            <button
              className={`btn btn-outline-secondary d-flex align-items-center login-btn ${
                isProcessingAssessment || isLoading ? "disabled" : ""
              }`}
              type="button"
              onClick={() => !isProcessingAssessment && !isLoading && setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
              disabled={isProcessingAssessment || isLoading}
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
                    } ${isProcessingAssessment || isLoading ? "disabled" : ""}`}
                    onClick={(e) => {
                      if (isProcessingAssessment || isLoading) {
                        e.preventDefault();
                      } else {
                        setShowDropdown(false);
                      }
                    }}
                  >
                    <FaTachometerAlt className="me-2" style={{ fontSize: "16px" }} />
                    Dashboard
                  </Link>
                  </li>
                  <li>
                   <Link
                    to="/practice"
                    className={`dropdown-item d-flex align-items-center ${
                      location.pathname === "/practice" ? "active" : ""
                    } ${isProcessingAssessment || isLoading ? "disabled" : ""}`}
                    onClick={(e) => {
                      if (isProcessingAssessment || isLoading) {
                        e.preventDefault();
                      } else {
                        setShowDropdown(false);
                      }
                    }}
                  >
                    <FaBook className="me-2" style={{ fontSize: "16px" }} />
                     Practice
                  </Link> 
                  </li>
                  <li>
                 <button
  className="dropdown-item history-toggle d-flex align-items-center"
  onClick={() => setShowHistorySubmenu(!showHistorySubmenu)}
  disabled={isProcessingAssessment || isLoading}
  
>
  <FaHistory className="me-2" style={{ fontSize: "16px" }} />
  History
  <FaCaretDown className="ms-auto" />
</button>

{showHistorySubmenu && (
  <ul className="list-unstyled history-submenu">
    <li>
      <Link to="/conversationhistory" className="dropdown-item">
        <FaChartBar className="me-2" /> Training History
      </Link>
    </li>
    <li>
      <Link to="/practicehistory" className="dropdown-item">
        <FaChartLine className="me-2" /> Practice History
      </Link>
    </li>
  </ul>
)}
</li>


                
                <li><hr className="dropdown-divider" /></li>
                <li>
  <button
    className={`dropdown-item d-flex align-items-center text-danger ${
      isProcessingAssessment || isLoading ? "disabled" : ""
    }`}
    onClick={(e) => {
      e.preventDefault();
      if (!(isProcessingAssessment || isLoading)) {
        setShowDropdown(false);
        handleLogout();  // ✅ Trigger API call
      }
    }}
  >
    <FaSignOutAlt className="me-2" style={{ fontSize: "16px" }} />
    Log Out
  </button>
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