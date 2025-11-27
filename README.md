# Zola Chat App

Ứng dụng chat thời gian thực với giao diện hiện đại, hỗ trợ tạo bài viết, nhắn tin và chia sẻ nội dung đa phương tiện. Tài liệu này hướng dẫn nhanh cách cài đặt, chạy và sử dụng Zola trên môi trường phát triển cục bộ.

---

## 1. Chuẩn Bị
1. Cài **Node.js 18+** (đi kèm npm).  
2. Cài **Git** để clone mã nguồn.  
3. Kiểm tra đã có trình duyệt hiện đại (Chrome/Edge/Firefox).  
4. (Tuỳ chọn) Cài thêm **pnpm/yarn** nếu muốn dùng thay npm.

---

## 2. Lấy Mã Nguồn & Cài Đặt Phụ Thuộc
```bash
git clone https://github.com/Khoa432004/Zola-App
cd Zola-App
```

### Frontend
```bash
cd frontend
npm install
cd ..
```

### Backend
```bash
cd backend
npm install
cd ..
```

---

## 3. Thiết Lập Biến Môi Trường
1. Tìm file mẫu `.env.example` (nếu có) ở từng module để biết đầy đủ biến.  
2. Tạo file cấu hình thực tế (`frontend/.env.local`, `backend/.env`).  
3. Điền giá trị cần thiết, ví dụ:
   - **Frontend**
     ```
     NEXT_PUBLIC_API_URL= http://localhost:4000/api
     NEXT_PUBLIC_FIREBASE_API_KEY= <Firebase Web API key>
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN= <Firebase auth domain>
     NEXT_PUBLIC_FIREBASE_PROJECT_ID= <Firebase project id>
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET= <Firebase storage bucket>
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= <Firebase messaging sender id>
     NEXT_PUBLIC_FIREBASE_APP_ID= <Firebase web app id>
     ```
   - **Backend**
     ```
     PORT=4000
     CORS_ORIGIN= http://localhost:3000
     JWT_SECRET= <JWT secret key>
     JWT_EXPIRES_IN= 7d

     EMAIL_USER= <SMTP username>
     EMAIL_PASSWORD= <SMTP password>
     MAIL_USER= <Alternative mail username if used>
     MAIL_PASS= <Alternative mail password>

     FIREBASE_PROJECT_ID= <Firebase project id>
     FIREBASE_CLIENT_EMAIL= <Firebase service account email>
     FIREBASE_PRIVATE_KEY= "-----BEGIN PRIVATE KEY-----\n<service-account-private-key>\n-----END PRIVATE KEY-----\n"

     CLOUDINARY_CLOUD_NAME= <Cloudinary cloud name>
     CLOUDINARY_API_KEY= <Cloudinary API key>
     CLOUDINARY_API_SECRET= <Cloudinary API secret>
     ```

---

## 4. Chạy Ứng Dụng
1. **Khởi động backend** (nếu có):
   ```bash
   cd backend
   npm run dev
   ```
   Backend mặc định lắng nghe `http://localhost:4000`.

2. **Khởi động frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   Mở trình duyệt tại địa chỉ cung cấp (thường là `http://localhost:3000`).

---

## 5. Sử Dụng Tính Năng
1. **Đăng ký & đăng nhập**  
   - Điền thông tin cần thiết để tạo tài khoản mới hoặc dùng tài khoản demo có sẵn.  
   - OTP/email verification sẽ gửi mã xác nhận trước khi hoàn tất đăng ký.  
   - Sau khi đăng nhập, JWT/token được lưu trong localStorage để tự động duy trì phiên.

2. **Quên mật khẩu / reset**  
   - Chọn `Forgot password`, nhập email và nhận OTP hoặc đường dẫn reset.  
   - Xác thực mã OTP, đặt mật khẩu mới, sau đó đăng nhập lại bình thường.

3. **Kết bạn & chấp nhận lời mời**  
   - Tìm kiếm người dùng, gửi lời mời kết bạn và chờ họ chấp nhận.  
   - Chỉ khi đã là bạn bè, bạn mới có thể bắt đầu chat trực tiếp hoặc thêm họ vào nhóm.

4. **Tạo phòng chat riêng**  
   - Chọn chức năng “New Room”, đặt tên phòng và tick những người bạn muốn mời (2 người ⇒ chat riêng tư, 2+ người ⇒ chat nhóm).  
   - Chỉ những người đã là bạn bè mới xuất hiện trong danh sách lựa chọn.  
   - Sau khi tạo, mọi thành viên đều thấy phòng mới và có thể trò chuyện ngay.

5. **Đăng bài viết (dòng thời gian)**  
   - Chọn “Create Post”, nhập caption và chèn hình ảnh/video để chia sẻ giống mạng xã hội.  
   - Bài viết hiển thị trên feed để toàn bộ bạn bè hoặc người theo dõi xem và tương tác.
   - Bài viết có thể được chỉnh sửa cũng như chia sẽ để điều chỉnh phạm vi người xem.
   - Mỗi bài viết có “Trash” cho phép xóa tạm thời; từ thùng rác có thể khôi phục hoặc xóa vĩnh viễn, đồng thời mở lại khi cần.

6. **Trò chuyện thời gian thực**  
   - Chọn một người bạn hoặc nhóm.  
   - Gửi tin nhắn văn bản, emoji, file , video , voice hoặc phản ứng (reaction); tin nhắn được cập nhật tức thì qua WebSocket.
   - Phòng chat có thể thực hiện gọi điện cho các người dùng khác

7. **Trang cá nhân & thiết lập**  
   - Vào trang profile để chỉnh sửa họ tên, email, số điện thoại, avatar…  
   - Xem thống kê bài viết, số bạn bè, v.v.

---

## 6. Hỗ Trợ
- Tạo issue trên repository khi gặp lỗi hoặc đề xuất tính năng.  
- Mô tả rõ môi trường (OS, Node version) và log lỗi để dễ tái hiện.  
- Đính kèm screenshot hoặc video ngắn giúp quá trình xử lý nhanh hơn.

Chúc bạn trải nghiệm vui vẻ với Zola Chat App!
