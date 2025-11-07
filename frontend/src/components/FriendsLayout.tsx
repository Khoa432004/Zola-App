'use client';

import { useState } from 'react';
import FriendsPanel from './FriendsPanel';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export default function FriendsLayout() {
  const [activeView, setActiveView] = useState<'friends' | 'invitations'>('friends');
  const [searchQuery, setSearchQuery] = useState('');

  const friends: Friend[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'minhdungvt001@gmail.com',
      avatar: 'JS'
    }
  ];

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Friends List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredFriends.map((friend) => (
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
                  {friend.avatar}
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
          ))}
        </div>
      </section>

      {/* Main Friends Panel */}
      <FriendsPanel friends={friends} />
    </>
  );
}

