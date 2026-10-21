import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  LogOut,
  Package,
  Bell,
  ArrowRight,
} from "lucide-react";
import "./StudentDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

const StudentDashboard = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get student's name from localStorage (saved during login)
  const studentName = localStorage.getItem("username") || "Student";

  // --- FETCH DATA ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch("http://localhost:5000/api/student/stats", { headers }),
          fetch("http://localhost:5000/api/student/recent-orders", { headers }),
        ]);

        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();

        setStats({
          totalOrders: Number(statsData?.totalOrders) || 0,
          activeOrders: Number(statsData?.activeOrders) || 0,
          completedOrders: Number(statsData?.completedOrders) || 0,
          totalSpent: Number(statsData?.totalSpent) || 0,
        });

        setRecentOrders(Array.isArray(ordersData) ? ordersData : []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching student data:", error);
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
    });
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
        <h2>Loading your dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="student-dashboard-container">
      {/* SIDEBAR */}
      <div className="student-sidebar">
        <div className="student-sidebar-header">
          <img src={logo} alt="LCC Logo" className="student-sidebar-logo" />
          <div>
            <div className="student-sidebar-title">LCC Student</div>
            <div className="student-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="student-sidebar-nav">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/track-orders"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <Package size={20} /> <span>Track Orders</span>
          </NavLink>
        </nav>
        <div className="student-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="student-main-content">
        <div className="student-header">
          <h1 className="student-header-title">My Dashboard</h1>
          <div className="student-header-right">
            <Bell size={20} color="#6b7280" />
            <div className="student-avatar">{studentName.charAt(0)}</div>
          </div>
        </div>

        <div className="student-dashboard-content">
          {/* Welcome Banner */}
          <div className="student-welcome-banner">
            <div>
              <h2>Welcome back, {studentName}!</h2>
              <p>Track your orders and shop for official LCC merchandise.</p>
            </div>
            <button className="shop-btn" onClick={() => navigate("/products")}>
              Browse Store <ArrowRight size={16} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="student-stats-grid">
            <div className="student-stat-card">
              <p className="student-stat-label">Total Orders</p>
              <h3 className="student-stat-value">{stats.totalOrders}</h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">Active Orders</p>
              <h3 className="student-stat-value" style={{ color: "#f59e0b" }}>
                {stats.activeOrders}
              </h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">Completed</p>
              <h3 className="student-stat-value" style={{ color: "#00874e" }}>
                {stats.completedOrders}
              </h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">Total Spent</p>
              <h3 className="student-stat-value">
                ₱{stats.totalSpent.toLocaleString()}
              </h3>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="student-table-card">
            <div className="student-table-header">
              <h3 className="student-table-title">My Recent Orders</h3>
              <NavLink to="/track-orders" className="view-all-link">
                View All Orders →
              </NavLink>
            </div>

            <table className="student-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Item</th>
                  <th>Size</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "30px",
                        color: "#6b7280",
                      }}
                    >
                      You haven't placed any orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(3, "0")}</td>
                      <td style={{ fontWeight: 600 }}>{order.product_name}</td>
                      <td>{order.product_size || "—"}</td>
                      <td>₱{Number(order.total_price).toLocaleString()}</td>
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

export default StudentDashboard;
