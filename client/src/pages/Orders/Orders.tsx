import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut,
  Search, Bell, Eye, Printer, X, ChevronUp, ChevronDown, ChevronsUpDown,
  RefreshCw, Filter
} from 'lucide-react';
import './Orders.css';
import logo from '../../assets/images/LCClogo1.png';

interface Order {
  id: number;
  quantity: number;
  total_price: number;
  status: string;
  order_date: string;
  product_id: number;
  product_name: string;
  product_course: string;
  product_size: string;
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

type SortKey = 'id' | 'full_name' | 'product_name' | 'total_price' | 'status' | 'order_date';
type SortOrder = 'asc' | 'desc';
type SortRule = { key: SortKey; order: SortOrder };

const STATUS_TABS = ['All', 'Pending', 'Processing', 'Ready for Pickup', 'Completed', 'Cancelled'];

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: 'order_date', order: 'desc' },
  ]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const token = localStorage.getItem('token');

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
        setLastUpdated(new Date());
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [token, navigate]);

  // ✅ Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  // Sorting
  const handleSort = (key: SortKey, isShiftKey: boolean) => {
    setSortRules((prevRules) => {
      const existingIndex = prevRules.findIndex((rule) => rule.key === key);

      if (isShiftKey) {
        if (existingIndex !== -1) {
          const updated = [...prevRules];
          updated[existingIndex] = {
            key,
            order: updated[existingIndex].order === 'asc' ? 'desc' : 'asc',
          };
          return updated;
        } else {
          return [...prevRules, { key, order: 'asc' }];
        }
      } else {
        if (existingIndex === 0 && prevRules.length === 1) {
          return [{ key, order: prevRules[0].order === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ key, order: 'asc' }];
      }
    });
  };

  const clearSort = () => {
    setSortRules([{ key: 'order_date', order: 'desc' }]);
  };

  // Filter + Sort
  const sortedAndFilteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();

    const filtered = orders.filter((o) => {
      const matchesSearch =
        String(o.id).includes(term) ||
        o.full_name?.toLowerCase().includes(term) ||
        o.username?.toLowerCase().includes(term) ||
        o.product_name?.toLowerCase().includes(term) ||
        o.product_course?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'All' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      for (const rule of sortRules) {
        let aVal: any = a[rule.key];
        let bVal: any = b[rule.key];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return rule.order === 'asc' ? -1 : 1;
        if (aVal > bVal) return rule.order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [orders, searchTerm, statusFilter, sortRules]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: any = {
      All: orders.length,
      Pending: 0,
      Processing: 0,
      'Ready for Pickup': 0,
      Completed: 0,
      Cancelled: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }, [orders]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to update status');
        return;
      }

      await fetchOrders();
    } catch (error) {
      alert('Cannot connect to server.');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'Pending': return 'status-pending';
      case 'Processing': return 'status-processing';
      case 'Ready for Pickup': return 'status-ready';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    const ruleIndex = sortRules.findIndex((r) => r.key === column);
    if (ruleIndex === -1) return <ChevronsUpDown size={14} color="#9ca3af" />;
    const rule = sortRules[ruleIndex];
    return (
      <div className="sort-icon-wrapper">
        {rule.order === 'asc' ? (
          <ChevronUp size={14} color="#00874e" />
        ) : (
          <ChevronDown size={14} color="#00874e" />
        )}
        {sortRules.length > 1 && <span className="sort-priority">{ruleIndex + 1}</span>}
      </div>
    );
  };

  return (
    <div className="orders-container">
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
          <div className="orders-nav-item" onClick={() => navigate('/admin-dashboard')}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate('/inventory')}>
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div className="orders-nav-item active">
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate('/users')}>
            <Users size={20} /> <span>Users</span>
          </div>
          <div className="orders-nav-item" onClick={() => navigate('/settings')}>
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="orders-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN */}
      <div className="orders-main-content">
        <div className="orders-header">
          <div>
            <h1 className="orders-header-title">Order Management</h1>
            <p className="orders-last-updated">
              Last updated: {lastUpdated.toLocaleTimeString('en-PH')}
            </p>
          </div>
          <div className="orders-header-right">
            <div className="orders-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search orders..."
                className="orders-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className={`auto-refresh-toggle ${autoRefresh ? 'on' : 'off'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw size={16} />
            </button>
            <div className="orders-avatar">A</div>
          </div>
        </div>

        <div className="orders-content">
          {/* STATUS TABS */}
          <div className="status-tabs">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                className={`status-tab ${statusFilter === s ? 'active' : ''} ${getStatusClass(s)}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
                <span className="status-count">{statusCounts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* SORT INFO */}
          <div className="orders-sort-info">
            <span>
              <Filter size={14} style={{ display: 'inline', marginRight: 6 }} />
              Showing <strong>{sortedAndFilteredOrders.length}</strong> order(s)
              {sortRules.length > 1 && (
                <>
                  {' — Multi-sort: '}
                  {sortRules.map((r, i) => (
                    <span key={r.key}>
                      {i > 0 && ' → '}
                      <strong>{r.key}</strong> ({r.order})
                    </span>
                  ))}
                  <button className="clear-sort-btn" onClick={clearSort}>Clear</button>
                </>
              )}
            </span>
          </div>

          {loading ? (
            <div className="orders-loading">Loading orders...</div>
          ) : sortedAndFilteredOrders.length === 0 ? (
            <div className="orders-empty">
              <ShoppingCart size={48} color="#9ca3af" />
              <h3>No orders found</h3>
              <p>Try a different filter or search term.</p>
            </div>
          ) : (
            <div className="orders-table-card">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={(e) => handleSort('id', e.shiftKey)}>
                      <div className="th-content">Order ID <SortIcon column="id" /></div>
                    </th>
                    <th className="sortable" onClick={(e) => handleSort('full_name', e.shiftKey)}>
                      <div className="th-content">Student <SortIcon column="full_name" /></div>
                    </th>
                    <th className="sortable" onClick={(e) => handleSort('product_name', e.shiftKey)}>
                      <div className="th-content">Product <SortIcon column="product_name" /></div>
                    </th>
                    <th>Qty</th>
                    <th className="sortable" onClick={(e) => handleSort('total_price', e.shiftKey)}>
                      <div className="th-content">Total <SortIcon column="total_price" /></div>
                    </th>
                    <th className="sortable" onClick={(e) => handleSort('status', e.shiftKey)}>
                      <div className="th-content">Status <SortIcon column="status" /></div>
                    </th>
                    <th className="sortable" onClick={(e) => handleSort('order_date', e.shiftKey)}>
                      <div className="th-content">Date <SortIcon column="order_date" /></div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#ORD-{String(order.id).padStart(3, '0')}</td>
                      <td>
                        <div className="student-cell">
                          <span className="student-name">{order.full_name || order.username}</span>
                          <span className="student-course">{order.product_course}</span>
                        </div>
                      </td>
                      <td>{order.product_name}</td>
                      <td>{order.quantity}</td>
                      <td style={{ fontWeight: 600 }}>₱{Number(order.total_price).toLocaleString()}</td>
                      <td>
                        <select
                          className={`status-select ${getStatusClass(order.status)}`}
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Ready for Pickup">Ready for Pickup</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td>{formatDate(order.order_date)}</td>
                      <td>
                        <button
                          className="action-btn view"
                          onClick={() => setSelectedOrder(order)}
                          title="View Receipt"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>
              <X size={20} />
            </button>

            <div className="receipt">
              <div className="receipt-header">
                <img src={logo} alt="LCC Logo" className="receipt-logo" />
                <div>
                  <h2>LEGACY COLLEGE OF COMPOSTELA</h2>
                  <p>Merchandise Order Management System</p>
                  <p className="receipt-address">Compostela, Davao de Oro</p>
                </div>
              </div>

              <div className="receipt-title">OFFICIAL RECEIPT</div>

              <div className="receipt-info">
                <div className="receipt-info-row">
                  <span>Order ID:</span>
                  <strong>#ORD-{String(selectedOrder.id).padStart(3, '0')}</strong>
                </div>
                <div className="receipt-info-row">
                  <span>Date:</span>
                  <strong>{formatDateTime(selectedOrder.order_date)}</strong>
                </div>
                <div className="receipt-info-row">
                  <span>Student:</span>
                  <strong>{selectedOrder.full_name || selectedOrder.username}</strong>
                </div>
                <div className="receipt-info-row">
                  <span>Course:</span>
                  <strong>{selectedOrder.product_course}</strong>
                </div>
              </div>

              <table className="receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedOrder.product_name}</td>
                    <td>{selectedOrder.product_size}</td>
                    <td>{selectedOrder.quantity}</td>
                    <td>
                      ₱{(selectedOrder.total_price / selectedOrder.quantity).toLocaleString()}
                    </td>
                    <td>₱{Number(selectedOrder.total_price).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className="receipt-total">
                <span>TOTAL</span>
                <span>₱{Number(selectedOrder.total_price).toLocaleString()}</span>
              </div>

              <div className="receipt-status-row">
                <span>Status:</span>
                <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div className="receipt-footer">
                <p className="receipt-note">
                  ⚠️ <strong>NOT AN OFFICIAL RECEIPT.</strong> Payment must be made at the LCC Cashier.
                </p>
                <p>Thank you for your order!</p>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn-print" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="btn-close" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;