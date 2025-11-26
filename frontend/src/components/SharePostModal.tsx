'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface SharePostModalProps {
  isOpen: boolean;
  postId: string;
  postTitle: string;
  postAuthor: string;
  postContent: string;
  onClose: () => void;
  onShared?: () => void;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function SharePostModal({ 
  isOpen, 
  postId, 
  postTitle,
  postAuthor,
  postContent,
  onClose,
  onShared 
}: SharePostModalProps) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private' | 'specific'>('public');
  const [isSharing, setIsSharing] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load friends when modal opens and visibility is set to specific
  useEffect(() => {
    if (isOpen && visibility === 'specific' && friends.length === 0) {
      loadFriends();
    }
  }, [isOpen, visibility]);

  const loadFriends = async () => {
    setIsLoadingFriends(true);
    try {
      const response = await apiService.getFriends();
      if (response.success && response.data) {
        setFriends(response.data);
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = async () => {
    if (isSharing) return;
    
    try {
      setIsSharing(true);
      
      // If specific visibility, pass selected friend IDs
      const sharedWith = visibility === 'specific' ? Array.from(selectedFriends) : undefined;
      
      console.log('📤 Sharing post:', {
        postId,
        caption,
        visibility,
        sharedWith,
        selectedFriendsCount: selectedFriends.size
      });
      
      const res = await apiService.sharePost(postId, caption, visibility, sharedWith);
      
      if (res && res.success) {
        alert('Đã chia sẻ bài viết thành công!');
        onShared?.();
        onClose();
      } else {
        alert('Chia sẻ thất bại');
      }
    } catch (err: any) {
      console.error('Share error:', err);
      alert(err?.message || 'Không thể chia sẻ bài viết');
    } finally {
      setIsSharing(false);
    }
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
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          width: 560,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Chia sẻ bài viết</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 24, color: '#6b7280' }}>
            ✕
          </button>
        </div>

        {/* Caption input */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Bạn nghĩ gì về bài viết này?"
          style={{
            width: '100%',
            minHeight: 80,
            padding: 12,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            resize: 'vertical',
            marginBottom: 16,
          }}
        />

        {/* Visibility selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
            Ai có thể xem bài viết này?
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="public">Công khai</option>
            <option value="friends">Tất cả bạn bè</option>
            <option value="specific">Bạn bè cụ thể</option>
            <option value="private">Chỉ mình tôi</option>
          </select>
        </div>

        {/* Friend selector - only show when visibility is 'specific' */}
        {visibility === 'specific' && (
          <div style={{ 
            marginBottom: 16,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 12,
            maxHeight: 300,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bạn bè..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
            </div>

            {isLoadingFriends ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                Đang tải danh sách bạn bè...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
                {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè nào'}
              </div>
            ) : (
              <div style={{ 
                overflowY: 'auto',
                maxHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                {filteredFriends.map(friend => (
                  <label
                    key={friend.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      background: selectedFriends.has(friend.id) ? '#f0f9ff' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedFriends.has(friend.id)) {
                        e.currentTarget.style.background = '#f9fafb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedFriends.has(friend.id)) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.has(friend.id)}
                      onChange={() => toggleFriendSelection(friend.id)}
                      style={{
                        width: 18,
                        height: 18,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundImage: friend.avatar ? `url(${friend.avatar})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {!friend.avatar && (
                        <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                          {friend.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {friend.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedFriends.size > 0 && (
              <div style={{ 
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e5e7eb',
                fontSize: 13,
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Đã chọn {selectedFriends.size} bạn bè
              </div>
            )}
          </div>
        )}

        {/* Original post preview */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 12,
          background: '#f9fafb',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
            Bài viết của {postAuthor}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
            {postTitle}
          </div>
          <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
            {postContent.length > 150 ? postContent.substring(0, 150) + '...' : postContent}
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={isSharing}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: isSharing ? '#9ca3af' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: isSharing ? 'not-allowed' : 'pointer',
          }}
        >
          {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
        </button>
      </div>
    </div>
  );
}
