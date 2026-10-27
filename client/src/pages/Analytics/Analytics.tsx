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
import "../Orders/Orders.css";
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
      <div style={{ padding: 50, textAlign: "center" }}>
        Loading Analytics...
      </div>
    );
  }

  return (
    <div className="orders-container">
      {/* SIDEBAR */}
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
          <div className="orders-nav-item" onClick={() => navigate("/scanner")}>
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>
          <div className="orders-nav-item active">
            <BarChart3 size={20} /> <span>Analytics</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate("/users")}>
            <Users size={20} /> <span>Users</span>
          </div>
          <div
            className="orders-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="orders-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="orders-main-content">
        <div className="orders-header">
          <h1 className="orders-header-title">Analytics & Reports</h1>
          <Bell size={20} color="#6b7280" />
        </div>

        <div
          className="orders-content"
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* TOP ROW CHARTS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {/* Stock per Faculty */}
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Stock Inventory per Faculty</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.stockByFaculty || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar
                    dataKey="value"
                    fill="#00874e"
                    radius={[4, 4, 0, 0]}
                    name="Units in Stock"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Order Volume */}
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">
                Daily Order Volume (Last 14 Days)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.dailyOrders || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#00874e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Orders Placed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BOTTOM ROW TABLES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: "20px",
            }}
          >
            {/* Top Sellers */}
            <div className="admin-table-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                <TrendingUp size={20} color="#00874e" />
                <h3 className="admin-chart-title" style={{ margin: 0 }}>
                  Peek of the Month: Top Sellers
                </h3>
              </div>
              <table className="admin-table">
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
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: 20,
                          color: "#6b7280",
                        }}
                      >
                        No completed orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Low Stock Alerts */}
            <div className="admin-table-card">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                <AlertTriangle size={20} color="#dc2626" />
                <h3
                  className="admin-chart-title"
                  style={{ margin: 0, color: "#dc2626" }}
                >
                  Low Stock Alerts
                </h3>
              </div>
              <table className="admin-table">
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
                        <span className="course-badge">{item.course}</span>
                      </td>
                      <td>
                        <span
                          className={`stock-badge ${item.stock === 0 ? "stock-out" : "stock-low"}`}
                        >
                          {item.stock} left
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.lowStock?.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: 20,
                          color: "#6b7280",
                        }}
                      >
                        All products are well-stocked.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
