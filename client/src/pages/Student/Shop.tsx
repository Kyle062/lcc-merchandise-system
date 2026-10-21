import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LogOut,
  ShoppingBag,
  Bell,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
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

  // ✅ CART STATE
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
      setFilteredProducts(products.filter((p) => p.course === selectedCourse));
    }
  }, [selectedCourse, products]);

  // ✅ CART FUNCTIONS
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.cartQuantity >= product.stock_quantity) {
          showToast(
            "warning",
            "Stock Limit Reached",
            `Only ${product.stock_quantity} available.`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
    showToast("success", "Added to Cart", `${product.name} added.`);
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.cartQuantity + delta;
          if (newQty < 1) return item;
          if (newQty > item.stock_quantity) {
            showToast(
              "warning",
              "Stock Limit Reached",
              `Only ${item.stock_quantity} available.`,
            );
            return item;
          }
          return { ...item, cartQuantity: newQty };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0,
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "Confirm Checkout",
      message: `Place order for ${cart.length} item(s) totaling ₱${cartTotal.toLocaleString()}?`,
      confirmLabel: "Place Order",
      variant: "info",
      onConfirm: async () => {
        try {
          const payload = {
            items: cart.map((item) => ({
              product_id: item.id,
              quantity: item.cartQuantity,
            })),
          };

          const res = await fetch("http://localhost:5000/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json();

          if (!res.ok) {
            showToast("error", "Checkout Failed", data.message);
          } else {
            showToast(
              "success",
              "Order Placed!",
              `Successfully ordered ${cart.length} item(s).`,
            );
            setCart([]);
            setIsCartOpen(false);

            // Refresh products to reflect new stock
            const updatedRes = await fetch(
              "http://localhost:5000/api/products",
            );
            const updatedData = await updatedRes.json();
            setProducts(updatedData.filter((p: any) => p.stock_quantity > 0));
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
            {/* ✅ CART BUTTON */}
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={18} /> Cart
              {cart.length > 0 && (
                <span className="cart-badge">
                  {cart.reduce((s, i) => s + i.cartQuantity, 0)}
                </span>
              )}
            </button>

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
                    onClick={() => addToCart(product)}
                  >
                    <Plus size={16} /> Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ CART MODAL */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h2 className="cart-modal-title">Your Cart</h2>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setIsCartOpen(false)}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#6b7280",
                  }}
                >
                  Your cart is empty.
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-price">
                        ₱{Number(item.price).toLocaleString()}
                      </span>
                    </div>
                    <div className="cart-item-actions">
                      <button
                        className="qty-btn"
                        onClick={() => updateCartQty(item.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        style={{
                          fontWeight: 600,
                          width: 20,
                          textAlign: "center",
                        }}
                      >
                        {item.cartQuantity}
                      </span>
                      <button
                        className="qty-btn"
                        onClick={() => updateCartQty(item.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total:</span>
                <span>₱{cartTotal.toLocaleString()}</span>
              </div>
              <button
                className="checkout-submit-btn"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                style={{ opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                Checkout {cart.length} Item(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
