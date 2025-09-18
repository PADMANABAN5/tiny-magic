import React, { useState, useEffect } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // change-password modal fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // visibility toggles
  const [showPassword, setShowPassword] = useState(false);     // login
  const [showCurrentPwd, setShowCurrentPwd] = useState(false); // modal - current
  const [showNewPwd, setShowNewPwd] = useState(false);         // modal - new
  const [showConfirmPwd, setShowConfirmPwd] = useState(false); // modal - confirm

  const BASE_URL = process.env.REACT_APP_API_LINK;
  const navigate = useNavigate();
  const { login, token } = useAuth();

  // ---- Password validation helper ----
  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*?]/.test(pwd);

    if (!minLength) return { isValid: false, message: "🔑 Password must be at least 8 characters long." };
    if (!hasUppercase) return { isValid: false, message: "🔑 Password must contain at least one uppercase letter." };
    if (!hasLowercase) return { isValid: false, message: "🔑 Password must contain at least one lowercase letter." };
    if (!hasNumber) return { isValid: false, message: "🔑 Password must contain at least one number." };
    if (!hasSpecialChar) return { isValid: false, message: "🔑 Password must contain at least one special character (!@#$%^&*?)." };
    return { isValid: true, message: "" };
  };
   const allowCopyPaste = (e) => {
    e.stopPropagation(); // Prevent global event handlers from blocking
  };
  // ------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const sanitizedIdentifier = identifier.trim();
    const sanitizedPassword = password.trim();

    if (!sanitizedIdentifier || !sanitizedPassword) {
      setError("Both fields are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/users/login`,
        { identifier: sanitizedIdentifier, password: sanitizedPassword },
        { headers: { "Content-Type": "application/json" } }
      );

      const { data: user } = response.data || {};
      if (!user) {
        setError("Unexpected response from server.");
        setIsSubmitting(false);
        return;
      }

      login(user);

      if (user.is_default_password) {
        setUserDetails(user);
        setShowPasswordChangeModal(true);
        setIsSubmitting(false);
        return;
      }

      redirectBasedOnRole(user);
      setIsSubmitting(false);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 401) {
        setError(`❌ ${message || "Invalid credentials."}`);
      } else if (status === 403) {
        const msg = err.response?.data?.message || "Access denied.";
        if (msg.includes("Account is inactive")) setError("❌ Your account is inactive. Contact admin.");
        else if (msg.includes("Organization is inactive")) setError("❌ Your organization is inactive. Contact support.");
        else setError("❌ Access denied.");
      } else if (status === 429) {
        setError(`🔒 ${message || "Too many attempts. Try later."}`);
      } else if (status === 400) {
        setError("❗ Missing credentials. Fill in all fields.");
      } else {
        setError(err.response?.data?.error || "⚠️ Login failed. Try again.");
      }

      setIsLoggedIn(false);
      setIsSubmitting(false);
    }
  };

  const redirectBasedOnRole = (user) => {
    setIsLoggedIn(true);
    switch (user.role) {
      case "orguser":
        navigate("/dashboard", { replace: true, state: { selectedModel: "gpt4o", username: user.username } });
        break;
      case "superadmin":
        navigate("/superadmin", { replace: true, state: { username: user.username } });
        break;
      case "orgadmin":
        navigate("/orgadmin", { replace: true });
        break;
      case "mentor":
        navigate("/mentorpods", { replace: true });
        break;
      default:
        setError("Unknown role");
    }
  };

  const handleChangePassword = async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("⚠️ Please fill in all password fields.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("⚠️ New password cannot be the same as the current password.");
      return;
    }

    const check = validatePassword(newPassword);
    if (!check.isValid) {
      setError(check.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("❌ New password and confirm password do not match.");
      return;
    }

    if (!token) {
      setError("⏳ Session expired. Please log in again.");
      setShowPasswordChangeModal(false);
      navigate("/login");
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/users/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      setShowPasswordChangeModal(false);
      setUserDetails(null);
      setIdentifier("");
      setPassword("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("✅ Password updated successfully! Please login with your new password.");
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.error || err.response?.data?.message;

      if (status === 400) setError("⚠️ Invalid request. Please check your inputs.");
      else if (status === 401) setError("❌ Current password is incorrect.");
      else if (status === 403) setError("🚫 You do not have permission to change the password.");
      else if (status === 404) setError("⚠️ Change password route not found. Contact support.");
      else setError(apiMessage || "⚠️ Failed to change password. Please try again.");
    }
  };

  // Close modal on Esc
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowPasswordChangeModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Close modal on overlay click
  const closeOnOverlay = (e) => {
    if (e.target.classList.contains("modal-overlay1")) {
      setShowPasswordChangeModal(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <div className="sphere sphere1" />
        <div className="sphere sphere2" />
        <div className="sphere sphere3" />
        <div className="sphere sphere4" />
        <div className="sphere sphere5" />

        <div className="login-card">
          {isMaintenanceMode && (
            <div className="maintenance-msg">
              🚧 The platform is under maintenance right now. It will be live shortly!
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
                  onCopy={allowCopyPaste}
                  onCut={allowCopyPaste}
                  onPaste={allowCopyPaste}
                  onSelectStart={allowCopyPaste}
                  onKeyDown={allowCopyPaste}
                 style={{ userSelect: 'auto' }}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
              </div>

              {/* Login Password */}
              <div className="input-group password-group">
                <label>Password</label>
                <div className="password-input-container">
                  <input
                    onCopy={allowCopyPaste}
              onCut={allowCopyPaste}
              onPaste={allowCopyPaste}
              onSelectStart={allowCopyPaste}
              onKeyDown={allowCopyPaste}
              style={{ userSelect: 'auto' }}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>

              <button className="login-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Please Wait..." : "Login"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordChangeModal && (
        <div className="modal-overlay1" role="dialog" aria-labelledby="modal-title" onClick={closeOnOverlay}>
          <div className="modal-content1" role="document">
            <h3 id="modal-title" className="login-title">Change Password</h3>

            {/* Current Password */}
            <div className="input-group password-group">
              <label>Current Password</label>
              <div className="password-input-container">
                <input
                onCopy={allowCopyPaste}
              onCut={allowCopyPaste}
              onPaste={allowCopyPaste}
              onSelectStart={allowCopyPaste}
              onKeyDown={allowCopyPaste}
              style={{ userSelect: 'auto' }}
                  type={showCurrentPwd ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-icon"
                  onClick={() => setShowCurrentPwd((v) => !v)}
                  aria-label={showCurrentPwd ? "Hide current password" : "Show current password"}
                  aria-pressed={showCurrentPwd}
                >
                  {showCurrentPwd ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="input-group password-group">
              <label>New Password</label>
              <div className="password-input-container">
                <input
                onCopy={allowCopyPaste}
              onCut={allowCopyPaste}
              onPaste={allowCopyPaste}
              onSelectStart={allowCopyPaste}
              onKeyDown={allowCopyPaste}
              style={{ userSelect: 'auto' }}
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-icon"
                  onClick={() => setShowNewPwd((v) => !v)}
                  aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                  aria-pressed={showNewPwd}
                >
                  {showNewPwd ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group password-group">
              <label>Confirm Password</label>
              <div className="password-input-container">
                <input
                onCopy={allowCopyPaste}
              onCut={allowCopyPaste}
              onPaste={allowCopyPaste}
              onSelectStart={allowCopyPaste}
              onKeyDown={allowCopyPaste}
              style={{ userSelect: 'auto' }}
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-icon"
                  onClick={() => setShowConfirmPwd((v) => !v)}
                  aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                  aria-pressed={showConfirmPwd}
                >
                  {showConfirmPwd ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>

            {confirmPassword && (
              <div className={`password-match-status ${newPassword === confirmPassword ? "match" : "mismatch"}`}>
                {newPassword === confirmPassword ? "✔️ Passwords match" : "❌ Passwords do not match"}
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            <button
              className="login-btn"
              onClick={handleChangePassword}
              disabled={!newPassword || newPassword !== confirmPassword}
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
