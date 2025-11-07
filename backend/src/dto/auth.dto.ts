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

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}
