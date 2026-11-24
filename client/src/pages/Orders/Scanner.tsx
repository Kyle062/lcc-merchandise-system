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
  RefreshCw,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import "../Orders/Orders.css";
import "./Scanner.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import {
  blockOrderGroup,
  isGroupBlocked,
} from "../../utils/blockedOrders";

const Scanner = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tamperDiffs, setTamperDiffs] = useState<any[]>([]);
  const [signedSnapshot, setSignedSnapshot] = useState<any>(null);
  const [successData, setSuccessData] = useState<any>(null);

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

  const getQrBoxSize = () => {
    const width = typeof window === "undefined" ? 280 : window.innerWidth;
    if (width <= 600) return Math.min(220, Math.round(width * 0.68));
    if (width <= 768) return Math.min(260, Math.round(width * 0.7));
    return 280;
  };

  useEffect(() => {
    let isMounted = true;
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode("reader");
        const qrBoxSize = getQrBoxSize();
        scannerRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 30,
            qrbox: { width: qrBoxSize, height: qrBoxSize },
            aspectRatio: 1.0,
          },
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

    if (isGroupBlocked(Number(groupId))) {
      setScanError(
        "This receipt was previously flagged as tampered. It is blocked and will not be recorded in Order Management.",
      );
      showToast(
        "error",
        "Blocked Receipt",
        "Tampered receipts cannot be processed.",
      );
      return;
    }

    if (isProcessingRef.current || previewData) return;
    isProcessingRef.current = true;

    setLoading(true);
    setScanError(null);
    setTamperDiffs([]);
    setSignedSnapshot(null);

    try {
      // STEP 1: Verify Signature
      const verifyRes = await fetch(
        "http://172.20.10.4:5000/api/orders/verify-receipt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ group_id: groupId }),
        },
      );

      const verifyData = await verifyRes.json();

      if (!verifyData.isValid) {
        setScanError(
          `${verifyData.message || "TAMPERED RECEIPT DETECTED! This receipt is forged."} This order is blocked and will not be recorded in Order Management.`,
        );
        setTamperDiffs(verifyData.diffs || []);
        blockOrderGroup(Number(groupId));
        setSignedSnapshot(verifyData.signed_snapshot || null);
        showToast("error", "SECURITY ALERT", "Digital signature mismatch.");
        setTimeout(() => {
          isProcessingRef.current = false;
          setScanError(null);
          setTamperDiffs([]);
          setSignedSnapshot(null);
        }, 10000);
        setLoading(false);
        return;
      }

      // STEP 2: Load Preview
      const res = await fetch(
        "http://172.20.10.4:5000/api/orders/scan-preview",
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
          "Receipt Verified!",
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

    const groupId = Number(previewData?.id);
    if (!Number.isInteger(groupId))
      return showToast("error", "Invalid Receipt", "Order group is missing.");

    if (isGroupBlocked(groupId)) {
      closeModal();
      return showToast(
        "error",
        "Receipt Blocked",
        "Tampered orders cannot be recorded in Order Management.",
      );
    }

    const items = editedItems.map((item) => ({
      id: Number(item.id),
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      total_price: Number(item.total_price),
    }));

    const hasInvalidItem = items.some(
      (item) =>
        !Number.isInteger(item.id) ||
        item.id < 1 ||
        !Number.isInteger(item.product_id) ||
        item.product_id < 1 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.total_price),
    );
    if (hasInvalidItem)
      return showToast(
        "error",
        "Invalid Receipt",
        "One or more items have invalid details.",
      );

    setLoading(true);

    try {
      const res = await fetch(
        "http://172.20.10.4:5000/api/orders/confirm-scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ group_id: groupId, items }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // ✅ Show Green Success Screen
      setSuccessData({
        groupId,
        student: previewData.user_id,
        total: items.reduce((sum, item) => sum + item.total_price, 0),
      });

      showToast(
        "success",
        "Payment Confirmed",
        "Order is now Processing. Stock deducted.",
      );

      setPreviewData(null);

      setTimeout(() => {
        setSuccessData(null);
        isProcessingRef.current = false;
      }, 4000);
    } catch (error: any) {
      showToast("error", "Confirmation Failed", error.message);
      isProcessingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setPreviewData(null);
    isProcessingRef.current = false;
  };

  const calculateTotal = () => {
    return editedItems.reduce((sum, item) => sum + Number(item.total_price), 0);
  };

  const renderDiffRow = (d: any, i: number) => {
    let displayField = d.field;

    if (d.field.startsWith("items.")) {
      const parts = d.field.split(".");
      const itemIndex = parseInt(parts[1]);
      const property = parts[2];

      let productName = `Item #${itemIndex + 1}`;
      if (
        signedSnapshot &&
        signedSnapshot.items &&
        signedSnapshot.items[itemIndex]
      ) {
        productName = signedSnapshot.items[itemIndex].name;
        if (signedSnapshot.items[itemIndex].size) {
          productName += ` (${signedSnapshot.items[itemIndex].size})`;
        }
      }

      const propLabel =
        property === "quantity"
          ? "Quantity"
          : property === "subtotal"
            ? "Subtotal"
            : property === "unit_price"
              ? "Unit Price"
              : property === "name"
                ? "Product Name"
                : property;

      displayField = `${productName} - ${propLabel}`;
    } else if (d.field === "total") {
      displayField = "Total Amount";
    } else if (d.field === "user_id") {
      displayField = "Student ID";
    } else if (d.field === "full_name") {
      displayField = "Student Name";
    } else if (d.field === "username") {
      displayField = "Student Username";
    }

    return (
      <tr key={i}>
        <td>
          <strong>{displayField}</strong>
        </td>
        <td className="diff-old">{d.signed}</td>
        <td className="diff-new">{d.current}</td>
      </tr>
    );
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

              {!previewData && !scanError && !loading && !successData && (
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
                <div
                  className="overlay-error"
                  style={{
                    background: "rgba(220, 38, 38, 0.98)",
                    padding: "20px",
                    overflowY: "auto",
                  }}
                >
                  <AlertTriangle size={60} style={{ marginBottom: "10px" }} />
                  <h3 style={{ margin: "0 0 10px 0" }}>SECURITY ALERT</h3>
                  <p
                    style={{
                      fontWeight: "bold",
                      marginBottom: "15px",
                      fontSize: "14px",
                    }}
                  >
                    {scanError}
                  </p>

                  {tamperDiffs.length > 0 && (
                    <div style={{ width: "100%", maxWidth: "400px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "8px",
                          textAlign: "left",
                          color: "white",
                        }}
                      >
                        DETECTED CHANGES:
                      </div>
                      <div
                        className="diff-table-wrapper"
                        style={{ background: "white", textAlign: "left" }}
                      >
                        <table className="diff-table">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Signed Value</th>
                              <th>Current Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tamperDiffs.map((d, i) => renderDiffRow(d, i))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {loading && !scanError && !successData && (
                <div className="overlay-loading">
                  <RefreshCw
                    size={60}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <h3>Processing...</h3>
                </div>
              )}

              {successData && (
                <div
                  className="overlay-success"
                  style={{
                    background: "rgba(16, 185, 129, 0.98)",
                    padding: "30px",
                    textAlign: "center",
                  }}
                >
                  <CheckCircle size={80} style={{ marginBottom: "15px" }} />
                  <h3 style={{ margin: "0 0 10px 0" }}>PAYMENT CONFIRMED!</h3>
                  <p style={{ fontSize: "16px", fontWeight: "bold" }}>
                    Order #GRP-{String(successData.groupId).padStart(3, "0")}
                  </p>
                  <p style={{ fontSize: "14px" }}>
                    Total: ₱{successData.total.toLocaleString()}
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      marginTop: "10px",
                      opacity: 0.9,
                    }}
                  >
                    Order is now Processing. Stock deducted.
                  </p>
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
                <div className="receipt-header-text">
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
                <div className="receipt-info-row">
                  <span>Signature:</span>
                  <strong
                    style={{
                      color: "#059669",
                      fontSize: "11px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <ShieldCheck size={14} /> VERIFIED
                  </strong>
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
              <button
                className="btn-print"
                onClick={handleConfirmPayment}
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
