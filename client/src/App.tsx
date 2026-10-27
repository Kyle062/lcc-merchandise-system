import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

// Admin Pages
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import Inventory from "./pages/Inventory/Inventory";
import Orders from "./pages/Orders/Orders";
import Scanner from "./pages/Orders/Scanner";
import Users from "./pages/Users/Users";
import Settings from "./pages/Settings/Settings";
import Analytics from './pages/Analytics/Analytics';

// Student Pages
import StudentDashboard from "./pages/Dashboard/StudentDashboard";
import Shop from "./pages/Student/Shop";
import TrackOrders from "./pages/Student/TrackOrders"; 

function App() {
  return (
    <Routes>
      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Admin Routes */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route path="/users" element={<Users />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/settings" element={<Settings />} />
      

      {/* Student Routes */}
      <Route path="/student-dashboard" element={<StudentDashboard />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/track-orders" element={<TrackOrders />} /> 
    </Routes>
  );
}

export default App;