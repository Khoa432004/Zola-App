import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { LoginRequest, GoogleLoginRequest, AuthResponse } from '@/services/api';

export interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  } | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  resetPasswordEmail: string | null
  otpVerified: boolean
}

const initialState: AuthState = {
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  resetPasswordEmail: null,
  otpVerified: false,
};

// Load user from localStorage on initialization
if (typeof window !== 'undefined') {
  const savedAccount = localStorage.getItem('account');
  if (savedAccount) {
    try {
      initialState.user = JSON.parse(savedAccount);
      initialState.isAuthenticated = !!initialState.token;
    } catch (e) {
      console.error('Failed to parse saved account:', e);
    }
  }
}

// Async thunks for API calls
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      if (response.success && response.data) {
        // Save to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('account', JSON.stringify(response.data.account));
        return response.data;
      }
      return rejectWithValue(response.message || 'Login failed');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const googleLoginAsync = createAsyncThunk(
  'auth/googleLogin',
  async (googleData: GoogleLoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.googleLogin(googleData);
      if (response.success && response.data) {
        // Save to localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('account', JSON.stringify(response.data.account));
        return response.data;
      }
      return rejectWithValue(response.message || 'Google login failed');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Google login failed');
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('account');
      localStorage.removeItem('rememberMe');
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  })

  export const forgotPasswordAsync = createAsyncThunk(
  "auth/forgotPassword",
  async (credentials: { email: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.forgotPassword(credentials)
      if (response.success && response.data) {
        return response.data
      }
      return rejectWithValue(response.message || "Yêu cầu thất bại")
    } catch (error: any) {
      return rejectWithValue(error.message || "Có lỗi xảy ra")
    }
  },
)

export const verifyOTPAsync = createAsyncThunk(
  "auth/verifyOTP",
  async (credentials: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.verifyOTP(credentials)
      if (response.success && response.data) {
        return response.data
      }
      return rejectWithValue(response.message || "Xác thực thất bại")
    } catch (error: any) {
      return rejectWithValue(error.message || "Có lỗi xảy ra")
    }
  },
)

export const resetPasswordAsync = createAsyncThunk(
  "auth/resetPassword",
  async (
    credentials: { email: string; otp: string; newPassword: string; confirmPassword: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await apiService.resetPassword(credentials)
      if (response.success) {
        return response.data
      }
      return rejectWithValue(response.message || "Đặt lại mật khẩu thất bại")
    } catch (error: any) {
      return rejectWithValue(error.message || "Có lỗi xảy ra")
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: AuthState['user']; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.account;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Google Login
    builder
      .addCase(googleLoginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLoginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.account;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(googleLoginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    

       builder
      .addCase(forgotPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(forgotPasswordAsync.fulfilled, (state, action) => {
        state.isLoading = false
        state.resetPasswordEmail = action.payload.email
        state.error = null
      })
      .addCase(forgotPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    builder
      .addCase(verifyOTPAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyOTPAsync.fulfilled, (state) => {
        state.isLoading = false
        state.otpVerified = true
        state.error = null
      })
      .addCase(verifyOTPAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    builder
      .addCase(resetPasswordAsync.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resetPasswordAsync.fulfilled, (state) => {
        state.isLoading = false
        state.resetPasswordEmail = null
        state.otpVerified = false
        state.error = null
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
});
export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;

