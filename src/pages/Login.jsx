import React, { useState, useEffect } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/AuthContext";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  const BASE_URL = process.env.REACT_APP_API_LINK;
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const sanitizedIdentifier = identifier.trim();
    const sanitizedPassword = password.trim();
    if (!sanitizedIdentifier || !sanitizedPassword) {
      setError("Both fields are required.");
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/users/login`,
        { identifier: sanitizedIdentifier, password: sanitizedPassword },
        { headers: { "Content-Type": "application/json" } }
      );

      const { data: user } = response.data;
      if (!user) {
        setError("Unexpected response from server.");
        return;
      }

      login(user); // Store token and user data in AuthContext
      if (user.is_default_password) {
        setUserDetails(user);
        setShowPasswordChangeModal(true);
        return;
      }

      redirectBasedOnRole(user);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError("❌ Invalid credentials. Please try again.");
      } else if (status === 403) {
        const message = err.response?.data?.message || "Access denied.";
        if (message.includes("Account is inactive")) {
          setError("❌ Your account is inactive. Contact admin.");
        } else if (message.includes("Organization is inactive")) {
          setError("❌ Your organization is inactive. Contact support.");
        } else {
          setError("❌ Access denied.");
        }
      } else if (status === 400) {
        setError("❗ Missing credentials. Fill in all fields.");
      } else {
        setError(err.response?.data?.error || "⚠️ Login failed. Try again.");
      }
      setIsLoggedIn(false);
    }
  };

  const redirectBasedOnRole = (user) => {
    setIsLoggedIn(true);
    setTimeout(() => {
      switch (user.role) {
        case "orguser":
          navigate("/dashboard", {
            state: {
              selectedModel: "gpt4o",
              username: user.username,
            },
          });
          break;
        case "superadmin":
          navigate("/superadmin", { state: { username: user.username } });
          break;
        case "orgadmin":
          navigate("/orgadmin");
          break;
        case "mentor":
          navigate("/mentorpods");
          break;
        default:
          setError("Unknown role");
      }
    }, 2000); // 2000 milliseconds = 2 seconds
  };

  const handleChangePassword = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both new password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Session expired. Please log in again.");
      setShowPasswordChangeModal(false);
      navigate("/login");
      return;
    }

    try {
      await axios.put(
        `${BASE_URL}/users/${userDetails.user_id}`,
        { password: newPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setShowPasswordChangeModal(false);
      setUserDetails(null);
      setIdentifier("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Password updated successfully! Please login with new password.");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to change password."
      );
    }
  };

  // Add Escape key support for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowPasswordChangeModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <div className="sphere sphere1"></div>
        <div className="sphere sphere2"></div>
        <div className="sphere sphere3"></div>
        <div className="sphere sphere4"></div>
        <div className="sphere sphere5"></div>

        <div className="login-card">
          <h2 className="login-title">Login</h2>

          {isLoggedIn ? (
            <div className="success-msg">✅ Successfully Logged In!</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="error-msg">{error}</div>}

              <div className="input-group">
                <label>Email or Username</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button className="login-btn" type="submit" disabled={isLoggedIn}>
                Login
              </button>
            </form>
          )}
        </div>
      </div>

      {showPasswordChangeModal && (
        <div className="modal-overlay1" role="dialog" aria-labelledby="modal-title">
          <div className="modal-content1">
            <h3 id="modal-title" className="login-title">Change Password</h3>
            {/* <button
              className="close-btn"
              onClick={() => setShowPasswordChangeModal(false)}
              aria-label="Close modal"
            >
              ×
            </button> */}

            <div className="input-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {confirmPassword && (
              <div
                className={`password-match-status ${
                  newPassword === confirmPassword ? "match" : "mismatch"
                }`}
              >
                {newPassword === confirmPassword
                  ? "✔️ Passwords match"
                  : "❌ Passwords do not match"}
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            <button
              className="login-btn"
              onClick={handleChangePassword}
              disabled={newPassword !== confirmPassword}
            >
              Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;