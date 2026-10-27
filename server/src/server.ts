import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Network Access: http://192.168.254.111:${PORT}`);
});
