"use client";

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import MemoryModal from './MemoryModal';
import PrivacySettingsModal from './PrivacySettingsModal';
import { useAuth } from '@/hooks/useAuth';

interface Memory {
  memoryId: string;
  userId: string;
  title: string;
  description?: string;
  date: Date | string;
  imageUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface MemoriesSectionProps {
  userId?: string; // Nếu không có, hiển thị kỷ niệm của user hiện tại
  showCreateButton?: boolean; // Có hiển thị nút tạo kỷ niệm không
}

export default function MemoriesSection({ userId, showCreateButton = true }: MemoriesSectionProps) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showAllMemories, setShowAllMemories] = useState(false); // Toggle between upcoming vs all

  const loadMemories = async () => {
    setIsLoading(true);
    setError('');
    try {
      let response;
      if (userId && userId !== user?.id) {
        console.log(`🔍 [FRONTEND] Loading memories for user ${userId} (current user: ${user?.id})`);
        response = await apiService.getUserMemories(userId);
        console.log(`✅ [FRONTEND] Got memories response:`, {
          success: response.success,
          dataLength: response.data?.length || 0,
        });
      } else {
        console.log(`🔍 [FRONTEND] Loading my own memories`);
        response = await apiService.getMyMemories();
      }
      if (response.success) {
        setMemories(response.data || []);
        console.log(`✅ [FRONTEND] Set ${response.data?.length || 0} memories`);
      }
    } catch (err: any) {
      console.error(`❌ [FRONTEND] Error loading memories:`, err);
      console.error(`   Error message: ${err.message}`);
      setError(err.message || 'Không thể tải kỷ niệm');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [userId, user?.id]);

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  };

  const handleDelete = async (memoryId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kỷ niệm này?')) {
      return;
    }

    try {
      await apiService.deleteMemory(memoryId);
      loadMemories();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa kỷ niệm');
    }
  };

  const isMyMemories = !userId || userId === user?.id;

  // Calculate days until each memory and filter
  const processedMemories = memories.map(memory => {
    const memoryDate = memory.date instanceof Date ? memory.date : new Date(memory.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    
    // Calculate target date (this year or next year)
    const thisYear = new Date(today.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
    thisYear.setHours(0, 0, 0, 0);
    const nextYear = new Date(today.getFullYear() + 1, memoryDate.getMonth(), memoryDate.getDate());
    nextYear.setHours(0, 0, 0, 0);
    const targetDate = thisYear < today ? nextYear : thisYear;
    
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...memory,
      daysUntil,
      memoryDate,
      targetDate,
      isToday: daysUntil === 0,
      isThisWeek: daysUntil >= 0 && daysUntil <= 7,
      isUpcoming: daysUntil >= 0 && daysUntil <= 30,
    };
  });

  // Filter memories based on view mode
  const filteredMemories = showAllMemories 
    ? processedMemories 
    : processedMemories.filter(m => m.isUpcoming);

  // Sort by days until (closest first)
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    // Prioritize upcoming memories
    if (a.isUpcoming && !b.isUpcoming) return -1;
    if (!a.isUpcoming && b.isUpcoming) return 1;
    return a.daysUntil - b.daysUntil;
  });

  const upcomingCount = processedMemories.filter(m => m.isUpcoming).length;
  const hasMoreMemories = memories.length > upcomingCount;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            📅 Kỷ niệm
          </h3>
          {isMyMemories && (
            <button
              onClick={() => setShowPrivacyModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                color: '#6b7280',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
              title="Cài đặt quyền riêng tư"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
        </div>
        {showCreateButton && isMyMemories && (
          <button
            onClick={() => {
              setEditingMemory(null);
              setShowCreateModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tạo kỷ niệm
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          Đang tải kỷ niệm...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
          {error}
        </div>
      ) : memories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          {isMyMemories ? 'Chưa có kỷ niệm nào. Hãy tạo kỷ niệm đầu tiên!' : 'Người dùng này chưa có kỷ niệm nào.'}
        </div>
      ) : sortedMemories.length === 0 ? (
        <div>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
            Không có kỷ niệm sắp tới trong 30 ngày tới
          </div>
          {hasMoreMemories && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setShowAllMemories(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Xem tất cả ({memories.length} kỷ niệm)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sortedMemories.map((memory) => {
              // Determine background color based on memory timing
              let backgroundColor = '#f9fafb';
              let borderColor = '#e5e7eb';
              
              if (memory.isToday) {
                backgroundColor = '#fef3c7'; // Yellow for today
                borderColor = '#fbbf24';
              } else if (memory.isThisWeek) {
                backgroundColor = '#dbeafe'; // Light blue for this week
                borderColor = '#60a5fa';
              }

              return (
                <div
                  key={memory.memoryId}
                  style={{
                    border: `2px solid ${borderColor}`,
                    borderRadius: 8,
                    padding: 16,
                    background: backgroundColor,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Badge for special memories */}
                  {memory.isToday && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: 16,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ⭐ HÔM NAY
                    </div>
                  )}
                  {!memory.isToday && memory.isThisWeek && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: 16,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      📌 TUẦN NÀY
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 12, marginTop: memory.isToday || memory.isThisWeek ? 8 : 0 }}>
                    {memory.imageUrl && (
                      <img
                        src={memory.imageUrl}
                        alt={memory.title}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 600, color: '#111827' }}>
                            {memory.title}
                          </h4>
                          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                            📅 {formatDate(memory.memoryDate)}
                            {memory.isUpcoming && (
                              <span 
                                style={{ 
                                  marginLeft: 8, 
                                  color: memory.isToday ? '#d97706' : memory.isThisWeek ? '#2563eb' : '#6366f1',
                                  fontWeight: 600 
                                }}
                              >
                                ({memory.daysUntil === 0 ? 'Hôm nay' : `Còn ${memory.daysUntil} ngày`})
                              </span>
                            )}
                          </div>
                          {memory.description && (
                            <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
                              {memory.description}
                            </p>
                          )}
                        </div>
                        {isMyMemories && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => {
                                setEditingMemory(memory);
                                setShowCreateModal(true);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 4,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              title="Chỉnh sửa"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(memory.memoryId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: 4,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              title="Xóa"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle button to view all or only upcoming */}
          {hasMoreMemories && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => setShowAllMemories(!showAllMemories)}
                style={{
                  padding: '8px 16px',
                  background: showAllMemories ? '#f3f4f6' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: showAllMemories ? '#374151' : '#ffffff',
                  border: showAllMemories ? '1px solid #d1d5db' : 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (showAllMemories) {
                    e.currentTarget.style.background = '#e5e7eb';
                  } else {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (showAllMemories) {
                    e.currentTarget.style.background = '#f3f4f6';
                  } else {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {showAllMemories ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    Thu gọn (chỉ xem {upcomingCount} kỷ niệm sắp tới)
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Xem tất cả ({memories.length} kỷ niệm)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <MemoryModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMemory(null);
        }}
        onMemoryCreated={() => {
          loadMemories();
          setShowCreateModal(false);
          setEditingMemory(null);
        }}
        editingMemory={editingMemory}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}

