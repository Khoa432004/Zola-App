'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import FriendsPanel from './FriendsPanel';
import { apiService } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAppSelector } from '@/store/hooks';

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

export default function FriendsLayout() {
  const [activeView, setActiveView] = useState<'friends' | 'invitations'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  const loadingFriendsRef = useRef(false);
  const loadingRequestsRef = useRef(false);
  const friendsLoadedRef = useRef(false);
  const requestsLoadedRef = useRef(false);

  const loadFriends = useCallback(async (force = false) => {
    if (loadingFriendsRef.current || (!force && friendsLoadedRef.current)) {
      return;
    }

    try {
      loadingFriendsRef.current = true;
      setIsLoading(true);
      const response = await apiService.getFriends();
      if (response.success && response.data) {
        const uniqueFriends = response.data.reduce((acc: Friend[], friend: any) => {
          const exists = acc.some(f => f.id === friend.id);
          if (!exists) {
            acc.push({
              id: friend.id,
              name: friend.name,
              email: friend.email,
              avatar: friend.avatar || friend.name?.substring(0, 2).toUpperCase() || 'U'
            });
          }
          return acc;
        }, []);
        setFriends(uniqueFriends);
        friendsLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      friendsLoadedRef.current = false;
    } finally {
      setIsLoading(false);
      loadingFriendsRef.current = false;
    }
  }, []);

  const loadRequests = useCallback(async (force = false) => {
    if (loadingRequestsRef.current || (!force && requestsLoadedRef.current)) {
      return;
    }

    try {
      loadingRequestsRef.current = true;
      setIsLoadingRequests(true);
      const response = await apiService.getReceivedRequests();
      if (response.success && response.data) {
        const uniqueRequests = response.data.reduce((acc: FriendRequest[], request: FriendRequest) => {
          const exists = acc.some(r => r.id === request.id || (r.from === request.from && r.to === request.to));
          if (!exists) {
            acc.push(request);
          }
          return acc;
        }, []);
        setReceivedRequests(uniqueRequests);
        requestsLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      requestsLoadedRef.current = false;
    } finally {
      setIsLoadingRequests(false);
      loadingRequestsRef.current = false;
    }
  }, []);

  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (!socketService.isConnected() && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        socketService.connect(token);
      }
    }

    const handleFriendRequestReceived = (data: { request: any }) => {
      setReceivedRequests(prev => {
        const existingIndex = prev.findIndex(r => 
          r.id === data.request.id || 
          (r.id && data.request.id && r.id === data.request.id) ||
          (r.from === data.request.from && r.to === data.request.to)
        );
        
        if (existingIndex !== -1) {
          console.log('⚠️ Friend request already exists, skipping:', data.request.id);
          const updated = [...prev];
          updated[existingIndex] = data.request;
          return updated;
        }
        
        console.log('✅ Adding new friend request:', data.request.id);
        return [...prev, data.request];
      });
      requestsLoadedRef.current = false;
    };

    const handleFriendRequestAccepted = (data: { friend: any; requestId?: string }) => {
      setReceivedRequests(prev => {
        if (data.requestId) {
          return prev.filter(r => r.id !== data.requestId);
        }
        return prev.filter(r => r.from !== data.friend?.id && r.to !== data.friend?.id);
      });
      
      if (data.friend && data.friend.friendData) {
        const friendData = data.friend.friendData;
        setFriends(prev => {
          const exists = prev.some(f => f.id === friendData.id);
          if (exists) return prev;
          return [...prev, {
            id: friendData.id,
            name: friendData.name || 'Người dùng',
            email: friendData.email || 'Email không khả dụng',
            avatar: friendData.avatar || friendData.name?.substring(0, 2).toUpperCase() || 'U'
          }];
        });
      } else if (data.friend && data.friend.users) {
        if (!loadingFriendsRef.current) {
          friendsLoadedRef.current = false;
          loadFriends(true);
        }
      }
    };

    const handleFriendRequestRejected = (data: { requestId?: string; from?: string; to?: string }) => {
      setReceivedRequests(prev => {
        if (data.requestId) {
          return prev.filter(r => r.id !== data.requestId);
        }
        if (data.from && data.to) {
          return prev.filter(r => !(r.from === data.from && r.to === data.to));
        }
        return prev;
      });
      
      requestsLoadedRef.current = false;
      if (activeView === 'invitations') {
        loadRequests(true);
      }
    };

    socketService.on('friend_request_received', handleFriendRequestReceived);
    socketService.on('friend_request_accepted', handleFriendRequestAccepted);
    socketService.on('friend_request_rejected', handleFriendRequestRejected);

    return () => {
      socketService.off('friend_request_received', handleFriendRequestReceived);
      socketService.off('friend_request_accepted', handleFriendRequestAccepted);
      socketService.off('friend_request_rejected', handleFriendRequestRejected);
    };
  }, [activeView, loadFriends, loadRequests]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (activeView === 'invitations') {
      loadRequests();
    }
  }, [activeView, loadRequests]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    const requestToAccept = receivedRequests.find(r => r.id === requestId);
    if (requestToAccept?.fromUser) {
      const fromUser = requestToAccept.fromUser;
      setFriends(prev => {
        const exists = prev.some(f => f.id === fromUser.id);
        if (exists) return prev;
        return [...prev, {
          id: fromUser.id,
          name: fromUser.name || 'Người dùng',
          email: fromUser.email || 'Email không khả dụng',
          avatar: fromUser.avatar || fromUser.name?.substring(0, 2).toUpperCase() || 'U'
        }];
      });
    }
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    
    try {
      await apiService.acceptFriendRequest(requestId);
      setTimeout(() => {
        if (friendsLoadedRef.current) {
          friendsLoadedRef.current = false;
          loadFriends(true);
        }
      }, 2000);
    } catch (error: any) {
      if (requestToAccept) {
        setReceivedRequests(prev => {
          const exists = prev.some(r => r.id === requestToAccept.id);
          if (!exists) return [...prev, requestToAccept];
          return prev;
        });
        if (requestToAccept.fromUser) {
          setFriends(prev => prev.filter(f => f.id !== requestToAccept.fromUser!.id));
        }
      }
      alert(error.message || 'Chấp nhận lời mời thất bại');
    }
  }, [receivedRequests, loadFriends]);

  const handleRejectRequest = useCallback(async (requestId: string) => {
    const requestToReject = receivedRequests.find(r => r.id === requestId);
    setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
    
    try {
      await apiService.rejectFriendRequest(requestId);
      requestsLoadedRef.current = false;
      loadRequests(true);
    } catch (error: any) {
      if (requestToReject) {
        setReceivedRequests(prev => [...prev, requestToReject]);
      }
      alert(error.message || 'Từ chối lời mời thất bại');
    }
  }, [receivedRequests, loadRequests]);

  const handleRequestSent = useCallback(() => {
    requestsLoadedRef.current = false;
    if (activeView === 'invitations') {
      loadRequests(true);
    }
  }, [activeView, loadRequests]);

  const handleRequestProcessed = useCallback(() => {
    friendsLoadedRef.current = false;
    requestsLoadedRef.current = false;
    loadFriends(true);
    loadRequests(true);
  }, [loadFriends, loadRequests]);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAvatarInitials = useCallback((name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }, []);

  return (
    <>
      {/* Friends List Panel */}
      <section style={{ 
        width: 340, 
        borderRight: "1px solid #e5e7eb", 
        background: "#ffffff", 
        height: "100%", 
        display: "flex", 
        flexDirection: "column" 
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: 24, 
            fontWeight: 700, 
            color: "#111827",
            marginBottom: 8
          }}>
            Bạn bè
          </h1>
          <p style={{ 
            margin: 0, 
            fontSize: 14, 
            color: "#6b7280" 
          }}>
            Quản lý danh sách bạn bè và lời mời.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          padding: "12px 16px", 
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          gap: 8
        }}>
          <button
            onClick={() => setActiveView('friends')}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: activeView === 'friends' ? "#f3f4f6" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            + Thêm bạn
          </button>
          <button
            onClick={() => setActiveView('invitations')}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: activeView === 'invitations' ? "#f3f4f6" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Lời mời
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ 
          padding: "12px 16px", 
          borderBottom: "1px solid #f3f4f6" 
        }}>
          <div style={{ 
            background: "#f9fafb", 
            borderRadius: 12, 
            padding: "10px 14px", 
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #e5e7eb"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bạn bè..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: "#111827"
              }}
            />
          </div>
        </div>

        {/* Friends/Requests List */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto"
        }}>
          {activeView === 'friends' ? (
            isLoading && !friendsLoadedRef.current ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                Đang tải...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè'}
              </div>
            ) : (
              filteredFriends.map((friend) => (
            <div
              key={friend.id}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "14px 16px", 
                gap: 12, 
                borderBottom: "1px solid #f3f4f6", 
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
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
                      {friend.avatar || getAvatarInitials(friend.name)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: 15, 
                  color: "#111827", 
                  fontWeight: 600,
                  marginBottom: 4
                }}>
                  {friend.name}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: "#6b7280"
                }}>
                  {friend.email}
                </div>
              </div>
            </div>
              ))
            )
          ) : (
            isLoadingRequests && !requestsLoadedRef.current ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                Đang tải...
              </div>
            ) : receivedRequests.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                Không có lời mời kết bạn nào
              </div>
            ) : (
              receivedRequests
                .filter((request, index, self) => {
                  const firstIndex = self.findIndex(r => 
                    (r.id && request.id && r.id === request.id) || 
                    (!r.id && !request.id && r.from === request.from && r.to === request.to)
                  );
                  return index === firstIndex;
                })
                .map((request, index) => {
                  const uniqueKey = request.id 
                    ? `request-${request.id}-${index}`
                    : `request-${request.from}-${request.to}-${index}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                  style={{ 
                    padding: "14px 16px", 
                    borderBottom: "1px solid #f3f4f6"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12,
                    marginBottom: 12
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
                        fontSize: 15, 
                        color: "#111827", 
                        fontWeight: 600,
                        marginBottom: 4
                      }}>
                        {request.fromUser?.name || 'Người dùng'}
                      </div>
                      <div style={{ 
                        fontSize: 13, 
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
                      onClick={() => handleAcceptRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        background: "#6366f1",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      Chấp nhận
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        background: "#ffffff",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer"
                      }}
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
                  );
                })
            )
          )}
        </div>
      </section>

      {/* Main Friends Panel */}
      <FriendsPanel 
        friends={friends} 
        activeView={activeView}
        receivedRequests={receivedRequests}
        isLoadingRequests={isLoadingRequests && !requestsLoadedRef.current}
        onRequestSent={handleRequestSent}
        onRequestProcessed={handleRequestProcessed}
      />
    </>
  );
}
