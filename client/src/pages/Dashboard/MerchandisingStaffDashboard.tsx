import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Search,
  Bell,
  QrCode,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import "./MerchandisingStaffDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

const MerchandisingStaffDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingOrders: 0,
    processingOrders: 0,
    lowStockItems: 0,
    completedToday: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
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
        const res = await fetch(
          "http://192.168.254.111:5000/api/staff/dashboard",
          { headers },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch staff dashboard data");
        }

        const data = await res.json();

        setStats({
          pendingOrders: Number(data?.pendingOrders) || 0,
          processingOrders: Number(data?.processingOrders) || 0,
          lowStockItems: Number(data?.lowStockItems) || 0,
          completedToday: Number(data?.completedToday) || 0,
        });

        setRecentOrders(
          Array.isArray(data?.recentOrders) ? data.recentOrders : [],
        );
        setLowStockProducts(
          Array.isArray(data?.lowStockProducts) ? data.lowStockProducts : [],
        );
        setLoading(false);
      } catch (error) {
        console.error("Error fetching staff data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "staff-badge staff-badge-completed";
      case "Pending":
        return "staff-badge staff-badge-pending";
      case "Processing":
        return "staff-badge staff-badge-processing";
      case "Ready for Pickup":
        return "staff-badge staff-badge-ready";
      default:
        return "staff-badge";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
        <h2>Loading staff dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="staff-dashboard-container">
      <div className="staff-sidebar">
        <div className="staff-sidebar-header">
          <img src={logo} alt="LCC Logo" className="staff-sidebar-logo" />
          <div>
            <div className="staff-sidebar-title">LCC Staff</div>
            <div className="staff-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="staff-sidebar-nav">
          <NavLink
            to="/merchandising-staff-dashboard"
            className={({ isActive }) =>
              isActive ? "staff-nav-item active" : "staff-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/inventory-manager"
            className={({ isActive }) =>
              isActive ? "staff-nav-item active" : "staff-nav-item"
            }
          >
            <Package size={20} /> <span>Inventory</span>
          </NavLink>
          <NavLink
            to="/order-processor"
            className={({ isActive }) =>
              isActive ? "staff-nav-item active" : "staff-nav-item"
            }
          >
            <ShoppingCart size={20} /> <span>Process Orders</span>
          </NavLink>
          <NavLink
            to="/scanner"
            className={({ isActive }) =>
              isActive ? "staff-nav-item active" : "staff-nav-item"
            }
          >
            <QrCode size={20} /> <span>QR Scanner</span>
          </NavLink>
        </nav>
        <div className="staff-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="staff-main-content">
        <div className="staff-header">
          <h1 className="staff-header-title">Merchandising Staff Dashboard</h1>
          <div className="staff-header-right">
            <div className="staff-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search..."
                className="staff-search-input"
              />
            </div>
            <Bell size={20} className="staff-header-icon" />
            <div className="staff-avatar">S</div>
          </div>
        </div>

        <div className="staff-dashboard-content">
          <div className="staff-stats-grid">
            <div className="staff-stat-card">
              <div className="staff-stat-icon-wrapper bg-yellow">
                <Clock size={24} color="#d97706" />
              </div>
              <div>
                <p className="staff-stat-label">Pending Orders</p>
                <h3 className="staff-stat-value">{stats.pendingOrders}</h3>
              </div>
            </div>

            <div className="staff-stat-card">
              <div className="staff-stat-icon-wrapper bg-blue">
                <ShoppingCart size={24} color="#2563eb" />
              </div>
              <div>
                <p className="staff-stat-label">Processing</p>
                <h3 className="staff-stat-value">{stats.processingOrders}</h3>
              </div>
            </div>

            <div className="staff-stat-card">
              <div className="staff-stat-icon-wrapper bg-red">
                <AlertTriangle size={24} color="#dc2626" />
              </div>
              <div>
                <p className="staff-stat-label">Low Stock Items</p>
                <h3 className="staff-stat-value">{stats.lowStockItems}</h3>
              </div>
            </div>

            <div className="staff-stat-card">
              <div className="staff-stat-icon-wrapper bg-green">
                <CheckCircle size={24} color="#059669" />
              </div>
              <div>
                <p className="staff-stat-label">Completed Today</p>
                <h3 className="staff-stat-value">{stats.completedToday}</h3>
              </div>
            </div>
          </div>

          <div className="staff-content-grid">
            <div className="staff-card">
              <div className="staff-card-header">
                <h3 className="staff-card-title">Recent Orders</h3>
                <NavLink to="/order-processor" className="staff-view-all">
                  View All →
                </NavLink>
              </div>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Group ID</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "#6b7280",
                        }}
                      >
                        No recent orders.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.group_id}>
                        <td>#GRP-{String(order.group_id).padStart(3, "0")}</td>
                        <td>{order.student_name}</td>
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

            <div className="staff-card">
              <div className="staff-card-header">
                <h3 className="staff-card-title">Low Stock Alerts</h3>
                <NavLink to="/inventory-manager" className="staff-view-all">
                  Manage Stock →
                </NavLink>
              </div>
              <div className="staff-low-stock-list">
                {lowStockProducts.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#6b7280",
                    }}
                  >
                    All items are well stocked.
                  </p>
                ) : (
                  lowStockProducts.map((product) => (
                    <div key={product.id} className="staff-low-stock-item">
                      <div>
                        <p className="staff-product-name">{product.name}</p>
                        <p className="staff-product-meta">
                          Size: {product.size || "N/A"} | {product.course}
                        </p>
                      </div>
                      <div className="staff-stock-badge">
                        {product.stock_quantity} left
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchandisingStaffDashboard;
