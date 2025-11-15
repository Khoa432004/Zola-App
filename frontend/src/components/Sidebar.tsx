'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import UserProfileModal from './UserProfileModal';
import MyPostsModal from './MyPostsModal';
import TrashModal from './TrashModal';

interface SidebarProps {
  activePage?: 'chat' | 'friends' | 'social';
  onPageChange?: (page: 'chat' | 'friends' | 'social') => void;
}

export default function Sidebar({ activePage = 'chat', onPageChange }: SidebarProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyPostsModal, setShowMyPostsModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { logout, user } = useAuth();
  
  // Lấy chữ cái đầu của tên user hoặc email
  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'A';
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showSettingsMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu, showUserMenu]);

  const handleLogout = async () => {
    try {
      setShowSettingsMenu(false);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setShowSettingsMenu(false);
    }
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
      {/* Avatar with User Menu */}
      <div style={{ position: "relative" }} ref={userMenuRef}>
        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            background: user?.avatar 
              ? `url(${user.avatar})` 
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
            backgroundSize: user?.avatar ? "cover" : "auto",
            backgroundPosition: "center",
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
          title={user?.name || user?.email || "Hồ sơ"}
        >
          {!user?.avatar && (
            <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{getInitial()}</span>
          )}
        </div>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div style={{
            position: "absolute",
            top: 0,
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
            {/* Profile */}
            <div
              onClick={() => {
                setShowUserMenu(false);
                setShowProfileModal(true);
              }}
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: 14, color: "#111827" }}>Profile</span>
            </div>

            {/* Bài đăng của tôi */}
            <div
              onClick={() => {
                setShowUserMenu(false);
                setShowMyPostsModal(true);
              }}
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span style={{ fontSize: 14, color: "#111827" }}>Bài đăng của tôi</span>
            </div>

            <div style={{ height: 1, background: "#e5e7eb", margin: "4px 0" }} />

            {/* Logout */}
            <div
              onClick={async () => {
                setShowUserMenu(false);
                await handleLogout();
              }}
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{ fontSize: 14, color: "#111827" }}>Logout</span>
            </div>
          </div>
        )}
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
      
      {/* Trash icon */}
      <div 
        onClick={() => setShowTrashModal(true)}
        style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 10, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s",
          opacity: 0.8
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.8";
          e.currentTarget.style.background = "transparent";
        }}
        title="Thùng rác"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
          {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
          </svg> */}
          <svg
            id="svg111"
            width="25"
            height="25"
            viewBox="0 0 682.66669 682.66669"
            xmlns="http://www.w3.org/2000/svg"
            >
            <defs
              id="defs115"><clipPath
                clipPathUnits="userSpaceOnUse"
                id="clipPath125"><path
                  d="M 0,512 H 512 V 0 H 0 Z"
                  id="path123" /></clipPath></defs><g
              id="g117"
              transform="matrix(1.3333333,0,0,-1.3333333,0,682.66667)"><g
                id="g119"><g
                  id="g121"
                  clipPath="url(#clipPath125)"><g
                    id="g127"
                    transform="translate(304.2002,442.7187)"><path
                      d="m 0,0 c 17.681,-4.563 34.383,-11.568 49.719,-20.638 0,0 7.389,7.391 15.688,15.69 6.026,6.032 14.203,9.415 22.727,9.415 8.514,0 16.693,-3.383 22.718,-9.415 7.31,-7.311 15.408,-15.408 22.718,-22.719 6.033,-6.025 9.415,-14.203 9.415,-22.718 0,-8.524 -3.382,-16.701 -9.415,-22.726 -8.299,-8.299 -15.689,-15.689 -15.689,-15.689 9.069,-15.336 16.074,-32.037 20.638,-49.719 h 22.147 c 17.746,0 32.134,-14.388 32.134,-32.133 v -32.134 c 0,-17.745 -14.388,-32.133 -32.134,-32.133 h -22.147 c -4.564,-17.681 -11.569,-34.383 -20.638,-49.718 0,0 7.39,-7.391 15.689,-15.689 6.033,-6.026 9.415,-14.203 9.415,-22.727 0,-8.515 -3.382,-16.693 -9.415,-22.718 -7.31,-7.31 -15.408,-15.408 -22.718,-22.718 -6.025,-6.033 -14.204,-9.415 -22.718,-9.415 -8.524,0 -16.701,3.382 -22.727,9.415 C 57.108,-360.19 49.719,-352.8 49.719,-352.8 34.383,-361.869 17.681,-368.875 0,-373.437 v -22.148 c 0,-17.746 -14.388,-32.134 -32.134,-32.134 h -32.133 c -17.746,0 -32.133,14.388 -32.133,32.134 v 22.148 c -17.681,4.562 -34.383,11.568 -49.719,20.637 0,0 -7.39,-7.39 -15.689,-15.689 -6.025,-6.033 -14.203,-9.415 -22.726,-9.415 -8.515,0 -16.694,3.382 -22.718,9.415 -7.31,7.31 -15.408,15.408 -22.719,22.718 -6.032,6.025 -9.415,14.203 -9.415,22.718 0,8.524 3.383,16.701 9.415,22.727 8.299,8.298 15.69,15.689 15.69,15.689 -9.07,15.335 -16.074,32.037 -20.638,49.718 h -22.147 c -17.746,0 -32.134,14.388 -32.134,32.133 v 32.134 c 0,17.745 14.388,32.133 32.134,32.133 h 22.147 c 4.564,17.682 11.568,34.383 20.638,49.719 0,0 -7.391,7.39 -15.69,15.689 -6.032,6.025 -9.415,14.202 -9.415,22.726 0,8.515 3.383,16.693 9.415,22.718 7.311,7.311 15.409,15.408 22.719,22.719 6.024,6.032 14.203,9.415 22.718,9.415 8.523,0 16.701,-3.383 22.726,-9.415 8.299,-8.299 15.689,-15.69 15.689,-15.69 15.336,9.07 32.038,16.075 49.719,20.638 v 22.148 c 0,17.746 14.387,32.133 32.133,32.133 h 32.133 C -14.388,54.281 0,39.894 0,22.148 Z"
                      style={{
                        fill: 'none',
                        stroke: '#FFFFFF',
                        strokeWidth: 20,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeMiterlimit: 0,
                        strokeDasharray: 'none',
                        strokeOpacity: 1
                      }}
                      id="path129" /></g><g
                    id="g131"
                    transform="translate(256,352.3999)"><path
                      d="m 0,0 c 53.205,0 96.4,-43.195 96.4,-96.4 0,-53.204 -43.195,-96.4 -96.4,-96.4 -53.205,0 -96.4,43.196 -96.4,96.4 C -96.4,-43.195 -53.205,0 0,0 Z"
                      style={{
                        fill: 'none',
                        stroke: '#FFFFFF',
                        strokeWidth: 20,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeMiterlimit: 0,
                        strokeDasharray: 'none',
                        strokeOpacity: 1
                      }}
                      id="path133" /></g></g></g></g></svg>

          
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
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* My Posts Modal */}
      <MyPostsModal
        isOpen={showMyPostsModal}
        onClose={() => setShowMyPostsModal(false)}
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
      />
    </aside>
  );
}

