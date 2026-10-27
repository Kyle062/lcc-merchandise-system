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
import "./Scanner.css"; // ✅ Import specific scanner CSS
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

  // ✅ STRICT CAMERA CLEANUP
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 30,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          (decodedText) => processScan(decodedText),
          () => {},
        );
      } catch (err) {
        console.error("Failed to start scanner:", err);
        if (isMounted) {
          showToast("error", "Camera Error", "Could not access the webcam.");
        }
      }
    };

    startScanner();

    // ✅ CLEANUP FUNCTION: This runs when you navigate away
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch(console.error);
        }
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
      const res = await fetch(
        "http://192.168.254.111:5000/api/orders/scan-qr",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ group_id: groupId }),
        },
      );

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
      showToast("error", "Connection Error", "Could not reach server.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
        setSuccessData(null);
        setScanError(null);
      }, 4000);
    }
  };

  const refreshCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
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
              Hold the student's QR code up to your camera.
            </p>
          </div>
        </div>

        <div className="scanner-content-wrapper">
          <div className="scanner-card">
            <div className="scanner-card-header">
              <h2 className="scanner-title">Scan Student QR Code</h2>
              <button
                onClick={refreshCamera}
                className="refresh-btn"
                title="Refresh Camera"
              >
                <RefreshCw size={18} color="#4b5563" />
              </button>
            </div>

            {/* SQUARE CAMERA CONTAINER */}
            <div className="camera-container">
              <div id="reader"></div>

              {/* SCANNER OVERLAY */}
              {!successData && !scanError && (
                <div className="scanner-overlay">
                  <div className="dimmed-background" />
                  <div className="scan-box">
                    <div className="corner top-left" />
                    <div className="corner top-right" />
                    <div className="corner bottom-left" />
                    <div className="corner bottom-right" />
                    <div className="laser-line" />
                  </div>
                </div>
              )}

              {/* OVERLAYS */}
              {successData && (
                <div className="overlay-success">
                  <CheckCircle size={80} style={{ marginBottom: "20px" }} />
                  <h3>Order Scanned!</h3>
                  <p>Group #GRP-{successData} is now Processing.</p>
                </div>
              )}

              {scanError && (
                <div className="overlay-error">
                  <XCircle size={80} style={{ marginBottom: "20px" }} />
                  <h3>Scan Failed</h3>
                  <p>{scanError}</p>
                </div>
              )}

              {loading && !successData && !scanError && (
                <div className="overlay-loading">
                  <RefreshCw
                    size={60}
                    style={{
                      marginBottom: "16px",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <h3>Processing...</h3>
                </div>
              )}
            </div>

            <p className="scanner-help-text">
              Align the QR code inside the green corners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
