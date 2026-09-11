import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import AdminDashboard from './pages/Dashboard/AdminDashboard'
// import StaffDashboard from './pages/Dashboard/StaffDashboard'
// import StudentDashboard from './pages/Dashboard/StudentDashboard'
// import FinanceDashboard from './pages/Dashboard/FinanceDashboard'
// import ProductDetails from './pages/ProductDetails'
// import Profile from './pages/Profile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Role-Based Dashboards */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      {/* <Route path="/staff-dashboard" element={<StaffDashboard />} />
      <Route path="/student-dashboard" element={<StudentDashboard />} />
      <Route path="/finance-dashboard" element={<FinanceDashboard />} /> */}
      
      {/* <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/profile" element={<Profile />} /> */}
    </Routes>
  )
}

export default App