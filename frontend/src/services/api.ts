import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    account: {
      id: string;
      email: string;
      name: string;
      avatar?: string;
      role?: "user" | "admin";
    };
    token: string;
  };
}

export interface ReportMessageRequest {
  messageId: string;
  conversationId: string;
  reason: string;
  description: string;
}

export interface MessageReport {
  id: string;
  reportedBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  reportedUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  reason: string;
  description: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}
class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // ✅ Interceptor thêm token vào header
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("token");
          const account = localStorage.getItem("account");

          console.log(
            "[API Request Interceptor]",
            config.url,
            "- Token from localStorage:",
            token ? token.substring(0, 20) + "..." : "NO TOKEN FOUND"
          );

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("[API Request Interceptor] Added Authorization header");
          } else {
            console.warn("[API Request Interceptor] No token found in localStorage");
          }

          // Log user info if available
          if (account) {
            try {
              const user = JSON.parse(account);
              console.log("[API Request Interceptor] User from localStorage:", {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
              });
            } catch (e) {
              console.warn("[API Request Interceptor] Failed to parse account:", e);
            }
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ✅ Interceptor xử lý lỗi 401
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("account");
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ✅ Đăng nhập email/password
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>(
        "/auth/login",
        credentials
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  // ✅ Đăng nhập Google
  async googleLogin(googleData: GoogleLoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>(
        "/auth/google",
        googleData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  // ✅ Gửi OTP
  async sendOtp(payload: { email: string }) {
    try {
      const response = await this.axiosInstance.post("/auth/send-otp", payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Gửi OTP thất bại");
    }
  }

  // ✅ Xác minh OTP
  async verifyOtp(payload: { email: string; otp: string }) {
    try {
      const response = await this.axiosInstance.post(
        "/auth/verify-otp",
        payload
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "OTP không đúng");
    }
  }

  // ✅ Tạo tài khoản cuối cùng
  async registerFinal(payload: {
    email: string;
    username: string;
    password: string;
  }) {
    try {
      const response = await this.axiosInstance.post(
        "/auth/register-final",
        payload
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Đăng ký tài khoản thất bại"
      );
    }
  }

  async forgotPassword(credentials: { email: string }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>(
        "/auth/forgot-password",
        credentials
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  // Xác minh OTP cho reset password (từ Account database)
  async verifyOTP(credentials: { email: string; otp: string }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>(
        "/auth/verify-otp-reset",
        credentials
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  async resetPassword(credentials: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>(
        "/auth/reset-password",
        credentials
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>(
        "/auth/logout"
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra");
    }
  }

  // Profile
  async getProfile() {
    try {
      const response = await this.axiosInstance.get("/profile/me");
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được hồ sơ");
    }
  }

  async updateProfile(payload: {
    name?: string;
    phone?: string;
    address?: string;
    bio?: string;
    avatar?: string;
  }) {
    try {
      const response = await this.axiosInstance.patch("/profile", payload);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Cập nhật hồ sơ thất bại"
      );
    }
  }

  async uploadAvatar(file: File) {
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await this.axiosInstance.post(
        "/profile/avatar",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể upload ảnh đại diện"
      );
    }
  }

  async updatePrivacySettings(showOnlineStatus: boolean) {
    try {
      const response = await this.axiosInstance.patch("/profile/privacy", {
        showOnlineStatus,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          "Cập nhật cài đặt quyền riêng tư thất bại"
      );
    }
  }

  // Posts
  async getPosts(page: number = 1, limit: number = 10) {
    const response = await this.axiosInstance.get("/posts", {
      params: { page, limit },
    });
    return response.data;
  }

  async getFeaturedPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/featured", {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không lấy được bài đăng nổi bật"
      );
    }
  }

  async getMyPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/my", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không lấy được bài đăng của tôi"
      );
    }
  }

  async createPost(formData: FormData) {
    try {
      const response = await this.axiosInstance.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể đăng bài");
    }
  }

  async updatePost(postId: string, formData: FormData) {
    try {
      const response = await this.axiosInstance.put(
        `/posts/${postId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể cập nhật bài viết"
      );
    }
  }

  async deletePost(postId: string) {
    try {
      const response = await this.axiosInstance.delete(`/posts/${postId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể xóa bài viết"
      );
    }
  }

  async getDeletedPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/deleted", {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không lấy được bài viết đã xóa"
      );
    }
  }

  async restorePost(postId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/posts/${postId}/restore`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể khôi phục bài viết"
      );
    }
  }

  async getCommentsByPost(postId: string, limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get(
        `/comments/post/${postId}`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không lấy được bình luận"
      );
    }
  }

  async createComment(
    targetId: string,
    content: string,
    files?: File | File[]
  ) {
    try {
      if (files) {
        const formData = new FormData();
        formData.append("targetId", targetId);
        formData.append("content", content || "");
        if (Array.isArray(files)) {
          files.forEach((f) => formData.append("media", f));
        } else {
          formData.append("media", files);
        }

        const response = await this.axiosInstance.post("/comments", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
      }

      const response = await this.axiosInstance.post("/comments", {
        targetId,
        content,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể tạo bình luận"
      );
    }
  }

  async updateComment(commentId: string, content: string) {
    try {
      const response = await this.axiosInstance.put(`/comments/${commentId}`, {
        content,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể cập nhật bình luận"
      );
    }
  }

  async likeComment(commentId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/comments/${commentId}/like`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể thích bình luận"
      );
    }
  }

  async unlikeComment(commentId: string) {
    try {
      const response = await this.axiosInstance.delete(
        `/comments/${commentId}/like`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể bỏ thích bình luận"
      );
    }
  }

  async deleteComment(commentId: string) {
    try {
      const response = await this.axiosInstance.delete(
        `/comments/${commentId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể xóa bình luận"
      );
    }
  }
  async getLatestPosts() {
    return this.axiosInstance.get("/posts/latest");
  }

  async getTopLikedPosts(page: number = 1, limit: number = 10) {
    const response = await this.axiosInstance.get("/posts/top-liked", {
      params: { page, limit },
    });
    return response.data;
  }

  async getTopViewedPosts(page: number = 1, limit: number = 10) {
    const response = await this.axiosInstance.get("/posts/top-viewed", {
      params: { page, limit },
    });
    return response.data;
  }

  async getPromotedPosts() {
    return this.axiosInstance.get("/posts/promoted");
  }

  async toggleLike(postId: string) {
    try {
      const response = await this.axiosInstance.post(`/posts/${postId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể thích/bỏ thích bài viết"
      );
    }
  }

  async getPostById(postId: string) {
    try {
      const response = await this.axiosInstance.get(`/posts/${postId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không lấy được bài viết"
      );
    }
  }

  async likePost(postId: string) {
    try {
      const response = await this.axiosInstance.post(`/posts/${postId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể thích bài viết"
      );
    }
  }

  async unlikePost(postId: string) {
    try {
      const response = await this.axiosInstance.delete(`/posts/${postId}/like`);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể bỏ thích bài viết"
      );
    }
  }

  async sharePost(
    postId: string,
    caption?: string,
    visibility?: "public" | "friends" | "private" | "specific",
    sharedWith?: string[]
  ) {
    try {
      const response = await this.axiosInstance.post(`/posts/${postId}/share`, {
        caption: caption || "",
        visibility: visibility || "public",
        sharedWith: sharedWith || undefined,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Không thể chia sẻ bài viết"
      );
    }
  }

  // Friends
  async sendFriendRequest(email: string) {
    try {
      const response = await this.axiosInstance.post("/friends/requests", {
        email,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Gửi lời mời kết bạn thất bại"
      );
    }
  }

  async getReceivedRequests() {
    try {
      const response = await this.axiosInstance.get(
        "/friends/requests/received"
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách lời mời thất bại"
      );
    }
  }

  async getSentRequests() {
    try {
      const response = await this.axiosInstance.get("/friends/requests/sent");
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách lời mời thất bại"
      );
    }
  }

  async acceptFriendRequest(requestId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/friends/requests/${requestId}/accept`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Chấp nhận lời mời kết bạn thất bại"
      );
    }
  }

  async rejectFriendRequest(requestId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/friends/requests/${requestId}/reject`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Từ chối lời mời kết bạn thất bại"
      );
    }
  }

  async cancelFriendRequest(requestId: string) {
    try {
      const response = await this.axiosInstance.delete(
        `/friends/requests/${requestId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Hủy lời mời kết bạn thất bại"
      );
    }
  }

  async getFriends() {
    try {
      const response = await this.axiosInstance.get("/friends");
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách bạn bè thất bại"
      );
    }
  }

  async unfriend(friendId: string) {
    try {
      const response = await this.axiosInstance.delete(`/friends/${friendId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Hủy kết bạn thất bại");
    }
  }

  // ========== CONVERSATION METHODS ==========

  /**
   * Tạo conversation riêng tư
   */
  async createPrivateConversation(friendId: string) {
    try {
      const response = await this.axiosInstance.post("/conversations/private", {
        friendId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Tạo cuộc trò chuyện thất bại"
      );
    }
  }

  /**
   * Tạo conversation nhóm
   */
  async createGroupConversation(memberIds: string[], groupName?: string) {
    try {
      const response = await this.axiosInstance.post("/conversations/group", {
        memberIds,
        groupName,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Tạo nhóm chat thất bại"
      );
    }
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getConversations() {
    try {
      const response = await this.axiosInstance.get("/conversations");
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          "Lấy danh sách cuộc trò chuyện thất bại"
      );
    }
  }

  /**
   * Lấy conversation theo ID
   */
  async getConversationById(conversationId: string) {
    try {
      const response = await this.axiosInstance.get(
        `/conversations/${conversationId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy cuộc trò chuyện thất bại"
      );
    }
  }

  // ========== MESSAGE METHODS ==========

  /**
   * Gửi message (có thể có file)
   */
  async sendMessage(
    conId: string,
    content: string,
    type: "text" | "image" | "video" | "sticker" | "audio" = "text",
    file?: File,
    replyToId?: string
  ) {
    try {
      const formData = new FormData();
      formData.append("conId", conId);
      formData.append("content", content);
      formData.append("type", type);

      if (file) {
        formData.append("file", file);
      }

      if (replyToId) {
        formData.append("replyToId", replyToId);
      }

      const response = await this.axiosInstance.post(
        "/messages/send",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Gửi tin nhắn thất bại");
    }
  }

  /**
   * Lấy messages của conversation
   * @param conId Conversation ID
   * @param limit Số lượng messages
   * @param beforeTimestamp Load messages trước timestamp này (cho lazy loading)
   */
  async getMessages(conId: string, limit?: number, beforeTimestamp?: number) {
    try {
      const params: any = {};
      if (limit) params.limit = limit.toString();
      if (beforeTimestamp) params.beforeTimestamp = beforeTimestamp.toString();
      const response = await this.axiosInstance.get(`/messages/${conId}`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Lấy tin nhắn thất bại");
    }
  }

  /**
   * Đánh dấu conversation đã xem
   */
  async markConversationAsSeen(conId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/messages/conversation/${conId}/seen`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          "Đánh dấu cuộc trò chuyện đã xem thất bại"
      );
    }
  }

  /**
   * Xóa message
   */
  async deleteMessage(messageId: string) {
    try {
      const response = await this.axiosInstance.delete(
        `/messages/${messageId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Xóa tin nhắn thất bại");
    }
  }

  /**
   * Toggle reaction cho message
   */
  async toggleMessageReaction(messageId: string, emoji: string) {
    try {
      const response = await this.axiosInstance.post(
        `/messages/${messageId}/reaction`,
        {
          emoji,
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Thả cảm xúc thất bại");
    }
  }

  /**
   * Lấy reactions của message
   */
  async getMessageReactions(messageId: string) {
    try {
      const response = await this.axiosInstance.get(
        `/messages/${messageId}/reactions`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách cảm xúc thất bại"
      );
    }
  }

  /**
   * Tìm kiếm messages theo keyword
   */
  async searchMessages(keyword: string, limit?: number) {
    try {
      const params: any = { keyword };
      if (limit) params.limit = limit.toString();
      const response = await this.axiosInstance.get("/messages/search/all", {
        params,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Tìm kiếm tin nhắn thất bại"
      );
    }
  }

  // ==================== STORY APIs ====================

  /**
   * Lấy tất cả stories (grouped by author)
   */
  async getStories() {
    try {
      const response = await this.axiosInstance.get("/stories");
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách stories thất bại"
      );
    }
  }

  /**
   * Lấy stories của tôi
   */
  async getMyStories(includeExpired: boolean = false) {
    try {
      const params = includeExpired ? { includeExpired: "true" } : {};
      const response = await this.axiosInstance.get("/stories/my", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy stories của tôi thất bại"
      );
    }
  }

  /**
   * Lấy story theo ID
   */
  async getStoryById(storyId: string) {
    try {
      const response = await this.axiosInstance.get(`/stories/${storyId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Lấy story thất bại");
    }
  }

  /**
   * Tạo story mới
   */
  async createStory(formData: FormData) {
    try {
      const response = await this.axiosInstance.post("/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Đăng story thất bại");
    }
  }

  /**
   * Đánh dấu story đã xem
   */
  async markStoryAsViewed(storyId: string) {
    try {
      const response = await this.axiosInstance.post(
        `/stories/${storyId}/view`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Đánh dấu story đã xem thất bại"
      );
    }
  }

  /**
   * Xóa story
   */
  async deleteStory(storyId: string) {
    try {
      const response = await this.axiosInstance.delete(`/stories/${storyId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Xóa story thất bại");
    }
  }

  /**
   * Lấy danh sách viewers của story
   */
  async getStoryViewers(storyId: string) {
    try {
      const response = await this.axiosInstance.get(
        `/stories/${storyId}/viewers`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Lấy danh sách viewers thất bại"
      );
    }
  }

  // ==================== APPOINTMENT METHODS ====================

  /**
   * Tạo cuộc hẹn mới
   */
  async createAppointment(data: {
    con_id: string;
    title: string;
    description?: string;
    appointment_time: string;
    location?: string;
    participant_ids: string[];
    reminder_times: number[];
    repeat_type?: "none" | "daily" | "weekly" | "monthly";
  }) {
    try {
      const response = await this.axiosInstance.post("/appointments", data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Không thể tạo cuộc hẹn");
    }
  }

  /**
   * Lấy danh sách cuộc hẹn của conversation
   */
  async getConversationAppointments(conversationId: string) {
    try {
      const response = await this.axiosInstance.get(
        `/appointments/conversation/${conversationId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Không thể lấy danh sách cuộc hẹn"
      );
    }
  }

  /**
   * Lấy chi tiết một cuộc hẹn
   */
  async getAppointmentById(appointmentId: string) {
    try {
      const response = await this.axiosInstance.get(
        `/appointments/${appointmentId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Không thể lấy thông tin cuộc hẹn"
      );
    }
  }

  /**
   * Cập nhật cuộc hẹn
   */
  async updateAppointment(
    appointmentId: string,
    data: {
      title?: string;
      description?: string;
      appointment_time?: string;
      location?: string;
      participant_ids?: string[];
      reminder_times?: number[];
      repeat_type?: "none" | "daily" | "weekly" | "monthly";
      status?: "pending" | "completed" | "cancelled";
    }
  ) {
    try {
      const response = await this.axiosInstance.put(
        `/appointments/${appointmentId}`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Không thể cập nhật cuộc hẹn"
      );
    }
  }

  /**
   * Xóa cuộc hẹn
   */
  async deleteAppointment(appointmentId: string) {
    try {
      const response = await this.axiosInstance.delete(
        `/appointments/${appointmentId}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Không thể xóa cuộc hẹn");
    }
  }

  // 📝 Báo cáo tin nhắn
  async reportMessage(
    reportData: ReportMessageRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.axiosInstance.post(
        "/admin/reports/messages",
        reportData
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Báo cáo thất bại");
    }
  }

  // 📋 Lấy danh sách báo cáo tin nhắn (admin only)
  async getMessageReports(
    status: string = "all"
  ): Promise<{ success: boolean; data: MessageReport[] }> {
    try {
      console.log("[API] Fetching message reports with status:", status);
      
      // Validate status
      const validStatuses = ["all", "pending", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status không hợp lệ: ${status}`);
      }

      const response = await this.axiosInstance.get(
        `/admin/reports/messages`,
        {
          params: { status },
        }
      );
      
      console.log("[API] Message reports fetched successfully:", response.data?.data?.length || 0, "reports");
      return response.data;
    } catch (error: any) {
      console.error("[API] Error fetching message reports:", {
        status,
        error: error.response?.data || error.message,
        statusCode: error.response?.status,
      });
      
      // Provide more detailed error messages
      if (error.response?.status === 401) {
        throw new Error("Bạn cần đăng nhập để xem báo cáo");
      } else if (error.response?.status === 403) {
        throw new Error("Bạn không có quyền xem báo cáo. Chỉ admin mới được phép.");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || "Dữ liệu không hợp lệ");
      } else if (error.response?.status === 500) {
        throw new Error(error.response?.data?.message || "Lỗi server khi tải báo cáo. Vui lòng thử lại sau.");
      } else {
        throw new Error(error.response?.data?.message || "Lỗi khi tải báo cáo");
      }
    }
  }

  // ✅ Duyệt/từ chối báo cáo tin nhắn (admin only)
  async updateMessageReportStatus(
    reportId: string,
    status: "approved" | "rejected"
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[API] Updating report status:", { reportId, status });
      
      if (!reportId || reportId.trim() === "") {
        throw new Error("Report ID không hợp lệ");
      }

      if (!status || !["approved", "rejected"].includes(status)) {
        throw new Error("Status không hợp lệ");
      }

      const response = await this.axiosInstance.put(
        `/admin/reports/messages/${reportId}/status`,
        { status }
      );
      
      console.log("[API] Report status updated successfully:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("[API] Error updating report status:", {
        reportId,
        status,
        error: error.response?.data || error.message,
      });
      
      // Provide more detailed error messages
      if (error.response?.status === 404) {
        throw new Error("Báo cáo không tồn tại");
      } else if (error.response?.status === 401) {
        throw new Error("Bạn cần đăng nhập để thực hiện thao tác này");
      } else if (error.response?.status === 403) {
        throw new Error("Bạn không có quyền thực hiện thao tác này");
      } else if (error.response?.status === 400) {
        throw new Error(error.response?.data?.message || "Dữ liệu không hợp lệ");
      } else {
        throw new Error(error.response?.data?.message || "Cập nhật thất bại. Vui lòng thử lại.");
      }
    }
  }
}

// Export the class
export { ApiService };

// Export singleton instance directly (must be exported at module level for Turbopack)
export const apiService = new ApiService();
