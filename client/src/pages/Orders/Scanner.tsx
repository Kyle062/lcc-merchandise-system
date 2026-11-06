import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  QrCode,
  XCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import "../Orders/Orders.css";
import "./Scanner.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const Scanner = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<any>(null);
  const [editedItems, setEditedItems] = useState<any[]>([]);

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
    let isMounted = true;
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        scannerRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: "environment" },
          { fps: 30, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
          (decodedText) => processScan(decodedText),
          () => {},
        );
      } catch (err) {
        if (isMounted)
          showToast("error", "Camera Error", "Could not access the webcam.");
      }
    };
    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(console.error);
      }
    };
  }, []);

  const processScan = async (decodedText: string) => {
    const groupIdMatch = decodedText.match(/LCC-ORDER-(\d+)/);
    if (!groupIdMatch) return;

    const groupId = groupIdMatch[1];
    if (isProcessingRef.current || previewData) return;
    isProcessingRef.current = true;

    setLoading(true);
    setScanError(null);

    try {
      const res = await fetch(
        "http://192.168.254.111:5000/api/orders/scan-preview",
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
        setScanError(data.message || "Failed to process order.");
        showToast("error", "Scan Failed", data.message);
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanError(null);
        }, 3000);
      } else {
        setPreviewData(data.group);
        setEditedItems(data.items);
        showToast(
          "success",
          "QR Scanned",
          `Loaded receipt for ${data.user?.full_name || "Student"}`,
        );
      }
    } catch (error: any) {
      setScanError("Network Error");
      showToast("error", "Connection Error", "Could not reach server.");
      setTimeout(() => {
        isProcessingRef.current = false;
        setScanError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQty = (id: number, newQty: number) => {
    if (newQty < 1) return;
    setEditedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const pricePerItem =
            Number(item.price) ||
            Number(item.total_price) / Number(item.quantity);
          return {
            ...item,
            quantity: newQty,
            total_price: pricePerItem * newQty,
          };
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (id: number) => {
    setEditedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmPayment = async () => {
    if (editedItems.length === 0)
      return showToast("error", "Empty Receipt", "Add at least one item.");

    try {
      const res = await fetch(
        "http://192.168.254.111:5000/api/orders/confirm-scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            group_id: previewData.id,
            items: editedItems,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast("success", "Payment Confirmed", "Order is now Processing.");
      setPreviewData(null);
      isProcessingRef.current = false;
    } catch (error: any) {
      showToast("error", "Confirmation Failed", error.message);
    }
  };

  const closeModal = () => {
    setPreviewData(null);
    isProcessingRef.current = false;
  };

  const calculateTotal = () => {
    return editedItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  };

  return (
    <div className="orders-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

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
            onClick={() => navigate("/analytics")}
          >
            <BarChart3 size={20} /> <span>Analytics</span>
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
            </div>

            <div className="camera-container">
              <div id="reader"></div>
              {!previewData && !scanError && !loading && (
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

              {scanError && (
                <div className="overlay-error">
                  <XCircle size={80} />
                  <h3>Scan Failed</h3>
                  <p>{scanError}</p>
                </div>
              )}
              {loading && !scanError && (
                <div className="overlay-loading">
                  <RefreshCw
                    size={60}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <h3>Fetching Order...</h3>
                </div>
              )}
            </div>
            <p className="scanner-help-text">
              Align the QR code inside the green corners.
            </p>
          </div>
        </div>
      </div>

      {previewData && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>

            <div className="receipt">
              <div className="receipt-header">
                <img src={logo} alt="LCC Logo" className="receipt-logo" />
                <div>
                  <h2>ORDER RECEIPT PREVIEW</h2>
                  <p>{previewData.group_code}</p>
                </div>
              </div>

              <div className="receipt-info">
                <div className="receipt-info-row">
                  <span>Student ID:</span>
                  <strong>{previewData.user_id}</strong>
                </div>
                <div className="receipt-info-row">
                  <span>Status:</span>
                  <strong>{previewData.status}</strong>
                </div>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {editedItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name} ({item.size})
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleEditQty(item.id, parseInt(e.target.value))
                          }
                          style={{
                            width: "60px",
                            padding: "5px",
                            border: "1px solid #d1d5db",
                            borderRadius: "4px",
                          }}
                        />
                      </td>
                      <td>₱{Number(item.total_price).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "red",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-total">
                <span>TOTAL</span>
                <span>₱{calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn-close" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn-print" onClick={handleConfirmPayment}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
