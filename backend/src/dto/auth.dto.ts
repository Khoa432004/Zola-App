export interface LoginDto {
  email: string;
  password: string;
}

export interface GoogleLoginDto {
  idToken: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthResponseDto {
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

export interface ForgotPasswordDto {
  email: string
}

export interface VerifyOTPDto {
  email: string
  otp: string
}

export interface ResetPasswordDto {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}
