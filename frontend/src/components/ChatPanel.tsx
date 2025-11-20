'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { apiService } from '@/services/api';

interface Conversation {
  id: string;
  con_id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline?: boolean;
  is_group: boolean;
}

interface MessageData {
  id: string;
  con_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'sticker';
  timestamp: number;
  createdAt: Date | string;
  seen: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: string;
  type?: 'text' | 'image' | 'video' | 'sticker' | 'failed';
}

interface ChatPanelProps {
  conversation: Conversation;
}

export default function ChatPanel({ conversation }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const user = useAppSelector((state) => state.auth.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Mark seen debounce ref
  const markSeenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load messages
  const loadMessages = useCallback(async (limit: number = 50) => {
    if (loadingRef.current || !conversation?.con_id) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);
      // Tối ưu: Thêm limit để chỉ load 50 messages mặc định
      const response = await apiService.getMessages(conversation.con_id, limit);
      if (response.success && response.data) {
        const formattedMessages = formatMessages(response.data);
        setMessages(formattedMessages);
        
        // Tối ưu: Debounce mark conversation as seen để tránh gọi quá nhiều lần
        if (markSeenTimeoutRef.current) {
          clearTimeout(markSeenTimeoutRef.current);
        }
        markSeenTimeoutRef.current = setTimeout(async () => {
          try {
            await apiService.markConversationAsSeen(conversation.con_id);
          } catch (error) {
            console.warn('Failed to mark conversation as seen:', error);
          }
        }, 1000); // Wait 1 second before marking as seen
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      alert(error.message || 'Không thể tải tin nhắn');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [conversation?.con_id, user]);

  // Format messages to display format
  const formatMessages = (data: MessageData[]): Message[] => {
    if (!user) return [];

    return data.map((msg) => {
      const isUser = msg.sender_id === user.id;
      const date = new Date(msg.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timestamp = `${hours}:${minutes}`;

      return {
        id: msg.id,
        text: msg.content,
        sender: isUser ? 'user' : 'other',
        timestamp,
        type: msg.type,
      };
    });
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?.con_id) {
      loadMessages(50); // Load 50 messages mặc định
    } else {
      setMessages([]);
    }
    
    // Cleanup: Clear mark seen timeout khi unmount hoặc conversation thay đổi
    return () => {
      if (markSeenTimeoutRef.current) {
        clearTimeout(markSeenTimeoutRef.current);
        markSeenTimeoutRef.current = null;
      }
    };
  }, [conversation?.con_id, loadMessages]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isSending || !conversation?.con_id) return;

    try {
      setIsSending(true);
      const response = await apiService.sendMessage(conversation.con_id, message.trim(), 'text');
      if (response.success && response.data) {
        // Add message to list optimistically
        const newMessage: Message = {
          id: response.data.id || Date.now().toString(),
          text: message.trim(),
          sender: 'user',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
        };
        setMessages([...messages, newMessage]);
        setMessage('');
        
        // Reload to get updated data (chỉ reload 50 messages đầu)
        setTimeout(() => {
          loadMessages(50);
        }, 300); // Giảm delay từ 500ms xuống 300ms
      }
    } catch (error: any) {
      alert(error.message || 'Không thể gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main style={{ 
      flex: 1, 
      background: "#ffffff", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column"
    }}>
      {/* Chat Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff"
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12
        }}>
          <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{conversation.avatar}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ fontSize: 15, color: "#111827", fontWeight: 600 }}>
              {conversation.name}
            </strong>
            {conversation.isOnline && (
              <>
                <span style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  background: "#10b981",
                  display: "inline-block"
                }} />
                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 500 }}>Online</span>
              </>
            )}
          </div>
        </div>
        <button style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "#ffffff"
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </div>
        ) : (
          messages.map((msg) => {
          if (msg.type === 'failed') {
            return (
              <div key={msg.id} style={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 4
              }}>
                <div style={{
                  maxWidth: "300px",
                  minHeight: "200px",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  position: "relative"
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#ef4444" strokeWidth="2" fill="#fee2e2" />
                    <path d="M9 9l6 6M15 9l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Không thể tải ảnh</span>
                  <span style={{ 
                    fontSize: 11, 
                    color: "#9ca3af", 
                    position: "absolute",
                    bottom: 8,
                    right: 12
                  }}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              marginBottom: 4
            }}>
              <div style={{
                maxWidth: "60%",
                background: isUser ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" : "#ffffff",
                color: isUser ? "#ffffff" : "#111827",
                borderRadius: 12,
                padding: "10px 14px",
                boxShadow: isUser ? "0 2px 4px rgba(99, 102, 241, 0.2)" : "0 1px 2px rgba(0, 0, 0, 0.05)",
                border: isUser ? "none" : "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 4 }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 11,
                  color: isUser ? "rgba(255, 255, 255, 0.7)" : "#9ca3af",
                  textAlign: "right"
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        }))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <button style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#6b7280"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#6b7280"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Nhập @, tin nhắn tới ${conversation.name}`}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 24,
            border: "1px solid #e5e7eb",
            fontSize: 14,
            outline: "none",
            background: "#ffffff"
          }}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: (message.trim() && !isSending) ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: (message.trim() && !isSending) ? "pointer" : "not-allowed",
            color: (message.trim() && !isSending) ? "#ffffff" : "#9ca3af",
            transition: "all 0.2s"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </main>
  );
}

