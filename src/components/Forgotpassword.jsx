import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false); 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 
  const navigate = useNavigate();
  const BASE_URL = process.env.REACT_APP_API_LINK;

  // Password validation helper (same as in Login.jsx)
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

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError("");
    if (!email.trim()) {
      setError("⚠️ Please enter your email.");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/users/forgot-password`, { email: email.trim() });
      alert("✅ OTP sent to your email");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "❌ Failed to send OTP");
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    if (!otp.trim()) {
      setError("⚠️ Please enter the OTP.");
      return;
    }
    try {
      await axios.post(`${BASE_URL}/users/verify-otp`, { email, otp });
      alert("✅ OTP verified");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "❌ Invalid OTP");
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("⚠️ Please fill in both password fields.");
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
    try {
      await axios.post(`${BASE_URL}/users/reset-password`, {
        email,
        otp,
        newPassword,
      });
      alert("🎉 Password reset successful, please login again");
      navigate("/login"); // Redirect to login
    } catch (err) {
      setError(err.response?.data?.message || "❌ Failed to reset password");
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        {/* Add sphere elements for animations */}
        <div className="sphere sphere1" />
        <div className="sphere sphere2" />
        <div className="sphere sphere3" />
        <div className="sphere sphere4" />
        <div className="sphere sphere5" />

        <div className="login-card">
          <h2 className="login-title">Forgot Password</h2>
          {error && <div className="error-msg">{error}</div>}

          {/* Step 1: Email */}
          {step === 1 && (
            <>
              <div className="input-group">
                <label>Enter your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  
                  style={{ userSelect: "auto" }}
                />
              </div>
              <button className="login-btn" onClick={handleSendOtp}>
                Send OTP
              </button>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <>
              <div className="input-group">
                <label>Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  
                  style={{ userSelect: "auto" }}
                />
              </div>
              <button className="login-btn" onClick={handleVerifyOtp}>
                Verify OTP
              </button>
            </>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <>
              <div className="input-group password-group">
                <label>New Password</label>
                <div className="password-input-container">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    
                    style={{ userSelect: "auto" }}
                  />
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    aria-pressed={showNewPassword}
                  >
                    {showNewPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              <div className="input-group password-group">
                <label>Confirm New Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                   
                    style={{ userSelect: "auto" }}
                  />
                  <button
                    type="button"
                    className="password-toggle-icon"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              {confirmPassword && (
                <div className={`password-match-status ${newPassword === confirmPassword ? "match" : "mismatch"}`}>
                  {newPassword === confirmPassword ? "✔️ Passwords match" : "❌ Passwords do not match"}
                </div>
              )}
              <button className="login-btn" onClick={handleResetPassword}>
                Reset Password
              </button>
            </>
          )}
          <div className="forgot-password-link" style={{ textAlign: "center", marginTop: "10px" }}>
            <button
              onClick={() => navigate("/login")}
              style={{ textDecoration: "none", color: "#085a5cff", cursor: "pointer", border: "none", background: "none" }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}