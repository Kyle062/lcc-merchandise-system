import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users as UsersIcon,
  Settings,
  LogOut,
  Search,
  Bell,
  UserPlus,
  Check,
  X,
  AlertCircle,
  Eye,
  Trash2,
  ShieldCheck,
  Clock,
  UserX,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "./Users.css";
import logo from "../../assets/images/LCClogo1.png";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name: string;
  course: string | null;
  status: "Pending" | "Active" | "Rejected";
  rejection_reason: string | null;
  created_at: string;
}

const COURSES = [
  "BSBA-FM",
  "BSBA-MM",
  "BSBA-HRM",
  "BSC",
  "BEED",
  "BSED-ENG",
  "BSED-SS",
  "BSED-VE",
  "BSIT",
  "BSTM",
];

type SortKey =
  | "id"
  | "username"
  | "full_name"
  | "role"
  | "status"
  | "created_at";
type SortOrder = "asc" | "desc";
type SortRule = { key: SortKey; order: SortOrder };

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRejected, setShowRejected] = useState(false);

  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: "created_at", order: "desc" },
  ]);

  // Add user form state
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "staff",
    course: "",
  });

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchUsers();
  }, [token, navigate]);

  // Split users by status
  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === "Pending"),
    [users],
  );
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "Active"),
    [users],
  );
  const rejectedUsers = useMemo(
    () => users.filter((u) => u.status === "Rejected"),
    [users],
  );

  // Filter + Sort active users
  const filteredActiveUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = activeUsers.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.course?.toLowerCase().includes(term);
      const matchesRole = roleFilter === "All" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    return [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        let aVal: any = a[rule.key];
        let bVal: any = b[rule.key];
        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return rule.order === "asc" ? -1 : 1;
        if (aVal > bVal) return rule.order === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [activeUsers, searchTerm, roleFilter, sortRules]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleApprove = async (user: User) => {
    if (
      !window.confirm(`Approve ${user.full_name || user.username}'s account?`)
    )
      return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/${user.id}/approve`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) await fetchUsers();
    } catch (error) {
      alert("Cannot connect to server.");
    }
  };

  const handleRejectClick = (user: User) => {
    setShowRejectModal(user);
    setRejectReason("");
  };

  const handleRejectConfirm = async () => {
    if (!showRejectModal) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/${showRejectModal.id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason }),
        },
      );
      if (res.ok) {
        setShowRejectModal(null);
        await fetchUsers();
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  };

  const handleDelete = async (user: User) => {
    if (
      !window.confirm(
        `Permanently delete "${user.username}"? This cannot be undone.`,
      )
    )
      return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchUsers();
    } catch (error) {
      alert("Cannot connect to server.");
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (res.ok) await fetchUsers();
    } catch (error) {
      alert("Cannot connect to server.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || "Error creating user");
        return;
      }

      setShowAddModal(false);
      setFormData({
        username: "",
        email: "",
        password: "",
        full_name: "",
        role: "staff",
        course: "",
      });
      await fetchUsers();
    } catch (error) {
      setErrorMessage("Cannot connect to server.");
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "role-admin";
      case "staff":
        return "role-staff";
      case "finance":
        return "role-finance";
      case "student":
        return "role-student";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    const ruleIndex = sortRules.findIndex((r) => r.key === column);
    if (ruleIndex === -1) return null;
    const rule = sortRules[ruleIndex];
    return rule.order === "asc" ? (
      <ChevronUp size={14} color="#00874e" />
    ) : (
      <ChevronDown size={14} color="#00874e" />
    );
  };

  const handleSort = (key: SortKey) => {
    setSortRules((prev) => {
      if (prev[0]?.key === key) {
        return [{ key, order: prev[0].order === "asc" ? "desc" : "asc" }];
      }
      return [{ key, order: "asc" }];
    });
  };

  return (
    <div className="users-container">
      {/* SIDEBAR */}
      <div className="users-sidebar">
        <div className="users-sidebar-header">
          <img src={logo} alt="LCC Logo" className="users-sidebar-logo" />
          <div>
            <div className="users-sidebar-title">LCC Admin</div>
            <div className="users-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="users-sidebar-nav">
          <div
            className="users-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div
            className="users-nav-item"
            onClick={() => navigate("/inventory")}
          >
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div className="users-nav-item" onClick={() => navigate("/orders")}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div className="users-nav-item active">
            <UsersIcon size={20} /> <span>Users</span>
          </div>
          <div className="users-nav-item" onClick={() => navigate("/settings")}>
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="users-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="users-main-content">
        <div className="users-header">
          <div>
            <h1 className="users-header-title">User Management</h1>
            <p className="users-subtitle">
              {users.length} total users · {pendingUsers.length} pending
              approval
            </p>
          </div>
          <div className="users-header-right">
            <div className="users-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search users..."
                className="users-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="add-user-btn"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus size={18} /> Add User
            </button>
            <div className="users-avatar">A</div>
          </div>
        </div>

        <div className="users-content">
          {/* ===== PENDING APPROVALS ===== */}
          {pendingUsers.length > 0 && (
            <div className="pending-section">
              <div className="pending-banner">
                <Clock size={20} />
                <div>
                  <strong>
                    {pendingUsers.length} account(s) pending approval
                  </strong>
                  <p>Review new student sign-ups before they can log in.</p>
                </div>
              </div>

              <div className="users-table-card">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Course</th>
                      <th>Date Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((user) => (
                      <tr key={user.id}>
                        <td>#{user.id}</td>
                        <td style={{ fontWeight: 600 }}>{user.username}</td>
                        <td>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.course ? (
                            <span className="course-badge">{user.course}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>
                          <div className="pending-actions">
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(user)}
                              title="Approve"
                            >
                              <Check size={16} /> Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleRejectClick(user)}
                              title="Reject"
                            >
                              <X size={16} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== ACTIVE USERS ===== */}
          <div className="section-title-row">
            <h2>Active Users ({filteredActiveUsers.length})</h2>
            <div className="role-filter">
              {["All", "student", "staff", "finance", "admin"].map((r) => (
                <button
                  key={r}
                  className={`role-tab ${roleFilter === r ? "active" : ""}`}
                  onClick={() => setRoleFilter(r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="users-loading">Loading users...</div>
          ) : filteredActiveUsers.length === 0 ? (
            <div className="users-empty">
              <UsersIcon size={48} color="#9ca3af" />
              <h3>No users found</h3>
            </div>
          ) : (
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort("id")}>
                      <div className="th-content">
                        ID <SortIcon column="id" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("username")}
                    >
                      <div className="th-content">
                        Username <SortIcon column="username" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("full_name")}
                    >
                      <div className="th-content">
                        Full Name <SortIcon column="full_name" />
                      </div>
                    </th>
                    <th>Email</th>
                    <th>Course</th>
                    <th className="sortable" onClick={() => handleSort("role")}>
                      <div className="th-content">
                        Role <SortIcon column="role" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="th-content">
                        Joined <SortIcon column="created_at" />
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveUsers.map((user) => (
                    <tr key={user.id}>
                      <td>#{user.id}</td>
                      <td style={{ fontWeight: 600 }}>{user.username}</td>
                      <td>{user.full_name}</td>
                      <td style={{ color: "#6b7280", fontSize: 13 }}>
                        {user.email}
                      </td>
                      <td>
                        {user.course ? (
                          <span className="course-badge">{user.course}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <select
                          className={`role-select ${getRoleBadgeClass(user.role)}`}
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="finance">Finance</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(user)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===== REJECTED USERS (COLLAPSIBLE) ===== */}
          {rejectedUsers.length > 0 && (
            <div className="rejected-section">
              <button
                className="rejected-toggle"
                onClick={() => setShowRejected(!showRejected)}
              >
                <UserX size={18} />
                <span>Rejected Accounts ({rejectedUsers.length})</span>
                {showRejected ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>

              {showRejected && (
                <div className="users-table-card">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Course</th>
                        <th>Reason</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectedUsers.map((user) => (
                        <tr key={user.id}>
                          <td>#{user.id}</td>
                          <td>{user.username}</td>
                          <td>{user.full_name}</td>
                          <td>{user.course || "—"}</td>
                          <td style={{ color: "#dc2626", fontSize: 13 }}>
                            {user.rejection_reason || "No reason given"}
                          </td>
                          <td>{formatDate(user.created_at)}</td>
                          <td>
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(user)}
                              style={{ fontSize: 11, padding: "4px 10px" }}
                            >
                              <Check size={12} /> Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== ADD USER MODAL ===== */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New User</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="modal-error">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="modal-form">
              <div className="modal-group">
                <label>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-row">
                <div className="modal-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="staff">Staff</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                {formData.role === "student" && (
                  <div className="modal-group">
                    <label>Course</label>
                    <select
                      value={formData.course}
                      onChange={(e) =>
                        setFormData({ ...formData, course: e.target.value })
                      }
                    >
                      <option value="">Select course...</option>
                      {COURSES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== REJECT MODAL ===== */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Account</h3>
              <button
                className="modal-close"
                onClick={() => setShowRejectModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
              Rejecting{" "}
              <strong>
                {showRejectModal.full_name || showRejectModal.username}
              </strong>{" "}
              will prevent them from logging in. Optionally provide a reason.
            </p>

            <div className="modal-group">
              <label>Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Invalid student ID, duplicate account..."
                rows={3}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1.5px solid #d1d5db",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowRejectModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn-reject-confirm"
                onClick={handleRejectConfirm}
                style={{
                  background: "#dc2626",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
