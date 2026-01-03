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

export interface ReportPostRequest {
  postId: string;
  reason: string;
  description: string;
}

export interface PostReport {
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
  media?: Array<{
    type: "image" | "video";
    sourceUrl: string;
  }>;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "user" | "admin";
  status: "active" | "banned";
  isDisabled: boolean;
  createdAt: string;
  lastSeen?: string;
  reportCount: number;
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

    // ✅ Interceptor thêm token vào header và kiểm tra token cho các endpoint yêu cầu auth
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("token");
          const account = localStorage.getItem("account");

          // List of endpoints that don't require authentication
          const publicEndpoints = [
            "/auth/login",
            "/auth/google",
            "/auth/register",
            "/auth/send-otp",
            "/auth/verify-otp",
            "/auth/register-final",
            "/auth/forgot-password",
            "/auth/verify-otp-reset",
            "/auth/reset-password",
          ];

          // Check if this endpoint requires authentication
          const requiresAuth = !publicEndpoints.some((endpoint) =>
            config.url?.includes(endpoint)
          );

          console.log(
            "[API Request Interceptor]",
            config.url,
            "- Token from localStorage:",
            token ? token.substring(0, 20) + "..." : "NO TOKEN FOUND",
            "- Requires Auth:",
            requiresAuth
          );

          if (requiresAuth && !token) {
            // Prevent request if token is missing for authenticated endpoints
            console.error(
              "[API Request Interceptor] Missing token for authenticated endpoint:",
              config.url
            );
            const error: any = new Error("Không có token xác thực");
            error.authRequired = true;
            error.statusCode = 401;
            return Promise.reject(error);
          }

          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("[API Request Interceptor] Added Authorization header");
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
              console.warn(
                "[API Request Interceptor] Failed to parse account:",
                e
              );
            }
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ✅ Interceptor xử lý lỗi 401 và missing token
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError | any) => {
        // Handle missing token error from request interceptor
        if (error.authRequired) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("account");
          }
          const authError: any = new Error(
            error.message || "Không có token xác thực"
          );
          authError.authRequired = true;
          authError.statusCode = 401;
          return Promise.reject(authError);
        }

        // Handle 401 Unauthorized from server
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("account");
          }
          const authError: any = new Error(
            error.response?.data?.message || "Phiên đăng nhập đã hết hạn"
          );
          authError.authRequired = true;
          authError.statusCode = 401;
          return Promise.reject(authError);
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
      // Check if account is banned
      if (error.response?.data?.banned) {
        const bannedError: any = new Error(
          error.response?.data?.message ||
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin."
        );
        bannedError.banned = true;
        throw bannedError;
      }

      // Check for wrong password error
      const errorMessage =
        error.response?.data?.message || error.message || "Có lỗi xảy ra";
      const isWrongPassword =
        errorMessage.includes("mật khẩu không đúng") ||
        errorMessage.includes("password") ||
        errorMessage.includes("Email hoặc mật khẩu") ||
        error.response?.status === 401;

      if (isWrongPassword) {
        const wrongPasswordError: any = new Error(
          errorMessage.includes("mật khẩu")
            ? errorMessage
            : "Email hoặc mật khẩu không đúng"
        );
        wrongPasswordError.code = "auth/wrong-password";
        wrongPasswordError.wrongPassword = true;
        throw wrongPasswordError;
      }

      throw new Error(errorMessage);
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
      // Check if account is banned
      if (error.response?.data?.banned) {
        const bannedError: any = new Error(
          error.response?.data?.message ||
            "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin."
        );
        bannedError.banned = true;
        throw bannedError;
      }
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

  async trackPostView(postId: string) {
    try {
      const response = await this.axiosInstance.post(`/posts/${postId}/view`);
      return response.data;
    } catch (error: any) {
      console.error("Error tracking post view:", error);
      // Không throw error để không làm gián đoạn UX
    }
  }

  async getViewedPosts(limit: number = 50) {
    try {
      const response = await this.axiosInstance.get("/posts/history/viewed", {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể lấy danh sách bài viết đã xem");
    }
  }

  async getLikedPosts(limit: number = 50) {
    try {
      const response = await this.axiosInstance.get("/posts/history/liked", {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể lấy danh sách bài viết đã thích");
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
  async getMessages(
    conId: string,
    limit?: number,
    beforeTimestamp?: number
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    authRequired?: boolean;
  }> {
    try {
      const params: any = {};
      if (limit) params.limit = limit.toString();
      if (beforeTimestamp) params.beforeTimestamp = beforeTimestamp.toString();
      const response = await this.axiosInstance.get(`/messages/${conId}`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      // Check if this is an authentication error
      if (error.authRequired || error.response?.status === 401) {
        return {
          success: false,
          message:
            error.message ||
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          authRequired: true,
        };
      }
      // Return structured error for other cases
      return {
        success: false,
        message: error.response?.data?.message || "Lấy tin nhắn thất bại",
      };
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

      const response = await this.axiosInstance.get(`/admin/reports/messages`, {
        params: { status },
      });

      console.log(
        "[API] Message reports fetched successfully:",
        response.data?.data?.length || 0,
        "reports"
      );
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
        throw new Error(
          "Bạn không có quyền xem báo cáo. Chỉ admin mới được phép."
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          error.response?.data?.message || "Dữ liệu không hợp lệ"
        );
      } else if (error.response?.status === 500) {
        throw new Error(
          error.response?.data?.message ||
            "Lỗi server khi tải báo cáo. Vui lòng thử lại sau."
        );
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
        throw new Error(
          error.response?.data?.message || "Dữ liệu không hợp lệ"
        );
      } else {
        throw new Error(
          error.response?.data?.message ||
            "Cập nhật thất bại. Vui lòng thử lại."
        );
      }
    }
  }

  // 📝 Báo cáo bài viết
  async reportPost(
    reportData: ReportPostRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[API] Reporting post:", reportData.postId);
      const response = await this.axiosInstance.post(
        "/admin/reports/posts",
        reportData
      );
      console.log("[API] Post report submitted successfully");
      return response.data;
    } catch (error: any) {
      console.error(
        "[API] Error reporting post:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Báo cáo bài viết thất bại"
      );
    }
  }

  // 📋 Lấy danh sách báo cáo bài viết (admin only)
  async getPostReports(
    status: string = "all"
  ): Promise<{ success: boolean; data: PostReport[] }> {
    try {
      console.log("[API] Fetching post reports with status:", status);

      // Validate status
      const validStatuses = ["all", "pending", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        throw new Error(`Status không hợp lệ: ${status}`);
      }

      const response = await this.axiosInstance.get(`/admin/reports/posts`, {
        params: { status },
      });

      console.log(
        "[API] Post reports fetched successfully:",
        response.data?.data?.length || 0,
        "reports"
      );
      return response.data;
    } catch (error: any) {
      console.error("[API] Error fetching post reports:", {
        status,
        error: error.response?.data || error.message,
        statusCode: error.response?.status,
      });

      // Provide more detailed error messages
      if (error.response?.status === 401) {
        throw new Error("Bạn cần đăng nhập để xem báo cáo");
      } else if (error.response?.status === 403) {
        throw new Error(
          "Bạn không có quyền xem báo cáo. Chỉ admin mới được phép."
        );
      } else if (error.response?.status === 400) {
        throw new Error(
          error.response?.data?.message || "Dữ liệu không hợp lệ"
        );
      } else if (error.response?.status === 500) {
        throw new Error(
          error.response?.data?.message ||
            "Lỗi server khi tải báo cáo. Vui lòng thử lại sau."
        );
      } else {
        throw new Error(error.response?.data?.message || "Lỗi khi tải báo cáo");
      }
    }
  }

  // ✅ Duyệt/từ chối báo cáo bài viết (admin only)
  async updatePostReportStatus(
    reportId: string,
    status: "approved" | "rejected"
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[API] Updating post report status:", { reportId, status });

      if (!reportId || reportId.trim() === "") {
        throw new Error("Report ID không hợp lệ");
      }

      if (!status || !["approved", "rejected"].includes(status)) {
        throw new Error("Status không hợp lệ");
      }

      const response = await this.axiosInstance.put(
        `/admin/reports/posts/${reportId}/status`,
        { status }
      );

      console.log(
        "[API] Post report status updated successfully:",
        response.data
      );
      return response.data;
    } catch (error: any) {
      console.error("[API] Error updating post report status:", {
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
        throw new Error(
          error.response?.data?.message || "Dữ liệu không hợp lệ"
        );
      } else {
        throw new Error(
          error.response?.data?.message ||
            "Cập nhật thất bại. Vui lòng thử lại."
        );
      }
    }
  }

  // ✅ Lấy danh sách tất cả users (admin only)
  async getAllUsers(): Promise<{
    success: boolean;
    data: User[];
    total?: number;
    message?: string;
  }> {
    try {
      console.log("[API] Fetching all users...");

      const response = await this.axiosInstance.get("/admin/users");

      // Normalize response: backend returns { success, message, data: { users, total } }
      // We return { success, data: users[], total, message }
      const backendData = response.data?.data;
      const users = backendData?.users || [];
      const total = backendData?.total || users.length;

      console.log("[API] Users fetched successfully:", users.length, "users");

      return {
        success: response.data?.success || true,
        message: response.data?.message,
        data: users,
        total,
      };
    } catch (error: any) {
      console.error("[API] Error fetching users:", {
        error: error.response?.data || error.message,
        statusCode: error.response?.status,
      });

      // Provide more detailed error messages
      if (error.response?.status === 401) {
        throw new Error("Bạn cần đăng nhập để xem danh sách users");
      } else if (error.response?.status === 403) {
        throw new Error(
          "Bạn không có quyền xem danh sách users. Chỉ admin mới được phép."
        );
      } else if (error.response?.status === 500) {
        throw new Error(
          error.response?.data?.message ||
            "Lỗi server khi tải danh sách users. Vui lòng thử lại sau."
        );
      } else {
        throw new Error(
          error.response?.data?.message || "Không thể tải danh sách người dùng"
        );
      }
    }
  }

  // ✅ Ban user (admin only)
  async banUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[API] Banning user:", userId);

      if (!userId || userId.trim() === "") {
        throw new Error("User ID không hợp lệ");
      }

      const response = await this.axiosInstance.patch(
        `/admin/users/${userId}/ban`
      );

      console.log("[API] User banned successfully:", response.data);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with full details
      const errorDetails = {
        userId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      };

      console.error("[API] Error banning user:", errorDetails);

      // Handle network errors (no response)
      if (!error.response) {
        if (error.code === "ECONNABORTED") {
          throw new Error("Yêu cầu quá thời gian. Vui lòng thử lại.");
        } else if (error.message?.includes("Network Error")) {
          throw new Error(
            "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
          );
        } else {
          throw new Error(error.message || "Lỗi kết nối. Vui lòng thử lại.");
        }
      }

      // Handle HTTP status codes
      const status = error.response.status;
      const errorMessage = error.response?.data?.message;

      if (status === 404) {
        throw new Error(errorMessage || "User không tồn tại");
      } else if (status === 401) {
        throw new Error(
          errorMessage || "Bạn cần đăng nhập để thực hiện thao tác này"
        );
      } else if (status === 403) {
        throw new Error(
          errorMessage ||
            "Bạn không có quyền thực hiện thao tác này hoặc không thể ban tài khoản admin"
        );
      } else if (status === 400) {
        throw new Error(errorMessage || "Dữ liệu không hợp lệ");
      } else if (status === 500) {
        throw new Error(errorMessage || "Lỗi server. Vui lòng thử lại sau.");
      } else {
        throw new Error(
          errorMessage || `Không thể khóa tài khoản (Lỗi ${status})`
        );
      }
    }
  }

  // ✅ Unban user (admin only)
  async unbanUser(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("[API] Unbanning user:", userId);

      if (!userId || userId.trim() === "") {
        throw new Error("User ID không hợp lệ");
      }

      const response = await this.axiosInstance.patch(
        `/admin/users/${userId}/unban`
      );

      console.log("[API] User unbanned successfully:", response.data);
      return response.data;
    } catch (error: any) {
      // Enhanced error logging with full details
      const errorDetails = {
        userId,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      };

      console.error("[API] Error unbanning user:", errorDetails);

      // Handle network errors (no response)
      if (!error.response) {
        if (error.code === "ECONNABORTED") {
          throw new Error("Yêu cầu quá thời gian. Vui lòng thử lại.");
        } else if (error.message?.includes("Network Error")) {
          throw new Error(
            "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
          );
        } else {
          throw new Error(error.message || "Lỗi kết nối. Vui lòng thử lại.");
        }
      }

      // Handle HTTP status codes
      const status = error.response.status;
      const errorMessage = error.response?.data?.message;

      if (status === 404) {
        throw new Error(errorMessage || "User không tồn tại");
      } else if (status === 401) {
        throw new Error(
          errorMessage || "Bạn cần đăng nhập để thực hiện thao tác này"
        );
      } else if (status === 403) {
        throw new Error(
          errorMessage || "Bạn không có quyền thực hiện thao tác này"
        );
      } else if (status === 400) {
        throw new Error(errorMessage || "Dữ liệu không hợp lệ");
      } else if (status === 500) {
        throw new Error(errorMessage || "Lỗi server. Vui lòng thử lại sau.");
      } else {
        throw new Error(
          errorMessage || `Không thể mở khóa tài khoản (Lỗi ${status})`
        );
      }
    }
  }

  // ==================== MEMORY APIs ====================

  /**
   * Lấy tất cả kỷ niệm của user hiện tại
   */
  async getMyMemories() {
    try {
      const response = await this.axiosInstance.get("/memories/my");
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Lấy danh sách kỷ niệm thất bại");
    }
  }

  /**
   * Lấy kỷ niệm sắp tới
   */
  async getUpcomingMemories(days: number = 30) {
    try {
      const response = await this.axiosInstance.get("/memories/upcoming", {
        params: { days },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Lấy kỷ niệm sắp tới thất bại");
    }
  }

  /**
   * Lấy kỷ niệm của user khác (nếu được phép)
   */
  async getUserMemories(userId: string) {
    try {
      const response = await this.axiosInstance.get(`/memories/user/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Lấy kỷ niệm thất bại");
    }
  }

  /**
   * Tạo kỷ niệm mới
   */
  async createMemory(formData: FormData) {
    try {
      const response = await this.axiosInstance.post("/memories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Tạo kỷ niệm thất bại");
    }
  }

  /**
   * Cập nhật kỷ niệm
   */
  async updateMemory(memoryId: string, formData: FormData) {
    try {
      const response = await this.axiosInstance.put(`/memories/${memoryId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Cập nhật kỷ niệm thất bại");
    }
  }

  /**
   * Xóa kỷ niệm
   */
  async deleteMemory(memoryId: string) {
    try {
      const response = await this.axiosInstance.delete(`/memories/${memoryId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Xóa kỷ niệm thất bại");
    }
  }

  /**
   * Gửi email thông báo kỷ niệm
   */
  async sendMemoryNotifications() {
    try {
      const response = await this.axiosInstance.post("/memories/notifications/send");
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Gửi email thông báo thất bại");
    }
  }

  /**
   * Cập nhật cài đặt privacy cho memories
   */
  async updateMemoryPrivacySettings(memoriesVisible: boolean, memoriesEmailNotification: boolean) {
    try {
      const response = await this.axiosInstance.patch("/profile/privacy", {
        memoriesVisible,
        memoriesEmailNotification,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Cập nhật cài đặt kỷ niệm thất bại"
      );
    }
  }
}

// Export the class
export { ApiService };

// Export singleton instance directly (must be exported at module level for Turbopack)
export const apiService = new ApiService();
