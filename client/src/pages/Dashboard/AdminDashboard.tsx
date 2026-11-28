import { API_BASE, ANALYTICS_SERVICE_BASE } from "../../config/api";
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  QrCode,
  DollarSign,
  Clock3,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "./AdminDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

const COLORS = [
  "#15803d",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

const STAGE_THRESHOLD_HOURS: Record<string, number> = {
  Pending: 24,
  Processing: 48,
  "In Tailoring": 72,
};

const getOverdueHours = (status: string, ageHours: number) =>
  Math.max(0, ageHours - (STAGE_THRESHOLD_HOURS[status] ?? 0));

const getStockSeverity = (stock: number, threshold: number) => {
  if (stock <= 0) return "critical";
  if (stock <= threshold / 2) return "warning";
  return "watch";
};

const velocityRank: Record<string, number> = {
  fast: 0,
  steady: 1,
  slow: 2,
};

const LOW_STOCK_PAGE_SIZE = 6;

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lowStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(true);
  const [lowStockPage, setLowStockPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(
    localStorage.getItem("full_name") || "Administrator",
  );
  const [isCompactChart, setIsCompactChart] = useState(
    () => window.innerWidth <= 768,
  );

  useEffect(() => {
    const handleResize = () => setIsCompactChart(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    const token = localStorage.getItem("token");
    setDiagnosticsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/dashboard/diagnostics?threshold=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to fetch diagnostics");
      setDiagnostics(await res.json());
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchDashboard = async () => {
      try {
        // Fetch from Python Service
        const res = await fetch(`${ANALYTICS_SERVICE_BASE}/admin-dashboard`);

        if (!res.ok) throw new Error("Failed to fetch data");

        const data = await res.json();

        setStats({
          totalSales: Number(data?.stats?.totalSales) || 0,
          totalOrders: Number(data?.stats?.totalOrders) || 0,
          pendingOrders: Number(data?.stats?.pendingOrders) || 0,
          lowStock: Number(data?.stats?.lowStock) || 0,
        });

        setRecentOrders(
          Array.isArray(data?.recentOrders) ? data.recentOrders : [],
        );
        setSalesData(Array.isArray(data?.salesData) ? data.salesData : []);
        setInventoryData(
          Array.isArray(data?.inventoryData) ? data.inventoryData : [],
        );

        if (data?.full_name) {
          setFullName(data.full_name);
          localStorage.setItem("full_name", data.full_name);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    Promise.all([fetchDashboard(), fetchDiagnostics()]).finally(() =>
      setLoading(false),
    );
  }, [navigate, fetchDiagnostics]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("full_name");
    navigate("/login");
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "admin-badge admin-badge-completed";
      case "Pending":
        return "admin-badge admin-badge-pending";
      case "Processing":
        return "admin-badge admin-badge-processing";
      case "Ready for Pickup":
        return "admin-badge admin-badge-ready";
      case "In Tailoring":
        return "admin-badge admin-badge-processing";
      case "Refunded":
        return "admin-badge admin-badge-cancelled";
      case "Cancelled":
        return "admin-badge admin-badge-cancelled";
      default:
        return "admin-badge";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const lowStockItems = [...(diagnostics?.lowStock || [])].sort(
    (a: any, b: any) => {
      const stockDiff = Number(a.stock) - Number(b.stock);
      if (stockDiff !== 0) return stockDiff;
      const velocityDiff =
        (velocityRank[a.velocity] ?? 3) - (velocityRank[b.velocity] ?? 3);
      if (velocityDiff !== 0) return velocityDiff;
      const soldDiff = Number(b.unitsSold30d ?? 0) - Number(a.unitsSold30d ?? 0);
      if (soldDiff !== 0) return soldDiff;
      return String(a.name).localeCompare(String(b.name));
    },
  );
  const lowStockPageCount = Math.max(
    1,
    Math.ceil(lowStockItems.length / LOW_STOCK_PAGE_SIZE),
  );
  const safeLowStockPage = Math.min(lowStockPage, lowStockPageCount - 1);
  const lowStockStart = safeLowStockPage * LOW_STOCK_PAGE_SIZE;
  const visibleLowStock = lowStockItems.slice(
    lowStockStart,
    lowStockStart + LOW_STOCK_PAGE_SIZE,
  );
  const bottleneckItems = [...(diagnostics?.bottlenecks || [])].sort(
    (a: any, b: any) => Number(b.ageHours) - Number(a.ageHours),
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        <div className="spinner"></div>
        <h2 style={{ marginTop: 20 }}>Loading dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* --- SIDEBAR --- */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src={logo} alt="LCC Logo" className="admin-sidebar-logo" />
          <div>
            <div className="admin-sidebar-title">LCC Admin</div>
            <div className="admin-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin-dashboard"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <Package size={20} /> <span>Inventory</span>
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <ShoppingCart size={20} /> <span>Orders</span>
          </NavLink>
          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <QrCode size={20} /> <span>QR Scanner</span>
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <Users size={20} /> <span>Users</span>
          </NavLink>
          <div
            className="admin-nav-item"
            onClick={() => navigate("/analytics")}
          >
            <BarChart3 size={20} /> <span>Analytics</span>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <Settings size={20} /> <span>Settings</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="admin-main-content">
        <div className="admin-header">
          <h1 className="admin-header-title">Dashboard Overview</h1>
          <div className="admin-header-right">
            <div className="admin-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search..."
                className="admin-search-input"
              />
            </div>
            <Bell size={20} className="admin-header-icon" />
            <div className="admin-avatar">A</div>
          </div>
        </div>

        <div className="admin-dashboard-content">
          <div className="admin-welcome-banner">
            <div>
              <h2>Welcome back, {fullName}!</h2>
              <p>Here is what is happening with LCC merchandise today.</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                <span className="admin-stat-icon">
                  <DollarSign size={16} />
                </span>
                Total Sales
              </p>
              <h3 className="admin-stat-value">
                ₱{Number(stats.totalSales).toLocaleString()}
              </h3>
              <p className="admin-stat-change-positive">All-time revenue</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                <span className="admin-stat-icon">
                  <ShoppingCart size={16} />
                </span>
                Total Orders
              </p>
              <h3 className="admin-stat-value">{stats.totalOrders}</h3>
              <p className="admin-stat-change-positive">Orders placed</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                <span className="admin-stat-icon">
                  <Clock3 size={16} />
                </span>
                Pending Orders
              </p>
              <h3 className="admin-stat-value">{stats.pendingOrders}</h3>
              <p className="admin-stat-change-negative">Needs action</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">
                <span className="admin-stat-icon">
                  <Package size={16} />
                </span>
                Low Stock Items
              </p>
              <h3 className="admin-stat-value">{stats.lowStock}</h3>
              <p className="admin-stat-change-negative">Below 10 units</p>
            </div>
          </div>

          {/* Stock and queue diagnostics */}
          <div className="admin-diagnostics-card">
            <div className="admin-diagnostics-heading">
              <AlertCircle size={18} />
              <h3>Stock & Queue Diagnostics</h3>
              <span>Reorder at &lt; {diagnostics?.reorderThreshold ?? 10} units</span>
              <button
                type="button"
                className={`admin-diagnostics-refresh ${diagnosticsLoading ? "refreshing" : ""}`}
                onClick={fetchDiagnostics}
                disabled={diagnosticsLoading}
                title="Refresh diagnostics"
              >
                <RefreshCw size={14} />
                {diagnosticsLoading ? "Refreshing" : "Refresh"}
              </button>
            </div>

            {diagnosticsLoading && !diagnostics ? (
              <div className="admin-diagnostics-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <>
                <div className="admin-diagnostics-section">
                  <div className="admin-diagnostics-section-head">
                    <strong>Queue health</strong>
                    <span>Workflow order · current active load</span>
                  </div>
                  <div className="admin-diagnostics-grid">
                    <div className="admin-diagnostics-metric">
                      <span className="admin-diagnostics-metric-icon">
                        <Clock3 size={16} />
                      </span>
                      <span>
                        <span className="admin-diagnostics-metric-label">
                          Pending past 24h
                        </span>
                        <strong className="admin-diagnostics-metric-value">
                          {diagnostics?.aging?.pendingStuck ?? 0}
                        </strong>
                      </span>
                    </div>
                    <div className="admin-diagnostics-metric">
                      <span className="admin-diagnostics-metric-icon">
                        <ShoppingCart size={16} />
                      </span>
                      <span>
                        <span className="admin-diagnostics-metric-label">
                          Processing past 48h
                        </span>
                        <strong className="admin-diagnostics-metric-value">
                          {diagnostics?.aging?.processingStuck ?? 0}
                        </strong>
                      </span>
                    </div>
                    <div className="admin-diagnostics-metric">
                      <span className="admin-diagnostics-metric-icon">
                        <Package size={16} />
                      </span>
                      <span>
                        <span className="admin-diagnostics-metric-label">
                          In Tailoring past 72h
                        </span>
                        <strong className="admin-diagnostics-metric-value">
                          {diagnostics?.aging?.tailoringStuck ?? 0}
                        </strong>
                      </span>
                    </div>
                    <div className="admin-diagnostics-metric">
                      <span className="admin-diagnostics-metric-icon">
                        <BarChart3 size={16} />
                      </span>
                      <span>
                        <span className="admin-diagnostics-metric-label">
                          Avg. Fulfillment Time
                        </span>
                        <strong className="admin-diagnostics-metric-value">
                          {diagnostics?.avgFulfillmentHours ?? 0}{" "}
                          <small>hrs</small>
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-diagnostics-section">
                  <div className="admin-diagnostics-section-head">
                    <strong>Queue bottlenecks</strong>
                    <span>Oldest active orders first</span>
                  </div>
                  {bottleneckItems.length > 0 ? (
                    <div className="admin-bottleneck-list">
                      {bottleneckItems.map((item: any, index: number) => {
                        const overdue = getOverdueHours(
                          item.status,
                          Number(item.ageHours),
                        );
                        return (
                          <div
                            className="admin-bottleneck-row"
                            key={item.groupId ?? item.groupCode ?? `bottleneck-${index}`}
                          >
                            <span className="admin-bottleneck-code">
                              {item.groupCode || `#GRP-${item.groupId}`}
                            </span>
                            <span className={getBadgeClass(item.status)}>
                              {item.status}
                            </span>
                            <span className="admin-bottleneck-age">
                              {Number(item.ageHours)}h
                            </span>
                            <span
                              className={`admin-diagnostic-badge ${overdue > 0 ? "overdue" : "on-track"}`}
                            >
                              {overdue > 0 ? `${overdue}h over` : "on track"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="admin-diagnostics-empty">
                      No active orders are waiting in the queue.
                    </p>
                  )}
                </div>

                <div className="admin-diagnostics-section">
                  <div className="admin-diagnostics-section-head">
                    <strong>Stock risk</strong>
                    <span>
                      {lowStockItems.length === 0
                        ? "No items below threshold"
                        : `${lowStockStart + 1}–${
                            lowStockStart + visibleLowStock.length
                          } of ${lowStockItems.length} below threshold`}
                    </span>
                  </div>
                  {lowStockItems.length > 0 ? (
                    <>
                      <div className="admin-low-stock-list">
                        {visibleLowStock.map((item: any, index: number) => {
                          const stock = Number(item.stock);
                          const threshold = Number(
                            item.reorderThreshold ??
                              diagnostics?.reorderThreshold ??
                              10,
                          );
                          const fill = Math.min(
                            100,
                            Math.round((stock / Math.max(threshold, 1)) * 100),
                          );
                          const severity = getStockSeverity(stock, threshold);
                          return (
                            <div
                              className="admin-low-stock-row"
                              key={item.id ?? item.name ?? `stock-${index}`}
                            >
                              <div>
                                <span className="admin-low-stock-name">
                                  {item.name}
                                </span>
                                <span className="admin-low-stock-course">
                                  {item.course}
                                </span>
                              </div>
                              <div
                                className="admin-stock-track"
                                aria-label={`${stock} of ${threshold} units`}
                              >
                                <span
                                  className={`admin-stock-fill ${severity}`}
                                  style={{ width: `${fill}%` }}
                                />
                              </div>
                              <div className="admin-low-stock-meta">
                                <span
                                  className={`admin-stock-count ${severity}`}
                                >
                                  {stock} / {threshold} units
                                </span>
                                <span>
                                  {Number(item.unitsSold30d ?? 0)} sold (30d)
                                </span>
                                <span
                                  className={`admin-velocity-badge admin-velocity-${item.velocity || "slow"}`}
                                >
                                  {item.velocity || "slow"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {lowStockItems.length > LOW_STOCK_PAGE_SIZE && (
                        <div className="admin-diagnostics-pager">
                          <button
                            type="button"
                            className="admin-pager-btn"
                            aria-label="Previous low stock items"
                            disabled={safeLowStockPage === 0}
                            onClick={() =>
                              setLowStockPage((page) => Math.max(0, page - 1))
                            }
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="admin-pager-label">
                            Page {safeLowStockPage + 1} of {lowStockPageCount}
                          </span>
                          <button
                            type="button"
                            className="admin-pager-btn"
                            aria-label="Next low stock items"
                            disabled={safeLowStockPage >= lowStockPageCount - 1}
                            onClick={() =>
                              setLowStockPage((page) =>
                                Math.min(lowStockPageCount - 1, page + 1),
                              )
                            }
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="admin-diagnostics-empty">
                      No products below the reorder threshold.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Charts Row */}
          <div className="admin-charts-grid">
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Monthly Sales & Orders</h3>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="sales"
                    fill="#15803d"
                    radius={[4, 4, 0, 0]}
                    name="Sales (₱)"
                  />
                  <Bar
                    dataKey="orders"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="admin-chart-card">
              <h3 className="admin-chart-title">
                Stock Distribution by Course
              </h3>
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isCompactChart ? 44 : 60}
                    outerRadius={isCompactChart ? 76 : 120}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={false}
                    label={
                      isCompactChart
                        ? undefined
                        : ({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} units`, "Stock"]}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={isCompactChart ? 40 : 60}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="admin-table-card">
            <h3 className="admin-chart-title">Recent Orders</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Student</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#6b7280",
                      }}
                    >
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, index) => (
                    <tr key={order.id ?? `recent-order-${index}`}>
                      <td>#GRP-{String(order.id).padStart(3, "0")}</td>
                      <td>{order.full_name || order.username}</td>
                      <td>{order.product_name}</td>
                      <td>
                        <span className={getBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
