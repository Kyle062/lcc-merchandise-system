import React, { useState, useEffect } from "react";
import { EyeOff, Eye, AlertCircle, ShieldAlert } from "lucide-react";
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
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  const navigate = useNavigate();

  // Load remembered username on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("remembered_user");
    if (savedUser) {
      setEmail(savedUser);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => setLockoutTime(lockoutTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;

    const sanitizedEmail = email.trim();
    const sanitizedPassword = password.trim();

    if (!sanitizedEmail || !sanitizedPassword) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://192.168.254.111:5000/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: sanitizedEmail,
            password: sanitizedPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        if (newAttempts >= 5) {
          setLockoutTime(30);
          setErrorMessage("Too many failed attempts. Please wait 30 seconds.");
          setFailedAttempts(0);
        } else if (response.status === 403) {
          setErrorMessage(data.message || "Your account is not yet active.");
        } else {
          setErrorMessage(data.message || "Invalid username or password.");
        }

        setIsLoading(false);
        return;
      }

      setFailedAttempts(0);

      // ✅ REMEMBER ME LOGIC
      if (rememberMe) {
        localStorage.setItem("remembered_user", sanitizedEmail);
      } else {
        localStorage.removeItem("remembered_user");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);

      if (data.role === "admin") navigate("/admin-dashboard");
      else if (data.role === "staff") navigate("/orders");
      else if (data.role === "student") navigate("/student-dashboard");
      else if (data.role === "finance") navigate("/finance-dashboard");
      else if (data.role === "tailor") navigate("/tailor-dashboard");
      else setErrorMessage("Unknown role. Contact administrator.");
    } catch (error) {
      setErrorMessage(
        "Cannot connect to server. Make sure backend is running.",
      );
      setIsLoading(false);
    }
  };

  const isLocked = lockoutTime > 0;

  return (
    <div className="signup-container">
      <div
        className="bg-image"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="bg-overlay" />

      <div className="content-wrapper">
        <div className="left-section">
          <div className="logo-container">
            <img src={logo} alt="LCC Logo" className="logo-img" />
            <div className="logo-text">
              <h1 className="lcc-name">LEGACY COLLEGE OF COMPOSTELA</h1>
              <p className="lcc-name-sub">
                Merchandise Order Management System
              </p>
            </div>
          </div>

          <div className="hero-copy">
            <p className="hero-tag">
              For students, staff, and the merchandise office
            </p>
            <h2>
              The campus store,
              <br />
              without the
              <br />
              tally sheet.
            </h2>
            <p className="hero-desc">
              Live stock counts, order status your students can actually check,
              and receipts that reconcile themselves.
            </p>
          </div>
        </div>

        <div className="form-card1">
          <div className="form-header">
            <h3>
              Welcome Back to
              <br />
              LCC Merchandising
            </h3>
            <p>Log in to access your merchandising account</p>
          </div>

          {isLocked && (
            <div
              className="error-banner"
              style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}
            >
              <ShieldAlert size={18} />
              <span>
                Account temporarily locked. Try again in {lockoutTime}s.
              </span>
            </div>
          )}

          {errorMessage && !isLocked && (
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
                className={`form-input ${errorMessage || isLocked ? "input-error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                disabled={isLocked || isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${errorMessage || isLocked ? "input-error" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage("");
                  }}
                  disabled={isLocked || isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLocked || isLoading}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="remember-me-wrapper">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  className="remember-me-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || isLocked}
              style={{ opacity: isLoading || isLocked ? 0.7 : 1, marginTop: 0 }}
            >
              {isLoading
                ? "LOGGING IN..."
                : isLocked
                  ? `LOCKED (${lockoutTime}s)`
                  : "LOG IN"}
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
