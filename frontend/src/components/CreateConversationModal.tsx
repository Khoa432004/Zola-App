'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: any) => void;
}

export default function CreateConversationModal({
  isOpen,
  onClose,
  onConversationCreated,
}: CreateConversationModalProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [mode, setMode] = useState<'select' | 'private' | 'group'>('select');

  useEffect(() => {
    if (isOpen && mode === 'select') {
      loadFriends();
    }
  }, [isOpen, mode]);

  const loadFriends = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getFriends();
      if (response.success && response.data) {
        setFriends(response.data);
      }
    } catch (error: any) {
      console.error('Error loading friends:', error);
      alert(error.message || 'Không thể tải danh sách bạn bè');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePrivate = async (friendId: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.createPrivateConversation(friendId);
      if (response.success && response.data) {
        onConversationCreated(response.data);
        onClose();
        resetForm();
      }
    } catch (error: any) {
      alert(error.message || 'Tạo cuộc trò chuyện thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedFriends.length < 1) {
      alert('Vui lòng chọn ít nhất một người bạn');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.createGroupConversation(
        selectedFriends,
        groupName || undefined
      );
      if (response.success && response.data) {
        onConversationCreated(response.data);
        onClose();
        resetForm();
      }
    } catch (error: any) {
      alert(error.message || 'Tạo nhóm chat thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const resetForm = () => {
    setMode('select');
    setSelectedFriends([]);
    setGroupName('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '24px',
          maxWidth: 500,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            Tạo cuộc trò chuyện mới
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {mode === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setMode('private')}
              style={{
                padding: '16px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  Chat riêng với bạn bè
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Tạo cuộc trò chuyện riêng với một người bạn
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('group')}
              style={{
                padding: '16px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                  Tạo nhóm chat mới
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Tạo nhóm chat với nhiều người bạn
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'private' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={() => setMode('select')}
              style={{
                padding: '8px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#6b7280',
                fontSize: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                Đang tải...
              </div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                Bạn chưa có bạn bè nào
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleCreatePrivate(friend.id)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: 8,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.background = '#ffffff';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {friend.name?.charAt(0)?.toUpperCase() || friend.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>
                        {friend.name || friend.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'group' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={() => setMode('select')}
              style={{
                padding: '8px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#6b7280',
                fontSize: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Quay lại
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                Tên nhóm (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Nhập tên nhóm..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none',
                  background: '#ffffff',
                  color: '#111827',
                  transition: 'all 0.2s',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                Đang tải...
              </div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                Bạn chưa có bạn bè nào
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      style={{
                        padding: '12px',
                        borderRadius: 8,
                        border: selectedFriends.includes(friend.id)
                          ? '2px solid #6366f1'
                          : '1px solid #e5e7eb',
                        background: selectedFriends.includes(friend.id) ? '#eef2ff' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {friend.name?.charAt(0)?.toUpperCase() || friend.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>
                          {friend.name || friend.email}
                        </div>
                      </div>
                      {selectedFriends.includes(friend.id) && (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            background: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCreateGroup}
                  disabled={isLoading || selectedFriends.length < 1}
                  style={{
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      isLoading || selectedFriends.length < 1
                        ? '#e5e7eb'
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: isLoading || selectedFriends.length < 1 ? '#9ca3af' : '#ffffff',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: isLoading || selectedFriends.length < 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Tạo nhóm ({selectedFriends.length})
                </button>
              </>
            )}
          </div>
        )}

        {mode !== 'select' && (
          <button
            onClick={onClose}
            style={{
              marginTop: 16,
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#6b7280',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}

