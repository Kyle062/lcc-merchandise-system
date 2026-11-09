import React, { useState, useEffect, useRef } from "react";
import {
  EyeOff,
  Eye,
  AlertCircle,
  CheckCircle,
  Camera,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library"; // ✅ Import hints
import "./SignUp.css";

import bgImage from "../assets/images/Background Merchandising.png";
import logo from "../assets/images/LCClogo1.png";
import heroLeft from "../assets/images/cartoon1.png";

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
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing camera...");

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const navigate = useNavigate();

  // ✅ Auto-scan logic with Hints
  useEffect(() => {
    if (showCamera) {
      // 1. Setup hints for 1D barcodes
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.UPC_A,
        BarcodeFormat.CODE_39,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      setScanStatus("Hold your Student ID up to the camera...");

      codeReader
        .decodeFromVideoDevice(undefined, "video-preview", (result, error) => {
          if (result) {
            handleBarcodeDetected(result.getText());
          }
        })
        .catch((err) => {
          console.error("Camera error:", err);
          setErrorMessage("Could not access camera. Please allow permissions.");
          setShowCamera(false);
        });
    }

    return () => {
      if (codeReaderRef.current) {
        BrowserMultiFormatReader.releaseAllStreams();
      }
    };
  }, [showCamera]);

  const handleBarcodeDetected = async (barcodeText: string) => {
    if (isLoading || !showCamera) return;

    // Stop scanning immediately
    if (codeReaderRef.current) {
      BrowserMultiFormatReader.releaseAllStreams();
    }

    setIsScanning(true);
    setScanStatus("Barcode detected! Verifying...");

    const VALID_BARCODE = "2024005107";
    const VALID_NAME = "KYLE BERNARD A. TRIMIDAL";

    // Add a small delay to ensure camera releases
    setTimeout(() => {
      if (barcodeText === VALID_BARCODE) {
        if (formData.full_name.toUpperCase() === VALID_NAME) {
          submitRegistration(true);
        } else {
          setScanStatus(
            "Error: ID Name does not match your registration name.",
          );
          setTimeout(() => {
            setIsScanning(false);
            setScanStatus("Hold your Student ID up to the camera...");
            startScanner();
          }, 3000);
        }
      } else {
        setScanStatus(`Error: Unregistered Barcode (${barcodeText}).`);
        setTimeout(() => {
          setIsScanning(false);
          setScanStatus("Hold your Student ID up to the camera...");
          startScanner();
        }, 3000);
      }
    }, 500);
  };

  const startScanner = () => {
    if (codeReaderRef.current && videoRef.current) {
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        "video-preview",
        (result, error) => {
          if (result) {
            handleBarcodeDetected(result.getText());
          }
        },
      );
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
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

    setShowCamera(true);
  };

  const submitRegistration = async (isVerified: boolean) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        "http://192.168.254.111:5000/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            course: formData.course,
            id_photo: isVerified ? "verified" : null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Sign-up failed. Please try again.");
        setIsLoading(false);
        return;
      }

      setShowCamera(false);
      setSuccess(true);
      setSuccessMessage(data.message);
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
    const isActive = successMessage.includes("active");
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
                  background: isActive ? "#ecfdf5" : "#fef3c7",
                  margin: "0 auto 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isActive ? (
                  <CheckCircle size={48} color="#00874e" />
                ) : (
                  <AlertCircle size={48} color="#d97706" />
                )}
              </div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: isActive ? "#00874e" : "#d97706",
                  marginBottom: 10,
                }}
              >
                {isActive
                  ? "ID Verified & Account Active!"
                  : "Account Submitted"}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                {isActive
                  ? "Your student ID was successfully verified against the barcode. You can now log in immediately."
                  : "Your registration has been sent to the administrator for manual review."}
              </p>
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
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====== AUTO-SCANNING CAMERA MODAL ======
  if (showCamera) {
    return (
      <div className="camera-modal-overlay">
        <div className="camera-modal">
          <div className="camera-modal-header">
            <h3>Verifying Student ID</h3>
            <button onClick={() => setShowCamera(false)} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="camera-preview-container">
            <video id="video-preview" className="camera-video" />

            {!isScanning && (
              <div className="scanner-overlay">
                <div className="scan-line"></div>
              </div>
            )}

            <div
              className={`scan-status ${isScanning ? "scanning-active" : ""}`}
            >
              {isScanning && <Loader2 className="spinner-icon" size={20} />}
              <span>{scanStatus}</span>
            </div>
          </div>

          <div className="camera-footer">
            <p>
              Look at the camera and hold your LCC ID barcode clearly in frame.
            </p>
            {errorMessage && <div className="camera-error">{errorMessage}</div>}
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
            <p>Student registration · ID Verification required</p>
          </div>

          {errorMessage && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Course *</label>
              <select
                className="form-select"
                value={formData.course}
                onChange={(e) =>
                  setFormData({ ...formData, course: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
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

            <button type="submit" className="submit-btn" disabled={isLoading}>
              Scan ID & SIGN UP
            </button>
          </form>

          <div className="form-footer">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </div>
      </div>

      <img src={heroLeft} alt="Students" className="hero-left-img" />
    </div>
  );
};

export default SignUp;
