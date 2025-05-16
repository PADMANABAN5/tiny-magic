import React, { useState } from "react";
import "../styles/login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setIsLoggedIn(true);

    // Delay before showing model popup
    setTimeout(() => {
      setShowModelPopup(true);
    }, 2000); // 2 seconds
  };

  const handleModelSelection = () => {
    if (selectedModel) {
      localStorage.setItem("selectedModel", selectedModel);
      localStorage.setItem("username", email);
      navigate("/dashboard", {
        state: { selectedModel, username: "PADMANABAN" },
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
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
