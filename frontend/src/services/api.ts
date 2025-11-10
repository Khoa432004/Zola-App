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

  async verifyOTP(credentials: { email: string; otp: string }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<any>("/auth/verify-otp", credentials)
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
}

export const apiService = new ApiService();
