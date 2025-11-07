'use client';

import { useState } from 'react';

interface Post {
  id: string;
  author: string;
  email: string;
  timestamp: string;
  title: string;
  description: string;
  image?: string;
  likes: number;
  isLiked: boolean;
}

export default function SocialPanel() {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      author: 'Trần Thảo Tiên',
      email: 'thaotien23vn@gmail.com',
      timestamp: 'lúc 23:03 3 tháng 6, 2025',
      title: 'Tuyển thực tập sinh FE',
      description: 'địa chỉ làm việc tại tòa Etown2',
      likes: 3,
      isLiked: false
    },
    {
      id: '2',
      author: 'Anh Minh',
      email: 'anhminh20221@gmail.com',
      timestamp: 'lúc 09:18 30 tháng 5, 2025',
      title: 'May Anh',
      description: 'duoi day',
      likes: 3,
      isLiked: false
    }
  ]);

  const featuredPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 2);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  return (
    <div style={{ display: "flex", flex: 1, height: "100vh", overflow: "hidden" }}>
      {/* Main Feed */}
      <main style={{ 
        flex: 1, 
        background: "#f9fafb", 
        height: "100%", 
        overflowY: "auto",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          background: "#ffffff",
          padding: "20px 32px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: "#6366f1"
          }}>
            ZolaChat
          </h1>
          <button style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + Tạo bài viết
          </button>
        </div>

        {/* Posts Feed */}
        <div style={{ padding: "24px 32px", maxWidth: 680, margin: "0 auto", width: "100%" }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "20px",
                marginBottom: 20,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}
            >
              {/* Post Header */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
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
                  <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>
                    {post.author.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                    {post.author}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {post.email}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {post.timestamp}
                </div>
              </div>

              {/* Post Title */}
              <h3 style={{
                margin: "0 0 8px 0",
                fontSize: 18,
                fontWeight: 700,
                color: "#111827"
              }}>
                {post.title}
              </h3>

              {/* Post Description */}
              <p style={{
                margin: "0 0 16px 0",
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.6
              }}>
                {post.description}
              </p>

              {/* Post Image Placeholder */}
              {post.image && (
                <div style={{
                  width: "100%",
                  height: 300,
                  background: "#f3f4f6",
                  borderRadius: 8,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #e5e7eb"
                }}>
                  <span style={{ color: "#9ca3af", fontSize: 14 }}>Post Image</span>
                </div>
              )}

              {/* Post Actions */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingTop: 12,
                borderTop: "1px solid #f3f4f6"
              }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 6,
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={post.isLiked ? "#ef4444" : "none"}
                    stroke={post.isLiked ? "#ef4444" : "#6b7280"}
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span style={{
                    fontSize: 14,
                    color: post.isLiked ? "#ef4444" : "#6b7280",
                    fontWeight: 500
                  }}>
                    Thích
                  </span>
                </button>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  {post.likes} lượt thích
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar - Featured Posts */}
      <aside style={{
        width: 320,
        background: "#ffffff",
        borderLeft: "1px solid #e5e7eb",
        padding: "24px 20px",
        height: "100%",
        overflowY: "auto"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#111827"
          }}>
            Bài viết nổi bật
          </h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {featuredPosts.map((post) => (
            <div
              key={post.id}
              style={{
                padding: "12px",
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                marginBottom: 4
              }}>
                {post.title}
              </div>
              <div style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 8
              }}>
                Bởi: {post.author}
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {post.likes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

