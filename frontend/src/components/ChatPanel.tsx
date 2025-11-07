'use client';

import { useState } from 'react';

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: string;
  type?: 'text' | 'image' | 'failed';
}

interface ChatPanelProps {
  conversation: Conversation;
}

export default function ChatPanel({ conversation }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  
  // Sample messages như trong ảnh
  const messages: Message[] = [
    {
      id: '1',
      text: 'Chào bạn!',
      sender: 'user',
      timestamp: '12:59'
    },
    {
      id: '2',
      text: 'Chào cậu',
      sender: 'other',
      timestamp: '12:59'
    },
    {
      id: '3',
      text: 'Nhà tớ nó nuôi 1 con mèo cậu có muốn xem không',
      sender: 'other',
      timestamp: '13:00'
    },
    {
      id: '4',
      text: 'Có',
      sender: 'user',
      timestamp: '13:00'
    },
    {
      id: '5',
      text: '',
      sender: 'other',
      timestamp: '13:00',
      type: 'failed'
    }
  ];

  const handleSend = () => {
    if (message.trim()) {
      // TODO: Implement send message logic
      console.log('Sending message:', message);
      setMessage('');
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
        {messages.map((msg) => {
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
        })}
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
          disabled={!message.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: message.trim() ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: message.trim() ? "pointer" : "not-allowed",
            color: message.trim() ? "#ffffff" : "#9ca3af",
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

