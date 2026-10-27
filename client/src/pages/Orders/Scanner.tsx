import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  QrCode,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import "../Orders/Orders.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const Scanner = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");

  // We use a ref to hold the scanner instance so we can stop it later
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false); // Prevents multiple scans at once

  const processScan = async (decodedText: string) => {
    // 1. Extract the Group ID from the QR text (e.g., "LCC-ORDER-15" -> "15")
    const groupIdMatch = decodedText.match(/LCC-ORDER-(\d+)/);

    if (!groupIdMatch) {
      // If the QR code doesn't match our format, ignore it
      return;
    }

    const groupId = groupIdMatch[1];

    // Prevent multiple scans while processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setLoading(true);
    setScanError(null);
    setSuccessData(null);

    // 2. Send to backend
    try {
      const res = await fetch("http://localhost:5000/api/orders/scan-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScanError(data.message || "Failed to process order.");
        showToast("error", "Scan Failed", data.message);
      } else {
        setSuccessData(groupId);
        showToast("success", "Order Scanned!", data.message);
      }
    } catch (error) {
      setScanError("Connection Error. Could not reach server.");
      showToast("error", "Connection Error", "Could not reach server.");
    } finally {
      setLoading(false);

      // Cooldown for 2 seconds before allowing the next scan
      setTimeout(() => {
        isProcessingRef.current = false;
        setSuccessData(null);
        setScanError(null);
      }, 2000);
    }
  };

  useEffect(() => {
    // Initialize the scanner
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;
        setIsScanning(true);

        await html5Qrcode.start(
          { facingMode: "environment" }, // Prefer back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Success callback
            processScan(decodedText);
          },
          (errorMessage) => {
            // Ignore continuous scanning errors (happens when no QR is in frame)
          },
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        showToast(
          "error",
          "Camera Error",
          "Could not access the webcam. Is DroidCam running?",
        );
        setIsScanning(false);
      }
    };

    // Start scanner only when component mounts
    if (!isScanning) {
      startScanner();
    }

    // Cleanup when leaving the page
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="orders-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* SIDEBAR */}
      <div className="orders-sidebar">
        <div className="orders-sidebar-header">
          <img src={logo} alt="LCC Logo" className="orders-sidebar-logo" />
          <div>
            <div className="orders-sidebar-title">LCC Admin</div>
            <div className="orders-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="orders-sidebar-nav">
          <div
            className="orders-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div
            className="orders-nav-item"
            onClick={() => navigate("/inventory")}
          >
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate("/orders")}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div className="orders-nav-item active">
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate("/users")}>
            <Users size={20} /> <span>Users</span>
          </div>
          <div
            className="orders-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div
          className="orders-sidebar-footer"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="orders-main-content">
        <div className="orders-header">
          <div>
            <h1 className="orders-header-title">QR Scanner</h1>
            <p className="orders-last-updated">
              Position the QR code in front of the camera to scan.
            </p>
          </div>
        </div>

        <div
          className="orders-content"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              textAlign: "center",
              maxWidth: "600px",
              width: "100%",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                marginBottom: "20px",
                color: "#1f2937",
              }}
            >
              Scan Student QR Code
            </h2>

            {/* The Video Feed Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: "300px",
                background: "#f3f4f6",
                borderRadius: "12px",
                overflow: "hidden",
                border: "2px solid #e5e7eb",
              }}
            >
              <div id="reader" style={{ width: "100%" }}></div>

              {/* Success Overlay */}
              {successData && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(16, 185, 129, 0.9)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <CheckCircle size={64} style={{ marginBottom: "16px" }} />
                  <h3 style={{ fontSize: "24px", fontWeight: "bold" }}>
                    Order Scanned!
                  </h3>
                  <p style={{ fontSize: "16px" }}>
                    Group #GRP-{successData} is now Processing.
                  </p>
                </div>
              )}

              {/* Error Overlay */}
              {scanError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(239, 68, 68, 0.9)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <XCircle size={64} style={{ marginBottom: "16px" }} />
                  <h3 style={{ fontSize: "24px", fontWeight: "bold" }}>
                    Scan Failed
                  </h3>
                  <p style={{ fontSize: "16px" }}>{scanError}</p>
                </div>
              )}

              {/* Loading Overlay */}
              {loading && !successData && !scanError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <RefreshCw
                    size={48}
                    style={{
                      marginBottom: "16px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <h3 style={{ fontSize: "18px" }}>Processing Order...</h3>
                </div>
              )}
            </div>

            <p
              style={{ color: "#6b7280", fontSize: "13px", marginTop: "16px" }}
            >
              Point the student's QR code at the camera. The system will
              automatically process it.
            </p>
          </div>
        </div>
      </div>

      {/* Simple inline CSS for the spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        /* Make the video element responsive */
        #reader video {
          width: 100% !important;
          border-radius: 10px;
          object-fit: cover;
        }
        /* Hide default html5-qrcode UI elements we don't need */
        #reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
