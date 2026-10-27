from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import qrcode
import io
import subprocess
import os

app = Flask(__name__)
# ✅ Allow requests from any origin (fixes potential CORS issues with React)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/generate-qr", methods=["GET"])
def generate_qr():
    order_id = request.args.get("order_id")
    if not order_id:
        return jsonify({"error": "Order ID is required"}), 400

    # Generate the QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=1,  # 1 is ERROR_CORRECT_L (fixes the red line in VS Code)
        box_size=10,
        border=4,
    )
    # The data encoded in the QR is just the Group ID
    qr.add_data(f"LCC-ORDER-{order_id}")
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Save to memory buffer
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)

    return send_file(buf, mimetype="image/png")


@app.route("/launch-camera", methods=["GET"])
def launch_camera():
    try:
        # ⚠️ IMPORTANT: PASTE YOUR EXACT DROIDCAM PATH HERE.
        # If you copied it from the shortcut properties, it might have quotes.
        # If it has quotes, remove the quotes and keep the r before the string.

        # Example: r"C:\Program Files (x86)\DroidCam\droidcam.exe"

        droidcam_path = r"C:\Program Files\DroidCam\Client\bin\64bit\droidcam.exe" 

        # Launch the app
        subprocess.Popen([droidcam_path])
        return jsonify({"message": "DroidCam launched successfully"})
    except Exception as e:
        print(f"Error launching DroidCam: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)
