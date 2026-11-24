import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Package,
  Bell,
  ArrowRight,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import "./StudentDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState(
    localStorage.getItem("full_name") || "Student",
  );

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
          fetch("http://172.20.10.4:5000/api/student/stats", { headers }),
          fetch("http://172.20.10.4:5000/api/student/recent-orders", {
            headers,
          }),
        ]);

        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();

        setStats({
          totalOrders: Number(statsData?.totalOrders) || 0,
          activeOrders: Number(statsData?.activeOrders) || 0,
          completedOrders: Number(statsData?.completedOrders) || 0,
          totalSpent: Number(statsData?.totalSpent) || 0,
        });

        if (statsData?.full_name) {
          setFullName(statsData.full_name);
          localStorage.setItem("full_name", statsData.full_name);
        }

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
    localStorage.removeItem("full_name");
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
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="student-dashboard-container">
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
            to="/shop"
            className={({ isActive }) =>
              isActive ? "student-nav-item active" : "student-nav-item"
            }
          >
            <ShoppingBag size={20} /> <span>Shop Merchandise</span>
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

      <div className="student-main-content">
        <div className="student-header">
          <h1 className="student-header-title">My Dashboard</h1>
          <div className="student-header-right">
            <Bell size={20} color="#6b7280" />
            <div className="student-avatar">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={20} color="#dc2626" />
            </button>
          </div>
        </div>

        <div className="student-dashboard-content">
          <div className="student-welcome-banner">
            <div>
              <h2>Welcome back, {fullName}!</h2>
              <p>Track your orders and shop for LCC merchandise.</p>
            </div>
            <button className="shop-btn" onClick={() => navigate("/shop")}>
              Browse Store <ArrowRight size={16} />
            </button>
          </div>

          <div className="student-stats-grid">
            <div className="student-stat-card">
              <p className="student-stat-label">
                <ShoppingBag size={16} /> Total Orders
              </p>
              <h3 className="student-stat-value">{stats.totalOrders}</h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">
                <Clock3 size={16} /> Active Orders
              </p>
              <h3 className="student-stat-value" style={{ color: "#f59e0b" }}>
                {stats.activeOrders}
              </h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">
                <CheckCircle2 size={16} /> Completed
              </p>
              <h3 className="student-stat-value" style={{ color: "#15803d" }}>
                {stats.completedOrders}
              </h3>
            </div>
            <div className="student-stat-card">
              <p className="student-stat-label">
                <Wallet size={16} /> Total Spent
              </p>
              <h3 className="student-stat-value">
                ₱{stats.totalSpent.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="student-content-grid">
            <div className="student-panel">
              <div className="student-panel-header">
                <h3 className="student-panel-title">Quick actions</h3>
                <p className="student-panel-subtitle">
                  Common tasks, one click away.
                </p>
              </div>
              <div className="quick-action-list">
                <button
                  className="quick-action"
                  onClick={() => navigate("/shop")}
                >
                  <span className="quick-action-icon">
                    <ShoppingBag size={18} />
                  </span>
                  <span className="quick-action-text">
                    <strong>Shop merchandise</strong>
                    <small>Browse uniforms, caps and IDs</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
                <button
                  className="quick-action"
                  onClick={() => navigate("/track-orders")}
                >
                  <span className="quick-action-icon">
                    <Package size={18} />
                  </span>
                  <span className="quick-action-text">
                    <strong>Track your orders</strong>
                    <small>Check status and pickup details</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div className="student-panel">
              <div className="student-panel-header">
                <h3 className="student-panel-title">How ordering works</h3>
                <p className="student-panel-subtitle">
                  Three simple steps to pickup.
                </p>
              </div>
              <div className="student-guide-steps">
                <div className="guide-step">
                  <span className="guide-step-index">1</span>
                  <div className="guide-step-body">
                    <strong>Choose merchandise</strong>
                    <p>Pick your item and available size.</p>
                  </div>
                </div>
                <div className="guide-step">
                  <span className="guide-step-index">2</span>
                  <div className="guide-step-body">
                    <strong>Place your order</strong>
                    <p>Review your cart and confirm checkout.</p>
                  </div>
                </div>
                <div className="guide-step">
                  <span className="guide-step-index">3</span>
                  <div className="guide-step-body">
                    <strong>Scan your QR</strong>
                    <p>Show it at the counter when your order is ready.</p>
                  </div>
                </div>
              </div>
              <p className="student-panel-note">
                Need help? Ask the merchandise counter.
              </p>
            </div>
          </div>

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
                  <th>Group ID</th>
                  <th>Items</th>
                  <th>Total</th>
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
                        padding: "30px",
                        color: "#6b7280",
                      }}
                    >
                      You haven't placed any orders yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.group_id}>
                      <td>#GRP-{String(order.group_id).padStart(3, "0")}</td>
                      <td style={{ fontWeight: 600 }}>
                        {order.item_count} item(s)
                      </td>
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
