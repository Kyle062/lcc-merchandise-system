import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scissors,
  Clock,
  CheckCircle,
  LogOut,
  Search,
  Bell,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./TailorDashboard.css";
import logo from "../../assets/images/LCClogo1.png";

const TailorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    assignedOrders: 0,
    inProgress: 0,
    completedToday: 0,
  });
  const [queue, setQueue] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
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
        const [statsRes, queueRes] = await Promise.all([
          fetch("http://192.168.254.111:5000/api/tailor/stats", { headers }),
          fetch("http://192.168.254.111:5000/api/tailor/assigned", { headers }),
        ]);

        const statsData = await statsRes.json();
        const queueData = await queueRes.json();

        setStats({
          assignedOrders: Number(statsData?.assignedOrders) || 0,
          inProgress: Number(statsData?.inProgress) || 0,
          completedToday: Number(statsData?.completedToday) || 0,
        });
        setQueue(Array.isArray(queueData) ? queueData : []);

        // Mock Chart Data (You can replace this with real data from your API later)
        setChartData([
          { name: "Mon", completed: 4 },
          { name: "Tue", completed: 6 },
          { name: "Wed", completed: 2 },
          { name: "Thu", completed: 8 },
          { name: "Fri", completed: 5 },
          { name: "Sat", completed: 0 },
        ]);

        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading)
    return <div className="tailor-loading">Loading Tailor Dashboard...</div>;

  return (
    <div className="tailor-dashboard-container">
      <div className="tailor-sidebar">
        <div className="tailor-sidebar-header">
          <img src={logo} alt="LCC Logo" className="tailor-sidebar-logo" />
          <div>
            <div className="tailor-sidebar-title">LCC Tailor</div>
            <div className="tailor-sidebar-subtitle">Production System</div>
          </div>
        </div>
        <nav className="tailor-sidebar-nav">
          <NavLink
            to="/tailor-dashboard"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/tailor-queue"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <Scissors size={20} /> <span>Work Queue</span>
          </NavLink>
          <NavLink
            to="/tailor-reports"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <FileText size={20} /> <span>Reports</span>
          </NavLink>
        </nav>
        <div className="tailor-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="tailor-main-content">
        <div className="tailor-header">
          <h1 className="tailor-header-title">Tailor Dashboard</h1>
          <div className="tailor-header-right">
            <div className="tailor-search-bar">
              <Search size={16} color="#6b7280" />
              <input type="text" placeholder="Search orders..." />
            </div>
            <Bell size={20} className="tailor-header-icon" />
            <div className="tailor-avatar">T</div>
          </div>
        </div>

        <div className="tailor-dashboard-content">
          <div className="tailor-stats-grid">
            <div className="tailor-stat-card">
              <div className="tailor-stat-icon bg-yellow">
                <Clock size={24} color="#d97706" />
              </div>
              <div>
                <p className="tailor-stat-label">Assigned to Me</p>
                <h3 className="tailor-stat-value">{stats.assignedOrders}</h3>
              </div>
            </div>
            <div className="tailor-stat-card">
              <div className="tailor-stat-icon bg-blue">
                <Scissors size={24} color="#2563eb" />
              </div>
              <div>
                <p className="tailor-stat-label">Currently In Progress</p>
                <h3 className="tailor-stat-value">{stats.inProgress}</h3>
              </div>
            </div>
            <div className="tailor-stat-card">
              <div className="tailor-stat-icon bg-green">
                <CheckCircle size={24} color="#059669" />
              </div>
              <div>
                <p className="tailor-stat-label">Completed Today</p>
                <h3 className="tailor-stat-value">{stats.completedToday}</h3>
              </div>
            </div>
          </div>

          {/* Chart Row */}
          <div className="tailor-chart-card">
            <h3 className="tailor-chart-title">Weekly Completed Tailoring</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f3f4f6" }} />
                <Bar
                  dataKey="completed"
                  fill="#d97706"
                  radius={[4, 4, 0, 0]}
                  name="Orders Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="tailor-table-card">
            <div className="tailor-table-header">
              <h3 className="tailor-table-title">Active Work Queue</h3>
              <NavLink to="/tailor-queue" className="tailor-view-all">
                Manage Queue →
              </NavLink>
            </div>
            <table className="tailor-table">
              <thead>
                <tr>
                  <th>Group ID</th>
                  <th>Student</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Date Assigned</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#6b7280",
                      }}
                    >
                      No assigned orders currently.
                    </td>
                  </tr>
                ) : (
                  queue.map((order) => (
                    <tr key={order.group_id}>
                      <td>#GRP-{String(order.group_id).padStart(3, "0")}</td>
                      <td>{order.student_name}</td>
                      <td>{order.item_count} item(s)</td>
                      <td>
                        <span
                          className={`tailor-badge status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.order_date).toLocaleDateString()}</td>
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

export default TailorDashboard;
