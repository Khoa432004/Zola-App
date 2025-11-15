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
    };
    token: string;
  };
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
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
      const response = await this.axiosInstance.post<any>("/auth/forgot-password", credentials)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra")
    }
  }

  // Xác minh OTP cho reset password (từ Account database)
  async verifyOTP(credentials: { email: string; otp: string }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>("/auth/verify-otp-reset", credentials)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra")
    }
  }

  async resetPassword(credentials: {
    email: string
    otp: string
    newPassword: string
    confirmPassword: string
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>("/auth/reset-password", credentials)
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Có lỗi xảy ra")
    }
  }

  async logout(): Promise<AuthResponse> {
    try {
      const response = await this.axiosInstance.post<AuthResponse>("/auth/logout");
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

  async updateProfile(payload: { name?: string; phone?: string }) {
    try {
      const response = await this.axiosInstance.patch("/profile", payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Cập nhật hồ sơ thất bại");
    }
  }

  // Posts
  async getPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được bài đăng");
    }
  }

  async getFeaturedPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/featured", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được bài đăng nổi bật");
    }
  }

  async getMyPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/my", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được bài đăng của tôi");
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
      const response = await this.axiosInstance.put(`/posts/${postId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể cập nhật bài viết");
    }
  }

  async deletePost(postId: string) {
    try {
      const response = await this.axiosInstance.delete(`/posts/${postId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể xóa bài viết");
    }
  }

  async getDeletedPosts(limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get("/posts/deleted", { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được bài viết đã xóa");
    }
  }

  async restorePost(postId: string) {
    try {
      const response = await this.axiosInstance.post(`/posts/${postId}/restore`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể khôi phục bài viết");
    }
  }

  async getCommentsByPost(postId: string, limit?: number) {
    try {
      const params = limit ? { limit } : {};
      const response = await this.axiosInstance.get(`/comments/post/${postId}`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không lấy được bình luận");
    }
  }

  async createComment(targetId: string, content: string) {
    try {
      const response = await this.axiosInstance.post('/comments', {
        targetId,
        content
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể tạo bình luận");
    }
  }

  async updateComment(commentId: string, content: string) {
    try {
      const response = await this.axiosInstance.put(`/comments/${commentId}`, {
        content
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể cập nhật bình luận");
    }
  }

  async deleteComment(commentId: string) {
    try {
      const response = await this.axiosInstance.delete(`/comments/${commentId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Không thể xóa bình luận");
    }
  }
}

export const apiService = new ApiService();
