import React, { useState, useEffect } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Import the icons

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(true);

  // New state variables for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const BASE_URL = process.env.REACT_APP_API_LINK;
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

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
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
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
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
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

    // Client-side validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("⚠️ Please fill in all password fields.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("⚠️ New password cannot be the same as the current password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("🔑 Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("🔑 Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError("🔑 Password must contain at least one special character.");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError("🔑 Password must contain at least one number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("❌ New password and confirm password do not match.");
      return;
    }

    if (!token) {
      setError("⏳ Session expired. Please log in again.");
      setShowPasswordChangeModal(false);
      setIsSubmitting(false);
      navigate("/login");
      return;
    }

    // API request
    try {
      await axios.post(
        `${BASE_URL}/users/change-password`,
        {
          currentPassword: currentPassword,
          newPassword: newPassword,
        },
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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSubmitting(false);
      alert(
        "✅ Password updated successfully! Please login with your new password."
      );
    } catch (err) {
      const status = err.response?.status;
      const apiMessage =
        err.response?.data?.error || err.response?.data?.message;

      if (status === 400) {
        setError("⚠️ Invalid request. Please check your inputs.");
      } else if (status === 401) {
        setError("❌ Current password is incorrect.");
      } else if (status === 403) {
        setError("🚫 You do not have permission to change the password.");
      } else if (status === 404) {
        setError("⚠️ Change password route not found. Contact support.");
      } else {
        setError(
          apiMessage || "⚠️ Failed to change password. Please try again."
        );
      }
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
          {isMaintenanceMode && (
            <div className="maintenance-msg">
              🚧 The platform is under maintenance right now. It will be live
              shortly!
            </div>
          )}
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

              {/* Main Login Password Field with Eye Icon */}
              <div className="input-group password-group">
                <label>Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    className="password-toggle-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <button
                className="login-btn"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please Wait..." : "Login"}
              </button>
            </form>
          )}
        </div>
      </div>

      {showPasswordChangeModal && (
        <div
          className="modal-overlay1"
          role="dialog"
          aria-labelledby="modal-title"
        >
          <div className="modal-content1">
            <h3 id="modal-title" className="login-title">
              Change Password
            </h3>

            {/* Change Password Modal - Current Password with Eye Icon */}
            <div className="input-group password-group">
              <label>Current Password</label>
              <div className="password-input-container">
                <input
                  type={showChangePassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <span
                  className="password-toggle-icon"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  {showChangePassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            {/* Change Password Modal - New Password with Eye Icon */}
            <div className="input-group password-group">
              <label>New Password</label>
              <div className="password-input-container">
                <input
                  type={showChangePassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span
                  className="password-toggle-icon"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  {showChangePassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </div>

            {/* Change Password Modal - Confirm Password with Eye Icon */}
            <div className="input-group password-group">
              <label>Confirm Password</label>
              <div className="password-input-container">
                <input
                  type={showChangePassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span
                  className="password-toggle-icon"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                >
                  {showChangePassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
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
