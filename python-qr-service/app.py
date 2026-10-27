from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import qrcode
import io

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route("/generate-qr", methods=["GET"])
def generate_qr():
    order_id = request.args.get("order_id")
    if not order_id:
        return jsonify({"error": "Order ID is required"}), 400

    qr = qrcode.QRCode(
        version=1,
        error_correction=1,
        box_size=10,
        border=4,
    )
    qr.add_data(f"LCC-ORDER-{order_id}")
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)

    return send_file(buf, mimetype="image/png")


if __name__ == "__main__":
    print("Python QR Server is running on port 8000")
    app.run(port=8000, debug=True)
