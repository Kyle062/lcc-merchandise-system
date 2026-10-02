import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings as SettingsIcon, LogOut,
  Search, Bell, Store, Mail, Clock, Shield, Database, Download, Trash2,
  RefreshCw, AlertTriangle, Save, Eye, EyeOff, CheckCircle, Info
} from 'lucide-react';
import './Settings.css';
import logo from '../../assets/images/LCClogo1.png';
import Toast from '../../components/Toast/Toast';
import type { ToastMessage, ToastType } from '../../components/Toast/Toast';
import ConfirmDialog from '../../components/Toast/ConfirmDialog';

interface Settings {
  [key: string]: string;
}

interface SystemInfo {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingApprovals: number;
  databaseStatus: string;
  lastBackup: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({});
  const [originalSettings, setOriginalSettings] = useState<Settings>({});
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = (type: ToastType, title: string, message?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false, title: '', message: '', confirmLabel: 'Confirm',
    variant: 'danger', onConfirm: () => {},
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSettings();
    fetchSystemInfo();
  }, [token, navigate]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSettings(data);
      setOriginalSettings(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('error', 'Load Failed', 'Could not load settings.');
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings/system-info', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Error fetching system info:', error);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = async (key: string) => {
    const newValue = settings[key] === 'true' ? 'false' : 'true';
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    // Auto-save toggles
    await saveSetting({ [key]: newValue });
  };

  const saveSetting = async (payload: Settings) => {
    try {
      const res = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setOriginalSettings((prev) => ({ ...prev, ...payload }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const ok = await saveSetting(settings);
    setSaving(false);
    if (ok) {
      showToast('success', 'Settings Saved', 'Your changes have been saved successfully.');
      setOriginalSettings(settings);
    } else {
      showToast('error', 'Save Failed', 'Could not save settings.');
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    showToast('info', 'Changes Discarded', 'Reverted to last saved settings.');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    navigate('/login');
  };

  // DANGER ZONE Actions
  const handleClearCancelled = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Cancelled Orders?',
      message: 'This will permanently delete ALL orders with status "Cancelled". This cannot be undone.',
      confirmLabel: 'Clear Cancelled',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch('http://localhost:5000/api/settings/clear-cancelled', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            showToast('success', 'Orders Cleared', `${data.count} cancelled order(s) removed.`);
            fetchSystemInfo();
          } else {
            showToast('error', 'Failed', data.message);
          }
        } catch {
          showToast('error', 'Connection Error', 'Cannot reach server.');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetCounter = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Order Counter?',
      message: 'The next order will start from #ORD-001. Existing orders will NOT be deleted.',
      confirmLabel: 'Reset Counter',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const res = await fetch('http://localhost:5000/api/settings/reset-order-counter', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showToast('success', 'Counter Reset', 'Order IDs will start from #ORD-001.');
          } else {
            showToast('error', 'Failed', 'Could not reset counter.');
          }
        } catch {
          showToast('error', 'Connection Error', 'Cannot reach server.');
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleExport = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings/export-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lcc-orders-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('success', 'Export Complete', 'CSV file has been downloaded.');
    } catch {
      showToast('error', 'Export Failed', 'Could not generate CSV.');
    }
  };

  const renderToggle = (key: string, label: string, description?: string) => (
    <div className="setting-row">
      <div className="setting-label">
        <div className="setting-name">{label}</div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      <button
        type="button"
        className={`toggle-switch ${settings[key] === 'true' ? 'on' : 'off'}`}
        onClick={() => handleToggle(key)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );

  const renderInput = (
    key: string,
    label: string,
    type: string = 'text',
    placeholder?: string,
    description?: string
  ) => (
    <div className="setting-group">
      <label className="setting-input-label">{label}</label>
      {description && <div className="setting-desc">{description}</div>}
      <input
        type={type}
        className="setting-input"
        value={settings[key] || ''}
        onChange={(e) => handleChange(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const renderSelect = (
    key: string,
    label: string,
    options: string[],
    description?: string
  ) => (
    <div className="setting-group">
      <label className="setting-input-label">{label}</label>
      {description && <div className="setting-desc">{description}</div>}
      <select
        className="setting-input"
        value={settings[key] || ''}
        onChange={(e) => handleChange(key, e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-sidebar" />
        <div className="settings-main-content">
          <div className="settings-loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* SIDEBAR */}
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <img src={logo} alt="LCC Logo" className="settings-sidebar-logo" />
          <div>
            <div className="settings-sidebar-title">LCC Admin</div>
            <div className="settings-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="settings-sidebar-nav">
          <div className="settings-nav-item" onClick={() => navigate('/admin-dashboard')}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div className="settings-nav-item" onClick={() => navigate('/inventory')}>
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div className="settings-nav-item" onClick={() => navigate('/orders')}>
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div className="settings-nav-item" onClick={() => navigate('/users')}>
            <Users size={20} /> <span>Users</span>
          </div>
          <div className="settings-nav-item active">
            <SettingsIcon size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="settings-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="settings-main-content">
        <div className="settings-header">
          <div>
            <h1 className="settings-header-title">System Settings</h1>
            <p className="settings-subtitle">
              Configure your merchandise management system
            </p>
          </div>
          <div className="settings-header-right">
            {hasChanges && (
              <button className="btn-discard" onClick={handleReset}>
                <RefreshCw size={16} /> Discard
              </button>
            )}
            <button
              className="btn-save-all"
              onClick={handleSaveAll}
              disabled={!hasChanges || saving}
              style={{ opacity: !hasChanges || saving ? 0.5 : 1 }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <div className="settings-avatar">A</div>
          </div>
        </div>

        <div className="settings-content">
          {/* STORE INFORMATION */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-icon-green">
                <Store size={20} />
              </div>
              <div>
                <h2 className="settings-card-title">Store Information</h2>
                <p className="settings-card-subtitle">
                  Basic information displayed on receipts and reports
                </p>
              </div>
            </div>
            <div className="settings-card-body">
              <div className="settings-grid">
                {renderInput('store_name', 'Store Name', 'text', 'LCC Merchandise')}
                {renderInput('store_address', 'Address', 'text', 'Compostela, Davao de Oro')}
                {renderInput('store_email', 'Contact Email', 'email', 'merchandise@lcc.edu.ph')}
                {renderInput('store_phone', 'Contact Phone', 'text', '+63 900 000 0000')}
                {renderInput('store_hours', 'Store Hours', 'text', '8:00 AM - 5:00 PM, Mon-Fri')}
                {renderInput('cashier_location', 'Cashier Location', 'text', 'LCC Cashier Office')}
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-icon-blue">
                <Mail size={20} />
              </div>
              <div>
                <h2 className="settings-card-title">Notifications</h2>
                <p className="settings-card-subtitle">
                  Control automated email notifications
                </p>
              </div>
            </div>
            <div className="settings-card-body">
              {renderToggle(
                'notify_email_enabled',
                'Enable Email Notifications',
                'Master switch for all email notifications'
              )}
              {renderToggle(
                'notify_order_status',
                'Order Status Updates',
                'Notify students when their order status changes'
              )}
              {renderToggle(
                'notify_new_signup',
                'New Student Signup Alerts',
                'Notify admin when a new student registers'
              )}
              <div className="settings-grid" style={{ marginTop: 16 }}>
                {renderInput('sender_email', 'Sender Email Address', 'email', 'noreply@lcc.edu.ph')}
              </div>
            </div>
          </div>

          {/* ORDER & INVENTORY */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-icon-amber">
                <Package size={20} />
              </div>
              <div>
                <h2 className="settings-card-title">Order & Inventory</h2>
                <p className="settings-card-subtitle">
                  Configure order processing and stock management
                </p>
              </div>
            </div>
            <div className="settings-card-body">
              <div className="settings-grid">
                {renderInput('low_stock_threshold', 'Low Stock Threshold', 'number', '10', 'Show warning when stock is below this number')}
                {renderSelect('auto_deduct_stage', 'Auto-deduct Stock When Status Reaches', ['Processing', 'Completed'], 'Stock is automatically reduced at this stage')}
                {renderInput('order_prefix', 'Order ID Prefix', 'text', 'ORD-')}
              </div>
              <div style={{ marginTop: 16 }}>
                {renderToggle(
                  'allow_student_cancel',
                  'Allow Students to Cancel Orders',
                  'Students can cancel their own pending orders'
                )}
              </div>
            </div>
          </div>

          {/* SECURITY */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-icon-purple">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="settings-card-title">Security</h2>
                <p className="settings-card-subtitle">
                  Access control and account approval settings
                </p>
              </div>
            </div>
            <div className="settings-card-body">
              {renderToggle(
                'require_admin_approval',
                'Require Admin Approval for New Students',
                'New student sign-ups must be approved before they can log in'
              )}
              <div className="settings-grid" style={{ marginTop: 16 }}>
                {renderSelect('session_timeout', 'Session Timeout', ['30 minutes', '1 hour', '2 hours', '8 hours', '24 hours'])}
                {renderInput('min_password_length', 'Minimum Password Length', 'number', '6')}
              </div>
            </div>
          </div>

          {/* SYSTEM INFO */}
          {systemInfo && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon settings-icon-gray">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="settings-card-title">System Information</h2>
                  <p className="settings-card-subtitle">Read-only system status</p>
                </div>
              </div>
              <div className="settings-card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">System Version</div>
                    <div className="info-value">{settings.system_version || '1.0.0'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Database Status</div>
                    <div className="info-value info-status-ok">
                      <CheckCircle size={14} /> {systemInfo.databaseStatus}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Total Users</div>
                    <div className="info-value">{systemInfo.totalUsers}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Total Products</div>
                    <div className="info-value">{systemInfo.totalProducts}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Total Orders</div>
                    <div className="info-value">{systemInfo.totalOrders}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Pending Approvals</div>
                    <div className="info-value" style={{ color: systemInfo.pendingApprovals > 0 ? '#dc2626' : '#1f2937' }}>
                      {systemInfo.pendingApprovals}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          <div className="settings-card settings-danger-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-icon-red">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="settings-card-title">Danger Zone</h2>
                <p className="settings-card-subtitle">
                  Irreversible actions — proceed with caution
                </p>
              </div>
            </div>
            <div className="settings-card-body">
              <div className="danger-row">
                <div>
                  <div className="danger-title">Export All Orders</div>
                  <div className="danger-desc">Download all orders as a CSV file</div>
                </div>
                <button className="btn-danger-outline" onClick={handleExport}>
                  <Download size={16} /> Export CSV
                </button>
              </div>
              <div className="danger-row">
                <div>
                  <div className="danger-title">Clear Cancelled Orders</div>
                  <div className="danger-desc">Permanently delete all orders with status "Cancelled"</div>
                </div>
                <button className="btn-danger-outline" onClick={handleClearCancelled}>
                  <Trash2 size={16} /> Clear Cancelled
                </button>
              </div>
              <div className="danger-row">
                <div>
                  <div className="danger-title">Reset Order Counter</div>
                  <div className="danger-desc">Next order will start from #ORD-001</div>
                </div>
                <button className="btn-danger-outline" onClick={handleResetCounter}>
                  <RefreshCw size={16} /> Reset Counter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;