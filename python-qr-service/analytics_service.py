from flask import Flask, jsonify, request          # Flask core: app, JSON responses, incoming requests
from flask_cors import CORS                        # Enables cross-origin requests from the frontend
import mysql.connector                             # MySQL database driver
from datetime import datetime, timedelta           # Date/time helpers for timeframe filters
import base64                                      # Decodes base64 image sent from frontend
import io                                          # In-memory byte streams (unused here but imported)
from PIL import Image                              # Image library (unused here but imported)
from pyzbar.pyzbar import decode                   # Barcode / QR decoder
import cv2                                         # OpenCV for image preprocessing
import numpy as np                                 # Array operations for OpenCV
import pytesseract                                 # OCR engine wrapper (reads text from images)
import re                                          # Regex for extracting ID digits

# Tells pytesseract where the Tesseract OCR executable lives on Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

app = Flask(__name__)                              # Creates the Flask application instance
CORS(app)                                          # Allows all origins to call this API

# Database connection settings
db_config = {
    "host": "localhost",                           # MySQL runs on this machine
    "user": "root",                                # MySQL username
    "password": "",                                # MySQL password (empty here)
    "database": "lcc_merchandise",                 # Target database name
}

# Opens and returns a new MySQL connection using db_config
def get_db_connection():
    return mysql.connector.connect(**db_config)


# ─────────────────────────────────────────────
# ROUTE: /admin-dashboard  (GET)
# Returns summary stats, recent orders, monthly sales, and inventory distribution for the admin dashboard
# ─────────────────────────────────────────────
@app.route("/admin-dashboard", methods=["GET"])
def get_admin_dashboard():
    try:
        conn = get_db_connection()                 # Open DB connection
        cursor = conn.cursor(dictionary=True)      # Rows come back as dicts

        # Total revenue across all orders
        cursor.execute("SELECT COALESCE(SUM(total_price), 0) as total_sales FROM orders")
        total_sales = float(cursor.fetchone()["total_sales"]) # type: ignore

        # Total number of distinct order groups (one group = one order)
        cursor.execute("SELECT COUNT(DISTINCT id) as total_orders FROM order_groups")
        total_orders = cursor.fetchone()["total_orders"] # type: ignore

        # Count of orders still marked Pending
        cursor.execute("SELECT COUNT(*) as pending_orders FROM order_groups WHERE status = 'Pending'")
        pending_orders = cursor.fetchone()["pending_orders"] # type: ignore

        # Count of products at or below the low-stock threshold (10)
        cursor.execute("SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity <= 10")
        low_stock = cursor.fetchone()["low_stock"] # type: ignore

        # Latest 5 orders with customer info + a preview product name
        cursor.execute("""
            SELECT 
                g.id as id, g.created_at as order_date, g.status,
                u.full_name, u.username,
                (SELECT p.name FROM orders o JOIN products p ON o.product_id = p.id WHERE o.group_id = g.id LIMIT 1) as product_name
            FROM order_groups g
            JOIN users u ON g.user_id = u.id
            ORDER BY g.created_at DESC
            LIMIT 5
        """)
        recent_orders = cursor.fetchall()
        for order in recent_orders:
            order["order_date"] = str(order["order_date"]) # type: ignore   # Convert datetime → string for JSON

        # Monthly sales totals + order counts for the chart
        cursor.execute("""
            SELECT 
                DATE_FORMAT(g.created_at, '%b') as month,
                SUM(o.total_price) as sales,
                COUNT(DISTINCT g.id) as orders
            FROM order_groups g
            JOIN orders o ON g.id = o.group_id
            GROUP BY MONTH(g.created_at)
            ORDER BY MONTH(g.created_at)
        """)
        sales_data = cursor.fetchall()
        for item in sales_data:
            item["sales"] = float(item["sales"]) # type: ignore   # Decimal → float for JSON

        # Stock totals per course/faculty (excludes general "All" items)
        cursor.execute("""
            SELECT course as name, SUM(stock_quantity) as value
            FROM products
            WHERE course != 'All'
            GROUP BY course
        """)
        inv_dist = cursor.fetchall()
        for item in inv_dist:
            item["value"] = int(item["value"]) # type: ignore    # Decimal → int for JSON

        cursor.close()                             # Close cursor
        conn.close()                               # Close connection

        # Return all dashboard data as one JSON payload
        return jsonify({
            "stats": {
                "totalSales": total_sales,
                "totalOrders": total_orders,
                "pendingOrders": pending_orders,
                "lowStock": low_stock,
            },
            "recentOrders": recent_orders,
            "salesData": sales_data,
            "inventoryData": inv_dist,
        })

    except Exception as e:
        print("Error in Admin Dashboard:", str(e)) # Log to console
        return jsonify({"error": str(e)}), 500     # Return 500 with error message


# ─────────────────────────────────────────────
# ROUTE: /analytics  (GET)
# Returns deeper analytics: stock per faculty, low-stock list, top sellers, revenue per faculty, daily orders
# ─────────────────────────────────────────────
@app.route("/analytics", methods=["GET"])
def get_analytics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Total stock grouped by course/faculty (excludes "All")
        cursor.execute("""
            SELECT course, SUM(stock_quantity) as total_stock 
            FROM products 
            WHERE course != 'All' 
            GROUP BY course
        """)
        stock_by_faculty = [
            {"name": row["course"], "value": int(row["total_stock"])} # type: ignore
            for row in cursor.fetchall()
        ]

        # Products with stock ≤ 10, sorted lowest first
        cursor.execute("""
            SELECT name, course, stock_quantity as stock 
            FROM products 
            WHERE stock_quantity <= 10 
            ORDER BY stock_quantity ASC
        """)
        low_stock = cursor.fetchall()

        # Top-selling products (only from Completed orders)
        cursor.execute("""
            SELECT p.name, SUM(o.quantity) as sold, SUM(o.total_price) as revenue
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status = 'Completed'
            GROUP BY p.id
        """)
        top_sellers_raw = cursor.fetchall()

        top_sellers = []
        for item in top_sellers_raw:
            top_sellers.append({
                "name": item["name"], # type: ignore
                "sold": item["sold"], # type: ignore
                "revenue": float(item["revenue"]), # type: ignore
            })
        # Keep only the top 5 sellers (sorted in Python, not SQL)
        top_sellers = sorted(top_sellers, key=lambda x: x["sold"], reverse=True)[:5]

        # Revenue grouped by faculty/course (Completed only, excludes "All")
        cursor.execute("""
            SELECT p.course, SUM(o.total_price) as revenue
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status = 'Completed' AND p.course != 'All'
            GROUP BY p.course
        """)
        revenue_by_faculty = [
            {"name": row["course"], "revenue": float(row["revenue"])} # type: ignore
            for row in cursor.fetchall()
        ]

        # Daily order counts for the last 14 days
        cursor.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as orders
            FROM order_groups
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """)
        daily_orders = [
            {"day": str(row["day"]), "orders": row["orders"]} # type: ignore
            for row in cursor.fetchall()
        ]

        avg_hours = 0                             # Placeholder — avg fulfillment time not implemented yet

        cursor.close()
        conn.close()

        # Return all analytics sections as JSON
        return jsonify({
            "stockByFaculty": stock_by_faculty,
            "lowStock": low_stock,
            "topSellers": top_sellers,
            "revenueByFaculty": revenue_by_faculty,
            "dailyOrders": daily_orders,
            "avgFulfillmentHours": avg_hours,
        })

    except Exception as e:
        print("Error in Analytics:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# ROUTE: /tailor-analytics  (GET)
# Accepts ?timeframe=day|month|week. Returns revenue chart, top 5 items, and total revenue
# ─────────────────────────────────────────────
@app.route("/tailor-analytics", methods=["GET"])
def get_tailor_analytics():
    timeframe = request.args.get("timeframe", "week") # Default = week

    # Pick start date + SQL filter based on timeframe
    if timeframe == "day":
        start_date = datetime.now().strftime("%Y-%m-%d")
        date_filter = "DATE(o.order_date) = %s"
    elif timeframe == "month":
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d") # First day of this month
        date_filter = "o.order_date >= %s"
    else: 
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d") # Last 7 days
        date_filter = "o.order_date >= %s"

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Revenue per day label (e.g. "Nov 25") for the chart
        # NOTE: %%b is required because this is an f-string with %s placeholders
        cursor.execute(f"""
            SELECT 
                DATE_FORMAT(o.order_date, '%%b %%d') as label,
                SUM(o.total_price) as revenue
            FROM orders o
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status IN ('Ready for Pickup', 'Completed') AND {date_filter}
            GROUP BY DATE_FORMAT(o.order_date, '%%b %%d')
            ORDER BY DATE(o.order_date) ASC
        """, (start_date,))
        
        revenue_data = cursor.fetchall()
        for item in revenue_data:
            item["revenue"] = float(item["revenue"]) # type: ignore   # Decimal → float

        # Top 5 items sold within timeframe
        cursor.execute(f"""
            SELECT 
                p.name as item_name,
                SUM(o.quantity) as total_qty
            FROM orders o
            JOIN order_groups g ON o.group_id = g.id
            JOIN products p ON o.product_id = p.id
            WHERE g.status IN ('Ready for Pickup', 'Completed') AND {date_filter}
            GROUP BY p.name
            ORDER BY total_qty DESC
            LIMIT 5
        """, (start_date,))
        top_items = cursor.fetchall()
        for item in top_items:
            item["total_qty"] = int(item["total_qty"]) # type: ignore

        # Total revenue in timeframe (0 if no orders)
        cursor.execute(f"""
            SELECT COALESCE(SUM(o.total_price), 0) as total
            FROM orders o
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status IN ('Ready for Pickup', 'Completed') AND {date_filter}
        """, (start_date,))
        total_revenue = float(cursor.fetchone()["total"]) # type: ignore

        cursor.close()
        conn.close()

        # Return tailor analytics as JSON
        return jsonify({
            "revenueChart": revenue_data,
            "topItemsChart": top_items,
            "totalRevenue": total_revenue,
        })

    except Exception as e:
        print("Error in Tailor Analytics:", str(e))
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# ROUTE: /scan-id  (POST)
# Accepts base64 image, tries barcode decoding (3 passes), falls back to OCR. Returns extracted 8–12 digit ID
# ─────────────────────────────────────────────
@app.route("/scan-id", methods=["POST"])
def scan_id():
    try:
        data = request.json                        # Read JSON body
        if not data or "image" not in data:        # Validate image field exists
            return jsonify({"success": False, "message": "Missing image."}), 400

        image_data = data["image"].split(",")[1]   # Strip "data:image/...;base64," prefix
        image_bytes = base64.b64decode(image_data) # Decode base64 → raw bytes

        nparr = np.frombuffer(image_bytes, np.uint8)         # Convert bytes → numpy array
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)          # Decode array → OpenCV image

        if img is None:                            # Guard against corrupt/unsupported image
            return jsonify({"success": False, "message": "Could not read image."})

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) # Convert to grayscale for decoding/OCR

        # Attempt 1: decode barcode on plain grayscale
        barcodes = decode(gray)
        if not barcodes:
            # Attempt 2: blur + Otsu threshold (handles noise/poor contrast)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)
            _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            barcodes = decode(thresh)
            
        if not barcodes:
            # Attempt 3: sharpening kernel (makes faint barcode edges stand out)
            kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
            sharpened = cv2.filter2D(gray, -1, kernel)
            barcodes = decode(sharpened)

        # If any barcode decoded → extract first 8–12 digit run
        if barcodes:
            for barcode in barcodes:
                barcode_text = barcode.data.decode("utf-8")
                match = re.search(r'\d{8,12}', barcode_text)
                if match:
                    return jsonify({
                        "success": True, 
                        "message": "ID Verified (Barcode)!", 
                        "barcode": match.group(),
                    })

        # Fallback: OCR pipeline
        blur = cv2.GaussianBlur(gray, (5, 5), 0)     # Smooth noise
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU) # Binarize
        
        # Upscale 2× to help Tesseract read small digits
        gray_resized = cv2.resize(thresh, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        
        # OCR using sparse-text mode (best for ID cards)
        text = pytesseract.image_to_string(gray_resized, config='--psm 11')
        
        cleaned_text = re.sub(r'[^0-9]', '', text)   # Keep only digits
        
        match = re.search(r'\d{8,12}', cleaned_text) # Look for valid ID length
        
        if match:
            return jsonify({
                "success": True,
                "message": "ID Verified (OCR)!",
                "barcode": match.group(),
            })

        # Nothing found at all → tell frontend to retry
        return jsonify({"success": False, "message": "Could not read ID. Please try again."})

    except Exception as e:
        print("Error in Barcode Scan:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


# Starts the server on all interfaces so a phone on the same WiFi can reach it
if __name__ == "__main__":
    print("Starting Analytics Python Service on port 8001...")
    app.run(host="0.0.0.0", port=8001, debug=True)