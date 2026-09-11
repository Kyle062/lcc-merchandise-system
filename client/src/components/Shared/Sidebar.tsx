import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import logo from "../../assets/images/LCClogo1.png"; // Adjust path if needed

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="LCC Logo" className="sidebar-logo" />
        <div>
          <div className="sidebar-title">LCC Admin</div>
          <div className="sidebar-subtitle">Merchandise System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/admin-dashboard"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <Package size={20} />
          <span>Inventory</span>
        </NavLink>
        <NavLink
          to="/orders"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <ShoppingCart size={20} />
          <span>Orders</span>
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <Users size={20} />
          <span>Users</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer" onClick={handleLogout}>
        <LogOut size={20} />
        <span>Logout</span>
      </div>
    </div>
  );
};

export default Sidebar;
