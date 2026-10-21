import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingBag,
  Bell,
  QrCode,
  Check,
  Truck,
  Inbox,
} from "lucide-react";
import "./TrackOrders.css"; // ✅ Import the new CSS
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const TrackOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<number | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");
  const studentName = localStorage.getItem("username") || "Student";

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/orders/my-orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setOrders(data);
        }
        setLoading(false);
      } catch (error) {
        console.error(error);
        showToast("error", "Error", "Could not load your orders.");
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ✅ Helper function to determine the timeline step
  const getStep = (status: string) => {
    switch (status) {
      case "Pending":
        return 1;
      case "Processing":
        return 2;
      case "Ready for Pickup":
        return 3;
      case "Completed":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="track-container">
      <div className="toast-container">
        {toasts.map((t) => (
         <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* SIDEBAR */}
      <div className="track-sidebar">
        <div className="track-sidebar-header">
          <img src={logo} alt="LCC Logo" className="track-sidebar-logo" />
          <div>
            <div className="track-sidebar-title">LCC Student</div>
            <div className="track-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="track-sidebar-nav">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              isActive ? "track-nav-item active" : "track-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              isActive ? "track-nav-item active" : "track-nav-item"
            }
          >
            <ShoppingBag size={20} /> <span>Shop Merchandise</span>
          </NavLink>
          <NavLink
            to="/track-orders"
            className={({ isActive }) =>
              isActive ? "track-nav-item active" : "track-nav-item"
            }
          >
            <Package size={20} /> <span>Track Orders</span>
          </NavLink>
        </nav>
        <div className="track-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="track-main-content">
        <div className="track-header">
          <h1 className="track-header-title">Track My Orders</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Bell size={20} color="#6b7280" />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#00874e",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="track-content">
          {loading ? (
            <p>Loading your orders...</p>
          ) : orders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 50,
                color: "#6b7280",
                background: "white",
                borderRadius: 12,
              }}
            >
              <Inbox
                size={48}
                color="#9ca3af"
                style={{ margin: "0 auto 10px" }}
              />
              You haven't placed any orders yet.
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => {
                const currentStep = getStep(order.status);

                return (
                  <div key={order.id} className="order-card">
                    {/* Left: Order Info */}
                    <div className="order-info">
                      <div className="order-id">
                        #ORD-{String(order.id).padStart(3, "0")}
                      </div>
                      <div className="order-date">
                        {formatDate(order.order_date)}
                      </div>
                      <div className="order-product">{order.product_name}</div>
                      <div className="order-details">
                        Size: {order.product_size || "N/A"} • Qty:{" "}
                        {order.quantity}
                      </div>
                    </div>

                    {/* Center: Timeline */}
                    <div className="order-timeline">
                      <div
                        className={`timeline-step ${currentStep >= 1 ? "active" : ""} ${currentStep === 1 ? "current" : ""}`}
                      >
                        <div className="timeline-dot">
                          <Inbox size={12} />
                        </div>
                        <span className="timeline-label">Pending</span>
                      </div>
                      <div
                        className={`timeline-line ${currentStep >= 2 ? "active" : ""}`}
                      />

                      <div
                        className={`timeline-step ${currentStep >= 2 ? "active" : ""} ${currentStep === 2 ? "current" : ""}`}
                      >
                        <div className="timeline-dot">
                          <Package size={12} />
                        </div>
                        <span className="timeline-label">Processing</span>
                      </div>
                      <div
                        className={`timeline-line ${currentStep >= 3 ? "active" : ""}`}
                      />

                      <div
                        className={`timeline-step ${currentStep >= 3 ? "active" : ""} ${currentStep === 3 ? "current" : ""}`}
                      >
                        <div className="timeline-dot">
                          <Truck size={12} />
                        </div>
                        <span className="timeline-label">Ready</span>
                      </div>
                      <div
                        className={`timeline-line ${currentStep >= 4 ? "active" : ""}`}
                      />

                      <div
                        className={`timeline-step ${currentStep >= 4 ? "active" : ""} ${currentStep === 4 ? "current" : ""}`}
                      >
                        <div className="timeline-dot">
                          <Check size={12} />
                        </div>
                        <span className="timeline-label">Completed</span>
                      </div>
                    </div>

                    {/* Right: Action & Price */}
                    <div className="order-action">
                      <div className="order-total">
                        ₱{Number(order.total_price).toLocaleString()}
                      </div>

                      {order.status === "Pending" ? (
                        <button
                          className="qr-btn"
                          onClick={() => setSelectedQR(order.id)}
                        >
                          <QrCode size={16} /> View QR
                        </button>
                      ) : (
                        <span className="processed-text">Scanned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✅ QR CODE MODAL */}
      {selectedQR !== null && (
        <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
          <div
            className="cart-modal"
            style={{ textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="cart-modal-header"
              style={{ justifyContent: "center" }}
            >
              <h2 className="cart-modal-title">Your QR Code</h2>
            </div>
            <p
              style={{
                color: "#6b7280",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              Present this to the merchandise staff.
            </p>

            <div
              style={{
                border: "1px solid #e5e7eb",
                padding: "10px",
                borderRadius: "8px",
                display: "inline-block",
              }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  color: "#00874e",
                }}
              >
                Order #ORD-{String(selectedQR).padStart(3, "0")}
              </p>
              <img
                src={`http://localhost:8000/generate-qr?order_id=${selectedQR}`}
                alt={`QR for Order ${selectedQR}`}
                style={{ width: "200px", height: "200px" }}
              />
            </div>

            <button
              className="checkout-submit-btn"
              style={{ marginTop: "20px" }}
              onClick={() => setSelectedQR(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackOrders;
