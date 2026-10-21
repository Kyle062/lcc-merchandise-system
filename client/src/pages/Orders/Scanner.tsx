import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  QrCode,
  CheckCircle,
} from "lucide-react";
import "../Orders/Orders.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";

const Scanner = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const token = localStorage.getItem("token");

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setLoading(true);
    setSuccessData(null);

    try {
      const res = await fetch("http://localhost:5000/api/orders/scan-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", "Scan Failed", data.message);
      } else {
        showToast("success", "Order Scanned!", data.message);
        setSuccessData(orderId);
        setOrderId("");
      }
    } catch {
      showToast("error", "Connection Error", "Could not reach server.");
    }
    setLoading(false);
  };

  return (
    <div className="orders-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* SIDEBAR */}
      <div className="orders-sidebar">
        <div className="orders-sidebar-header">
          <img src={logo} alt="LCC Logo" className="orders-sidebar-logo" />
          <div>
            <div className="orders-sidebar-title">LCC Admin</div>
            <div className="orders-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="orders-sidebar-nav">
          <div
            className="orders-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div
            className="orders-nav-item"
            onClick={() => navigate("/inventory")}
          >
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate("/orders")}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>

          <div className="orders-nav-item active">
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>

          <div className="orders-nav-item" onClick={() => navigate("/users")}>
            <Users size={20} /> <span>Users</span>
          </div>
          <div
            className="orders-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div
          className="orders-sidebar-footer"
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="orders-main-content">
        <div className="orders-header">
          <div>
            <h1 className="orders-header-title">QR Scanner</h1>
            <p className="orders-last-updated">
              Scan student QR codes to process orders.
            </p>
          </div>
        </div>

        <div
          className="orders-content"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "50px",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              textAlign: "center",
              maxWidth: "500px",
              width: "100%",
            }}
          >
            <QrCode
              size={64}
              color="#00874e"
              style={{ margin: "0 auto 20px" }}
            />
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "10px",
              }}
            >
              Enter Order ID
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "30px" }}>
              Simulate a QR scan by entering the Order ID found on the student's
              QR code.
            </p>

            <form
              onSubmit={handleScan}
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <input
                type="number"
                placeholder="e.g. 42"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                style={{
                  padding: "15px",
                  fontSize: "18px",
                  textAlign: "center",
                  borderRadius: "8px",
                  border: "2px solid #e5e7eb",
                  outline: "none",
                }}
                required
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "15px",
                  background: "#00874e",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Scanning..." : "Scan QR Code"}
              </button>
            </form>

            {successData && (
              <div
                style={{
                  marginTop: "30px",
                  padding: "20px",
                  background: "#ecfdf5",
                  borderRadius: "12px",
                  border: "1px solid #a7f3d0",
                }}
              >
                <CheckCircle
                  size={32}
                  color="#059669"
                  style={{ margin: "0 auto 10px" }}
                />
                <h3
                  style={{
                    fontSize: "18px",
                    color: "#065f46",
                    fontWeight: "bold",
                  }}
                >
                  Order #{successData} Scanned!
                </h3>
                <p style={{ fontSize: "13px", color: "#047857" }}>
                  Status changed to Processing. Inventory deducted.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
