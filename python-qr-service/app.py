from flask import Flask, request, jsonify, send_file   # Flask core: app, query params, JSON responses, file streaming
from flask_cors import CORS                            # Enables cross-origin requests from the frontend
import qrcode                                          # QR code generator library
import io                                              # In-memory byte streams (used for the image buffer)

app = Flask(__name__)                                  # Creates the Flask application instance
CORS(app, resources={r"/*": {"origins": "*"}})         # Allow ALL origins on ALL routes (dev-friendly, lock down in prod)


# ─────────────────────────────────────────────
# ROUTE: /generate-qr  (GET)
# Example: GET /generate-qr?order_id=123
# Generates a QR code image encoding "LCC-ORDER-<id>" and returns it as a PNG
# ─────────────────────────────────────────────
@app.route("/generate-qr", methods=["GET"])
def generate_qr():
    order_id = request.args.get("order_id")            # Read ?order_id= from the URL
    if not order_id:                                   # Reject missing/empty order_id
        return jsonify({"error": "Order ID is required"}), 400

    qr = qrcode.QRCode(
        version=1,                                     # Smallest QR size (auto-grows via fit=True)
        error_correction=1,                            # Error correction level (1 = L, ~7% damage tolerance)
        box_size=10,                                   # Pixels per QR module (bigger = larger image)
        border=4,                                      # Quiet zone border (4 modules, standard minimum)
    )
    qr.add_data(f"LCC-ORDER-{order_id}")               # Content embedded in the QR code
    qr.make(fit=True)                                  # Auto-resize QR version to fit the data

    img = qr.make_image(fill_color="black", back_color="white")  # Render QR as a PIL image

    buf = io.BytesIO()                                 # In-memory buffer — avoids writing to disk
    img.save(buf)                                      # Save PNG bytes into the buffer
    buf.seek(0)                                        # ⚠️ Rewind to start — required, else 0 bytes are sent

    return send_file(buf, mimetype="image/png")        # Stream the PNG buffer back as the response


# Starts the server on all interfaces so a phone on the same WiFi can reach it
if __name__ == '__main__':
    # ✅ host='0.0.0.0' is required for your phone to reach it
    app.run(host='0.0.0.0', port=8000, debug=True)     # Port 8000; debug=True = auto-reload (dev only)