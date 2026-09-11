import React from "react";
import { Search, Bell } from "lucide-react";

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <div className="header">
      <h1 className="header-title">{title}</h1>
      <div className="header-right">
        <div className="search-bar">
          <Search size={18} color="#6b7280" />
          <input type="text" placeholder="Search..." className="search-input" />
        </div>
        <Bell size={22} className="header-icon" />
        <div className="avatar">A</div>
      </div>
    </div>
  );
};

export default Header;
