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
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
const BASE_URL = process.env.REACT_APP_API_LINK;

function Orgadminsidebar() {
 const location = useLocation();
   const username = sessionStorage.getItem("email");
   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
   const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem("token"); // store your login token here
      await axios.post(
        `${BASE_URL}/users/logout`,
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
         <Link to="/orgadmin" className="navbar-brand d-flex align-items-center">
           <div className="logo-container">
             <img src="/logo.png" alt="Logo" className="logo-image" /> 
           </div>
         </Link>
  
         <div className="ms-auto">
           <div className="dropdown">
             <button
               className="btn btn-outline-secondary d-flex align-items-center login-btn"
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
                     to="/orgadmin"
                     className={`dropdown-item d-flex align-items-center ${
                       location.pathname === "/orgadmin" ? "active" : ""
                     }`}
                     onClick={() => setShowDropdown(false)}
                   >
                     <FaTachometerAlt className="me-2" style={{ fontSize: "16px" }} />
                     Dashboard
                   </Link>
                 </li>
                 <li><hr className="dropdown-divider" /></li>
                 <li>
                                                   <button
                                                     className="dropdown-item d-flex align-items-center text-danger"
                                                     onClick={() => {
                                                       
                                                       setShowDropdown(false);
                                                       handleLogout();
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
 

export default Orgadminsidebar