import React, { useState } from "react";
import { EyeOff, Eye, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

import bgImage from "../assets/images/Background Merchandising.png";
import logo from "../assets/images/LCClogo1.png";
import heroLeft from "../assets/images/cartoon1.png";
import groupRight from "../assets/images/cartoon2.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Invalid username or password.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      if (data.role === "admin") navigate("/admin-dashboard");
      else if (data.role === "staff") navigate("/staff-dashboard");
      else if (data.role === "student") navigate("/student-dashboard");
      else if (data.role === "finance") navigate("/finance-dashboard");
      else setErrorMessage("Unknown role. Contact administrator.");
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Cannot connect to server. Make sure backend is running.");
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="bg-image" style={{ backgroundImage: `url('${bgImage}')` }} />
      <div className="bg-overlay" />

      <div className="content-wrapper">
        <div className="left-section">
          <div className="logo-container">
            <img src={logo} alt="LCC Logo" className="logo-img" />
            <div className="logo-text">
              <h1 className="lcc-name">LEGACY COLLEGE OF COMPOSTELA</h1>
              <p className="lcc-name-sub">Merchandise Order Management System</p>
            </div>
          </div>

          <div className="hero-copy">
            <p className="hero-tag">For students, staff, and the merchandise office</p>
            <h2>The campus store,<br />without the<br />tally sheet.</h2>
            <p className="hero-desc">
              Live stock counts, order status your students can actually check,
              and receipts that reconcile themselves.
            </p>
          </div>
        </div>

        <div className="form-card1">
          <div className="form-header">
            <h3>Welcome Back to<br />LCC Merchandising</h3>
            <p>Log in to access your merchandising account</p>
          </div>

          {errorMessage && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email or username:</label>
              <input
                type="text"
                className={`form-input ${errorMessage ? "input-error" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(""); }}
                required
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${errorMessage ? "input-error" : ""}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMessage(""); }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-password-wrapper">
              <a href="/forgot-password" className="forgot-password-link">Forgot Password?</a>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? "LOGGING IN..." : "LOG IN"}
            </button>
          </form>

          <div className="form-footer">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>

      <img src={heroLeft} alt="Students" className="hero-left-img" />
      <img src={groupRight} alt="Campus Group" className="group-right-img" />
    </div>
  );
};

export default Login;