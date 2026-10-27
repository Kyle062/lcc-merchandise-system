import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  QrCode,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Bell,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import "./Analytics.css";
import logo from "../../assets/images/LCClogo1.png";

const Analytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (res.ok) setData(result);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: "center", fontWeight: "bold" }}>
        Loading Analytics...
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* SIDEBAR */}
      <div className="analytics-sidebar">
        <div className="analytics-sidebar-header">
          <img src={logo} alt="LCC Logo" className="analytics-sidebar-logo" />
          <div>
            <div className="analytics-sidebar-title">LCC Admin</div>
            <div className="analytics-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="analytics-sidebar-nav">
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/inventory")}
          >
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/orders")}
          >
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/scanner")}
          >
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>

          <div
            className="analytics-nav-item"
            onClick={() => navigate("/users")}
          >
            <Users size={20} /> <span>Users</span>
          </div>
          <div className="analytics-nav-item active">
            <BarChart3 size={20} /> <span>Analytics</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="analytics-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="analytics-main-content">
        <div className="analytics-header">
          <h1 className="analytics-header-title">Analytics & Reports</h1>
          <Bell size={20} color="#6b7280" />
        </div>

        <div className="analytics-content">
          {/* KPI CARDS ROW */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#ecfdf5", color: "#00874e" }}
              >
                <Clock size={24} />
              </div>
              <div>
                <p className="kpi-label">Avg. Fulfillment Time</p>
                <h3 className="kpi-value">
                  {data?.avgFulfillmentHours || 0} Hours
                </h3>
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#eff6ff", color: "#3b82f6" }}
              >
                <Package size={24} />
              </div>
              <div>
                <p className="kpi-label">Total Items in Stock</p>
                <h3 className="kpi-value">
                  {data?.stockByFaculty
                    ?.reduce((acc: number, curr: any) => acc + curr.value, 0)
                    .toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="kpi-label">Low Stock Items</p>
                <h3 className="kpi-value">
                  {data?.lowStock?.length || 0} Alerts
                </h3>
              </div>
            </div>
          </div>

          {/* CHARTS ROW 1 */}
          <div className="analytics-charts-grid">
            <div className="analytics-card">
              <h3 className="analytics-card-title">
                Stock Inventory per Faculty
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.stockByFaculty || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f3f4f6" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#00874e"
                    radius={[4, 4, 0, 0]}
                    name="Units in Stock"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-card-title">
                Daily Order Volume (Last 14 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.dailyOrders || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#00874e"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#00874e" }}
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div className="analytics-tables-grid">
            {/* Top Sellers Table */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <TrendingUp size={20} color="#00874e" />
                <h3 className="analytics-card-title">
                  Peek of the Month: Top Sellers
                </h3>
              </div>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product Name</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topSellers?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td
                        style={{
                          fontWeight: 700,
                          color: index === 0 ? "#00874e" : "#6b7280",
                        }}
                      >
                        #{index + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.sold} units</td>
                      <td style={{ fontWeight: 600 }}>
                        ₱{item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {data?.topSellers?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="analytics-empty">
                        No completed orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Low Stock Alerts Table */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <AlertTriangle size={20} color="#dc2626" />
                <h3
                  className="analytics-card-title"
                  style={{ color: "#dc2626" }}
                >
                  Low Stock Alerts
                </h3>
              </div>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Course</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.lowStock?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: "#f3f4f6",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {item.course}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor:
                              item.stock === 0 ? "#fee2e2" : "#fef3c7",
                            color: item.stock === 0 ? "#991b1b" : "#92400e",
                          }}
                        >
                          {item.stock} left
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.lowStock?.length === 0 && (
                    <tr>
                      <td colSpan={3} className="analytics-empty">
                        All products are well-stocked.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ NEW: REVENUE PER FACULTY CHART */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <DollarSign size={20} color="#00874e" />
              <h3 className="analytics-card-title">
                Total Revenue per Faculty (Completed Orders)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data?.revenueByFaculty || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `₱${value.toLocaleString()}`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) =>
                    `₱${Number(value).toLocaleString()}`
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  name="Revenue"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
