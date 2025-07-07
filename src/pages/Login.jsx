import React, { useState } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

function Login() {
  const [identifier, setIdentifier] = useState(""); // Can be email or username
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Login success:", response.data);

      const { data: user } = response.data; // ✅ Fix: extract from response.data.data

      sessionStorage.setItem("token", response.data.token || ""); // if token is present
      sessionStorage.setItem("email", user.email);
      sessionStorage.setItem("username", user.username);
      sessionStorage.setItem("userId", user.user_id);
      sessionStorage.setItem("role_name", user.role);
      sessionStorage.setItem("organization_name", user.organization_name || "");
      sessionStorage.setItem("selectedModel", "gpt4o"); // Always set to gpt4o
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
            navigate("/superadmin", {
              state: { username: user.username },
            });
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
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Login failed");
      setIsLoggedIn(false);
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
                <label>Email</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit">Login</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;