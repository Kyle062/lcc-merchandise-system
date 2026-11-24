import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Search,
  Eye,
  Printer,
  X,
  ChevronsUpDown,
  RefreshCw,
  Filter,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Clock,
  Check,
  Ban,
  Inbox,
  ReceiptText,
} from "lucide-react";
import "./Orders.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import RefundReceipt, {
  type RefundReceiptData,
} from "../../components/RefundReceipt/RefundReceipt";
import { getBlockedGroupIds } from "../../utils/blockedOrders";

interface OrderGroup {
  group_id: number;
  user_id: number;
  full_name: string;
  username: string;
  course: string;
  status: string;
  order_date: string;
  total_price: number;
  items: any[];
}

interface DiffItem {
  field: string;
  signed: any;
  current: any;
}

interface VerificationState {
  loading: boolean;
  isValid: boolean | null;
  message: string;
  diffs: DiffItem[];
  legacy?: boolean;
}

type SortKey =
  | "group_id"
  | "full_name"
  | "total_price"
  | "status"
  | "order_date";
type SortRule = { key: SortKey; order: "asc" | "desc" };

const STATUS_TABS = [
  "All",
  "Pending",
  "Processing",
  "Ready for Pickup",
  "Completed",
  "Cancelled",
  "Refunded",
];

const REFUNDABLE_STATUSES = ["Processing", "Ready for Pickup"];

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderGroup | null>(null);
  const [refundOrder, setRefundOrder] = useState<OrderGroup | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundInfo, setRefundInfo] = useState<any>(null);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [receiptRefund, setReceiptRefund] =
    useState<RefundReceiptData | null>(null);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: "order_date", order: "desc" },
  ]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ✅ NEW: verification state for tamper detection
  const [verification, setVerification] = useState<VerificationState>({
    loading: false,
    isValid: null,
    message: "",
    diffs: [],
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");

  const fetchRefunds = async () => {
    try {
      const res = await fetch("http://172.20.10.4:5000/api/refunds", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setRefunds(data);
    } catch (error) {
      console.error(error);
    }
  };

  const pendingRefunds = refunds.filter((refund) => refund.status === "pending");

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://172.20.10.4:5000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        const grouped = data.reduce((acc: any, item: any) => {
          const gid = item.group_id;
          if (!acc[gid]) {
            acc[gid] = {
              group_id: gid,
              user_id: item.user_id,
              full_name: item.full_name,
              username: item.username,
              course: item.user_course || item.product_course,
              status: item.status,
              order_date: item.order_date,
              total_price: 0,
              items: [],
            };
          }
          acc[gid].total_price += Number(item.total_price);
          acc[gid].items.push(item);
          return acc;
        }, {});
        // Tampered receipts flagged by the scanner are never listed here.
        const blocked = getBlockedGroupIds();
        const visibleGroups = Object.values(grouped).filter(
          (group: any) => !blocked.includes(Number(group.group_id)),
        );
        setOrders(visibleGroups);
        fetchRefunds();
        setLastUpdated(new Date());
      }
      setLoading(false);
    } catch (error) {
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

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [autoRefresh, token]);

  // Scanner tamper blocks live in browser storage; react to cross-tab changes.
  useEffect(() => {
    const sync = () => fetchOrders();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [token]);

  // ✅ NEW: verify signature every time a receipt is opened
  useEffect(() => {
    if (!selectedOrder) {
      setVerification({
        loading: false,
        isValid: null,
        message: "",
        diffs: [],
      });
      return;
    }

    const verify = async () => {
      setVerification((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch(
          "http://172.20.10.4:5000/api/orders/verify-receipt",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ group_id: selectedOrder.group_id }),
          },
        );
        const data = await res.json();
        setVerification({
          loading: false,
          isValid: data.isValid ?? false,
          message: data.message || "",
          diffs: data.diffs || [],
          legacy: data.legacy,
        });
      } catch (err) {
        setVerification({
          loading: false,
          isValid: false,
          message: "Could not reach verification server.",
          diffs: [],
        });
      }
    };
    verify();
  }, [selectedOrder, token]);

  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== "Refunded") {
      setRefundInfo(null);
      return;
    }

    setRefundInfo(
      refunds.find(
        (refund) =>
          refund.group_id === selectedOrder.group_id &&
          refund.status === "approved",
      ) || null,
    );
  }, [selectedOrder, refunds]);

  const handleSort = (key: SortKey) => {
    setSortRules((prev) => {
      const existing = prev.findIndex((r) => r.key === key);
      if (existing === 0 && prev.length === 1)
        return [{ key, order: prev[0].order === "asc" ? "desc" : "asc" }];
      return [{ key, order: "asc" }];
    });
  };

  const sortedAndFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = orders.filter((o) => {
      const matchesSearch =
        String(o.group_id).includes(term) ||
        o.full_name?.toLowerCase().includes(term) ||
        o.items.some((i: any) => i.product_name.toLowerCase().includes(term));
      return (
        matchesSearch && (statusFilter === "All" || o.status === statusFilter)
      );
    });

    return [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        let aVal: any = a[rule.key];
        let bVal: any = b[rule.key];
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return rule.order === "asc" ? -1 : 1;
        if (aVal > bVal) return rule.order === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [orders, searchTerm, statusFilter, sortRules]);

  const statusCounts = useMemo(() => {
    const counts: any = {
      All: orders.length,
      Pending: 0,
      Processing: 0,
      "Ready for Pickup": 0,
      Completed: 0,
      Cancelled: 0,
      Refunded: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }, [orders]);

  const handleStatusChange = async (
    groupId: number,
    newStatus: string,
    currentStatus: string,
  ) => {
    if (currentStatus === "Refunded") {
      showToast(
        "error",
        "Action Denied",
        "Refunded orders cannot be modified.",
      );
      return;
    }

    if (newStatus === "Pending" && currentStatus !== "Pending") {
      showToast(
        "error",
        "Action Denied",
        "Cannot revert an order back to Pending.",
      );
      return;
    }

    try {
      const res = await fetch(
        `http://172.20.10.4:5000/api/orders/${groupId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showToast(
        "success",
        "Status Updated",
        `Order #GRP-${groupId} is now ${newStatus}`,
      );
      fetchOrders();
    } catch (error: any) {
      showToast("error", "Update Failed", error.message);
    }
  };

  const openRefundReceipt = async (refundId: number) => {
    try {
      const res = await fetch(
        `http://172.20.10.4:5000/api/refunds/${refundId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok) setReceiptRefund(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitRefund = async () => {
    if (!refundOrder) return;

    const reason = refundReason.trim();
    if (!reason) {
      showToast("error", "Reason Required", "Enter a reason for this refund.");
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
      if (!res.ok) throw new Error(data.message || "Could not issue refund.");

      showToast(
        "success",
        "Refund Issued",
        `Order #GRP-${String(refundOrder.group_id).padStart(3, "0")} refunded. Stock has been restored.`,
      );
      setRefundOrder(null);
      setRefundReason("");
      setSelectedOrder(null);
      await openRefundReceipt(data.refundId);
      fetchOrders();
    } catch (error: any) {
      showToast("error", "Refund Failed", error.message);
    } finally {
      setRefunding(false);
    }
  };

  const handleAcceptRefund = async (request: any) => {
    setReviewingId(Number(request.id));
    try {
      const res = await fetch(
        `http://172.20.10.4:5000/api/refunds/${request.id}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not approve refund.");

      showToast(
        "success",
        "Refund Approved",
        `Order #GRP-${String(request.group_id).padStart(3, "0")} refunded. Stock has been restored.`,
      );
      await openRefundReceipt(data.refundId);
      fetchOrders();
    } catch (error: any) {
      showToast("error", "Approval Failed", error.message);
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectRefund = async (request: any) => {
    setReviewingId(Number(request.id));
    try {
      const res = await fetch(
        `http://172.20.10.4:5000/api/refunds/${request.id}/reject`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not reject refund.");

      showToast(
        "success",
        "Refund Rejected",
        `Order #GRP-${String(request.group_id).padStart(3, "0")} continues as Ready for Pickup.`,
      );
      fetchOrders();
    } catch (error: any) {
      showToast("error", "Rejection Failed", error.message);
    } finally {
      setReviewingId(null);
    }
  };

  const getStatusClass = (status: string) => {
    return `status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ✅ Helper to display a diff value in a human-readable way
  const renderValue = (val: any) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
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
          <div className="orders-nav-item active">
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate("/scanner")}>
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
            <h1 className="orders-header-title">Order Management</h1>
            <p className="orders-last-updated">
              Last updated: {lastUpdated.toLocaleTimeString("en-PH")}
            </p>
          </div>
          <div className="orders-header-right">
            <div className="orders-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search orders..."
                className="orders-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className={`auto-refresh-toggle ${autoRefresh ? "on" : "off"}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw size={16} />
            </button>
            <div className="orders-avatar">A</div>
          </div>
        </div>

        <div className="orders-content">
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Total Orders</span>
              <strong className="admin-kpi-value">{orders.length}</strong>
              <span className="admin-kpi-foot">Groups in management</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Ready for Pickup</span>
              <strong className="admin-kpi-value">
                {orders.filter((o) => o.status === "Ready for Pickup").length}
              </strong>
              <span className="admin-kpi-foot">Awaiting collection</span>
            </div>
            <div className="admin-kpi-card admin-kpi-warning">
              <span className="admin-kpi-label">Refund Requests</span>
              <strong className="admin-kpi-value">{pendingRefunds.length}</strong>
              <span className="admin-kpi-foot">Need admin review</span>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Refunded</span>
              <strong className="admin-kpi-value">
                {orders.filter((o) => o.status === "Refunded").length}
              </strong>
              <span className="admin-kpi-foot">Stock already restored</span>
            </div>
          </div>

          {pendingRefunds.length > 0 && (
            <section
              className="refund-review-panel"
              aria-labelledby="refund-review-title"
            >
              <div className="refund-review-header">
                <div className="refund-review-heading">
                  <Clock size={18} />
                  <h2 id="refund-review-title">Refund Requests</h2>
                  <span className="refund-review-count">
                    {pendingRefunds.length}
                  </span>
                </div>
                <p>
                  Review student requests for ready-for-pickup orders. Rejecting
                  keeps the order active.
                </p>
              </div>
              <div className="refund-request-list">
                {pendingRefunds.map((request) => (
                  <div className="refund-request-card" key={request.id}>
                    <div className="refund-request-main">
                      <div className="refund-request-title">
                        <strong>
                          {request.group_code ||
                            `#GRP-${String(request.group_id).padStart(3, "0")}`}
                        </strong>
                        <span>{request.student_name}</span>
                      </div>
                      <p className="refund-request-reason">{request.reason}</p>
                      <div className="refund-request-meta">
                        <span>
                          ₱{Number(request.amount).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>
                          Requested {formatDateTime(request.refunded_at)}
                        </span>
                      </div>
                    </div>
                    <div className="refund-request-actions">
                      <button
                        className="btn-review-reject"
                        onClick={() => handleRejectRefund(request)}
                        disabled={reviewingId === request.id}
                      >
                        <Ban size={15} /> Reject
                      </button>
                      <button
                        className="btn-review-accept"
                        onClick={() => handleAcceptRefund(request)}
                        disabled={reviewingId === request.id}
                      >
                        <Check size={15} />
                        {reviewingId === request.id
                          ? "Processing..."
                          : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="status-tabs">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                className={`status-tab ${statusFilter === s ? "active" : ""} ${getStatusClass(s)}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
                <span className="status-count">{statusCounts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="orders-sort-info">
            <span>
              <Filter size={14} style={{ display: "inline", marginRight: 6 }} />
              Showing <strong>{sortedAndFiltered.length}</strong> order group(s)
            </span>
          </div>

          {loading ? (
            <div className="orders-loading">Loading orders...</div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="orders-empty">
              <ShoppingCart size={48} color="#9ca3af" />
              <h3>No orders found</h3>
            </div>
          ) : (
            <div className="orders-table-card">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort("group_id")}>
                      <div className="th-content">
                        Group ID <ChevronsUpDown size={14} />
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort("full_name")}>
                      <div className="th-content">
                        Student <ChevronsUpDown size={14} />
                      </div>
                    </th>
                    <th>Items</th>
                    <th className="sortable" onClick={() => handleSort("total_price")}>
                      <div className="th-content">
                        Total <ChevronsUpDown size={14} />
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort("status")}>
                      <div className="th-content">
                        Status <ChevronsUpDown size={14} />
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort("order_date")}>
                      <div className="th-content">
                        Date <ChevronsUpDown size={14} />
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFiltered.map((order) => (
                    <tr key={order.group_id}>
                      <td>#GRP-{String(order.group_id).padStart(3, "0")}</td>
                      <td>
                        <div className="student-cell">
                          <span className="student-name">
                            {order.full_name || order.username}
                          </span>
                          <span className="student-course">{order.course}</span>
                        </div>
                      </td>
                      <td>
                        {order.items
                          .map((i: any) => `${i.quantity}x ${i.product_name}`)
                          .join(", ")}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        ₱{order.total_price.toLocaleString()}
                      </td>
                      <td>
                        <select
                          className={`status-select ${getStatusClass(order.status)}`}
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(
                              order.group_id,
                              e.target.value,
                              order.status,
                            )
                          }
                          disabled={order.status === "Refunded"}
                          style={{
                            cursor:
                              order.status === "Refunded"
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          <option
                            value="Pending"
                            disabled={order.status !== "Pending"}
                          >
                            Pending
                          </option>
                          <option value="Processing">Processing</option>
                          <option value="Ready for Pickup">
                            Ready for Pickup
                          </option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refunded" disabled>
                            Refunded
                          </option>
                        </select>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>
                        <button
                          className="action-btn view"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedOrder(null)}
            >
              <X size={20} />
            </button>
            <div className="receipt">
              <div className="receipt-header">
                <img src={logo} alt="LCC Logo" className="receipt-logo" />
                <div>
                  <h2>LEGACY COLLEGE OF COMPOSTELA</h2>
                  <p>Merchandise Order Management System</p>
                </div>
              </div>

              {/* ✅ NEW: Tamper verification banners */}
              {verification.loading && (
                <div className="receipt-verify-loading">
                  <RefreshCw size={16} className="spin-icon" />
                  Verifying cryptographic signature...
                </div>
              )}

              {!verification.loading &&
                verification.isValid === true &&
                !verification.legacy && (
                  <div className="receipt-verified-banner">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Signature Verified</strong>
                      <p>
                        This receipt is authentic and has not been tampered
                        with.
                      </p>
                    </div>
                  </div>
                )}

              {!verification.loading && verification.isValid === false && (
                <div className="receipt-tamper-banner">
                  <ShieldAlert size={24} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 15 }}>
                      ⚠️ SECURITY ALERT — TAMPERED RECEIPT
                    </strong>
                    <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
                      {verification.message}
                    </p>

                    {verification.diffs.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            marginBottom: 6,
                            color: "#7f1d1d",
                          }}
                        >
                          DETECTED CHANGES ({verification.diffs.length}):
                        </div>
                        <div className="diff-table-wrapper">
                          <table className="diff-table">
                            <thead>
                              <tr>
                                <th>Field</th>
                                <th>Signed Value</th>
                                <th>Current Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {verification.diffs.map((d, i) => (
                                <tr key={i}>
                                  <td>
                                    <code>{d.field}</code>
                                  </td>
                                  <td className="diff-old">
                                    {renderValue(d.signed)}
                                  </td>
                                  <td className="diff-new">
                                    {renderValue(d.current)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="receipt-title">OFFICIAL RECEIPT</div>

              <div className="receipt-info">
                <div className="receipt-info-row">
                  <span>Group ID:</span>
                  <strong>
                    #GRP-{String(selectedOrder.group_id).padStart(3, "0")}
                  </strong>
                </div>
                <div className="receipt-info-row">
                  <span>Date:</span>
                  <strong>{formatDateTime(selectedOrder.order_date)}</strong>
                </div>
                <div className="receipt-info-row">
                  <span>Student:</span>
                  <strong>
                    {selectedOrder.full_name || selectedOrder.username}
                  </strong>
                </div>
                <div className="receipt-info-row">
                  <span>Course:</span>
                  <strong>{selectedOrder.course}</strong>
                </div>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td>{item.product_size}</td>
                      <td>{item.quantity}</td>
                      <td>₱{Number(item.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-total">
                <span>TOTAL</span>
                <span>
                  ₱{Number(selectedOrder.total_price).toLocaleString()}
                </span>
              </div>

              <div className="receipt-status-row">
                <span>Status:</span>
                <span
                  className={`status-badge ${getStatusClass(selectedOrder.status)}`}
                >
                  {selectedOrder.status}
                </span>
              </div>

              {selectedOrder.status === "Refunded" && refundInfo && (
                <div className="receipt-refund-info">
                  <strong>Refund Reason</strong>
                  {refundInfo.reason}
                  <br />
                  <span>
                    ₱{Number(refundInfo.amount).toLocaleString()} refunded on{" "}
                    {formatDateTime(refundInfo.refunded_at)}
                  </span>
                </div>
              )}

              <div className="receipt-footer">
                <p className="receipt-note">
                  <ShieldAlert
                    size={14}
                    style={{ verticalAlign: "middle", marginRight: 6 }}
                  />
                  <strong>NOT AN OFFICIAL RECEIPT.</strong> Payment must be
                  made at the LCC Cashier.
                </p>
                <p>Thank you for your order!</p>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn-print" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              {selectedOrder.status === "Refunded" && refundInfo && (
                <button
                  className="view-receipt-btn"
                  onClick={() => setReceiptRefund(refundInfo)}
                >
                  <ReceiptText size={16} /> Refund Receipt
                </button>
              )}
              {REFUNDABLE_STATUSES.includes(selectedOrder.status) && (
                <button
                  className="btn-refund"
                  onClick={() => {
                    setRefundOrder(selectedOrder);
                    setRefundReason("");
                  }}
                >
                  <RotateCcw size={16} /> Issue Refund
                </button>
              )}
              <button
                className="btn-close"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
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
            className="refund-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setRefundOrder(null)}
              disabled={refunding}
            >
              <X size={20} />
            </button>
            <h2>Issue Refund</h2>
            <p>
              This will restore stock and permanently mark the order as
              Refunded.
            </p>

            <div className="refund-summary">
              <span>
                Order <strong>#GRP-{refundOrder.group_id}</strong>
              </span>
              <span>
                Amount{" "}
                <strong>
                  ₱{Number(refundOrder.total_price).toLocaleString()}
                </strong>
              </span>
            </div>

            <label htmlFor="refund-reason">Reason for refund</label>
            <textarea
              id="refund-reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="e.g. Customer returned the item after payment"
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
                {refunding ? "Processing..." : "Confirm Refund"}
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

      {receiptRefund && (
        <RefundReceipt
          refund={receiptRefund}
          onClose={() => setReceiptRefund(null)}
        />
      )}
    </div>
  );
};

export default Orders;
