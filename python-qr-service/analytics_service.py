from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from datetime import datetime, timedelta
import base64
import io
from PIL import Image
from pyzbar.pyzbar import decode
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "lcc_merchandise",
}


def get_db_connection():
    return mysql.connector.connect(**db_config)


# ==========================================
# 1. ADMIN DASHBOARD ROUTE
# ==========================================
@app.route("/admin-dashboard", methods=["GET"])
def get_admin_dashboard():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT COALESCE(SUM(total_price), 0) as total_sales FROM orders"
        )
        total_sales = float(cursor.fetchone()["total_sales"])  # type: ignore

        cursor.execute("SELECT COUNT(DISTINCT id) as total_orders FROM order_groups")
        total_orders = cursor.fetchone()["total_orders"]  # type: ignore

        cursor.execute(
            "SELECT COUNT(*) as pending_orders FROM order_groups WHERE status = 'Pending'"
        )
        pending_orders = cursor.fetchone()["pending_orders"]  # type: ignore

        cursor.execute(
            "SELECT COUNT(*) as low_stock FROM products WHERE stock_quantity <= 10"
        )
        low_stock = cursor.fetchone()["low_stock"]  # type: ignore

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
            order["order_date"] = str(order["order_date"])  # type: ignore

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
            item["sales"] = float(item["sales"])  # type: ignore

        cursor.execute("""
            SELECT course as name, SUM(stock_quantity) as value
            FROM products
            WHERE course != 'All'
            GROUP BY course
        """)
        inv_dist = cursor.fetchall()
        for item in inv_dist:
            item["value"] = int(item["value"])  # type: ignore

        cursor.close()
        conn.close()

        return jsonify(
            {
                "stats": {
                    "totalSales": total_sales,
                    "totalOrders": total_orders,
                    "pendingOrders": pending_orders,
                    "lowStock": low_stock,
                },
                "recentOrders": recent_orders,
                "salesData": sales_data,
                "inventoryData": inv_dist,
            }
        )

    except Exception as e:
        print("Error in Admin Dashboard:", str(e))
        return jsonify({"error": str(e)}), 500


# ==========================================
# 2. ANALYTICS PAGE ROUTE
# ==========================================
@app.route("/analytics", methods=["GET"])
def get_analytics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT course, SUM(stock_quantity) as total_stock 
            FROM products 
            WHERE course != 'All' 
            GROUP BY course
        """)
        stock_by_faculty = [
            {"name": row["course"], "value": int(row["total_stock"])}  # type: ignore
            for row in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT name, course, stock_quantity as stock 
            FROM products 
            WHERE stock_quantity <= 10 
            ORDER BY stock_quantity ASC
        """)
        low_stock = cursor.fetchall()

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
            top_sellers.append(
                {
                    "name": item["name"],  # type: ignore
                    "sold": item["sold"],  # type: ignore
                    "revenue": float(item["revenue"]),  # type: ignore
                }
            )
        top_sellers = sorted(top_sellers, key=lambda x: x["sold"], reverse=True)[:5]

        cursor.execute("""
            SELECT p.course, SUM(o.total_price) as revenue
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status = 'Completed' AND p.course != 'All'
            GROUP BY p.course
        """)
        revenue_by_faculty = [
            {"name": row["course"], "revenue": float(row["revenue"])}  # type: ignore
            for row in cursor.fetchall()
        ]

        cursor.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as orders
            FROM order_groups
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        """)
        daily_orders = [
            {"day": str(row["day"]), "orders": row["orders"]}  # type: ignore
            for row in cursor.fetchall()
        ]

        avg_hours = 0

        cursor.close()
        conn.close()

        return jsonify(
            {
                "stockByFaculty": stock_by_faculty,
                "lowStock": low_stock,
                "topSellers": top_sellers,
                "revenueByFaculty": revenue_by_faculty,
                "dailyOrders": daily_orders,
                "avgFulfillmentHours": avg_hours,
            }
        )

    except Exception as e:
        print("Error in Analytics:", str(e))
        return jsonify({"error": str(e)}), 500


# ==========================================
# 3. TAILOR ANALYTICS ROUTE
# ==========================================
@app.route("/tailor-analytics", methods=["GET"])
def get_tailor_analytics():
    timeframe = request.args.get("timeframe", "week")

    if timeframe == "day":
        start_date = datetime.now().strftime("%Y-%m-%d")
        date_filter = "DATE(o.order_date) = %s"
    elif timeframe == "month":
        start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
        date_filter = "o.order_date >= %s"
    else:  # week
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        date_filter = "o.order_date >= %s"

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            f"""
            SELECT 
                DATE_FORMAT(o.order_date, '%%b %%d') as label,
                SUM(o.total_price) as revenue
            FROM orders o
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status IN ('Ready for Pickup', 'Completed') AND {date_filter}
            GROUP BY DATE_FORMAT(o.order_date, '%%b %%d')
            ORDER BY DATE(o.order_date) ASC
        """,
            (start_date,),
        )

        revenue_data = cursor.fetchall()
        for item in revenue_data:
            item["revenue"] = float(item["revenue"])  # type: ignore

        cursor.execute(
            f"""
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
        """,
            (start_date,),
        )
        top_items = cursor.fetchall()
        for item in top_items:
            item["total_qty"] = int(item["total_qty"])  # type: ignore

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(o.total_price), 0) as total
            FROM orders o
            JOIN order_groups g ON o.group_id = g.id
            WHERE g.status IN ('Ready for Pickup', 'Completed') AND {date_filter}
        """,
            (start_date,),
        )
        total_revenue = float(cursor.fetchone()["total"])  # type: ignore

        cursor.close()
        conn.close()

        return jsonify(
            {
                "revenueChart": revenue_data,
                "topItemsChart": top_items,
                "totalRevenue": total_revenue,
            }
        )

    except Exception as e:
        print("Error in Tailor Analytics:", str(e))
        return jsonify({"error": str(e)}), 500


# ==========================================
# 4. BARCODE SCANNER ROUTE
# ==========================================
@app.route("/scan-id", methods=["POST"])
def scan_id():
    try:
        data = request.json
        if not data or "image" not in data or "full_name" not in data:
            return jsonify({"success": False, "message": "Missing image or name."}), 400

        # 1. Decode the base64 image from React
        image_data = data["image"].split(",")[1]
        image_bytes = base64.b64decode(image_data)

        # 2. Convert to OpenCV format for better processing
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 3. Convert to grayscale and decode barcodes
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        barcodes = decode(gray)

        if not barcodes:
            barcodes = decode(Image.open(io.BytesIO(image_bytes)))

        if not barcodes:
            return jsonify(
                {
                    "success": False,
                    "message": "No barcode detected. Please hold it closer to the camera.",
                }
            )

        # 4. Extract barcode text
        barcode_text = barcodes[0].data.decode("utf-8")
        print(f"Scanned Barcode: {barcode_text}")

        # 5. Validate the barcode and name
        VALID_BARCODE = "2024005107"
        VALID_NAME = "KYLE BERNARD A. TRIMIDAL"

        if barcode_text == VALID_BARCODE:
            if data["full_name"].upper() == VALID_NAME:
                return jsonify(
                    {
                        "success": True,
                        "message": "ID Verified successfully!",
                        "barcode": barcode_text,
                    }
                )
            else:
                return jsonify(
                    {
                        "success": False,
                        "message": "The name you entered does not match the ID barcode.",
                    }
                )
        else:
            return jsonify(
                {"success": False, "message": f"Unregistered barcode: {barcode_text}"}
            )

    except Exception as e:
        print("Error in Barcode Scan:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500


# ==========================================
# 5. RUN THE APP
# ==========================================
if __name__ == "__main__":
    print("Starting Analytics Python Service on port 8001...")
    app.run(host="0.0.0.0", port=8001, debug=True)
