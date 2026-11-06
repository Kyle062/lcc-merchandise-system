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
  Trash2,
} from "lucide-react";
import "./TrackOrders.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import ConfirmDialog from "../../components/Toast/ConfirmDialog";

const TrackOrders = () => {
  const navigate = useNavigate();
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    groupId: number | null;
  }>({
    isOpen: false,
    groupId: null,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");
  const studentName = localStorage.getItem("username") || "Student";

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        "http://192.168.254.111:5000/api/orders/my-orders",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        const grouped = data.reduce((acc: any, item: any) => {
          const gid = item.group_id;
          if (!acc[gid]) {
            acc[gid] = {
              group_id: gid,
              status: item.status,
              order_date: item.order_date,
              total_price: 0,
              items: [],
            };
          }
          acc[gid].total_price += Number(item.total_price);
          acc[gid].items.push({
            name: item.product_name,
            size: item.product_size,
            qty: item.quantity,
          });
          return acc;
        }, {});
        setGroupedOrders(Object.values(grouped));
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
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

  const confirmDeleteOrder = async () => {
    if (!confirmDelete.groupId) return;
    try {
      const res = await fetch(
        `http://192.168.254.111:5000/api/orders/my-orders/${confirmDelete.groupId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        showToast(
          "success",
          "Order Cancelled",
          "Your pending order has been removed.",
        );
        fetchOrders();
      } else {
        showToast("error", "Delete Failed", data.message);
      }
    } catch {
      showToast("error", "Connection Error", "Could not reach server.");
    }
    setConfirmDelete({ isOpen: false, groupId: null });
  };

  const filteredOrders = groupedOrders.filter(
    (o) => filter === "All" || o.status === filter,
  );
  const FILTERS = [
    "All",
    "Pending",
    "Processing",
    "Ready for Pickup",
    "Completed",
  ];

  return (
    <div className="track-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Cancel this Order?"
        message="Are you sure you want to cancel this pending order? This action cannot be undone."
        confirmLabel="Cancel Order"
        variant="danger"
        onConfirm={confirmDeleteOrder}
        onCancel={() => setConfirmDelete({ isOpen: false, groupId: null })}
      />

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

      <div className="track-main-content">
        <div className="track-header">
          <h1 className="track-header-title">Track Orders</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <Bell size={20} color="#6b7280" />
            <div className="track-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={20} color="#dc2626" />
            </button>
          </div>
        </div>

        <div className="track-content">
          <div className="track-filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`track-filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading your orders...</p>
          ) : filteredOrders.length === 0 ? (
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
              No orders found.
            </div>
          ) : (
            <div className="order-list">
              {filteredOrders.map((group) => {
                const currentStep = getStep(group.status);
                return (
                  <div key={group.group_id} className="order-card">
                    <div className="order-info">
                      <div className="order-id">
                        #GRP-{String(group.group_id).padStart(3, "0")}
                      </div>
                      <div className="order-date">
                        {formatDate(group.order_date)}
                      </div>
                      <div className="order-items-list">
                        {group.items.map((item: any, idx: number) => (
                          <div key={idx} className="order-product">
                            {item.qty}x {item.name} <span>({item.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="order-timeline">
                      <div
                        className={`timeline-step ${currentStep >= 1 ? "active" : ""}`}
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
                        className={`timeline-step ${currentStep >= 2 ? "active" : ""}`}
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
                        className={`timeline-step ${currentStep >= 3 ? "active" : ""}`}
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
                        className={`timeline-step ${currentStep >= 4 ? "active" : ""}`}
                      >
                        <div className="timeline-dot">
                          <Check size={12} />
                        </div>
                        <span className="timeline-label">Done</span>
                      </div>
                    </div>

                    <div className="order-action">
                      <div className="order-total">
                        ₱{group.total_price.toLocaleString()}
                      </div>
                      {group.status === "Pending" ? (
                        <div className="order-buttons">
                          <button
                            className="qr-btn"
                            onClick={() => setSelectedQR(group.group_id)}
                          >
                            <QrCode size={16} /> View QR
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() =>
                              setConfirmDelete({
                                isOpen: true,
                                groupId: group.group_id,
                              })
                            }
                          >
                            <Trash2 size={14} /> Cancel
                          </button>
                        </div>
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
              Present this to the staff.
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
                Group #GRP-{String(selectedQR).padStart(3, "0")}
              </p>
              <img
                src={`http://192.168.254.111:8000/generate-qr?order_id=${selectedQR}`}
                alt={`QR for Group ${selectedQR}`}
                style={{ width: "180px", height: "180px" }}
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
