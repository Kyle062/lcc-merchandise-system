import { API_BASE } from "../../config/api";
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scissors,
  LogOut,
  Search,
  Bell,
  Eye,
  X,
  CheckCircle,
  PlayCircle,
  Inbox,
  Clock,
  CheckSquare,
  Layers,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import "./TailorDashboard.css";
import "./TailorQueue.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const QUEUE_TABS = [
  "All",
  "Processing",
  "In Tailoring",
  "Ready for Pickup",
  "Completed",
];
const COURSES = [
  "All",
  "BSBA-FM",
  "BSBA-MM",
  "BSBA-HRM",
  "BSC",
  "BEED",
  "BSED-ENG",
  "BSED-SS",
  "BSED-VE",
  "BSIT",
  "BSTM",
];

const TailorQueue = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");

  const fetchAssignedOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: String(page),
        limit: String(limit),
        sort: "order_date:asc",
      });
      if (activeTab !== "All") params.append("status", activeTab);
      if (courseFilter !== "All") params.append("course", courseFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const res = await fetch(
        `${API_BASE}/api/tailor/assigned?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setOrders(Array.isArray(data?.rows) ? data.rows : []);
      setTotalPages(Number(data?.totalPages || 1));
      setStatusCounts(data?.statusCounts || {});
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [token, searchTerm, activeTab, courseFilter, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    fetchAssignedOrders();
  }, [token, navigate, fetchAssignedOrders]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAssignedOrders, 10000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchAssignedOrders();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [autoRefresh, fetchAssignedOrders]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab, courseFilter, dateFrom, dateTo, limit]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    try {
      const res = await fetch(
        `${API_BASE}/api/tailor/details/${order.group_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setOrderDetails(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("error", "Error", "Could not fetch item details.");
    }
  };

  const handleUpdateProgress = async (
    groupId: number,
    newStatus: string,
    currentStatus: string,
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/tailor/progress/${groupId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            expected_status: currentStatus,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) await fetchAssignedOrders();
        throw new Error(data.message || "Could not update status.");
      }

      showToast(
        "success",
        "Status Updated",
        `Order #GRP-${groupId} is now ${newStatus}`,
      );
      fetchAssignedOrders();
      setSelectedOrder(null);
    } catch (error: any) {
      showToast("error", "Update Failed", error.message);
    }
  };

  const totalPending = Number(statusCounts.Processing || 0);
  const totalInProgress = Number(statusCounts["In Tailoring"] || 0);
  const visibleOrders = orders;

  const clearFilters = () => {
    setSearchTerm("");
    setActiveTab("All");
    setCourseFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const getBadgeClass = (status: string) => {
    return `tailor-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  };

  return (
    <div className="tailor-dashboard-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      <div className="tailor-sidebar">
        <div className="tailor-sidebar-header">
          <img src={logo} alt="LCC Logo" className="tailor-sidebar-logo" />
          <div>
            <div className="tailor-sidebar-title">LCC Tailor</div>
            <div className="tailor-sidebar-subtitle">Production System</div>
          </div>
        </div>
        <nav className="tailor-sidebar-nav">
          <NavLink
            to="/tailor-dashboard"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/tailor-queue"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <Scissors size={20} /> <span>Work Queue</span>
          </NavLink>
          <NavLink
            to="/tailor-reports"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <Layers size={20} /> <span>Reports</span>
          </NavLink>
        </nav>
        <div className="tailor-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="tailor-main-content">
        <div className="tailor-header">
          <div>
            <h1 className="tailor-header-title">Work Queue</h1>
            <p className="queue-last-updated">
              Last updated: {lastUpdated.toLocaleTimeString("en-PH")}
            </p>
          </div>
          <div className="tailor-header-right">
            <div className="tailor-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search Group ID or Student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className={`queue-refresh-toggle ${autoRefresh ? "on" : "off"}`}
              onClick={() => setAutoRefresh((value) => !value)}
              title="Toggle auto refresh"
            >
              <RefreshCw size={16} />
            </button>
            <Bell size={20} className="tailor-header-icon" />
            <div className="tailor-avatar">T</div>
          </div>
        </div>

        <div className="tailor-dashboard-content">
          {/* Stats Grid */}
          <div className="queue-stats-grid">
            <div className="queue-stat-card">
              <div className="queue-stat-icon bg-yellow">
                <Clock size={20} color="#d97706" />
              </div>
              <div>
                <p className="queue-stat-label">Pending Tailoring</p>
                <h3 className="queue-stat-value">{totalPending}</h3>
              </div>
            </div>
            <div className="queue-stat-card">
              <div className="queue-stat-icon bg-blue">
                <Scissors size={20} color="#2563eb" />
              </div>
              <div>
                <p className="queue-stat-label">In Progress</p>
                <h3 className="queue-stat-value">{totalInProgress}</h3>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="tailor-table-card">
            <div
              className="tailor-table-header"
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "15px",
              }}
            >
              <h3 className="tailor-table-title">Assigned Orders</h3>

              {/* Combined filters */}
              <div className="queue-filter-bar">
                <div className="queue-tabs">
                  {QUEUE_TABS.map((tab) => (
                    <button
                      key={tab}
                      className={`queue-tab ${activeTab === tab ? "active" : ""}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                      <span className="status-count">
                        {tab === "All"
                          ? statusCounts.All || 0
                          : statusCounts[tab] || 0}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="queue-filter-controls">
                  <label className="queue-filter-search">
                    <span>Search</span>
                    <input
                      type="search"
                      placeholder="Group or student..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Course / Department</span>
                    <select
                      value={courseFilter}
                      onChange={(e) => setCourseFilter(e.target.value)}
                    >
                      {COURSES.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>
                      <CalendarDays size={13} /> From
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>
                      <CalendarDays size={13} /> To
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Rows</span>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                  <button className="queue-clear-filters" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="queue-empty-state">Loading queue...</div>
            ) : visibleOrders.length === 0 ? (
              <div className="queue-empty-state">
                <CheckSquare size={48} />
                <h3>No matching records</h3>
                <p>Try a different status, course, or date range.</p>
                <button className="queue-clear-filters" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <table className="tailor-table">
                <thead>
                  <tr>
                    <th>Group ID</th>
                    <th>Student</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.group_id}>
                      <td style={{ fontWeight: "600" }}>
                        #GRP-{String(order.group_id).padStart(3, "0")}
                      </td>
                      <td>{order.student_name}</td>
                      <td>{order.item_count} item(s)</td>
                      <td>
                        <span className={getBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.order_date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-view"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye size={14} /> View
                          </button>
                          {order.status === "Processing" && (
                            <button
                              className="btn-start"
                              onClick={() =>
                                handleUpdateProgress(
                                  order.group_id,
                                  "In Tailoring",
                                  order.status,
                                )
                              }
                            >
                              <PlayCircle size={14} /> Start
                            </button>
                          )}
                          {order.status === "In Tailoring" && (
                            <button
                              className="btn-finish"
                              onClick={() =>
                                handleUpdateProgress(
                                  order.group_id,
                                  "Ready for Pickup",
                                  order.status,
                                )
                              }
                            >
                              <CheckCircle size={14} /> Finish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="queue-pagination">
              <span>Page {page} of {totalPages}</span>
              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedOrder && (
        <div
          className="tailor-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="tailor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tailor-modal-header">
              <h2 className="tailor-modal-title">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p className="tailor-modal-subtitle">
              Group #GRP-{String(selectedOrder.group_id).padStart(3, "0")} for{" "}
              {selectedOrder.student_name}
            </p>

            <div className="tailor-modal-items">
              {orderDetails.length === 0 ? (
                <p style={{ textAlign: "center" }}>Loading items...</p>
              ) : (
                orderDetails.map((item, idx) => (
                  <div key={idx} className="tailor-modal-item-row">
                    <span className="tailor-item-name">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="tailor-item-size">
                      Size: {item.size || "N/A"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              className="tailor-modal-close-btn"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TailorQueue;
