export interface ForgotPasswordRequest {
  email: string
}

export interface VerifyOTPRequest {
  email: string
  otp: string
}

export interface ResetPasswordRequest {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}
