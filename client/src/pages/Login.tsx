import React, { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css"; // Reusing the same CSS file for consistent styling

import bgImage from "../assets/images/Background Merchandising.png";
import logo from "../assets/images/LCClogo1.png";
import heroLeft from "../assets/images/cartoon1.png";
import groupRight from "../assets/images/cartoon2.png";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add your backend API login call here later
    console.log("Logging in with:", email, password);
    navigate("/dashboard"); // Redirect to dashboard on success
  };

  return (
    <div className="signup-container">
      {/* Background Image & Overlay */}
      <div
        className="bg-image"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="bg-overlay" />

      {/* Main Grid Content */}
      <div className="content-wrapper">
        {/* Left Section: Branding & Hero Text */}
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

        {/* Right Section: Form Card */}
        <div className="form-card">
          <div className="form-header">
            <h3>
              Welcome Back to
              <br />
              LCC Merchandising
            </h3>
            <p>Log in to access your merchandising account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email or username:</label>
              <input
                type="text"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div
              style={{
                textAlign: "right",
                marginTop: "-5px",
                marginBottom: "15px",
              }}
            >
              <a
                href="/forgot-password"
                style={{
                  fontSize: "12px",
                  color: "#007a43",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="submit-btn">
              LOG IN
            </button>
          </form>

          <div className="form-footer">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>

      {/* Characters Layer (Overlays the bottom of form card) */}
      <img src={heroLeft} alt="Students" className="hero-left-img" />
      <img src={groupRight} alt="Campus Group" className="group-right-img" />
    </div>
  );
};

export default Login;
