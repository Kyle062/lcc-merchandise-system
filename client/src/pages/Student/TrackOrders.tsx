import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingBag,
  Bell,
  QrCode,
  X,
} from "lucide-react";
import "./Shop.css"; // Reusing the Shop CSS for consistency
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

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "status-badge badge-completed";
      case "Pending":
        return "status-badge badge-pending";
      case "Processing":
        return "status-badge badge-processing";
      case "Ready for Pickup":
        return "status-badge badge-ready";
      default:
        return "status-badge";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="shop-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* SIDEBAR */}
      <div className="shop-sidebar">
        <div className="shop-sidebar-header">
          <img src={logo} alt="LCC Logo" className="shop-sidebar-logo" />
          <div>
            <div className="shop-sidebar-title">LCC Student</div>
            <div className="shop-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="shop-sidebar-nav">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <ShoppingBag size={20} /> <span>Shop Merchandise</span>
          </NavLink>
          <NavLink
            to="/track-orders"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <Package size={20} /> <span>Track Orders</span>
          </NavLink>
        </nav>
        <div className="shop-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="shop-main-content">
        <div className="shop-header">
          <h1 className="shop-header-title">Track My Orders</h1>
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

        <div className="shop-content">
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
              You haven't placed any orders yet.
            </div>
          ) : (
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                overflowX: "auto",
              }}
            >
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>Size</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(3, "0")}</td>
                      <td style={{ fontWeight: 600 }}>{order.product_name}</td>
                      <td>{order.product_size || "—"}</td>
                      <td>₱{Number(order.total_price).toLocaleString()}</td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>
                        <span className={getBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        {/* ✅ ONLY show View QR if the order is Pending */}
                        {order.status === "Pending" ? (
                          <button
                            onClick={() => setSelectedQR(order.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              background: "#ecfdf5",
                              color: "#00874e",
                              border: "1px solid #a7f3d0",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            <QrCode size={14} /> View QR
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#9ca3af",
                              fontStyle: "italic",
                            }}
                          >
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ QR CODE MODAL (Reusable) */}
      {selectedQR !== null && (
        <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
          <div
            className="cart-modal"
            style={{ maxWidth: "400px", textAlign: "center" }}
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
