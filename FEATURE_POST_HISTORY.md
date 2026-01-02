# Chức năng Xem Lịch Sử Bài Viết

## Tổng quan
Đã thêm 2 chức năng mới:
1. **Xem danh sách bài viết đã xem** - Lưu lại tất cả bài viết mà user đã xem
2. **Xem danh sách bài viết đã thích** - Hiển thị tất cả bài viết mà user đã like

## Giao diện người dùng

### Truy cập chức năng:
- Vào **Trang cá nhân** (Profile)
- Chọn tab **"Đã xem"** hoặc **"Đã thích"**
- Danh sách bài viết hiển thị trực tiếp trên trang (không dùng modal)

### Các tab trong Profile:
- 📝 **Bài viết** - Các bài viết của bạn
- ⭐ **Nổi bật** - Bài viết nổi bật
- 🎬 **Phương tiện** - Ảnh và video
- 👀 **Đã xem** - Bài viết đã xem ⭐ **MỚI**
- ❤️ **Đã thích** - Bài viết đã thích ⭐ **MỚI**

### Tự động tracking:
- Khi mở chi tiết bài viết (PostDetailModal), hệ thống tự động ghi nhận lượt xem
- Không cần tương tác thêm từ user

## Backend API

### 1. Track Post View
**Endpoint:** `POST /api/posts/:id/view`
**Auth:** Required
**Mô tả:** Tự động ghi nhận khi user xem một bài viết

**Response:**
```json
{
  "success": true,
  "message": "Đã ghi nhận lượt xem"
}
```

### 2. Get Viewed Posts
**Endpoint:** `GET /api/posts/history/viewed?limit=50`
**Auth:** Required
**Mô tả:** Lấy danh sách bài viết user đã xem, sắp xếp theo thời gian xem gần nhất

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "postId": "...",
      "authorName": "...",
      "caption": "...",
      "media": [...],
      "likeCount": 10,
      "viewCount": 100,
      "commentCount": 5,
      "createdAt": "...",
      ...
    }
  ]
}
```

### 3. Get Liked Posts
**Endpoint:** `GET /api/posts/history/liked?limit=50`
**Auth:** Required
**Mô tả:** Lấy danh sách bài viết user đã thích

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "postId": "...",
      "authorName": "...",
      "caption": "...",
      "isLiked": true,
      ...
    }
  ]
}
```

## Frontend Components

### PostHistoryModal Component
**File:** `frontend/src/components/PostHistoryModal.tsx`

Component modal hiển thị danh sách bài viết đã xem hoặc đã thích.

**Props:**
- `isOpen: boolean` - Trạng thái mở/đóng modal
- `onClose: () => void` - Callback khi đóng modal
- `type: 'viewed' | 'liked'` - Loại lịch sử cần hiển thị

**Features:**
- Hiển thị danh sách bài viết với preview
- Show author info, timestamp, caption
- Hiển thị media (ảnh/video) preview
- Stats (likes, comments, views)
- Loading state và error handling
- Responsive design

## Cách sử dụng

### 1. Truy cập từ Sidebar
Người dùng có thể xem lịch sử bài viết bằng cách:

1. Click vào avatar ở sidebar
2. Chọn một trong hai tùy chọn:
   - **"Bài viết đã xem"** - Xem lịch sử các bài viết đã xem
   - **"Bài viết đã thích"** - Xem tất cả bài viết đã like

### 2. Tự động Track View
Hệ thống tự động ghi nhận lượt xem khi:
- User mở modal chi tiết bài viết (PostDetailModal)
- Chỉ track nếu user đã đăng nhập

## Database Schema

### Collection: `post_views`
```typescript
{
  // Document ID: ${postId}_${userId}
  postId: string,
  userId: string,
  firstViewedAt: Timestamp,
  lastViewedAt: Timestamp,
  viewCount: number  // Số lần user xem bài viết này
}
```

### Collection: `posts/{postId}/likes`
```typescript
{
  // Document ID: userId
  userId: string,
  createdAt: Timestamp
}
```

## Technical Implementation

### Backend Changes

**1. Post Model (`backend/src/models/Post.ts`)**
- `trackView()` - Ghi nhận lượt xem
- `findViewedByUser()` - Lấy danh sách bài viết đã xem
- `findLikedByUser()` - Lấy danh sách bài viết đã thích

**2. Post Service (`backend/src/services/post.service.ts`)**
- `trackPostView()`
- `getViewedPosts()`
- `getLikedPosts()`

**3. Post Controller (`backend/src/controllers/post.controller.ts`)**
- `trackPostView` endpoint handler
- `getViewedPosts` endpoint handler
- `getLikedPosts` endpoint handler

**4. Routes (`backend/src/routes/post.routes.ts`)**
```typescript
router.get('/history/viewed', authenticate, controller.getViewedPosts);
router.get('/history/liked', authenticate, controller.getLikedPosts);
router.post('/:id/view', authenticate, controller.trackPostView);
```

### Frontend Changes

**1. API Service (`frontend/src/services/api.ts`)**
```typescript
async trackPostView(postId: string)
async getViewedPosts(limit: number = 50)
async getLikedPosts(limit: number = 50)
```

**2. UI Components**
- `PostHistoryModal.tsx` - Modal hiển thị lịch sử
- `Sidebar.tsx` - Thêm menu items để mở modal

**3. Integration**
- PostDetailModal tự động gọi `trackPostView()` khi mở

## Testing

### Test Backend APIs
```bash
# Test track view
curl -X POST http://localhost:5000/api/posts/{postId}/view \
  -H "Authorization: Bearer {token}"

# Test get viewed posts
curl http://localhost:5000/api/posts/history/viewed \
  -H "Authorization: Bearer {token}"

# Test get liked posts
curl http://localhost:5000/api/posts/history/liked \
  -H "Authorization: Bearer {token}"
```

### Test Frontend
1. Đăng nhập vào ứng dụng
2. Xem một số bài viết (click vào bài viết để mở modal)
3. Like một số bài viết
4. Click vào avatar ở sidebar
5. Chọn "Bài viết đã xem" hoặc "Bài viết đã thích"
6. Kiểm tra danh sách hiển thị đúng

## Performance Considerations

### Limitations
- **Viewed Posts:** Sử dụng Firestore query với index, performance tốt cho đến ~10,000 views/user
- **Liked Posts:** Hiện tại scan tất cả posts (limit 500) để check likes - có thể chậm nếu có nhiều posts
  - **Recommended:** Tạo collection riêng `user_liked_posts` để tối ưu performance trong tương lai

### Optimization Ideas
1. Thêm pagination cho viewed/liked posts
2. Cache kết quả trên client
3. Tạo index cho Firestore queries
4. Implement virtual scrolling cho danh sách dài

## Future Enhancements

1. **Thêm filters:**
   - Filter theo thời gian (hôm nay, tuần này, tháng này)
   - Filter theo author
   - Filter theo media type

2. **Search trong lịch sử:**
   - Tìm kiếm bài viết theo nội dung
   - Tìm theo tác giả

3. **Export lịch sử:**
   - Export danh sách bài viết đã xem/thích
   - Tạo backup

4. **Analytics:**
   - Thống kê loại nội dung user quan tâm
   - Recommendations dựa trên lịch sử xem

5. **Privacy controls:**
   - Xóa lịch sử xem
   - Tắt tracking
   - Clear history theo khoảng thời gian
