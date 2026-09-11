import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Search, Bell } from 'lucide-react';
import './AdminDashboard.css';
import logo from '../../assets/images/LCClogo1.png';

// --- MOCK DATA ---
const salesData = [
  { name: 'Jan', sales: 4000, orders: 240 },
  { name: 'Feb', sales: 3000, orders: 198 },
  { name: 'Mar', sales: 2000, orders: 150 },
  { name: 'Apr', sales: 2780, orders: 190 },
  { name: 'May', sales: 1890, orders: 120 },
  { name: 'Jun', sales: 2390, orders: 170 },
];

const inventoryData = [
  { name: 'Uniforms', value: 400 },
  { name: 'IDs', value: 300 },
  { name: 'Apparel', value: 300 },
  { name: 'Accessories', value: 200 },
];

const COLORS = ['#00874e', '#10b981', '#34d399', '#a7f3d0'];

const recentOrders = [
  { id: '#ORD-001', student: 'Juan Dela Cruz', item: 'PE Uniform', status: 'Pending', date: '2026-09-11' },
  { id: '#ORD-002', student: 'Maria Santos', item: 'School ID', status: 'Ready for Pickup', date: '2026-09-11' },
  { id: '#ORD-003', student: 'Pedro Reyes', item: 'LCC Hoodie', status: 'Completed', date: '2026-09-10' },
  { id: '#ORD-004', student: 'Ana Lopez', item: 'PE Uniform', status: 'Processing', date: '2026-09-10' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'admin-badge admin-badge-completed';
      case 'Pending': return 'admin-badge admin-badge-pending';
      case 'Processing': return 'admin-badge admin-badge-processing';
      case 'Ready for Pickup': return 'admin-badge admin-badge-ready';
      default: return 'admin-badge';
    }
  };

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
          <NavLink to="/admin-dashboard" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/inventory" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
            <Package size={20} /> <span>Inventory</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
            <Users size={20} /> <span>Users</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? "admin-nav-item active" : "admin-nav-item"}>
            <Settings size={20} /> <span>Settings</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="admin-main-content">
        {/* Header */}
        <div className="admin-header">
          <h1 className="admin-header-title">Dashboard Overview</h1>
          <div className="admin-header-right">
            <div className="admin-search-bar">
              <Search size={16} color="#6b7280" />
              <input type="text" placeholder="Search..." className="admin-search-input" />
            </div>
            <Bell size={20} className="admin-header-icon" />
            <div className="admin-avatar">A</div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="admin-dashboard-content">
          {/* Stats Cards */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Sales</p>
              <h3 className="admin-stat-value">₱12,450</h3>
              <p className="admin-stat-change-positive">+12% from last month</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Orders</p>
              <h3 className="admin-stat-value">156</h3>
              <p className="admin-stat-change-positive">+8% from last month</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Pending Orders</p>
              <h3 className="admin-stat-value">24</h3>
              <p className="admin-stat-change-negative">-3% from last month</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Low Stock Items</p>
              <h3 className="admin-stat-value">5</h3>
              <p className="admin-stat-change-negative">Needs attention</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="admin-charts-grid">
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Monthly Sales & Orders</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#00874e" radius={[4, 4, 0, 0]} name="Sales (₱)" />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Inventory Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
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
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.student}</td>
                    <td>{order.item}</td>
                    <td>
                      <span className={getBadgeClass(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;