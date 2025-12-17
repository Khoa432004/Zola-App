'use client';

import { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  status: 'active' | 'locked';
  createdAt: string;
  lastLogin?: string;
  reportCount: number;
}

// Mock data
const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-12-17T09:30:00Z',
    reportCount: 0,
  },
  {
    id: 'user2',
    name: 'Trần Thị B',
    email: 'tranthib@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-02-20T14:00:00Z',
    lastLogin: '2024-12-16T18:45:00Z',
    reportCount: 3,
  },
  {
    id: 'user3',
    name: 'Lê Văn C',
    email: 'levanc@example.com',
    role: 'user',
    status: 'locked',
    createdAt: '2024-03-10T08:00:00Z',
    lastLogin: '2024-12-10T12:00:00Z',
    reportCount: 8,
  },
  {
    id: 'user4',
    name: 'Phạm Thị D',
    email: 'phamthid@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-04-05T16:00:00Z',
    lastLogin: '2024-12-17T10:15:00Z',
    reportCount: 1,
  },
  {
    id: 'user5',
    name: 'Hoàng Văn E',
    email: 'hoangvane@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-12-17T11:00:00Z',
    reportCount: 0,
  },
];

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'locked'>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');

  const handleLockUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (confirm(`Bạn có chắc muốn khóa tài khoản "${user?.name}"?`)) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'locked' as const } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, status: 'locked' });
      }
      alert('Đã khóa tài khoản user');
    }
  };

  const handleUnlockUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (confirm(`Bạn có chắc muốn mở khóa tài khoản "${user?.name}"?`)) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, status: 'active' as const } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, status: 'active' });
      }
      alert('Đã mở khóa tài khoản user');
    }
  };

  const handleChangeRole = (userId: string, newRole: 'user' | 'admin') => {
    const user = users.find(u => u.id === userId);
    const roleLabel = newRole === 'admin' ? 'Admin' : 'User';
    if (confirm(`Bạn có chắc muốn đổi role của "${user?.name}" thành ${roleLabel}?`)) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
      alert(`Đã đổi role thành ${roleLabel}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: User['status']) => {
    return status === 'active' ? (
      <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '12px', backgroundColor: '#d1fae5', color: '#065f46' }}>
        Hoạt động
      </span>
    ) : (
      <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#991b1b' }}>
        Đã khóa
      </span>
    );
  };

  const getRoleBadge = (role: User['role']) => {
    return role === 'admin' ? (
      <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '12px', backgroundColor: '#ddd6fe', color: '#5b21b6' }}>
        Admin
      </span>
    ) : (
      <span style={{ padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
        User
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Users List */}
      <div style={{ width: '40%', borderRight: '1px solid #e5e7eb', backgroundColor: '#ffffff', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '20px', zIndex: 10 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>👥 Quản lý User</h1>
          
          {/* Search */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email..."
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                paddingTop: '10px',
                paddingBottom: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#111827'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            />
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['all', 'active', 'locked'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: filterStatus === status ? '#2563eb' : '#f3f4f6',
                    color: filterStatus === status ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status === 'all' ? 'Tất cả' : status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: 'All Roles' },
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ].map(role => (
                <button
                  key={role.value}
                  onClick={() => setFilterRole(role.value as any)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: filterRole === role.value ? '#7c3aed' : '#f3f4f6',
                    color: filterRole === role.value ? '#ffffff' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px' }}>
            Tìm thấy {filteredUsers.length} user
          </p>
        </div>

        {/* Users List */}
        <div>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p>Không tìm thấy user nào</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  backgroundColor: selectedUser?.id === user.id ? '#eff6ff' : '#ffffff',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedUser?.id !== user.id) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedUser?.id !== user.id) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      backgroundColor: user.status === 'locked' ? '#9ca3af' : undefined,
                      background: user.status === 'active' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined
                    }}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '14px', color: '#111827', margin: 0 }}>{user.name}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{user.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {getStatusBadge(user.status)}
                    {getRoleBadge(user.role)}
                  </div>
                </div>
                
                {user.reportCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#dc2626' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Bị báo cáo {user.reportCount} lần</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Detail */}
      <div style={{ flex: 1, backgroundColor: '#f9fafb', overflowY: 'auto' }}>
        {selectedUser ? (
          <div style={{ padding: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
              {/* User Info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    backgroundColor: selectedUser.status === 'locked' ? '#9ca3af' : undefined,
                    background: selectedUser.status === 'active' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined
                  }}>
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 4px 0' }}>{selectedUser.name}</h2>
                    <p style={{ color: '#6b7280', margin: '0 0 8px 0' }}>{selectedUser.email}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusBadge(selectedUser.status)}
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Ngày tạo tài khoản</p>
                  <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Đăng nhập lần cuối</p>
                  <p style={{ fontWeight: '600', color: '#111827', margin: 0 }}>
                    {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Chưa có'}
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Số lần bị báo cáo</p>
                  <p style={{ fontWeight: '600', color: selectedUser.reportCount > 5 ? '#dc2626' : '#111827', margin: 0 }}>
                    {selectedUser.reportCount} lần
                  </p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>User ID</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#111827', margin: 0 }}>{selectedUser.id}</p>
                </div>
              </div>

              {/* Warning if many reports */}
              {selectedUser.reportCount > 3 && (
                <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span style={{ fontWeight: '600' }}>Cảnh báo: User này có nhiều báo cáo vi phạm!</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Chỉ hiển thị nút Set làm Admin nếu user chưa phải admin */}
                {selectedUser.role !== 'admin' && (
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Quản lý Role</h3>
                    <button
                      onClick={() => handleChangeRole(selectedUser.id, 'admin')}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '15px',
                        cursor: 'pointer',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    >
                      ⭐ Set làm Admin
                    </button>
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Quản lý Trạng thái</h3>
                  {selectedUser.status === 'active' ? (
                    <button
                      onClick={() => handleLockUser(selectedUser.id)}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                      🔒 Khóa tài khoản
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnlockUser(selectedUser.id)}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                    >
                      🔓 Mở khóa tài khoản
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p style={{ fontSize: '15px' }}>Chọn một user để xem chi tiết</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
