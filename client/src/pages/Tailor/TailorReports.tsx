import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scissors,
  LogOut,
  Search,
  Bell,
  FileText,
  Download,
  DollarSign,
  Printer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./TailorDashboard.css";
import "./TailorReports.css";
import logo from "../../assets/images/LCClogo1.png";

const TailorReports = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    revenueChart: [],
    topItemsChart: [],
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("week");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Raw List from Node.js (for the table)
        const resList = await fetch(
          "http://192.168.254.111:5000/api/tailor/assigned",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const dataList = await resList.json();
        const finished = Array.isArray(dataList)
          ? dataList.filter(
              (o: any) =>
                o.status === "Ready for Pickup" || o.status === "Completed",
            )
          : [];
        setReports(finished);

        // 2. Fetch Analytics Charts from Python Service (Port 8001)
        const resAnalytics = await fetch(
          `http://192.168.254.111:8001/tailor-analytics?timeframe=${timeframe}`,
        );
        const dataAnalytics = await resAnalytics.json();
        setAnalytics(dataAnalytics);

        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, token, timeframe]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const input = document.getElementById("tailor-report-content");
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
      input.style.animation = "none";
      input.style.opacity = "1";

      // Wait for layout recalculation
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 2. Capture the canvas
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        // Ensure cloned elements have solid colors and no animations
        onclone: (clonedDoc) => {
          const clonedInput = clonedDoc.getElementById("tailor-report-content");
          if (clonedInput) {
            clonedInput.style.animation = "none";
            clonedInput.style.opacity = "1";
            const allElements = clonedInput.querySelectorAll("*");
            allElements.forEach((el: any) => {
              if (el.style) {
                el.style.opacity = "1";
              }
            });
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
      pdf.save("LCC-Tailor-Reports.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.group_id.toString().includes(searchTerm) ||
      r.student_name.toLowerCase().includes(searchTerm),
  );

  return (
    <div className="tailor-dashboard-container">
      <div className="tailor-sidebar no-print">
        <div className="tailor-sidebar-header">
          <img src={logo} alt="LCC Logo" className="tailor-sidebar-logo" />
          <div>
            <div className="tailor-sidebar-title">LCC Tailor</div>
            <div className="tailor-sidebar-subtitle">Production System</div>
          </div>
        </div>
        <nav className="tailor-sidebar-nav">
          <NavLink
            to="/tailor-dashboard"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/tailor-queue"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <Scissors size={20} /> <span>Work Queue</span>
          </NavLink>
          <NavLink
            to="/tailor-reports"
            className={({ isActive }) =>
              isActive ? "tailor-nav-item active" : "tailor-nav-item"
            }
          >
            <FileText size={20} /> <span>Reports</span>
          </NavLink>
        </nav>
        <div className="tailor-sidebar-footer" onClick={handleLogout}>
          <LogOut size={20} /> <span>Logout</span>
        </div>
      </div>

      <div className="tailor-main-content">
        <div className="tailor-header no-print">
          <h1 className="tailor-header-title">Tailoring Reports</h1>
          <div className="tailor-header-right">
            <div className="tailor-search-bar">
              <Search size={16} color="#6b7280" />
              <input
                type="text"
                placeholder="Search Group ID or Student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Bell size={20} className="tailor-header-icon" />
            <div className="tailor-avatar">T</div>
          </div>
        </div>

        {/* Print Header (Only visible when printing) */}
        <div className="print-only print-header">
          <img src={logo} alt="LCC Logo" className="print-logo" />
          <div className="print-header-titles">
            <h1 className="print-title">LCC Merchandise System</h1>
            <p className="print-subtitle">Tailoring Reports</p>
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
          className="tailor-dashboard-content fade-in"
          id="tailor-report-content"
        >
          <div className="report-top-bar">
            <div className="timeframe-filters no-print">
              <button
                className={timeframe === "day" ? "active" : ""}
                onClick={() => setTimeframe("day")}
              >
                Today
              </button>
              <button
                className={timeframe === "week" ? "active" : ""}
                onClick={() => setTimeframe("week")}
              >
                This Week
              </button>
              <button
                className={timeframe === "month" ? "active" : ""}
                onClick={() => setTimeframe("month")}
              >
                This Month
              </button>
            </div>

            <div className="revenue-card">
              <div className="revenue-icon">
                <DollarSign size={24} color="#059669" />
              </div>
              <div>
                <p className="revenue-label">Total Tailoring Revenue</p>
                <h3 className="revenue-value">
                  ₱{Number(analytics.totalRevenue || 0).toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="print-actions no-print">
              <button className="print-btn" onClick={handlePrint}>
                <Printer size={16} /> Print
              </button>
              <button
                className="print-btn"
                onClick={handleExportPDF}
                disabled={isExporting}
                style={{ opacity: isExporting ? 0.7 : 1 }}
              >
                <Download size={16} />
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>

          <div className="reports-charts-grid">
            <div className="report-chart-card">
              <h3 className="chart-title">Revenue Generated</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.revenueChart || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      formatter={(val) => `₱${val}`}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                      name="Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="report-chart-card">
              <h3 className="chart-title">Most Requested Merchandise</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topItemsChart || []}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="item_name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} />
                    <Bar
                      dataKey="total_qty"
                      fill="#d97706"
                      radius={[0, 4, 4, 0]}
                      name="Qty Ordered"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="tailor-table-card">
            <div className="tailor-table-header">
              <h3 className="tailor-table-title">Completed Tailoring Work</h3>
              {/* Note: Print button is now in the top bar, so we hide this one during print */}
            </div>

            {loading ? (
              <p style={{ textAlign: "center", padding: "20px" }}>
                Loading reports...
              </p>
            ) : filteredReports.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#6b7280",
                }}
              >
                No completed tailoring reports found.
              </p>
            ) : (
              <table className="tailor-table">
                <thead>
                  <tr>
                    <th>Group ID</th>
                    <th>Student</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Date Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.group_id}>
                      <td>#GRP-{String(report.group_id).padStart(3, "0")}</td>
                      <td>{report.student_name}</td>
                      <td>{report.item_count} item(s)</td>
                      <td>
                        <span
                          className={`tailor-badge status-${report.status.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td>
                        {new Date(report.order_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailorReports;
