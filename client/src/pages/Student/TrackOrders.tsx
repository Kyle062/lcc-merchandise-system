import React, { useEffect, useState, useMemo } from "react";
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
  Search,
  ArrowUpDown,
  XCircle,
  X,
  RotateCcw,
} from "lucide-react";
import "./TrackOrders.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import ConfirmDialog from "../../components/Toast/ConfirmDialog";
import {
  getPendingRefunds,
  savePendingRefund,
} from "../../utils/refundRequests";

const TrackOrders = () => {
  const navigate = useNavigate();
  const [groupedOrders, setGroupedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<number | null>(null);
  const [filter, setFilter] = useState("All");
  const [refundOrder, setRefundOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [pendingRefunds, setPendingRefunds] = useState(() => getPendingRefunds());

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

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
      const res = await fetch("http://172.20.10.4:5000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
              refund_reason: item.refund_reason,
              refunded_at: item.refunded_at,
              refund_amount: item.refund_amount,
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
        setPendingRefunds(getPendingRefunds());
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

    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        fetchOrders();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [token, navigate]);

  // Keep the approval badge in sync when the admin tab accepts or rejects.
  useEffect(() => {
    const syncPending = () => setPendingRefunds(getPendingRefunds());
    window.addEventListener("storage", syncPending);
    return () => window.removeEventListener("storage", syncPending);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
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

  const getStep = (status: string) => {
    switch (status) {
      case "Pending":
        return 1;
      case "Processing":
        return 2;
      case "In Tailoring":
        return 3;
      case "Ready for Pickup":
        return 3;
      case "Completed":
        return 4;
      default:
        return 1;
    }
  };

  const stepClass = (step: number, currentStep: number, isDone: boolean) => {
    if (isDone || step < currentStep) return "complete";
    if (step === currentStep) return "current";
    return "upcoming";
  };

  const confirmDeleteOrder = async () => {
    if (!confirmDelete.groupId) return;
    try {
      const res = await fetch(
        `http://172.20.10.4:5000/api/orders/my-orders/${confirmDelete.groupId}`,
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

  const REFUNDABLE_STATUSES = ["Processing", "Ready for Pickup"];

  const handleSubmitRefund = async () => {
    if (!refundOrder) return;

    const reason = refundReason.trim();
    if (!reason) {
      showToast("error", "Reason Required", "Enter a reason for this refund.");
      return;
    }

    // Ready-for-pickup orders need admin approval before money is returned.
    if (refundOrder.status === "Ready for Pickup") {
      savePendingRefund({
        id: `${Date.now()}`,
        group_id: refundOrder.group_id,
        group_code: `#GRP-${String(refundOrder.group_id).padStart(3, "0")}`,
        user_id: Number(localStorage.getItem("user_id")) || 0,
        student_name:
          localStorage.getItem("full_name") ||
          localStorage.getItem("username") ||
          "Student",
        reason,
        amount: Number(refundOrder.total_price) || 0,
        requested_at: new Date().toISOString(),
        status: "pending",
      });
      setPendingRefunds(getPendingRefunds());
      showToast(
        "success",
        "Refund Requested",
        "Sent to the admin for approval. Your order stays active until then.",
      );
      setRefundOrder(null);
      setRefundReason("");
      return;
    }

    setRefunding(true);

    try {
      const res = await fetch("http://172.20.10.4:5000/api/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          group_id: refundOrder.group_id,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not request refund.");

      showToast(
        "success",
        "Refund Requested",
        `Order #GRP-${refundOrder.group_id} has been refunded.`,
      );
      setRefundOrder(null);
      setRefundReason("");
      fetchOrders();
    } catch (error: any) {
      showToast("error", "Refund Failed", error.message);
    } finally {
      setRefunding(false);
    }
  };

  const processedOrders = useMemo(() => {
    let result = groupedOrders.filter(
      (o) => filter === "All" || o.status === filter,
    );

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (o) =>
          o.group_id.toString().includes(term) ||
          o.items.some((i: any) => i.name.toLowerCase().includes(term)),
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.order_date).getTime();
      const dateB = new Date(b.order_date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [groupedOrders, filter, searchTerm, sortOrder]);

  const FILTERS = [
    "All",
    "Pending",
    "Processing",
    "Ready for Pickup",
    "Completed",
    "Cancelled",
    "Refunded",
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
          <div className="track-controls">
            <div className="track-filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`track-filter-btn ${filter === f ? "active" : ""} ${f === "Cancelled" ? "filter-cancelled" : ""} ${f === "Refunded" ? "filter-refunded" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="track-search-sort">
              <div className="track-search">
                <Search size={16} color="#6b7280" />
                <input
                  type="text"
                  placeholder="Search Order ID or Item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="track-sort">
                <ArrowUpDown size={16} color="#6b7280" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                >
                  <option value="newest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <p>Loading your orders...</p>
          ) : processedOrders.length === 0 ? (
            <div className="empty-orders">
              <Inbox size={48} color="#9ca3af" />
              <p>No orders found.</p>
            </div>
          ) : (
            <div className="order-list">
              {processedOrders.map((group) => {
                const isCancelled = group.status === "Cancelled";
                const isRefunded = group.status === "Refunded";
                const pendingRefund = pendingRefunds.find(
                  (request) => Number(request.group_id) === group.group_id,
                );
                const currentStep = getStep(group.status);
                const isDone = group.status === "Completed";
                return (
                  <div
                    key={group.group_id}
                    className={`order-card ${isCancelled ? "cancelled-card" : ""} ${isRefunded ? "refunded-card" : ""}`}
                  >
                    <div className="order-card-top">
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

                      {group.status === "Pending" && (
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
                      )}

                      {REFUNDABLE_STATUSES.includes(group.status) &&
                        !pendingRefund && (
                          <div className="order-buttons">
                            <button
                              className="request-refund-btn"
                              onClick={() => {
                                setRefundOrder(group);
                                setRefundReason("");
                              }}
                            >
                              <RotateCcw size={14} /> Request Refund
                            </button>
                          </div>
                        )}

                      {pendingRefund && (
                        <span className="pending-refund-badge">
                          Refund pending admin approval
                        </span>
                      )}
                    </div>

                    {isCancelled ? (
                      <div className="cancelled-banner">
                        <XCircle size={20} />
                        <span>This order has been cancelled</span>
                      </div>
                    ) : isRefunded ? (
                      <div className="refunded-banner">
                        <RotateCcw size={20} />
                        <div>
                          <strong>This order has been refunded</strong>
                          {group.refund_reason && (
                            <>
                              <p>Reason: {group.refund_reason}</p>
                              <span>
                                ₱
                                {Number(
                                  group.refund_amount || group.total_price,
                                ).toLocaleString()}{" "}
                                refunded on {formatDate(group.refunded_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="order-timeline">
                        <div
                          className={`timeline-step ${stepClass(1, currentStep, isDone)}`}
                        >
                          <div className="timeline-dot">
                            {stepClass(1, currentStep, isDone) ===
                            "complete" ? (
                              <Check size={14} />
                            ) : (
                              <Inbox size={12} />
                            )}
                          </div>
                          <span className="timeline-label">Pending</span>
                        </div>
                        <div
                          className={`timeline-line ${stepClass(1, currentStep, isDone) === "complete" ? "complete" : ""}`}
                        />
                        <div
                          className={`timeline-step ${stepClass(2, currentStep, isDone)}`}
                        >
                          <div className="timeline-dot">
                            {stepClass(2, currentStep, isDone) ===
                            "complete" ? (
                              <Check size={14} />
                            ) : (
                              <Package size={12} />
                            )}
                          </div>
                          <span className="timeline-label">Processing</span>
                        </div>
                        <div
                          className={`timeline-line ${stepClass(2, currentStep, isDone) === "complete" ? "complete" : ""}`}
                        />
                        <div
                          className={`timeline-step ${stepClass(3, currentStep, isDone)}`}
                        >
                          <div className="timeline-dot">
                            {stepClass(3, currentStep, isDone) ===
                            "complete" ? (
                              <Check size={14} />
                            ) : (
                              <Truck size={12} />
                            )}
                          </div>
                          <span className="timeline-label">Ready</span>
                        </div>
                        <div
                          className={`timeline-line ${stepClass(3, currentStep, isDone) === "complete" ? "complete" : ""}`}
                        />
                        <div
                          className={`timeline-step ${stepClass(4, currentStep, isDone)}`}
                        >
                          <div className="timeline-dot">
                            <Check size={14} />
                          </div>
                          <span className="timeline-label">
                            Ready to Pick-up
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="order-action">
                      <div className="order-total">
                        ₱{group.total_price.toLocaleString()}
                      </div>
                      {isCancelled ? (
                        <span className="cancelled-text">Cancelled</span>
                      ) : isRefunded ? (
                        <span className="status-badge badge-refunded">
                          REFUNDED
                        </span>
                      ) : group.status === "Completed" ? (
                        <span className="status-badge badge-completed">
                          Completed
                        </span>
                      ) : (
                        <span className="processed-text">
                          {group.status === "Pending"
                            ? "Awaiting payment"
                            : `Status: ${group.status}`}
                        </span>
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
                src={`http://172.20.10.4:8000/generate-qr?order_id=${selectedQR}`}
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

      {refundOrder && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!refunding) setRefundOrder(null);
          }}
        >
          <div
            className="cart-modal refund-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setRefundOrder(null)}
              disabled={refunding}
            >
              <X size={20} />
            </button>
            <h2 className="cart-modal-title">Request Refund</h2>
            <p className="refund-modal-description">
              {refundOrder.status === "Ready for Pickup"
                ? `Your request for order #GRP-${String(refundOrder.group_id).padStart(3, "0")} will be sent to the admin for approval. The order continues until approved.`
                : `This will restore stock and permanently mark order #GRP-${String(refundOrder.group_id).padStart(3, "0")} as Refunded.`}
            </p>

            <div className="refund-summary">
              <span>
                Order <strong>#GRP-{String(refundOrder.group_id).padStart(3, "0")}</strong>
              </span>
              <span>
                Amount <strong>₱{Number(refundOrder.total_price).toLocaleString()}</strong>
              </span>
            </div>

            <label htmlFor="refund-reason">Reason for refund</label>
            <textarea
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Item is damaged / changed my mind"
              disabled={refunding}
              autoFocus
            />

            <div className="refund-actions">
              <button
                className="btn-refund-confirm"
                onClick={handleSubmitRefund}
                disabled={!refundReason.trim() || refunding}
              >
                <RotateCcw size={16} />
                {refunding
                  ? "Processing..."
                  : refundOrder.status === "Ready for Pickup"
                    ? "Send for Approval"
                    : "Confirm Refund"}
              </button>
              <button
                className="btn-close"
                onClick={() => setRefundOrder(null)}
                disabled={refunding}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackOrders;
