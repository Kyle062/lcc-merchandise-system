import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingBag,
  Bell,
} from "lucide-react";
import "./Shop.css";
import logo from "../../assets/images/LCClogo1.png";
import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import ConfirmDialog from "../../components/Toast/ConfirmDialog";

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // Toasts & Confirm
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, title, message }]);
  };
  const removeToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "info" as "info" | "warning" | "danger",
    onConfirm: () => {},
  });

  const token = localStorage.getItem("token");
  const studentName = localStorage.getItem("username") || "Student";

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();

        // Filter out items with 0 stock
        const available = data.filter((p: any) => p.stock_quantity > 0);
        setProducts(available);
        setFilteredProducts(available);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate]);

  // ✅ STRICT Filter by course
  useEffect(() => {
    if (selectedCourse === "All") {
      setFilteredProducts(products);
    } else {
      // Only show products that match the selected course exactly
      setFilteredProducts(products.filter((p) => p.course === selectedCourse));
    }
  }, [selectedCourse, products]);

  const handlePlaceOrder = (product: any) => {
    setConfirmDialog({
      isOpen: true,
      title: "Confirm Order",
      message: `Are you sure you want to order ${product.name} for ₱${product.price}?`,
      confirmLabel: "Place Order",
      variant: "info",
      onConfirm: async () => {
        try {
          const res = await fetch("http://localhost:5000/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ product_id: product.id, quantity: 1 }),
          });
          const data = await res.json();

          if (!res.ok) {
            showToast("error", "Order Failed", data.message);
          } else {
            showToast(
              "success",
              "Order Placed!",
              `Your order #${data.orderId} has been submitted.`,
            );
            // Refresh local stock display by removing 1
            setProducts((prev) =>
              prev
                .map((p) =>
                  p.id === product.id
                    ? { ...p, stock_quantity: p.stock_quantity - 1 }
                    : p,
                )
                .filter((p) => p.stock_quantity > 0),
            );
          }
        } catch {
          showToast(
            "error",
            "Connection Error",
            "Could not connect to server.",
          );
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const COURSES = [
    "All",
    "BSIT",
    "BSBA-FM",
    "BSBA-MM",
    "BSBA-HRM",
    "BSC",
    "BEED",
    "BSED-ENG",
    "BSED-SS",
    "BSED-VE",
    "BSTM",
  ];

  return (
    <div className="shop-container">
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* SIDEBAR */}
      <div className="shop-sidebar">
        <div className="shop-sidebar-header">
          <img src={logo} alt="LCC Logo" className="shop-sidebar-logo" />
          <div>
            <div className="shop-sidebar-title">LCC Student</div>
            <div className="shop-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="shop-sidebar-nav">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>

          {/* ✅ Shop is above Track Orders */}
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <ShoppingBag size={20} /> <span>Shop Merchandise</span>
          </NavLink>

          <NavLink
            to="/track-orders"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <Package size={20} /> <span>Track Orders</span>
          </NavLink>
        </nav>
        <div className="shop-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="shop-main-content">
        <div className="shop-header">
          <h1 className="shop-header-title">Shop Merchandise</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Bell size={20} color="#6b7280" />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#00874e",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="shop-content">
          {/* Filter Tabs */}
          <div className="shop-filters">
            {COURSES.map((course) => (
              <button
                key={course}
                className={`filter-tab ${selectedCourse === course ? "active" : ""}`}
                onClick={() => setSelectedCourse(course)}
              >
                {course === "All" ? "All Products" : course}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading ? (
            <p>Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50, color: "#6b7280" }}>
              No products available for {selectedCourse}.
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-course">{product.course}</div>
                  <div className="product-name">{product.name}</div>
                  <div className="product-size">
                    Size: {product.size || "N/A"}
                  </div>

                  <div
                    className={`product-stock ${product.stock_quantity < 10 ? "low" : ""}`}
                  >
                    {product.stock_quantity} in stock
                  </div>

                  <div className="product-price">
                    ₱{Number(product.price).toLocaleString()}
                  </div>

                  <button
                    className="order-btn"
                    onClick={() => handlePlaceOrder(product)}
                  >
                    Order Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;
