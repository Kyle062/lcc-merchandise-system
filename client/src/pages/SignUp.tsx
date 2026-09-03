import React, { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import "./SignUp.css";

import bgImage from "../assets/images/Background Merchandising.png";
import logo from "../assets/images/LCClogo1.png";
import heroLeft from "../assets/images/cartoon1.png";
import groupRight from "../assets/images/cartoon2.png";

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              <h1>LEGACY COLLEGE OF COMPOSTELA</h1>
              <p>Merchandise Order Management System</p>
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
              Welcome to
              <br />
              LCC Merchandising
            </h3>
            <p>Sign up to access your merchandising account</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label>Email or username:</label>
              <input type="text" className="form-input" />
            </div>

            <div className="form-group">
              <label>Sign as:</label>
              <select className="form-select">
                <option value="student">Student</option>
                <option value="staff">Merchandising Staff</option>
                <option value="finance">Finance Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label>Create Password:</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
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

            <div className="form-group">
              <label>Confirm Password:</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn">
              SIGN UP
            </button>
          </form>

          <div className="form-footer">
            Don't have account? <a href="/login">Sign Up</a>
          </div>
        </div>
      </div>

      {/* Characters Layer (Overlays the bottom of form card) */}
      <img src={heroLeft} alt="Students" className="hero-left-img" />
      <img src={groupRight} alt="Campus Group" className="group-right-img" />
    </div>
  );
};

export default SignUp;
