import React, { useState } from 'react';
import { EyeOff, Eye } from 'lucide-react';

// Adjust these paths if your images are located elsewhere
import bgImage from '../assets/images/Background Merchandising.png';
import logo from '../assets/images/LCClogo1.png';
import heroLeft from '../assets/images/cartoon1.png';
import groupRight from '../assets/images/cartoon2.png';

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-brand-dark">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />

      {/* Decorative Characters */}
      <img 
        src={heroLeft} 
        alt="Students" 
        className="absolute bottom-0 left-0 w-auto h-[55%] md:h-[65%] z-10 object-contain pointer-events-none"
      />
      <img 
        src={groupRight} 
        alt="Campus Group" 
        className="absolute bottom-0 right-[15%] w-auto h-[40%] md:h-[45%] z-10 object-contain pointer-events-none hidden lg:block"
      />

      {/* Main Content Layout */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-8 py-12 flex flex-col lg:flex-row items-center justify-between h-full">
        
        {/* Left Section: Typography & Branding */}
        <div className="flex-1 text-white mb-16 lg:mb-32">
          {/* Logo & Header */}
          <div className="flex items-center gap-4 mb-16">
            <img src={logo} alt="LCC Logo" className="w-14 h-14 object-contain" />
            <div>
              <h1 className="text-xl font-semibold tracking-wide text-green-50">LEGACY COLLEGE OF COMPOSTELA</h1>
              <p className="text-sm text-green-100 font-light">Merchandise Order Management System</p>
            </div>
          </div>

          {/* Hero Copy */}
          <div className="max-w-xl">
            <p className="text-green-300 font-semibold mb-4 text-sm tracking-wide">
              For students, staff, and the merchandise office
            </p>
            <h2 className="text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-white">
              The campus store,<br />without the<br />tally sheet.
            </h2>
            <p className="text-green-50 text-sm leading-relaxed max-w-md opacity-90">
              Live stock counts, order status your students can actually check, and receipts that reconcile themselves.
            </p>
          </div>
        </div>

        {/* Right Section: Glassmorphic Form Card */}
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl border border-white/60">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-brand-green leading-tight">Welcome to<br/>LCC Merchandising</h3>
            <p className="text-gray-500 text-xs mt-2">Sign up to access your merchandising account</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* Username/Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email or username:</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green/50 bg-white/50"
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sign as:</label>
              <select className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green/50 bg-white/50 appearance-none">
                <option value="student">Student</option>
                <option value="staff">Merchandising Staff</option>
                <option value="finance">Finance Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Create Password */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Create Password:</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green/50 bg-white/50 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password:</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-green/50 bg-white/50 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              className="w-full bg-brand-green text-white font-bold py-3 rounded-lg mt-6 hover:bg-green-800 transition-colors shadow-lg shadow-green-900/20"
            >
              SIGN UP
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center mt-6 text-xs text-gray-500">
            Already have an account? <a href="/login" className="text-brand-green font-semibold hover:underline">Log In</a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignUp;