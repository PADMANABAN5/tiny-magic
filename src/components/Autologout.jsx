import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AutoLogout = ({ timeout = 10 * 60 * 1000 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayTimeLeft, setDisplayTimeLeft] = useState(timeout / 1000); // For UI display (throttled updates)
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const warningShownRef = useRef(false); // Track if warning toast has been shown
  const currentTimeRef = useRef(timeout / 1000); // Ref for exact countdown (no re-renders)
  const BASE_URL = process.env.REACT_APP_API_LINK;

  const getToastType = (bg) => {
    switch (bg) {
      case 'primary':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      default:
        return 'info';
    }
  };

  const showToastMsg = (message, bg = "primary") => {
    toast(message, { type: getToastType(bg) });
  };

  const logout = async () => {
    try {
      const token = sessionStorage.getItem("token");
     // console.log("Token found:", token);
      if (token) {
        await axios.post(
          `${BASE_URL}/users/logout`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("Logout API successful");
      }
    } catch (error) {
      console.error("Logout API failed:", error.response?.data || error.message);
    } finally {
      showToastMsg("You have been logged out due to inactivity.", "warning");
      setTimeout(() => {
        sessionStorage.clear();
        localStorage.clear();
        console.log("Storage cleared, redirecting to /login");
        navigate("/login");
      }, 2500);
    }
  };

  const resetTimer = () => {
    console.log("Activity detected, resetting timer");
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = setTimeout(logout, timeout);
    currentTimeRef.current = timeout / 1000;
    setDisplayTimeLeft(timeout / 1000);
    warningShownRef.current = false; // Reset warning flag on activity
    intervalRef.current = setInterval(() => {
      currentTimeRef.current -= 1;
      const prevDisplay = displayTimeLeft;
      const newDisplay = currentTimeRef.current;

      // Throttle: Update display only when it changes by 10+ seconds, every minute, or when <=60
      if (
        newDisplay <= 60 ||
        Math.abs(newDisplay - prevDisplay) >= 10 ||
        newDisplay % 60 === 0
      ) {
        setDisplayTimeLeft(newDisplay);
      }

      if (newDisplay <= 30 && !warningShownRef.current) {
        showToastMsg(`Your session will expire in ${newDisplay} seconds. Stay active to continue.`, "warning");
        warningShownRef.current = true; // Prevent multiple toasts
      }

      if (newDisplay <= 0) {
        clearInterval(intervalRef.current);
        logout();
      }
    }, 1000);
  };

  useEffect(() => {
    if (location.pathname === "/login") {
      console.log("On /login page, skipping auto-logout timer");
      return;
    }

    console.log(`AutoLogout mounted. Starting timer for ${timeout / 1000} seconds`);
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
      console.log(`Added event listener for ${event}`);
    });
    resetTimer();

    return () => {
      console.log("AutoLogout unmounting or route changed, cleaning up");
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [location.pathname]);

  // Format timeLeft as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <>
      {/* Countdown timer on protected routes */}
      {location.pathname !== "/login" && displayTimeLeft <= 60 && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "#f8f9fa",
            padding: "10px",
            borderRadius: "5px",
            zIndex: 1000,
          }}
        >
          Session Timeout in: {formatTime(displayTimeLeft)}
        </div>
      )}
    </>
  );
};

export default AutoLogout;