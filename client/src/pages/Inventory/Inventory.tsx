import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  PackagePlus,
} from "lucide-react";
import "./Inventory.css";
import logo from "../../assets/images/LCClogo1.png";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  size: string;
  stock_quantity: number;
  image_url: string | null;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    size: "",
    stock_quantity: "",
  });

  const token = localStorage.getItem("token");

  // Fetch all products
  const fetchProducts = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/products");
      const data = await res.json();
      setProducts(data);
      setFilteredProducts(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProducts();
  }, [token, navigate]);

  // Search filter
  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.size?.toLowerCase().includes(term),
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      size: "",
      stock_quantity: "",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      size: product.size || "",
      stock_quantity: String(product.stock_quantity),
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const url = editingProduct
      ? `http://localhost:5000/api/products/${editingProduct.id}`
      : "http://localhost:5000/api/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock_quantity: parseInt(formData.stock_quantity),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || data.details || "Operation failed");
        return;
      }

      await fetchProducts();
      closeModal();
    } catch (error: any) {
      setErrorMessage("Cannot connect to server.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchProducts();
      } else {
        const data = await res.json();
        alert(data.message || "Delete failed");
      }
    } catch (error) {
      alert("Cannot connect to server.");
    }
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return { label: "Out of Stock", class: "stock-out" };
    if (qty < 10) return { label: `Low Stock (${qty})`, class: "stock-low" };
    return { label: `In Stock (${qty})`, class: "stock-good" };
  };

  return (
    <div className="inventory-container">
      {/* SIDEBAR */}
      <div className="inventory-sidebar">
        <div className="inventory-sidebar-header">
          <img src={logo} alt="LCC Logo" className="inventory-sidebar-logo" />
          <div>
            <div className="inventory-sidebar-title">LCC Admin</div>
            <div className="inventory-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="inventory-sidebar-nav">
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div className="inventory-nav-item active">
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/orders")}
          >
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/users")}
          >
            <Users size={20} /> <span>Users</span>
          </div>
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="inventory-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="inventory-main-content">
        <div className="inventory-header">
          <h1 className="inventory-header-title">Inventory Management</h1>
          <div className="inventory-header-right">
            <div className="inventory-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search products..."
                className="inventory-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Bell size={20} className="inventory-header-icon" />
            <div className="inventory-avatar">A</div>
          </div>
        </div>

        <div className="inventory-content">
          <div className="inventory-toolbar">
            <div>
              <h2 className="inventory-title">
                Products ({filteredProducts.length})
              </h2>
              <p className="inventory-subtitle">
                Manage your merchandise catalog
              </p>
            </div>
            <button className="add-product-btn" onClick={openAddModal}>
              <Plus size={18} /> Add Product
            </button>
          </div>

          {loading ? (
            <div className="inventory-loading">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="inventory-empty">
              <PackagePlus size={48} color="#9ca3af" />
              <h3>No products found</h3>
              <p>Click "Add Product" to create your first item.</p>
            </div>
          ) : (
            <div className="inventory-table-card">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product Name</th>
                    <th>Description</th>
                    <th>Size</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const badge = getStockBadge(product.stock_quantity);
                    return (
                      <tr key={product.id}>
                        <td>#{product.id}</td>
                        <td style={{ fontWeight: 600 }}>{product.name}</td>
                        <td style={{ color: "#6b7280" }}>
                          {product.description}
                        </td>
                        <td>{product.size}</td>
                        <td style={{ fontWeight: 600 }}>
                          ₱{Number(product.price).toLocaleString()}
                        </td>
                        <td>
                          <span className={`stock-badge ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="action-btn edit"
                              onClick={() => openEditModal(product)}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() =>
                                handleDelete(product.id, product.name)
                              }
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? "Edit Product" : "Add New Product"}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="modal-error">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-row">
                <div className="modal-group">
                  <label>Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="modal-group">
                  <label>Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-group">
                <label>Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_quantity: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
