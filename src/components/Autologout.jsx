import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toast, ToastContainer } from "react-bootstrap";

const AutoLogout = ({ timeout = 10 * 60 * 1000 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showToast, setShowToast] = useState(false); // For logout toast
  const [showWarningToast, setShowWarningToast] = useState(false); // For warning toast
  const [timeLeft, setTimeLeft] = useState(timeout / 1000); // Time in seconds
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const BaseUrl = process.env.REACT_APP_API_LINK;

  const logout = async () => {
    try {
      const token = sessionStorage.getItem("token");
     // console.log("Token found:", token);
      if (token) {
        await axios.post(
          `${BaseUrl}/users/logout`,
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
      setShowToast(true);
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
    setTimeLeft(timeout / 1000);
    setShowWarningToast(false); // Hide warning toast on reset
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
       // console.log(`Time left: ${prev - 1} seconds`);
        if (prev <= 30) {
          setShowWarningToast(true); // Show warning toast at 30 seconds
        }
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
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
      {location.pathname !== "/login" && timeLeft <= 60 && (
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
          Session Timeout in: {formatTime(timeLeft)}
        </div>
      )}

      {/* Toast for logout on protected routes */}
      {showToast && (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
          <Toast
            bg="warning"
            onClose={() => setShowToast(false)}
            show={showToast}
            delay={2000}
            autohide
          >
            <Toast.Header>
              <strong className="me-auto">Session Timeout</strong>
            </Toast.Header>
            <Toast.Body>You have been logged out due to inactivity.</Toast.Body>
          </Toast>
        </ToastContainer>
      )}

      {/* Warning toast for impending logout
      {location.pathname !== "/login" && showWarningToast && (
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
          <Toast
            bg="warning"
            onClose={() => setShowWarningToast(false)}
            show={showWarningToast}
            delay={5000} // Longer delay for user to react
            autohide
          >
            <Toast.Header>
              <strong className="me-auto">Session Timeout Warning</strong>
            </Toast.Header>
            <Toast.Body>
              Your session will expire in {formatTime(timeLeft)}. Stay active to continue.
            </Toast.Body>
          </Toast>
        </ToastContainer>
      )} */}
    </>
  );
};

export default AutoLogout;