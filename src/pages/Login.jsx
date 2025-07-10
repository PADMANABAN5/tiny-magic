import React, { useState } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier || !password) {
      setError("Both fields are required.");
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/users/login`,
        { identifier, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const { data: user } = response.data;

      if (user.is_default_password) {
        setUserDetails(user); // Save user temporarily
        setShowPasswordChangeModal(true); // Show modal
        return;
      }

      handleSessionAndRedirect(user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      setIsLoggedIn(false);
    }
  };

  const handleSessionAndRedirect = (user) => {
    sessionStorage.setItem("token", user.token || "");
    sessionStorage.setItem("email", user.email || "");
    sessionStorage.setItem("username", user.username);
    sessionStorage.setItem("userId", user.user_id);
    sessionStorage.setItem("role_name", user.role);
    sessionStorage.setItem("organization_name", user.organization_name || "");
    sessionStorage.setItem("selectedModel", "gpt4o");
    sessionStorage.setItem("firstname", user.first_name || "");
    sessionStorage.setItem("lastname", user.last_name || "");

    setIsLoggedIn(true);

    if (user.role === "orguser") {
      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            selectedModel: "gpt4o",
            username: user.username,
          },
        });
      }, 2000);
    } else {
      switch (user.role) {
        case "superadmin":
          navigate("/superadmin", { state: { username: user.username } });
          break;
        case "orgadmin":
          navigate("/orgadmin");
          break;
        case "mentor":
          navigate("/mentor");
          break;
        default:
          setError("Unknown role");
      }
    }
  };

  const handleChangePassword = async () => {
    setError("");
    if (!newPassword || !confirmPassword) {
      setError("Both new password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/users/${userDetails.user_id}`,
        {
          password: newPassword, // Use `new_password` if required by your backend
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setShowPasswordChangeModal(false);
      setUserDetails(null);
      setIdentifier("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");

      alert("Password updated successfully! Please login with new password.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    }
  };

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

              <button type="submit">Login</button>
            </form>
          )}
        </div>
      </div>

      {/* 🔒 Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: "400px" }}>
            <h3>🔐 Change Default Password</h3>
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

            {error && <div className="error-msg">{error}</div>}

            <button onClick={handleChangePassword}>Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
