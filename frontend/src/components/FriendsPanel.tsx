'use client';

import { useState } from 'react';
import { apiService } from '@/services/api';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: string;
  fromUser?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

interface FriendsPanelProps {
  friends: Friend[];
  activeView: 'friends' | 'invitations';
  receivedRequests?: FriendRequest[];
  isLoadingRequests?: boolean;
  onRequestSent?: () => void;
  onRequestProcessed?: () => void;
}

export default function FriendsPanel({ friends, activeView, receivedRequests = [], isLoadingRequests = false, onRequestSent, onRequestProcessed }: FriendsPanelProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendRequest = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiService.sendFriendRequest(email.trim());
      setSuccess('Đã gửi lời mời kết bạn');
      setEmail('');
      if (onRequestSent) {
        onRequestSent();
      }
    } catch (err: any) {
      setError(err.message || 'Gửi lời mời thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  if (activeView === 'friends') {
    return (
      <main style={{ 
        flex: 1, 
        background: "#ffffff", 
        height: "100%", 
        display: "flex", 
        flexDirection: "column"
      }}>
        {/* Add Friend Form */}
        <div style={{
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 700, 
              color: "#111827",
              marginBottom: 24
            }}>
              Thêm bạn mới
            </h2>
            
            <div style={{
              display: "flex",
              gap: 12,
              marginBottom: 16
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendRequest();
                  }
                }}
                placeholder="Nhập email của bạn bè"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: 14,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  outline: "none",
                  background: "#ffffff",
                  color: "#111827",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6366f1";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              />
              <button
                onClick={handleSendRequest}
                disabled={isLoading}
                style={{
                  padding: "12px 24px",
                  background: isLoading ? "#9ca3af" : "#6366f1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </div>

            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 14,
                marginBottom: 16
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: "12px 16px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 8,
                color: "#16a34a",
                fontSize: 14,
                marginBottom: 16
              }}>
                {success}
              </div>
            )}

            {/* Note Section */}
            <div style={{
              padding: "20px",
              background: "#f9fafb",
              borderRadius: 12,
              border: "1px solid #e5e7eb"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <h3 style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111827"
                }}>
                  Lưu ý
                </h3>
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: 24,
                color: "#6b7280",
                fontSize: 14,
                lineHeight: 1.8
              }}>
                <li>Chỉ thêm bạn từ người dùng đã đăng ký ZolaChat.</li>
                <li>Email phải chính xác.</li>
                <li>Nếu cả hai cùng gửi lời mời, sẽ tự động kết nối.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Invitations View
  const handleAccept = async (requestId: string) => {
    try {
      await apiService.acceptFriendRequest(requestId);
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err: any) {
      setError(err.message || 'Chấp nhận lời mời thất bại');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await apiService.rejectFriendRequest(requestId);
      if (onRequestProcessed) {
        onRequestProcessed();
      }
    } catch (err: any) {
      setError(err.message || 'Từ chối lời mời thất bại');
    }
  };

  const getAvatarInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <main style={{ 
      flex: 1, 
      background: "#ffffff", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column"
    }}>
      <div style={{
        padding: "40px",
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        {isLoadingRequests ? (
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{
              width: 80,
              height: 80,
              margin: "0 auto 24px",
              borderRadius: 40,
              border: "4px solid #e5e7eb",
              borderTop: "4px solid #6366f1",
              animation: "spin 1s linear infinite"
            }}>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
            <h2 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 700, 
              color: "#111827",
              marginBottom: 8
            }}>
              Đang tải...
            </h2>
            <p style={{ 
              margin: 0, 
              color: "#6b7280",
              fontSize: 16
            }}>
              Đang tải danh sách lời mời kết bạn
            </p>
          </div>
        ) : receivedRequests.length === 0 ? (
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <div style={{
              width: 120,
              height: 120,
              margin: "0 auto 24px",
              borderRadius: 60,
              background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            
            <h2 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 700, 
              color: "#111827",
              marginBottom: 8
            }}>
              Lời mời kết bạn (0)
            </h2>
            
            <p style={{ 
              margin: 0, 
              color: "#6b7280",
              fontSize: 16
            }}>
              Không có lời mời kết bạn nào.
            </p>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 600 }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 700, 
              color: "#111827",
              marginBottom: 24
            }}>
              Lời mời kết bạn ({receivedRequests.length})
            </h2>
            
            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#dc2626",
                fontSize: 14,
                marginBottom: 16
              }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {receivedRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: "20px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#ffffff"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12,
                    marginBottom: 16
                  }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 24, 
                      overflow: "hidden", 
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>
                        {request.fromUser ? getAvatarInitials(request.fromUser.name) : 'U'}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 16, 
                        color: "#111827", 
                        fontWeight: 600,
                        marginBottom: 4
                      }}>
                        {request.fromUser?.name || 'Người dùng'}
                      </div>
                      <div style={{ 
                        fontSize: 14, 
                        color: "#6b7280"
                      }}>
                        {request.fromUser?.email || 'Email không khả dụng'}
                      </div>
                    </div>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    gap: 8
                  }}>
                    <button
                      onClick={() => handleAccept(request.id)}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "#6366f1",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "#ffffff",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
