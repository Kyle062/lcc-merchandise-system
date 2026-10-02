import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// Root health check
app.get("/", (req, res) => {
  res.json({ message: "LCC Merchandise API is running" });
});

// Register all API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

console.log("✅ app.ts loaded — all routes registered");

export default app;
