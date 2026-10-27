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

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 30, // ✅ High FPS for instant scanning
            qrbox: { width: 280, height: 280 }, // ✅ Perfect square for the QR
            aspectRatio: 1.0, // ✅ Force the camera feed to be a square
          },
          (decodedText) => processScan(decodedText),
          () => {},
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        showToast(
          "error",
          "Camera Error",
          "Could not access the laptop webcam.",
        );
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const processScan = async (decodedText: string) => {
    const groupIdMatch = decodedText.match(/LCC-ORDER-(\d+)/);
    if (!groupIdMatch) return;

    const groupId = groupIdMatch[1];
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setLoading(true);
    setScanError(null);
    setSuccessData(null);

    try {
      const res = await fetch("http://192.168.254.111:5000/api/orders/scan-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanError(
          data.message || data.details || "Failed to process order.",
        );
        showToast("error", "Scan Failed", data.message);
      } else {
        setSuccessData(groupId);
        showToast("success", "Order Scanned!", data.message);
      }
    } catch (error: any) {
      setScanError(`Network Error: ${error.message}`);
      showToast("error", "Connection Error", "Could not reach Node.js server.");
    } finally {
      setLoading(false);

      setTimeout(() => {
        isProcessingRef.current = false;
        setSuccessData(null);
        setScanError(null);
      }, 4000); // Shows the success/error overlay for 4 seconds
    }
  };

  const refreshCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setTimeout(() => {
          scannerRef.current?.start(
            { facingMode: "environment" },
            { fps: 30, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
            (decodedText) => processScan(decodedText),
            () => {},
          );
        }, 300);
      });
    }
  };

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
              Hold the student's QR code up to your laptop camera.
            </p>
          </div>
        </div>

        <div
          className="orders-content"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                Scan Student QR Code
              </h2>
              <button
                onClick={refreshCamera}
                title="Refresh Camera"
                style={{
                  padding: "8px",
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={18} color="#4b5563" />
              </button>
            </div>

            {/* ✅ SQUARE CAMERA CONTAINER */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1", // Forces a perfect square
                background: "#000",
                borderRadius: "16px",
                overflow: "hidden",
                border: "4px solid #e5e7eb",
              }}
            >
              <div id="reader" style={{ width: "100%", height: "100%" }}></div>

              {/* ✅ PROFESSIONAL SCANNER OVERLAY */}
              {!successData && !scanError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 5,
                  }}
                >
                  {/* Dimmed background outside the box */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      boxShadow: "0 0 0 4000px rgba(0, 0, 0, 0.5)", // Darkens everything outside
                      width: "280px",
                      height: "280px",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  />

                  {/* Green Square Corners */}
                  <div
                    style={{
                      position: "relative",
                      width: "280px",
                      height: "280px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "40px",
                        height: "40px",
                        borderTop: "4px solid #10b981",
                        borderLeft: "4px solid #10b981",
                        borderRadius: "8px 0 0 0",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "40px",
                        height: "40px",
                        borderTop: "4px solid #10b981",
                        borderRight: "4px solid #10b981",
                        borderRadius: "0 8px 0 0",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "40px",
                        height: "40px",
                        borderBottom: "4px solid #10b981",
                        borderLeft: "4px solid #10b981",
                        borderRadius: "0 0 0 8px",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "40px",
                        height: "40px",
                        borderBottom: "4px solid #10b981",
                        borderRight: "4px solid #10b981",
                        borderRadius: "0 0 8px 0",
                      }}
                    />

                    {/* Moving Laser Line */}
                    <div
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "2px",
                        background: "#10b981",
                        boxShadow: "0 0 10px #10b981",
                        animation: "scanline 2s infinite linear",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Overlays for Success / Error / Loading */}
              {successData && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(16, 185, 129, 0.95)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <CheckCircle size={80} style={{ marginBottom: "20px" }} />
                  <h3 style={{ fontSize: "28px", fontWeight: "bold" }}>
                    Order Scanned!
                  </h3>
                  <p style={{ fontSize: "18px" }}>
                    Group #GRP-{successData} is now Processing.
                  </p>
                </div>
              )}

              {scanError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(239, 68, 68, 0.95)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                    padding: "20px",
                  }}
                >
                  <XCircle size={80} style={{ marginBottom: "20px" }} />
                  <h3 style={{ fontSize: "28px", fontWeight: "bold" }}>
                    Scan Failed
                  </h3>
                  <p
                    style={{
                      fontSize: "16px",
                      textAlign: "center",
                      wordBreak: "break-word",
                    }}
                  >
                    {scanError}
                  </p>
                </div>
              )}

              {loading && !successData && !scanError && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.7)",
                    color: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <RefreshCw
                    size={60}
                    style={{
                      marginBottom: "16px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <h3 style={{ fontSize: "22px" }}>Processing...</h3>
                </div>
              )}
            </div>

            <p
              style={{ color: "#6b7280", fontSize: "14px", marginTop: "20px" }}
            >
              Align the QR code inside the green corners.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scanline {
          0% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
        
        /* ✅ Force the video to fill the square container without stretching */
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        
        /* Hide default html5-qrcode UI */
        #reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default Scanner;
