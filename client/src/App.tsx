import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
// import Dashboard from './pages/Dashboard'
// import ProductDetails from './pages/ProductDetails'
// import Profile from './pages/Profile'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Default route redirects to Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Protected Routes (You will add protection logic later)
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/profile" element={<Profile />} /> */}
    </Routes>
  )
}

export default App