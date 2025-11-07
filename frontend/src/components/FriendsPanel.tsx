'use client';

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface FriendsPanelProps {
  friends: Friend[];
}

export default function FriendsPanel({ friends }: FriendsPanelProps) {
  return (
    <main style={{ 
      flex: 1, 
      background: "#ffffff", 
      height: "100%", 
      display: "flex", 
      flexDirection: "column"
    }}>
      {/* Welcome Area */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px"
      }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{
            width: 160,
            height: 160,
            margin: "0 auto 24px",
            borderRadius: 80,
            background: "linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "3px solid #e9d5ff"
          }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
            Chào mừng đến Khu vực Bạn bè!
          </h2>
          
          <p style={{ 
            marginTop: 0, 
            marginBottom: 32, 
            color: "#6b7280",
            fontSize: 16,
            lineHeight: 1.5
          }}>
            Sử dụng các tùy chọn ở bảng điều khiển bên trái để thêm bạn mới hoặc xem lời mời đang chờ.
          </p>
        </div>
      </div>
    </main>
  );
}

