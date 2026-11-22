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
  ShieldCheck,
} from "lucide-react";
import "./Shop.css";
import logo from "../../assets/images/LCClogo1.png";

import idImage from "../../assets/images/AlldepartmentID.jpg";
import uniformImage from "../../assets/images/AllDeptUniform.jpg";
import capImage from "../../assets/images/ITcap.jpg";
import slackImage from "../../assets/images/AllDeptSlacks.jpg";

import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import ConfirmDialog from "../../components/Toast/ConfirmDialog";

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem("student_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("student_cart", JSON.stringify(cart));
  }, [cart]);

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

  // ✅ STRICT IMAGE MAPPING
  const getProductImage = (name: string) => {
    const lowerName = name.toLowerCase();

    // 1. BSIT Cap ONLY
    if (lowerName === "bsit cap") {
      return capImage;
    }

    // 2. ID / Lanyard ONLY
    if (lowerName.includes("id") || lowerName.includes("lanyard")) {
      return idImage;
    }

    // 3. Slacks / Pants ONLY
    if (lowerName.includes("slack") || lowerName.includes("pants")) {
      return slackImage;
    }

    // 4. Department Uniform / Polo ONLY
    if (
      lowerName.includes("department") ||
      (lowerName.includes("uniform") &&
        !lowerName.includes("pe") &&
        !lowerName.includes("cap"))
    ) {
      return uniformImage;
    }

    // 5. If it's a PE Uniform or anything else, fallback to a placeholder for now
    // (You can upload specific PE images later and add them here)
    return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400";
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch("http://192.168.254.111:5000/api/products");
        const data = await res.json();
        const available = data.filter((p: any) => p.stock_quantity > 0);

        const grouped = available.reduce((acc: any, item: any) => {
          if (!acc[item.name]) {
            acc[item.name] = {
              id: item.id,
              name: item.name,
              course: item.course,
              description: item.description,
              price: item.price,
              sizes: [],
            };
          }
          acc[item.name].sizes.push({
            id: item.id,
            size: item.size,
            stock_quantity: item.stock_quantity,
          });
          return acc;
        }, {});

        const groupedArray = Object.values(grouped);
        setProducts(available);
        setGroupedProducts(groupedArray);
        setFilteredProducts(groupedArray);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [token, navigate]);

  useEffect(() => {
    if (selectedCourse === "All") {
      setFilteredProducts(groupedProducts);
    } else {
      setFilteredProducts(
        groupedProducts.filter((p) => p.course === selectedCourse),
      );
    }
  }, [selectedCourse, groupedProducts]);

  const handleOpenSizeModal = (product: any) => {
    setSelectedProduct(product);
    setIsSizeModalOpen(true);
  };

  const handleAddToCart = (sizeItem: any) => {
    if (!selectedProduct) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === sizeItem.id);
      if (existing) {
        if (existing.cartQuantity >= sizeItem.stock_quantity) {
          showToast(
            "warning",
            "Stock Limit Reached",
            `Only ${sizeItem.stock_quantity} available.`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.id === sizeItem.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }

      const hasSizeInName =
        sizeItem.size && selectedProduct.name.includes(`(${sizeItem.size})`);
      const displayName =
        hasSizeInName || !sizeItem.size
          ? selectedProduct.name
          : `${selectedProduct.name} (${sizeItem.size})`;

      return [
        ...prev,
        {
          id: sizeItem.id,
          name: selectedProduct.name,
          displayName: displayName,
          price: selectedProduct.price,
          size: sizeItem.size,
          stock_quantity: sizeItem.stock_quantity,
          cartQuantity: 1,
          isSelected: true,
        },
      ];
    });

    showToast("success", "Added to Cart", `${selectedProduct.name} added.`);
    setIsSizeModalOpen(false);
    setSelectedProduct(null);
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

  const toggleCartItem = (id: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item,
      ),
    );
  };

  const toggleAllCartItems = (checked: boolean) => {
    setCart((prev) => prev.map((item) => ({ ...item, isSelected: checked })));
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const selectedCartItems = cart.filter((item) => item.isSelected);
  const cartTotal = selectedCartItems.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0,
  );

  const handleCheckout = () => {
    if (selectedCartItems.length === 0) {
      showToast(
        "warning",
        "No Items Selected",
        "Please select items to checkout.",
      );
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Confirm Checkout",
      message: `Place order for ${selectedCartItems.length} item(s) totaling ₱${cartTotal.toLocaleString()}?`,
      confirmLabel: "Yes, Place Order",
      variant: "info",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          const payload = {
            items: selectedCartItems.map((item) => ({
              product_id: item.id,
              quantity: item.cartQuantity,
            })),
          };

          const res = await fetch("http://192.168.254.111:5000/api/orders", {
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
              `Successfully ordered ${selectedCartItems.length} item(s).`,
            );

            const orderSummary = selectedCartItems.map((item) => ({
              name: item.displayName || item.name,
              size: item.size,
              qty: item.cartQuantity,
              price: item.price * item.cartQuantity,
            }));

            setReceiptData({
              groupId: data.groupId,
              total: cartTotal,
              items: orderSummary,
              digitalSignature: data.digitalSignature,
            });

            setCart((prev) => prev.filter((item) => !item.isSelected));
            setIsCartOpen(false);

            const updatedRes = await fetch(
              "http://192.168.254.111:5000/api/products",
            );
            const updatedData = await updatedRes.json();
            const available = updatedData.filter(
              (p: any) => p.stock_quantity > 0,
            );

            const grouped = available.reduce((acc: any, item: any) => {
              if (!acc[item.name]) {
                acc[item.name] = {
                  id: item.id,
                  name: item.name,
                  course: item.course,
                  description: item.description,
                  price: item.price,
                  sizes: [],
                };
              }
              acc[item.name].sizes.push({
                id: item.id,
                size: item.size,
                stock_quantity: item.stock_quantity,
              });
              return acc;
            }, {});

            setProducts(available);
            setGroupedProducts(Object.values(grouped));
          }
        } catch {
          showToast(
            "error",
            "Connection Error",
            "Could not connect to server.",
          );
        }
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

      <div className="shop-main-content">
        <div className="shop-header">
          <h1 className="shop-header-title">Shop Merchandise</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={18} /> <span className="cart-text">Cart</span>
              {cart.length > 0 && (
                <span className="cart-badge">
                  {cart.reduce((s, i) => s + i.cartQuantity, 0)}
                </span>
              )}
            </button>
            <Bell size={20} color="#6b7280" />
            <div className="shop-avatar">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={20} color="#dc2626" />
            </button>
          </div>
        </div>

        <div className="shop-content">
          <div className="shop-filters">
            {COURSES.map((course) => (
              <button
                key={course}
                className={`filter-tab ${selectedCourse === course ? "active" : ""}`}
                onClick={() => setSelectedCourse(course)}
              >
                {course === "All" ? "All" : course}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              No products available for {selectedCourse}.
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product: any) => (
                <div key={product.name} className="product-card">
                  <div className="product-image-container">
                    <img
                      src={getProductImage(product.name)}
                      alt={product.name}
                      className="product-image"
                    />
                  </div>
                  <div className="product-info">
                    <div className="product-course">{product.course}</div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-sizes-count">
                      {product.sizes.length}{" "}
                      {product.sizes.length === 1 ? "Size" : "Sizes"} Available
                    </div>
                    <div className="product-price">
                      ₱{Number(product.price).toLocaleString()}
                    </div>
                    <button
                      className="order-btn"
                      onClick={() => handleOpenSizeModal(product)}
                    >
                      <Plus size={16} /> Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isSizeModalOpen && selectedProduct && (
        <div
          className="modal-overlay"
          onClick={() => setIsSizeModalOpen(false)}
        >
          <div
            className="cart-modal size-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal-header">
              <h2 className="cart-modal-title">{selectedProduct.name}</h2>
              <button
                className="close-btn"
                onClick={() => setIsSizeModalOpen(false)}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>
            <p className="size-modal-desc">
              {selectedProduct.description || "No description available."}
            </p>
            <h3 className="size-modal-label">Select Size</h3>
            <div className="size-options-grid">
              {selectedProduct.sizes.map((sizeItem: any) => (
                <button
                  key={sizeItem.id}
                  onClick={() => handleAddToCart(sizeItem)}
                  disabled={sizeItem.stock_quantity <= 0}
                  className={`size-option-btn ${sizeItem.stock_quantity <= 0 ? "disabled" : ""}`}
                >
                  <span className="size-name">
                    {sizeItem.size || "Standard"}
                  </span>
                  <span className="size-stock">
                    {sizeItem.stock_quantity} left
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-modal-header">
              <h2 className="cart-modal-title">Your Cart</h2>
              <button
                className="close-btn"
                onClick={() => setIsCartOpen(false)}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            {cart.length > 0 && (
              <div className="select-all-row">
                <input
                  type="checkbox"
                  className="cart-checkbox"
                  checked={cart.every((item) => item.isSelected)}
                  onChange={(e) => toggleAllCartItems(e.target.checked)}
                />
                <span className="select-all-text">Select All</span>
              </div>
            )}

            <div className="cart-items-list">
              {cart.length === 0 ? (
                <div className="empty-cart-state">
                  <ShoppingCart size={48} color="#d1d5db" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="cart-item-row"
                    style={{ opacity: item.isSelected ? 1 : 0.5 }}
                  >
                    <div className="cart-item-left">
                      <input
                        type="checkbox"
                        className="cart-checkbox"
                        checked={item.isSelected}
                        onChange={() => toggleCartItem(item.id)}
                      />
                      <div className="cart-item-info">
                        <span className="cart-item-name">
                          {item.displayName}
                        </span>
                        <span className="cart-item-price">
                          ₱{Number(item.price).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="cart-item-actions">
                      <button
                        className="qty-btn"
                        onClick={() => updateCartQty(item.id, -1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="cart-qty">{item.cartQuantity}</span>
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
                <span>Total ({selectedCartItems.length} items):</span>
                <span>₱{cartTotal.toLocaleString()}</span>
              </div>
              <button
                className="checkout-submit-btn"
                onClick={handleCheckout}
                disabled={selectedCartItems.length === 0}
                style={{ opacity: selectedCartItems.length === 0 ? 0.5 : 1 }}
              >
                Checkout {selectedCartItems.length} Item(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptData && (
        <div className="modal-overlay" onClick={() => setReceiptData(null)}>
          <div
            className="cart-modal receipt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-top-header">
              <img src={logo} alt="LCC Logo" className="receipt-logo" />
              <div className="receipt-icon-badge">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 className="receipt-title">Thank you for purchasing!</h2>
              <p className="receipt-subtitle">
                Your order has been successfully placed.
              </p>
            </div>
            <div className="receipt-status-bar">
              <span>Status:</span>
              <span className="receipt-status-pending">
                Pending (Not yet paid)
              </span>
            </div>
            <div className="receipt-summary-box">
              <h3 className="receipt-section-title">Order Summary</h3>
              <div className="receipt-items">
                {receiptData.items.map((item: any, idx: number) => (
                  <div key={idx} className="receipt-item-row">
                    <span className="receipt-item-name">
                      {item.qty}x {item.name}
                    </span>
                    <span className="receipt-item-price">
                      ₱{item.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="receipt-total-row">
                <span>Total:</span>
                <span>₱{receiptData.total.toLocaleString()}</span>
              </div>
            </div>
            <div className="receipt-guide-box">
              <h3 className="receipt-section-title">Payment Guide</h3>
              <p className="receipt-guide-text">
                Please proceed to the <strong>LCC Cashier Office</strong> to pay
                for your order. Present the QR code below to the staff to
                process your payment.
              </p>
            </div>
            <div className="receipt-qr-box">
              <div className="receipt-group-label">
                Group #GRP-{String(receiptData.groupId).padStart(3, "0")}
              </div>
              <img
                src={`http://192.168.254.111:8000/generate-qr?order_id=${receiptData.groupId}`}
                alt={`QR for Group ${receiptData.groupId}`}
                className="receipt-qr-img"
              />
            </div>

            <div
              style={{
                marginTop: "20px",
                textAlign: "center",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#065f46",
                  fontWeight: "700",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <ShieldCheck size={18} /> Protected by Digital Signature
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "#047857",
                  margin: "4px 0 0 0",
                }}
              >
                This receipt is cryptographically secured and verified.
              </p>
            </div>

            <button
              className="receipt-done-btn"
              onClick={() => setReceiptData(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
