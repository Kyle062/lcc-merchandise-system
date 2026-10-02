import React, { useState } from "react";
import { EyeOff, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";

import bgImage from "../assets/images/Background Merchandising.png";
import logo from "../assets/images/LCClogo1.png";
import heroLeft from "../assets/images/cartoon1.png";
import groupRight from "../assets/images/cartoon2.png";

const COURSES = [
  "BSBA-FM",
  "BSBA-MM",
  "BSBA-HRM",
  "BSC",
  "BEED",
  "BSED-ENG",
  "BSED-SS",
  "BSED-VE",
  "BSIT",
  "BSTM",
];

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    course: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (!formData.course) {
      setErrorMessage("Please select your course.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          course: formData.course,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Sign-up failed. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(
        "Cannot connect to server. Make sure backend is running.",
      );
      setIsLoading(false);
    }
  };

  // ====== SUCCESS SCREEN ======
  if (success) {
    return (
      <div className="signup-container">
        <div
          className="bg-image"
          style={{ backgroundImage: `url('${bgImage}')` }}
        />
        <div className="bg-overlay" />
        <div className="content-wrapper">
          <div
            className="form-card"
            style={{ margin: "100px auto", maxWidth: 500 }}
          >
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  margin: "0 auto 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle size={48} color="#00874e" />
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#00874e",
                  marginBottom: 10,
                }}
              >
                Account Submitted!
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Your registration has been sent to the administrator for review.
                You'll be able to log in once your account is{" "}
                <strong>approved</strong>.
              </p>
              <div
                style={{
                  background: "#fef3c7",
                  border: "1px solid #fcd34d",
                  color: "#92400e",
                  padding: "12px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 24,
                  textAlign: "left",
                }}
              >
                <strong>⏳ What happens next?</strong>
                <br />
                1. Admin reviews your details
                <br />
                2. Once approved, you can log in
                <br />
                3. You'll be notified via email (in the future)
              </div>
              <Link
                to="/login"
                style={{
                  display: "inline-block",
                  padding: "12px 32px",
                  backgroundColor: "#00874e",
                  color: "white",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== REGISTRATION FORM ======
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

        <div className="form-card">
          <div className="form-header">
            <h3>
              Create your
              <br />
              LCC Merchandising account
            </h3>
            <p>Student registration · Admin approval required</p>
          </div>

          {errorMessage && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  setErrorMessage("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Email or Username *</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  setErrorMessage("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setErrorMessage("");
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Course *</label>
              <select
                className="form-select"
                value={formData.course}
                onChange={(e) => {
                  setFormData({ ...formData, course: e.target.value });
                  setErrorMessage("");
                }}
                required
              >
                <option value="">Select your course...</option>
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrorMessage("");
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    });
                    setErrorMessage("");
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                >
                  {showConfirmPassword ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? "SUBMITTING..." : "SIGN UP"}
            </button>
          </form>

          <div className="form-footer">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
      </div>

      <img src={heroLeft} alt="Students" className="hero-left-img" />
      <img src={groupRight} alt="Campus Group" className="group-right-img" />
    </div>
  );
};

export default SignUp;
