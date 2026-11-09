import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scissors,
  LogOut,
  Search,
  Bell,
  Eye,
  X,
  CheckCircle,
  PlayCircle,
  Inbox,
} from "lucide-react";
import "./TailorDashboard.css"; // Reusing the same CSS
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const TailorQueue = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");

  const fetchAssignedOrders = async () => {
    try {
      const res = await fetch(
        "http://192.168.254.111:5000/api/tailor/assigned",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAssignedOrders();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Fetch specific items when clicking "View Details"
  const handleViewDetails = async (order: any) => {
    setSelectedOrder(order);
    try {
      const res = await fetch(
        `http://192.168.254.111:5000/api/tailor/details/${order.group_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setOrderDetails(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("error", "Error", "Could not fetch item details.");
    }
  };

  // Update Status to "In Tailoring" or "Ready for Pickup"
  const handleUpdateProgress = async (groupId: number, newStatus: string) => {
    try {
      const res = await fetch(
        `http://192.168.254.111:5000/api/tailor/progress/${groupId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!res.ok) throw new Error("Failed to update status");

      showToast(
        "success",
        "Status Updated",
        `Order #GRP-${groupId} is now ${newStatus}`,
      );
      fetchAssignedOrders(); // Refresh list
      setSelectedOrder(null); // Close modal if open
    } catch (error) {
      showToast("error", "Update Failed", "Could not update order status.");
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.group_id.toString().includes(searchTerm) ||
      o.student_name.toLowerCase().includes(searchTerm),
  );

  const getBadgeClass = (status: string) => {
    return `tailor-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`;
  };

  return (
    <div className="tailor-dashboard-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

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
        </nav>
        <div className="tailor-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="tailor-main-content">
        <div className="tailor-header">
          <h1 className="tailor-header-title">Work Queue</h1>
          <div className="tailor-header-right">
            <div className="tailor-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search Group ID or Student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Bell size={20} className="tailor-header-icon" />
            <div className="tailor-avatar">T</div>
          </div>
        </div>

        <div className="tailor-dashboard-content">
          <div className="tailor-table-card">
            <div className="tailor-table-header">
              <h3 className="tailor-table-title">Assigned Orders</h3>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", padding: "20px" }}>
                Loading queue...
              </p>
            ) : filteredOrders.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#6b7280",
                }}
              >
                <Inbox size={48} style={{ margin: "0 auto 10px" }} />
                <p>No orders in your queue right now.</p>
              </div>
            ) : (
              <table className="tailor-table">
                <thead>
                  <tr>
                    <th>Group ID</th>
                    <th>Student</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.group_id}>
                      <td>#GRP-{String(order.group_id).padStart(3, "0")}</td>
                      <td>{order.student_name}</td>
                      <td>{order.item_count} item(s)</td>
                      <td>
                        <span className={getBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td>{new Date(order.order_date).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleViewDetails(order)}
                            style={{
                              background: "#e5e7eb",
                              border: "none",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={14} /> View
                          </button>

                          {order.status === "Processing" && (
                            <button
                              onClick={() =>
                                handleUpdateProgress(
                                  order.group_id,
                                  "In Tailoring",
                                )
                              }
                              style={{
                                background: "#d97706",
                                color: "white",
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <PlayCircle size={14} /> Start
                            </button>
                          )}

                          {order.status === "In Tailoring" && (
                            <button
                              onClick={() =>
                                handleUpdateProgress(
                                  order.group_id,
                                  "Ready for Pickup",
                                )
                              }
                              style={{
                                background: "#059669",
                                color: "white",
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CheckCircle size={14} /> Finish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="cart-modal"
            style={{ maxWidth: "400px", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="cart-modal-header"
              style={{ justifyContent: "space-between" }}
            >
              <h2 className="cart-modal-title">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "15px",
              }}
            >
              Group #GRP-{String(selectedOrder.group_id).padStart(3, "0")} for{" "}
              {selectedOrder.student_name}
            </p>

            <div
              style={{
                textAlign: "left",
                background: "#f9fafb",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              {orderDetails.length === 0 ? (
                <p style={{ textAlign: "center" }}>Loading items...</p>
              ) : (
                orderDetails.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>
                      {item.quantity}x {item.name}
                    </span>
                    <span style={{ color: "#d97706", fontWeight: "700" }}>
                      Size: {item.size || "N/A"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#1f2937",
                color: "white",
                border: "none",
                borderRadius: "8px",
                marginTop: "20px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TailorQueue;
