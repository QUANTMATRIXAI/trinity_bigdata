import React from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, BarChart3, Settings, LogOut } from "lucide-react"; // Removed unused 'LayoutDashboard'

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "12px",
      cursor: "pointer",
      color: active ? "#fff" : "#a1a1aa",
      background: active ? "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)" : "transparent",
      marginBottom: "8px",
      fontWeight: 500
    }}
  >
    <Icon size={20} />
    <span>{label}</span>
  </motion.div>
);

export default function DashboardLayout({ children, activeTab, onTabChange }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#09090b", color: "white", fontFamily: "Inter, sans-serif" }}>
      
      {/* 1. Sidebar */}
      <div style={{ width: "260px", padding: "24px", borderRight: "1px solid #27272a", display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px", paddingLeft: "10px" }}>
          <div style={{ width: "32px", height: "32px", background: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
            🚀
          </div>
          <h2 style={{ fontSize: "20px", margin: 0, fontWeight: "700" }}>DataFast</h2>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1 }}>
          <SidebarItem 
            icon={FileSpreadsheet} 
            label="Data Manager" 
            active={activeTab === "upload"} 
            onClick={() => onTabChange("upload")} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Analysis" 
            active={activeTab === "analysis"} 
            onClick={() => onTabChange("analysis")} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={() => onTabChange("settings")} 
          />
        </div>

        {/* User Profile (Bottom) */}
        <div style={{ paddingTop: "20px", borderTop: "1px solid #27272a" }}>
          <SidebarItem icon={LogOut} label="Logout" />
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {/* Top Header */}
        <div style={{ height: "64px", borderBottom: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "rgba(9, 9, 11, 0.8)", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10 }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#e4e4e7" }}>
            {activeTab === "upload" ? "📂 File Management" : "📊 Data Analysis"}
          </h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{ fontSize: "14px", color: "#a1a1aa" }}>v2.0.0 (Pro)</span>
          </div>
        </div>

        {/* Dynamic Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ padding: "32px" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}