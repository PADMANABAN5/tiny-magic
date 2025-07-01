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
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");

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
      "http://localhost:5000/api/users/login",
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
    sessionStorage.setItem("role_name", user.role);
    sessionStorage.setItem("organization_name", user.organization_name || "");

    setIsLoggedIn(true);

    if (user.role === "orguser") {
      setTimeout(() => {
        setShowModelPopup(true);
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


  const handleModelSelection = () => {
    if (selectedModel) {
      sessionStorage.setItem("selectedModel", selectedModel);
      navigate("/dashboard", {
        state: {
          selectedModel,
          username: sessionStorage.getItem("email") || "",
        },
      });
    }
  };

  return (
    <div className="login-container">
      <div className="sphere sphere1"></div>
      <div className="sphere sphere2"></div>
      <div className="sphere sphere3"></div>

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

      {showModelPopup && (
        <div className="model-popup">
          <div className="popup-content">
            <h4>Select Your Preferred LLM Model</h4>
            {["llama4", "mistral", "llama3", "gpt4o"].map((model) => (
              <div key={model}>
                <input
                  type="radio"
                  id={model}
                  name="model"
                  value={model}
                  onChange={(e) => setSelectedModel(e.target.value)}
                />
                <label htmlFor={model}>{model}</label>
              </div>
            ))}
            <button
              className="btn btn-primary mt-3"
              onClick={handleModelSelection}
              disabled={!selectedModel}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
