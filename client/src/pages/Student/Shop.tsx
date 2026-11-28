import { API_BASE, QR_SERVICE_BASE } from "../../config/api";
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
  Search,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import "./Shop.css";
import logo from "../../assets/images/LCClogo1.png";

import idImage from "../../assets/images/AlldepartmentID.jpg";
import uniformImage from "../../assets/images/AllDeptUniform.jpg";
import capImage from "../../assets/images/ITcap.jpg";
import slackImage from "../../assets/images/AllDeptSlacks.jpg";

// ✅ NEW IMPORTS for the newly added merchandise
import bscHatImage from "../../assets/images/BSCriminologyHat.jpg";
import bscPoloImage from "../../assets/images/BSCriminologyPolo.jpg";
import bsitShirtImage from "../../assets/images/BSITT-SHIRT.jpg";

import Toast from "../../components/Toast/Toast";
import type { ToastMessage, ToastType } from "../../components/Toast/Toast";
import ConfirmDialog from "../../components/Toast/ConfirmDialog";
import { COURSES } from "../../constants/courses";

const COURSE_FILTERS = ["My Course", "All", ...COURSES];

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [studentCourse, setStudentCourse] = useState(
    localStorage.getItem("course") || "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem("student_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [addedItem, setAddedItem] = useState<any>(null);

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
  const studentName = localStorage.getItem("full_name") || "Student";
  const [profilePicture, setProfilePicture] = useState(
    localStorage.getItem("profile_picture") || "",
  );

  useEffect(() => {
    if (!token) return;

    const fetchStudentCourse = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/student/profile`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) return;

        const data = await response.json();
        const course = data.course || "";
        setStudentCourse(course);
        localStorage.setItem("course", course);
        if (data.profile_picture) {
          setProfilePicture(data.profile_picture);
          localStorage.setItem("profile_picture", data.profile_picture);
        }
      } catch (error) {
        console.error("Unable to load student course:", error);
      }
    };

    fetchStudentCourse();
  }, [token]);

  // ✅ UPDATED STRICT IMAGE MAPPING
  const getProductImage = (name: string) => {
    const lowerName = name.toLowerCase();

    // New merchandise based on exact names
    if (lowerName.includes("criminology") && lowerName.includes("hat")) {
      return bscHatImage;
    }
    if (
      lowerName.includes("criminology") &&
      (lowerName.includes("polo") || lowerName.includes("uniform"))
    ) {
      return bscPoloImage;
    }
    if (
      lowerName.includes("bsit") &&
      (lowerName.includes("shirt") || lowerName.includes("t-shirt"))
    ) {
      return bsitShirtImage;
    }

    // Existing merchandise
    if (lowerName === "bsit cap") {
      return capImage;
    }
    if (lowerName.includes("id") || lowerName.includes("lanyard")) {
      return idImage;
    }
    if (lowerName.includes("slack") || lowerName.includes("pants")) {
      return slackImage;
    }
    if (
      lowerName.includes("department") ||
      (lowerName.includes("uniform") &&
        !lowerName.includes("pe") &&
        !lowerName.includes("cap") &&
        !lowerName.includes("criminology"))
    ) {
      return uniformImage;
    }

    return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=400";
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
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
    let result = groupedProducts;

    if (selectedCourse === "My Course") {
      result = result.filter(
        (p) => !studentCourse || p.course === studentCourse || p.course === "All",
      );
    } else if (selectedCourse !== "All") {
      result = result.filter((p) => p.course === selectedCourse);
    }

    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          (p.description && p.description.toLowerCase().includes(lowerQuery)) ||
          (p.course && p.course.toLowerCase().includes(lowerQuery)),
      );
    }

    setFilteredProducts(result);
  }, [selectedCourse, studentCourse, groupedProducts, searchQuery]);

  const handleOpenSizeModal = (product: any) => {
    setSelectedProduct(product);
    setSelectedSizeId(null);
    setIsSizeModalOpen(true);
  };

  const handleAddToCart = (sizeItem: any) => {
    if (!selectedProduct) return;

    const existing = cart.find((item) => item.id === sizeItem.id);
    if (existing && existing.cartQuantity >= sizeItem.stock_quantity) {
      showToast(
        "warning",
        "Stock Limit Reached",
        `Only ${sizeItem.stock_quantity} available.`,
      );
      return;
    }

    const hasSizeInName =
      sizeItem.size && selectedProduct.name.includes(`(${sizeItem.size})`);
    const displayName =
      hasSizeInName || !sizeItem.size
        ? selectedProduct.name
        : `${selectedProduct.name} (${sizeItem.size})`;
    const nextQuantity = existing ? existing.cartQuantity + 1 : 1;

    setCart((prev) => {
      if (prev.some((item) => item.id === sizeItem.id)) {
        return prev.map((item) =>
          item.id === sizeItem.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          id: sizeItem.id,
          name: selectedProduct.name,
          displayName,
          price: selectedProduct.price,
          size: sizeItem.size,
          stock_quantity: sizeItem.stock_quantity,
          cartQuantity: 1,
          isSelected: true,
        },
      ];
    });

    setAddedItem({
      id: sizeItem.id,
      displayName,
      price: selectedProduct.price,
      size: sizeItem.size,
      cartQuantity: nextQuantity,
      image: getProductImage(selectedProduct.name),
    });

    setIsSizeModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeId(null);
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

    const submitOrder = async (allowDuplicate: boolean) => {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      try {
        const payload: any = {
          items: selectedCartItems.map((item) => ({
            product_id: item.id,
            quantity: item.cartQuantity,
          })),
        };
        if (allowDuplicate) payload.allow_duplicate = true;

        const res = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409 && data.duplicate) {
            setConfirmDialog({
              isOpen: true,
              title: "Duplicate Order Detected",
              message: `${data.message} Place this order anyway?`,
              confirmLabel: "Place anyway",
              variant: "warning",
              onConfirm: () => submitOrder(true),
            });
            return;
          }
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
            `${API_BASE}/api/products`,
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
    };

    setConfirmDialog({
      isOpen: true,
      title: "Confirm Checkout",
      message: `Place order for ${selectedCartItems.length} item(s) totaling ₱${cartTotal.toLocaleString()}?`,
      confirmLabel: "Yes, Place Order",
      variant: "info",
      onConfirm: () => submitOrder(false),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("full_name");
    localStorage.removeItem("course");
    localStorage.removeItem("profile_picture");
    navigate("/login");
  };

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
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "shop-nav-item active" : "shop-nav-item"
            }
          >
            <UserRound size={20} /> <span>My Profile</span>
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
            <NavLink to="/profile" className="avatar-link" aria-label="My profile">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="header-avatar"
                />
              ) : (
                <div className="shop-avatar">
                  {studentName.charAt(0).toUpperCase()}
                </div>
              )}
            </NavLink>
            <button className="mobile-logout-btn" onClick={handleLogout}>
              <LogOut size={20} color="#dc2626" />
            </button>
          </div>
        </div>

        <div className="shop-content">
          <div className="shop-controls">
            <div className="shop-search-container">
              <Search size={18} className="shop-search-icon" />
              <input
                type="text"
                placeholder="Search merchandise..."
                className="shop-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="shop-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="shop-filters">
              {COURSE_FILTERS.map((course) => (
                <button
                  key={course}
                  className={`filter-tab ${selectedCourse === course ? "active" : ""}`}
                  onClick={() => setSelectedCourse(course)}
                  title={course === "My Course" && studentCourse ? `My Course (${studentCourse})` : course}
                >
                  {course === "My Course" && studentCourse
                    ? `My Course · ${studentCourse}`
                    : course}
                </button>
              ))}
            </div>

            {selectedCourse === "My Course" && !studentCourse && (
              <p className="shop-course-hint">
                Set your course in{" "}
                <NavLink to="/profile">My Profile</NavLink> to use this filter.
              </p>
            )}
          </div>

          {loading ? (
            <div className="loading-state">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              {selectedCourse === "My Course"
                ? `No merchandise found for ${studentCourse || "your course"}.`
                : "No products found matching your search."}
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
          onClick={() => {
            setIsSizeModalOpen(false);
            setSelectedSizeId(null);
          }}
        >
          <div
            className="cart-modal size-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn size-modal-close"
              aria-label="Close size selector"
              onClick={() => {
                setIsSizeModalOpen(false);
                setSelectedSizeId(null);
              }}
            >
              <X size={20} color="#6b7280" />
            </button>

            <div className="size-product-image">
              <img
                src={getProductImage(selectedProduct.name)}
                alt={selectedProduct.name}
              />
            </div>

            <div className="size-product-body">
              <h2 className="size-product-name">{selectedProduct.name}</h2>
              <p className="size-product-price">
                ₱{Number(selectedProduct.price).toLocaleString()}
              </p>

              <h3 className="size-modal-label">Select Size</h3>
              <div className="size-options-grid">
                {selectedProduct.sizes.map((sizeItem: any) => (
                  <button
                    key={sizeItem.id}
                    onClick={() => setSelectedSizeId(sizeItem.id)}
                    disabled={sizeItem.stock_quantity <= 0}
                    className={`size-option-btn ${
                      sizeItem.stock_quantity <= 0 ? "disabled" : ""
                    } ${selectedSizeId === sizeItem.id ? "selected" : ""}`}
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

              <div className="size-modal-footer">
                <button
                  className="size-confirm-btn"
                  disabled={selectedSizeId === null}
                  onClick={() => {
                    const sizeItem = selectedProduct.sizes.find(
                      (item: any) => item.id === selectedSizeId,
                    );
                    if (sizeItem) handleAddToCart(sizeItem);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addedItem && (
        <div className="modal-overlay" onClick={() => setAddedItem(null)}>
          <div
            className="cart-modal added-modal"
            role="dialog"
            aria-label="Added to cart"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn added-modal-close"
              aria-label="Close confirmation"
              onClick={() => setAddedItem(null)}
            >
              <X size={18} color="#6b7280" />
            </button>

            <div className="added-icon">
              <CheckCircle2 size={30} />
            </div>
            <h2 className="added-title">Added to Cart</h2>
            <p className="added-subtitle">
              Your item is ready for checkout.
            </p>

            <div className="added-product">
              <img src={addedItem.image} alt={addedItem.displayName} />
              <div className="added-product-info">
                <h3>{addedItem.displayName}</h3>
                <p>
                  Size: {addedItem.size || "Standard"} · Qty{" "}
                  {addedItem.cartQuantity}
                </p>
              </div>
              <strong>₱{Number(addedItem.price).toLocaleString()}</strong>
            </div>

            <div className="added-actions">
              <button
                className="added-secondary-btn"
                onClick={() => setAddedItem(null)}
              >
                Continue Shopping
              </button>
              <button
                className="added-primary-btn"
                onClick={() => {
                  setAddedItem(null);
                  setIsCartOpen(true);
                }}
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div
          className="modal-overlay cart-overlay"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="cart-modal cart-drawer"
            onClick={(e) => e.stopPropagation()}
          >
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
                      <div className="qty-pill">
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
                      </div>
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
                src={`${QR_SERVICE_BASE}/generate-qr?order_id=${receiptData.groupId}`}
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
