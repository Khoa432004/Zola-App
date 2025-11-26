'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import styles from './SharePostModal.module.css';

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
  }, [isOpen, visibility, friends.length]);

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
      className={styles.overlay}
      onClick={onClose}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Chia sẻ bài viết</h3>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* Caption input */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Bạn nghĩ gì về bài viết này?"
          className={styles.captionInput}
        />

        {/* Visibility selector */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Ai có thể xem bài viết này?
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            className={styles.select}
          >
            <option value="public">Công khai</option>
            <option value="friends">Tất cả bạn bè</option>
            <option value="specific">Bạn bè cụ thể</option>
            <option value="private">Chỉ mình tôi</option>
          </select>
        </div>

        {/* Friend selector - only show when visibility is 'specific' */}
        {visibility === 'specific' && (
          <div className={styles.specificContainer}>
            <div className={styles.searchInputWrapper}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bạn bè..."
                className={styles.searchInput}
              />
            </div>

            {isLoadingFriends ? (
              <div className={styles.friendsLoading}>
                Đang tải danh sách bạn bè...
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className={styles.friendsEmpty}>
                {searchQuery ? 'Không tìm thấy bạn bè' : 'Chưa có bạn bè nào'}
              </div>
            ) : (
              <div className={styles.friendsListOuter}>
                {filteredFriends.map(friend => {
                  const isSelected = selectedFriends.has(friend.id);
                  return (
                    <label
                      key={friend.id}
                      className={`${styles.friendItem} ${isSelected ? styles.friendItemSelected : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFriendSelection(friend.id)}
                        className={styles.friendCheckbox}
                      />
                      <div
                        className={styles.friendAvatar}
                        style={{
                          backgroundImage: friend.avatar
                            ? `url(${friend.avatar})`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      >
                        {!friend.avatar && (
                          <span className={styles.friendInitial}>
                            {friend.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className={styles.friendInfo}>
                        <div className={styles.friendName}>
                          {friend.name}
                        </div>
                        <div className={styles.friendEmail}>
                          {friend.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedFriends.size > 0 && (
              <div className={styles.selectedSummary}>
                Đã chọn {selectedFriends.size} bạn bè
              </div>
            )}
          </div>
        )}

        {/* Original post preview */}
        <div className={styles.postPreview}>
          <div className={styles.postMeta}>
            Bài viết của {postAuthor}
          </div>
          <div className={styles.postTitle}>
            {postTitle}
          </div>
          <div className={styles.postContent}>
            {postContent.length > 150 ? postContent.substring(0, 150) + '...' : postContent}
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={isSharing}
          className={styles.shareButton}
        >
          {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
        </button>
      </div>
    </div>
  );
}
