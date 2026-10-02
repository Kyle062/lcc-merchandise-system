import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import "./AdminDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

// ✅ Vibrant, distinct color palette for 11 courses
const COLORS = [
  "#00874e", // LCC green (All)
  "#3b82f6", // blue (BSIT)
  "#f59e0b", // amber (BSBA-FM)
  "#ef4444", // red (BSBA-MM)
  "#8b5cf6", // violet (BSBA-HRM)
  "#06b6d4", // cyan (BSC)
  "#ec4899", // pink (BEED)
  "#10b981", // emerald (BSED-ENG)
  "#f97316", // orange (BSED-SS)
  "#6366f1", // indigo (BSED-VE)
  "#84cc16", // lime (BSTM)
];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, salesRes, invRes] = await Promise.all([
          fetch("http://localhost:5000/api/dashboard/stats", { headers }),
          fetch("http://localhost:5000/api/dashboard/recent-orders", {
            headers,
          }),
          fetch("http://localhost:5000/api/dashboard/monthly-sales", {
            headers,
          }),
          fetch("http://localhost:5000/api/dashboard/inventory-distribution", {
            headers,
          }),
        ]);

        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();
        const salesDataRes = await salesRes.json();
        const invData = await invRes.json();

        setStats({
          totalSales: Number(statsData?.totalSales) || 0,
          totalOrders: Number(statsData?.totalOrders) || 0,
          pendingOrders: Number(statsData?.pendingOrders) || 0,
          lowStock: Number(statsData?.lowStock) || 0,
        });

        setRecentOrders(Array.isArray(ordersData) ? ordersData : []);
        setSalesData(Array.isArray(salesDataRes) ? salesDataRes : []);

        if (Array.isArray(invData)) {
          setInventoryData(
            invData.map((item: any) => ({
              name: String(item.name || "Unknown"),
              value: Number(item.value) || 0,
            })),
          );
        } else {
          setInventoryData([]);
        }

        setLoading(false);
      } catch (error) {
        console.error("❌ Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
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

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h2>Loading dashboard...</h2>
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
            to="/users"
            className={({ isActive }) =>
              isActive ? "admin-nav-item active" : "admin-nav-item"
            }
          >
            <Users size={20} /> <span>Users</span>
          </NavLink>
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
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Sales</p>
              <h3 className="admin-stat-value">
                ₱{Number(stats.totalSales).toLocaleString()}
              </h3>
              <p className="admin-stat-change-positive">All-time revenue</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Orders</p>
              <h3 className="admin-stat-value">{stats.totalOrders}</h3>
              <p className="admin-stat-change-positive">Orders placed</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Pending Orders</p>
              <h3 className="admin-stat-value">{stats.pendingOrders}</h3>
              <p className="admin-stat-change-negative">Needs action</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Low Stock Items</p>
              <h3 className="admin-stat-value">{stats.lowStock}</h3>
              <p className="admin-stat-change-negative">Below 10 units</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="admin-charts-grid">
            {/* Monthly Sales */}
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
                    fill="#00874e"
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

            {/* Stock Distribution by Course */}
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
                    innerRadius={60}
                    outerRadius={120}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={false}
                    label={({ name, percent }) =>
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
                    height={60}
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
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(3, "0")}</td>
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
