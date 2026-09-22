import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Search, Bell } from 'lucide-react';
import './AdminDashboard.css';
import logo from '../../assets/images/LCClogo1.png';

const COLORS = ['#00874e', '#10b981', '#34d399', '#a7f3d0'];

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- STATE FOR DYNAMIC DATA ---
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

  // --- FETCH ALL DATA FROM BACKEND ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, salesRes, invRes] = await Promise.all([
          fetch('http://localhost:5000/api/dashboard/stats', { headers }),
          fetch('http://localhost:5000/api/dashboard/recent-orders', { headers }),
          fetch('http://localhost:5000/api/dashboard/monthly-sales', { headers }),
          fetch('http://localhost:5000/api/dashboard/inventory-distribution', { headers }),
        ]);

        const statsData = await statsRes.json();
        const ordersData = await ordersRes.json();
        const salesDataRes = await salesRes.json();
        const invData = await invRes.json();

        setStats(statsData);
        setRecentOrders(ordersData);
        setSalesData(salesDataRes);
        setInventoryData(invData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
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

        <div className="admin-dashboard-content">
          {/* Stats Cards - Now Dynamic */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Total Sales</p>
              <h3 className="admin-stat-value">₱{Number(stats.totalSales).toLocaleString()}</h3>
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
            <div className="admin-chart-card">
              <h3 className="admin-chart-title">Monthly Sales & Orders</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
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

          {/* Recent Orders Table - Now Dynamic */}
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
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(3, '0')}</td>
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