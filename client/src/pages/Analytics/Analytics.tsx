import { API_BASE } from "../../config/api";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  QrCode,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Bell,
  Clock,
  DollarSign,
  Printer,
  Download,
  CalendarDays,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./Analytics.css";
import logo from "../../assets/images/LCClogo1.png";

const LOW_STOCK_PAGE_SIZE = 6;

const formatDayTick = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

type ReportPeriod = "all" | "today" | "week" | "month" | "custom";
type AppliedPeriod = { type: ReportPeriod; from: string; to: string };

const Analytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedPeriod, setAppliedPeriod] = useState<AppliedPeriod>({
    type: "all",
    from: "",
    to: "",
  });
  const [periodError, setPeriodError] = useState("");
  const [lowStockPage, setLowStockPage] = useState(0);
  const token = localStorage.getItem("token");

  const buildPeriodParams = () => {
    const params = new URLSearchParams();
    if (appliedPeriod.type !== "all")
      params.append("period", appliedPeriod.type);
    if (appliedPeriod.type === "custom") {
      if (appliedPeriod.from) params.append("date_from", appliedPeriod.from);
      if (appliedPeriod.to) params.append("date_to", appliedPeriod.to);
    }
    return params;
  };

  const applyPreset = (next: ReportPeriod) => {
    setPeriod(next);
    setPeriodError("");
    setAppliedPeriod({ type: next, from: "", to: "" });
  };

  const applyCustomPeriod = () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setPeriodError("From date must be on or before To date.");
      return;
    }
    if (!dateFrom && !dateTo) {
      setPeriodError("Choose a From or To date for a custom range.");
      return;
    }
    setPeriodError("");
    setPeriod("custom");
    setAppliedPeriod({ type: "custom", from: dateFrom, to: dateTo });
  };

  const activePeriodLabel =
    data?.period ||
    (appliedPeriod.type === "all"
      ? "All Dates"
      : appliedPeriod.type === "custom"
        ? `Custom (${appliedPeriod.from || "start"} – ${appliedPeriod.to || "end"})`
        : appliedPeriod.type);

  const reportKey = `${appliedPeriod.type}|${appliedPeriod.from}|${appliedPeriod.to}`;

  const lowStockItems: any[] = Array.isArray(data?.lowStock)
    ? data.lowStock
    : [];
  const lowStockPageCount = Math.max(
    1,
    Math.ceil(lowStockItems.length / LOW_STOCK_PAGE_SIZE),
  );
  const safeLowStockPage = Math.min(lowStockPage, lowStockPageCount - 1);
  const lowStockStart = safeLowStockPage * LOW_STOCK_PAGE_SIZE;
  const lowStockEnd = Math.min(
    lowStockStart + LOW_STOCK_PAGE_SIZE,
    lowStockItems.length,
  );

  const periodFileLabel = () =>
    activePeriodLabel
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = buildPeriodParams();
        const res = await fetch(
          `${API_BASE}/api/analytics?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const result = await res.json();
        if (res.ok) setData(result);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token, navigate, appliedPeriod]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById("analytics-report-content");
    if (!input) return;

    setIsExporting(true);

    try {
      // 1. Temporarily remove internal scrolling and set a fixed width
      const originalWidth = input.style.width;
      const originalHeight = input.style.height;
      const originalOverflow = input.style.overflow;
      const originalAnimation = input.style.animation;
      const originalOpacity = input.style.opacity;

      // Force the container to expand fully and disable animations
      input.style.width = "1200px";
      input.style.height = "auto";
      input.style.overflow = "visible";
      input.style.animation = "none"; // Disable fade-in
      input.style.opacity = "1"; // Force solid opacity

      // Wait for layout recalculation
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2. Capture the canvas
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        // The onclone function ensures the cloned document has solid colors
        onclone: (clonedDoc) => {
          const clonedInput = clonedDoc.getElementById(
            "analytics-report-content",
          );
          if (clonedInput) {
            clonedInput.style.animation = "none";
            clonedInput.style.opacity = "1";

            // Force all child elements to have solid opacity
            const allElements = clonedInput.querySelectorAll("*");
            allElements.forEach((el: any) => {
              if (el.style) {
                el.style.opacity = "1";
              }
            });

            // The PDF is a complete report, so include every low-stock alert
            // instead of only the rows visible on the current page.
            clonedInput
              .querySelectorAll(".analytics-low-stock-row")
              .forEach((row: any) => {
                row.style.display = "table-row";
              });
            const clonedPager = clonedInput.querySelector(
              ".analytics-pager",
            ) as HTMLElement | null;
            if (clonedPager) clonedPager.style.display = "none";
          }
        },
      });

      // 3. Restore original styles immediately
      input.style.width = originalWidth;
      input.style.height = originalHeight;
      input.style.overflow = originalOverflow;
      input.style.animation = originalAnimation;
      input.style.opacity = originalOpacity;

      // 4. Generate PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`LCC-Analytics-Report-${periodFileLabel()}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSales = async (format: "csv" | "xls") => {
    const params = buildPeriodParams();
    params.append("format", format);
    try {
      const res = await fetch(
        `${API_BASE}/api/settings/export-sales?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales_summary_${periodFileLabel()}.${format === "xls" ? "xls" : "csv"}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="analytics-container">
      {/* SIDEBAR */}
      <div className="analytics-sidebar no-print">
        <div className="analytics-sidebar-header">
          <img src={logo} alt="LCC Logo" className="analytics-sidebar-logo" />
          <div>
            <div className="analytics-sidebar-title">LCC Admin</div>
            <div className="analytics-sidebar-subtitle">Merchandise System</div>
          </div>
        </div>
        <nav className="analytics-sidebar-nav">
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/admin-dashboard")}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/inventory")}
          >
            <Package size={20} /> <span>Inventory</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/orders")}
          >
            <ShoppingCart size={20} /> <span>Orders</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/scanner")}
          >
            <QrCode size={20} /> <span>QR Scanner</span>
          </div>

          <div
            className="analytics-nav-item"
            onClick={() => navigate("/users")}
          >
            <Users size={20} /> <span>Users</span>
          </div>
          <div className="analytics-nav-item active">
            <BarChart3 size={20} /> <span>Analytics</span>
          </div>
          <div
            className="analytics-nav-item"
            onClick={() => navigate("/settings")}
          >
            <Settings size={20} /> <span>Settings</span>
          </div>
        </nav>
        <div className="analytics-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="analytics-main-content">
        <div className="analytics-header no-print">
          <div>
            <h1 className="analytics-header-title">Analytics & Reports</h1>
            <div className="analytics-period-toolbar">
              <span className="analytics-period-toolbar-label">
                Reporting period
              </span>
              <div
                className="analytics-period-filters"
                role="group"
                aria-label="Reporting period"
              >
                <button
                  className={period === "all" ? "active" : ""}
                  aria-pressed={period === "all"}
                  onClick={() => applyPreset("all")}
                >
                  All
                </button>
                <button
                  className={period === "today" ? "active" : ""}
                  aria-pressed={period === "today"}
                  onClick={() => applyPreset("today")}
                >
                  Today
                </button>
                <button
                  className={period === "week" ? "active" : ""}
                  aria-pressed={period === "week"}
                  onClick={() => applyPreset("week")}
                >
                  This Week
                </button>
                <button
                  className={period === "month" ? "active" : ""}
                  aria-pressed={period === "month"}
                  onClick={() => applyPreset("month")}
                >
                  This Month
                </button>
                <button
                  className={period === "custom" ? "active" : ""}
                  aria-pressed={period === "custom"}
                  onClick={() => {
                    setPeriod("custom");
                    setPeriodError("");
                  }}
                >
                  <CalendarDays size={13} /> Custom
                </button>
              </div>
              {period === "custom" && (
                <div className="analytics-custom-range">
                  <input
                    type="date"
                    aria-label="From date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    aria-label="To date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                  <button
                    type="button"
                    className="analytics-period-apply"
                    onClick={applyCustomPeriod}
                  >
                    Apply
                  </button>
                </div>
              )}
              <span className="analytics-period-active">
                Active: <strong>{activePeriodLabel}</strong>
              </span>
            </div>
            {periodError && (
              <div className="analytics-period-error" role="alert">
                {periodError}
              </div>
            )}
          </div>
          <div className="analytics-header-actions">
            <span className="analytics-export-note">
              Exports use the active period
            </span>
            <button
              className="analytics-action-btn"
              onClick={() => handleDownloadSales("csv")}
              title="Download sales summary as CSV"
            >
              <Download size={18} /> CSV
            </button>
            <button
              className="analytics-action-btn"
              onClick={() => handleDownloadSales("xls")}
              title="Download sales summary for Excel"
            >
              <Download size={18} /> Excel
            </button>
            <button className="analytics-action-btn" onClick={handlePrint}>
              <Printer size={18} />
              Print
            </button>
            <button
              className="analytics-action-btn"
              onClick={handleExportPDF}
              disabled={isExporting}
              style={{ opacity: isExporting ? 0.7 : 1 }}
            >
              <Download size={18} />
              {isExporting ? "Exporting..." : "Export PDF"}
            </button>
            <Bell size={20} color="#6b7280" style={{ marginLeft: "10px" }} />
          </div>
        </div>

        {/* Print Header (Only visible when printing) */}
        <div className="print-only print-header">
          <img src={logo} alt="LCC Logo" className="print-logo" />
          <div className="print-header-titles">
            <h1 className="print-title">LCC Merchandise System</h1>
            <p className="print-subtitle">Analytics & Reports</p>
            <p className="print-period">Period: {activePeriodLabel}</p>
          </div>
          <div className="print-date">
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        <div
          key={reportKey}
          className="analytics-content fade-in"
          id="analytics-report-content"
        >
          {loading && (
            <div className="analytics-loading-banner" role="status">
              <span className="analytics-loading-spinner" />
              Refreshing reports for {activePeriodLabel}…
            </div>
          )}

          <div className="report-period-label">
            <span>Reporting Period</span>
            <strong>{activePeriodLabel}</strong>
          </div>

          {/* KPI CARDS ROW */}
          <div className="analytics-kpi-grid">
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#ecfdf5", color: "#15803d" }}
              >
                <Clock size={24} />
              </div>
              <div>
                <p className="kpi-label">Avg. Fulfillment Time</p>
                <h3 className="kpi-value">
                  {data?.avgFulfillmentHours || 0} Hours
                </h3>
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#eff6ff", color: "#3b82f6" }}
              >
                <Package size={24} />
              </div>
              <div>
                <p className="kpi-label">Total Items in Stock</p>
                <h3 className="kpi-value">
                  {data?.stockByFaculty
                    ?.reduce((acc: number, curr: any) => acc + curr.value, 0)
                    .toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="analytics-kpi-card">
              <div
                className="kpi-icon-wrap"
                style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="kpi-label">Low Stock Items</p>
                <h3 className="kpi-value">
                  {data?.lowStock?.length || 0} Alerts
                </h3>
              </div>
            </div>
          </div>

          {/* STOCK AND QUEUE DIAGNOSTICS */}
          <div className="analytics-card diagnostics-card">
            <div className="analytics-card-header">
              <AlertCircle size={20} color="#dc2626" />
              <h3 className="analytics-card-title">
                Stock & Queue Diagnostics
              </h3>
            </div>
            <p className="diagnostics-message">
              {data?.diagnostics?.message || "No aging bottlenecks detected."}
            </p>
            <div className="diagnostics-grid">
              <div>
                <span>Pending past 24h</span>
                <strong>{data?.diagnostics?.pendingStuck || 0}</strong>
              </div>
              <div>
                <span>Processing past 48h</span>
                <strong>{data?.diagnostics?.processingStuck || 0}</strong>
              </div>
              <div>
                <span>In Tailoring past 72h</span>
                <strong>{data?.diagnostics?.tailoringStuck || 0}</strong>
              </div>
              <div>
                <span>Avg. Fulfillment</span>
                <strong>{data?.avgFulfillmentHours || 0} hours</strong>
              </div>
            </div>
            {data?.diagnostics?.bottlenecks?.length > 0 && (
              <div className="diagnostics-bottlenecks">
                <strong>Oldest active orders</strong>
                <ul>
                  {data.diagnostics.bottlenecks.map((item: any) => (
                    <li key={item.groupId}>
                      {item.groupCode || `#GRP-${item.groupId}`} · {item.status} ·{" "}
                      {item.ageHours}h
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* CHARTS ROW 1 */}
          <div className="analytics-charts-grid">
            <div className="analytics-card">
              <h3 className="analytics-card-title">
                Current Stock by Faculty
              </h3>
              <p className="analytics-report-note">
                Current inventory snapshot — not affected by the selected period.
              </p>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.stockByFaculty || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#15803d"
                      radius={[4, 4, 0, 0]}
                      name="Units in Stock"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-card-title">
                Daily Order Volume · {activePeriodLabel}
              </h3>
              {data?.dailyOrders?.length ? (
                <div className="chart-frame">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyOrders}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11 }}
                        tickFormatter={formatDayTick}
                      />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke="#15803d"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#15803d" }}
                        name="Orders"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="analytics-empty chart-empty">
                  No orders placed in this period.
                </div>
              )}
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div className="analytics-tables-grid">
            {/* Top Sellers Table */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <TrendingUp size={20} color="#15803d" />
                <h3 className="analytics-card-title">
                  Top Sellers · {activePeriodLabel}
                </h3>
              </div>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product Name</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topSellers?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td
                        style={{
                          fontWeight: 700,
                          color: index === 0 ? "#15803d" : "#6b7280",
                        }}
                      >
                        #{index + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.sold} units</td>
                      <td style={{ fontWeight: 600 }}>
                        ₱{item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {data?.topSellers?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="analytics-empty">
                        No completed orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Low Stock Alerts Table */}
            <div className="analytics-card">
              <div className="analytics-card-header">
                <AlertTriangle size={20} color="#dc2626" />
                <h3
                  className="analytics-card-title"
                  style={{ color: "#dc2626" }}
                >
                  Low Stock Alerts
                </h3>
              </div>
              <p className="analytics-report-note">
                Movement flags use the active period; stock levels are current.
              </p>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Course</th>
                    <th>Stock</th>
                    <th>Reorder At</th>
                    <th>Units Sold (period)</th>
                    <th>Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item: any, index: number) => (
                    <tr
                      key={index}
                      className="analytics-low-stock-row"
                      style={{
                        display:
                          index >= lowStockStart && index < lowStockEnd
                            ? "table-row"
                            : "none",
                      }}
                    >
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span
                          style={{
                            backgroundColor: "#f3f4f6",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {item.course}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor:
                              item.stock === 0 ? "#fee2e2" : "#fef3c7",
                            color: item.stock === 0 ? "#991b1b" : "#92400e",
                          }}
                        >
                          {item.stock} left
                        </span>
                      </td>
                      <td>{item.reorderThreshold ?? 10}</td>
                      <td>{item.unitsSoldPeriod ?? item.unitsSold30d ?? 0}</td>
                      <td>
                        <span
                          className={`velocity-badge velocity-${item.velocity || "slow"}`}
                        >
                          {item.velocity || "slow"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="analytics-empty">
                        All products are well-stocked.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {lowStockPageCount > 1 && (
                <div className="analytics-pager no-print">
                  <button
                    type="button"
                    className="analytics-pager-btn"
                    aria-label="Previous low stock alerts"
                    disabled={safeLowStockPage === 0}
                    onClick={() =>
                      setLowStockPage((page) => Math.max(0, page - 1))
                    }
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="analytics-pager-label">
                    {lowStockStart + 1}–{lowStockEnd} of {lowStockItems.length} ·
                    Page {safeLowStockPage + 1} of {lowStockPageCount}
                  </span>
                  <button
                    type="button"
                    className="analytics-pager-btn"
                    aria-label="Next low stock alerts"
                    disabled={safeLowStockPage >= lowStockPageCount - 1}
                    onClick={() =>
                      setLowStockPage((page) =>
                        Math.min(lowStockPageCount - 1, page + 1),
                      )
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* REVENUE PER FACULTY CHART */}
          <div className="analytics-card">
            <div className="analytics-card-header">
              <DollarSign size={20} color="#15803d" />
              <h3 className="analytics-card-title">
                Revenue per Faculty · {activePeriodLabel}
              </h3>
            </div>
            {data?.revenueByFaculty?.length ? (
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.revenueByFaculty}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => `₱${value.toLocaleString()}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        `₱${Number(value).toLocaleString()}`
                      }
                      contentStyle={{
                        borderRadius: 8,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      name="Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="analytics-empty chart-empty">
                No completed sales in this period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
