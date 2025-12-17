'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ReportsManagement from './ReportsManagement';
import UserManagement from './UserManagement';

type TabType = 'message-reports' | 'post-reports' | 'user-management';

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('message-reports');
  const { user } = useAppSelector((state) => state.auth);
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', backgroundColor: '#ffffff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              A
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Admin Panel</h2>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('message-reports')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'message-reports' ? '#eff6ff' : 'transparent',
              color: activeTab === 'message-reports' ? '#2563eb' : '#374151',
              fontWeight: activeTab === 'message-reports' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'message-reports') {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'message-reports') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>Báo cáo Tin nhắn</span>
          </button>

          <button
            onClick={() => setActiveTab('post-reports')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'post-reports' ? '#eff6ff' : 'transparent',
              color: activeTab === 'post-reports' ? '#2563eb' : '#374151',
              fontWeight: activeTab === 'post-reports' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'post-reports') {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'post-reports') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span>Báo cáo Bài viết</span>
          </button>

          <button
            onClick={() => setActiveTab('user-management')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'user-management' ? '#eff6ff' : 'transparent',
              color: activeTab === 'user-management' ? '#2563eb' : '#374151',
              fontWeight: activeTab === 'user-management' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'user-management') {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'user-management') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Quản lý User</span>
          </button>
        </nav>

        {/* Footer Actions */}
        <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#f9fafb' }}>
        {activeTab === 'message-reports' && <ReportsManagement type="message" />}
        {activeTab === 'post-reports' && <ReportsManagement type="post" />}
        {activeTab === 'user-management' && <UserManagement />}
      </div>
    </div>
  );
}
