import React, { useState, useEffect, useRef } from "react";
import {
  EyeOff,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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

const VALID_STUDENTS = [
  {
    barcode: "2024005107",
    names: ["Kyle Bernard A. Trimidal", "Kyle Bernard Trimidal"],
  },
  { barcode: "20244004891", names: ["Angelo Guiritan", "Angelo G. Guiritan"] },
  {
    barcode: "2023005563",
    names: ["Jiefrey M Balagat", "Jiefrey Balagat", "Jiefrey M. Balagat"],
  },
  {
    barcode: "2024005081",
    names: [
      "Anna Grace C Tingwasan",
      "Anna Grace Tingwasan",
      "Anna Grace C. Tingwasan",
    ],
  },
  { barcode: "2024004213", names: ["Jan Robin Layog"] },
];

const getHost = () => {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1"
    ? "localhost"
    : "10.34.0.141";
};

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
  const [scanStatus, setScanStatus] = useState("Initializing camera...");
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const normalizeName = (name: string) => {
    return name
      .toUpperCase()
      .replace(/\./g, "")
      .split(" ")
      .filter((word) => word.length > 1)
      .join(" ")
      .trim();
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (showCamera && !scanSuccess) {
      timeoutId = setTimeout(() => setShowManualInput(true), 5000);

      const startScanner = async () => {
        try {
          const scanner = new Html5Qrcode("reader", {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
            ],
            verbose: false,
          });
          scannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            (decodedText) => {
              handleBarcodeScanned(decodedText);
            },
            () => {},
          );
          setScanStatus("Scanning for barcode...");
        } catch (err: any) {
          setErrorMessage("Could not access camera. Please allow permissions.");
          setShowCamera(false);
        }
      };

      startScanner();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopScanner();
    };
  }, [showCamera, scanSuccess]);

  const handleBarcodeScanned = (barcodeText: string) => {
    if (isLoading || scanSuccess) return;

    const cleanBarcode = barcodeText.trim();
    const userInputName = normalizeName(formData.full_name);

    const student = VALID_STUDENTS.find((s) => s.barcode === cleanBarcode);

    if (!student) {
      setScanStatus(`ID ${cleanBarcode} is not registered.`);
      return;
    }

    const isNameMatch = student.names.some((validName) => {
      return normalizeName(validName) === userInputName;
    });

    if (isNameMatch) {
      setScanSuccess(true);
      setScanStatus("ID Verified Successfully!");
      stopScanner();
      setTimeout(() => submitRegistration(true), 1000);
    } else {
      setScanStatus("Name does not match ID. Try again.");
    }
  };

  const captureAndScanPhoto = async () => {
    const video = document.querySelector("video");
    if (!video) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // We crop the image to match the green box (center 250x150)
    const cropWidth = videoWidth * 0.5;
    const cropHeight = videoHeight * 0.35;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = (videoHeight - cropHeight) / 2;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    setScanStatus("Analyzing photo...");
    setIsLoading(true);

    try {
      const host = getHost();
      const response = await fetch(`http://${host}:8001/scan-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success && data.barcode) {
        handleBarcodeScanned(data.barcode);
      } else {
        setScanStatus("Could not read ID. Please try again or type manually.");
      }
    } catch (err) {
      setIsLoading(false);
      setScanStatus("Server error. Please type manually.");
    }
  };

  const handleManualVerify = () => {
    handleBarcodeScanned(manualBarcode);
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
      const host = getHost();
      const response = await fetch(`http://${host}:5000/api/auth/register`, {
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
      });

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

  if (showCamera) {
    return (
      <div className="camera-modal-overlay">
        <div className="camera-modal">
          <div className="camera-modal-header">
            <h3>Verify Student ID</h3>
            <button onClick={() => setShowCamera(false)} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="camera-preview-container">
            <div id="reader" style={{ width: "100%", height: "100%" }}></div>

            {/* Professional Scanner Overlay */}
            <div
              className="scanner-overlay"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "250px",
                  height: "150px",
                  border: "2px solid #00ff88",
                  borderRadius: "10px",
                  boxShadow:
                    "0 0 15px rgba(0, 255, 136, 0.4) inset, 0 0 15px rgba(0, 255, 136, 0.4)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "2px",
                    background: "#00ff88",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    animation: "scanAnim 2s infinite linear",
                    boxShadow: "0 0 8px #00ff88",
                  }}
                />
              </div>
            </div>

            <div className="scan-status">
              {isLoading ? (
                <Loader2 className="spinner-icon" size={20} />
              ) : null}
              <span>{scanStatus}</span>
            </div>
          </div>

          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 15 }}
          >
            <button
              onClick={captureAndScanPhoto}
              style={{
                background: "#00874e",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "bold",
              }}
            >
              <Camera size={18} /> Take Photo & Scan
            </button>
          </div>

          {showManualInput && !scanSuccess && (
            <div
              style={{
                marginTop: "20px",
                textAlign: "center",
                background: "#f9fafb",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Camera struggling? Enter barcode manually:
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="e.g. 2024005107"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    flex: 1,
                  }}
                />
                <button
                  onClick={handleManualVerify}
                  style={{
                    background: "#00874e",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          <div className="camera-footer">
            <p>Hold steady. The system is scanning...</p>
            {errorMessage && <div className="camera-error">{errorMessage}</div>}
          </div>
        </div>
      </div>
    );
  }

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
              <ShieldCheck
                size={18}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Verify ID & SIGN UP
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
