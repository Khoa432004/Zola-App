'use client';

import { useState, useRef, useEffect } from 'react';
import UserProfileModal from './UserProfileModal';

interface SidebarProps {
  activePage?: 'chat' | 'friends' | 'social';
  onPageChange?: (page: 'chat' | 'friends' | 'social') => void;
}

export default function Sidebar({ activePage = 'chat', onPageChange }: SidebarProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  const handleLogout = () => {
    // TODO: Implement logout logic
    console.log('Logout');
    setShowSettingsMenu(false);
  };

  const handleExit = () => {
    // TODO: Implement exit logic
    console.log('Exit');
    setShowSettingsMenu(false);
  };

  return (
    <aside
      style={{
        width: 64,
        background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 20,
        paddingBottom: 20,
        gap: 12
      }}
    >
      {/* Avatar */}
      <div 
        onClick={() => setShowProfileModal(true)}
        style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          background: "#10b981", 
          overflow: "hidden", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          marginBottom: 4,
          border: "2px solid rgba(255,255,255,0.3)",
          cursor: "pointer",
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>A</span>
      </div>
      
      {/* Chat icon */}
      <div 
        onClick={() => onPageChange?.('chat')}
        style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 10, 
          background: activePage === 'chat' ? "rgba(255,255,255,0.2)" : "transparent", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      
      {/* Friends icon */}
      <div 
        onClick={() => onPageChange?.('friends')}
        style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 10, 
          background: activePage === 'friends' ? "rgba(255,255,255,0.2)" : "transparent", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      
      {/* Social icon */}
      <div 
        onClick={() => onPageChange?.('social')}
        style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 10, 
          background: activePage === 'social' ? "rgba(255,255,255,0.2)" : "transparent",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </div>
      
      {/* Cloud icon */}
      <div style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        cursor: "pointer",
        opacity: 0.7
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      </div>
      
      <div style={{ flex: 1 }} />
      
      {/* Settings icon with menu */}
      <div style={{ position: "relative" }} ref={settingsMenuRef}>
        <div 
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 10, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            cursor: "pointer",
            opacity: showSettingsMenu ? 1 : 0.8,
            background: showSettingsMenu ? "rgba(255,255,255,0.2)" : "transparent",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            if (!showSettingsMenu) {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showSettingsMenu) {
              e.currentTarget.style.opacity = "0.8";
              e.currentTarget.style.background = "transparent";
            }
          }}
          title="Cài đặt"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
          </svg>
        </div>

        {/* Settings Menu Dropdown */}
        {showSettingsMenu && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: "100%",
            marginLeft: 12,
            background: "#ffffff",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            minWidth: 200,
            padding: "8px 0",
            zIndex: 1000,
            border: "1px solid #e5e7eb"
          }}>
            {/* Ngôn ngữ */}
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <span style={{ fontSize: 14, color: "#111827" }}>Ngôn ngữ</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Hỗ trợ */}
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: 14, color: "#111827" }}>Hỗ trợ</span>
            </div>

            <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} />

            {/* Đăng xuất */}
            <div
              onClick={handleLogout}
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <span style={{ fontSize: 14, color: "#111827" }}>Đăng xuất</span>
            </div>

            {/* Thoát */}
            <div
              onClick={handleExit}
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <span style={{ fontSize: 14, color: "#111827" }}>Thoát</span>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </aside>
  );
}

