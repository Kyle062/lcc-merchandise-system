import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import Inventory from "./pages/Inventory/Inventory";
import Orders from "./pages/Orders/Orders";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/orders" element={<Orders />} />
    </Routes>
  );
}

export default App;
