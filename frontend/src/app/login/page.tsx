'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './styles.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, error: authError, isAuthenticated, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Hiển thị lỗi từ Redux
  useEffect(() => {
    if (authError) {
      setLocalError(authError);
    }
  }, [authError]);

  // Clear error khi component mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError(language === 'vi' ? 'Vui lòng nhập email và mật khẩu' : 'Please enter email and password');
      return;
    }

    try {
      await login({ email, password });
      
      // Save remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      // Redirect về trang chủ sau khi đăng nhập thành công
      router.push('/chat');
    } catch (error: any) {
      // Lỗi sẽ được xử lý bởi Redux và hiển thị qua authError
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setLocalError('');
      clearError();

      await loginWithGoogle();

      // Redirect về trang chat sau khi đăng nhập thành công
      router.push('/chat');
    } catch (error: any) {
      console.error('Google login error:', error);
      setLocalError(error.message || (language === 'vi' ? 'Đăng nhập Google thất bại' : 'Google login failed'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const error = localError || authError;

  const translations = {
    vi: {
      title: 'Đăng nhập',
      subtitle: 'Welcome back to ZolaChat',
      email: 'Email',
      password: 'Mật khẩu',
      rememberMe: 'Ghi nhớ đăng nhập',
      forgotPassword: 'Quên mật khẩu?',
      login: 'Đăng nhập',
      loginWithGoogle: 'Đăng nhập với Google',
      loggingIn: 'Đang đăng nhập...',
      or: 'Hoặc',
      error: 'Lỗi',
      noAccount: 'Chưa có tài khoản?',
      register: 'Đăng ký ngay',
    },
    en: {
      title: 'Login',
      subtitle: 'Welcome back to ZolaChat',
      email: 'Email',
      password: 'Password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      login: 'Login',
      loginWithGoogle: 'Sign in with Google',
      loggingIn: 'Signing in...',
      or: 'Or',
      error: 'Error',
      noAccount: "Don't have an account?",
      register: 'Register now',
    },
  };

  const t = translations[language];

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            borderRadius: '8px',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{t.email}</label>
            <div className={styles.inputWrapper}>
              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
              <span className={styles.inputIcon}>@</span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>{t.password}</label>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeIcon}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkbox}
              />
              <span>{t.rememberMe}</span>
            </label>
            <Link href="/forgot-password" className={styles.forgotPassword}>
              {t.forgotPassword}
            </Link>
          </div>

          <button type="submit" className={styles.loginButton} disabled={isLoading || isGoogleLoading}>
            <svg
              className={styles.loginIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isLoading ? t.loggingIn : t.login}
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerLine}></span>
            <span className={styles.dividerText}>{t.or}</span>
            <span className={styles.dividerLine}></span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className={styles.googleButton}
            disabled={isLoading || isGoogleLoading}
          >
            <svg
              className={styles.googleIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleLoading ? t.loggingIn : t.loginWithGoogle}
          </button>

          <p className={styles.registerPrompt}>
            {t.noAccount}{' '}
            <Link href="/register" className={styles.registerLink}>
              {t.register}
            </Link>
          </p>
        </form>
      </div>

      <div className={styles.languageSelector}>
        <button
          onClick={() => setLanguage('vi')}
          className={`${styles.langButton} ${language === 'vi' ? styles.langButtonActive : ''}`}
        >
          Tiếng Việt
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`${styles.langButton} ${language === 'en' ? styles.langButtonActive : ''}`}
        >
          English
        </button>
      </div>
    </div>
  );
}

