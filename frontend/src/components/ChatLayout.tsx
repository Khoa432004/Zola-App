'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import ChatPanel from "./ChatPanel";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
}

export default function ChatLayout() {
  const router = useRouter();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const user = useAppSelector((state) => state.auth.user);

  const conversations: Conversation[] = [
    {
      id: '1',
      name: 'John Smith',
      avatar: 'JS',
      lastMessage: 'đẹp nhỉ 🥰',
      timestamp: '13:00',
      isOnline: true
    }
  ];

  return (
    <>

      {/* Conversation list */}
      <section style={{ 
        width: 340, 
        borderRight: "1px solid #e5e7eb", 
        background: "#ffffff", 
        height: "100%", 
        display: "flex", 
        flexDirection: "column" 
      }}>
        {/* Search bar */}
        <div style={{ 
          padding: "16px 12px", 
          borderBottom: "1px solid #f3f4f6", 
          display: "flex", 
          alignItems: "center", 
          gap: 8 
        }}>
          <div style={{ 
            flex: 1, 
            background: "#f9fafb", 
            borderRadius: 12, 
            padding: "10px 14px", 
            color: "#9ca3af", 
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #e5e7eb"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span>Tìm kiếm cuộc trò chuyện</span>
          </div>
          <button 
            onClick={() => router.push('/friends')}
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 8, 
              border: "1px solid #e5e7eb", 
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            title="Thêm bạn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
          <button style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 8, 
            border: "1px solid #e5e7eb", 
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        
        {/* Conversation items */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto"
        }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "14px 16px", 
                gap: 12, 
                borderBottom: "1px solid #f3f4f6", 
                cursor: "pointer",
                transition: "background 0.2s",
                background: selectedConversation?.id === conv.id ? "#e0e7ff" : "#f9fafb"
              }}
              onMouseEnter={(e) => {
                if (selectedConversation?.id !== conv.id) {
                  e.currentTarget.style.background = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedConversation?.id !== conv.id) {
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
            >
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 24, 
                overflow: "hidden", 
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0
              }}>
                <span style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>{conv.avatar}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <strong style={{ fontSize: 15, color: "#111827", fontWeight: 600 }}>{conv.name}</strong>
                  <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{conv.timestamp}</span>
                </div>
                <div style={{ 
                  fontSize: 13, 
                  color: "#6b7280", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis" 
                }}>
                  {conv.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main chat area or welcome area */}
      {selectedConversation ? (
        <ChatPanel conversation={selectedConversation} />
      ) : (
        <main style={{ 
          flex: 1, 
          background: "#ffffff", 
          height: "100%", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            {/* Chat bubble icon */}
            <div style={{ 
              width: 140, 
              height: 140, 
              margin: "0 auto 24px", 
              borderRadius: 70, 
              background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              border: "3px solid #e9d5ff"
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            
            <h2 style={{ 
              margin: 0, 
              color: "#4f46e5", 
              fontSize: 28, 
              fontWeight: 700,
              marginBottom: 12,
              lineHeight: 1.2
            }}>
              {user?.name ? `Chào mừng ${user.name} đến với ZolaChat` : 'Chào mừng bạn đến với ZolaChat'}
            </h2>
            
            <p style={{ 
              marginTop: 0, 
              marginBottom: 32, 
              color: "#6b7280",
              fontSize: 16,
              lineHeight: 1.5
            }}>
              Vui lòng chọn một cuộc trò chuyện để bắt đầu nhắn tin.
            </p>
            
            <Link
              href="/friends"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                color: "#fff",
                borderRadius: 24,
                padding: "12px 24px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 15,
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Thêm bạn mới
            </Link>
          </div>
        </main>
      )}
    </>
  );
}

