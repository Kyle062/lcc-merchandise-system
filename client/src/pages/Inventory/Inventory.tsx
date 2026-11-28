import { API_BASE } from "../../config/api";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Download } from "lucide-react";
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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  QrCode,
  Image as ImageIcon,
} from "lucide-react";
import "./Inventory.css";
import logo from "../../assets/images/LCClogo1.png";

interface Product {
  id: number;
  name: string;
  course: string;
  description: string;
  price: number;
  size: string;
  stock_quantity: number;
  image_url: string | null;
}

type SortKey = "id" | "name" | "course" | "price" | "stock_quantity" | "size";
type SortOrder = "asc" | "desc";
type SortRule = { key: SortKey; order: SortOrder };

const COURSES = [
  "All",
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

const Inventory = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [stockState, setStockState] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: "id", order: "asc" },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    course: "All",
    description: "",
    price: "",
    size: "",
    stock_quantity: "",
    image_url: "",
  });

  const token = localStorage.getItem("token");

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: String(page),
        limit: String(limit),
        sort: `${sortRules[0].key}:${sortRules[0].order}`,
      });
      if (courseFilter !== "All") params.append("course", courseFilter);
      if (stockState !== "all") params.append("stock_state", stockState);

      const res = await fetch(
        `${API_BASE}/api/products/paged?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setProducts(Array.isArray(data?.rows) ? data.rows : []);
      setTotal(Number(data?.total || 0));
      setTotalPages(Number(data?.totalPages || 1));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setLoading(false);
    }
  }, [token, searchTerm, courseFilter, stockState, page, limit, sortRules]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    fetchProducts();
  }, [token, navigate, fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, courseFilter, stockState, limit]);

  const handleSort = (key: SortKey) => {
    setSortRules((prevRules) => [
      {
        key,
        order:
          prevRules[0].key === key && prevRules[0].order === "asc"
            ? "desc"
            : "asc",
      },
    ]);
    setPage(1);
  };

  const clearSort = () => {
    setSortRules([{ key: "id", order: "asc" }]);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCourseFilter("All");
    setStockState("all");
    setPage(1);
  };

  const handleDownloadExport = async (format: "csv" | "xls") => {
    const params = new URLSearchParams({ format });
    if (searchTerm) params.append("search", searchTerm);
    if (courseFilter !== "All") params.append("course", courseFilter);
    if (stockState !== "all") params.append("stock_state", stockState);

    try {
      const res = await fetch(
        `${API_BASE}/api/settings/export-inventory?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory.${format === "xls" ? "xls" : "csv"}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  const visibleProducts = products;

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
      course: "All",
      description: "",
      price: "",
      size: "",
      stock_quantity: "",
      image_url: "",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      course: product.course || "All",
      description: product.description || "",
      price: String(product.price),
      size: product.size || "",
      stock_quantity: String(product.stock_quantity),
      image_url: product.image_url || "",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setErrorMessage("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const url = editingProduct
      ? `${API_BASE}/api/products/${editingProduct.id}`
      : `${API_BASE}/api/products`;
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
      const res = await fetch(
        `${API_BASE}/api/products/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        await fetchProducts();
      } else {
        const data = await res.json();
        setErrorMessage(data.message || "Delete failed");
      }
    } catch (error) {
      setErrorMessage("Cannot connect to server.");
    }
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return { label: "Out of Stock", class: "stock-out" };
    if (qty < 10) return { label: `Low Stock (${qty})`, class: "stock-low" };
    return { label: `In Stock (${qty})`, class: "stock-good" };
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    const ruleIndex = sortRules.findIndex((r) => r.key === column);
    if (ruleIndex === -1) {
      return <ChevronsUpDown size={14} color="#9ca3af" />;
    }
    const rule = sortRules[ruleIndex];
    return (
      <div className="sort-icon-wrapper">
        {rule.order === "asc" ? (
          <ChevronUp size={14} color="#00874e" />
        ) : (
          <ChevronDown size={14} color="#00874e" />
        )}
        {sortRules.length > 1 && (
          <span className="sort-priority">{ruleIndex + 1}</span>
        )}
      </div>
    );
  };

  return (
    <div className="inventory-container">
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
            onClick={() => navigate("/scanner")}
          >
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/users")}
          >
            <Users size={20} /> <span>Users</span>
          </div>
          <div
            className="inventory-nav-item"
            onClick={() => navigate("/analytics")}
          >
            <BarChart3 size={20} /> <span>Analytics</span>
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
            <button
              className="inventory-export-btn"
              onClick={() => handleDownloadExport("csv")}
              title="Export inventory as CSV"
            >
              <Download size={16} /> CSV
            </button>
            <button
              className="inventory-export-btn"
              onClick={() => handleDownloadExport("xls")}
              title="Export inventory for Excel"
            >
              <Download size={16} /> Excel
            </button>
            <Bell size={20} className="inventory-header-icon" />
            <div className="inventory-avatar">A</div>
          </div>
        </div>

        <div className="inventory-content">
          <div className="inventory-toolbar">
            <div>
              <h2 className="inventory-title">Products ({total})</h2>
              <p className="inventory-subtitle">
                Sorted by <strong>{sortRules[0].key}</strong> (
                {sortRules[0].order}){" "}
                <button className="clear-sort-btn" onClick={clearSort}>
                  Clear sort
                </button>
              </p>
            </div>
            <button className="add-product-btn" onClick={openAddModal}>
              <Plus size={18} /> Add Product
            </button>
          </div>

          <div className="inventory-filter-bar">
            <label className="inventory-filter-search">
              <span>Search</span>
              <input
                type="search"
                placeholder="Name, description, size, course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <label>
              <span>Course / Department</span>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                {COURSES.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Stock</span>
              <select
                value={stockState}
                onChange={(e) => setStockState(e.target.value)}
              >
                <option value="all">All</option>
                <option value="low">Low (&lt;10)</option>
                <option value="out">Out of stock</option>
                <option value="in">In stock</option>
              </select>
            </label>
            <label>
              <span>Rows</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button className="inventory-clear-filters" onClick={clearFilters}>
              Clear filters
            </button>
          </div>

          {loading ? (
            <div className="inventory-loading">Loading products...</div>
          ) : visibleProducts.length === 0 ? (
            <div className="inventory-empty">
              <PackagePlus size={48} color="#9ca3af" />
              <h3>No matching records</h3>
              <p>Try a different search, course, or stock filter.</p>
              <button
                className="inventory-clear-filters"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="inventory-table-card">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th
                      className="sortable"
                      onClick={() => handleSort("id")}
                    >
                      <div className="th-content">
                        ID <SortIcon column="id" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("name")}
                    >
                      <div className="th-content">
                        Product Name <SortIcon column="name" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("course")}
                    >
                      <div className="th-content">
                        Course <SortIcon column="course" />
                      </div>
                    </th>
                    <th>Description</th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("size")}
                    >
                      <div className="th-content">
                        Size <SortIcon column="size" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("price")}
                    >
                      <div className="th-content">
                        Price <SortIcon column="price" />
                      </div>
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("stock_quantity")}
                    >
                      <div className="th-content">
                        Stock <SortIcon column="stock_quantity" />
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => {
                    const badge = getStockBadge(product.stock_quantity);
                    return (
                      <tr key={product.id}>
                        <td>#{product.id}</td>
                        <td style={{ fontWeight: 600 }}>{product.name}</td>
                        <td>
                          <span className="course-badge">{product.course}</span>
                        </td>
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
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() =>
                                handleDelete(product.id, product.name)
                              }
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

          <div className="inventory-pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div>
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

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
                <label>Product Image</label>
                <div className="image-upload-container">
                  {formData.image_url ? (
                    <div className="image-preview-wrapper">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() =>
                          setFormData({ ...formData, image_url: "" })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="image-upload-placeholder">
                      <ImageIcon size={24} color="#9ca3af" />
                      <span>Click to upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>
              </div>

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
                <label>Course *</label>
                <select
                  value={formData.course}
                  onChange={(e) =>
                    setFormData({ ...formData, course: e.target.value })
                  }
                  required
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
