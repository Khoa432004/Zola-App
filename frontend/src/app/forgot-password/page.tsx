'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import styles from './styles.module.css';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Timer
  const startOtpTimer = () => {
    setOtpTimer(300); // 5 minutes
    setCanResend(false);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    setError('');
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to send OTP for password reset
      // await apiService.sendPasswordResetOTP(email);
      console.log('Sending password reset OTP to:', email);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('otp');
      setOtp(['', '', '', '', '', '']); // Reset OTP inputs
      startOtpTimer();
    } catch (err: any) {
      setError(err.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    setError('');
    setIsLoading(true);
    try {
      // TODO: Call API to resend OTP
      // await apiService.resendPasswordResetOTP(email);
      console.log('Resending password reset OTP to:', email);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setOtp(['', '', '', '', '', '']); // Reset OTP inputs
      startOtpTimer();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, ''); // Only allow digits
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedData.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleVerifyOTP = async () => {
    setError('');
    const otpString = otp.join('');
    if (!otpString || otpString.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to verify OTP
      // await apiService.verifyPasswordResetOTP(email, otpString);
      console.log('Verifying password reset OTP:', otpString);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStep('password');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Mã OTP không đúng hoặc đã hết hạn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Call API to reset password
      // await apiService.resetPassword({ email, password, otp: otp.join('') });
      console.log('Resetting password for:', email);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/login?passwordReset=true');
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          {step !== 'email' && (
            <button
              onClick={() => {
                if (step === 'otp') setStep('email');
                else if (step === 'password') setStep('otp');
                setError('');
              }}
              className={styles.backButton}
            >
              <ArrowLeft size={20} />
              <span>Quay lại</span>
            </button>
          )}
          <h1 className={styles.title}>
            {step === 'email' && 'Quên mật khẩu'}
            {step === 'otp' && 'Xác nhận OTP'}
            {step === 'password' && 'Đặt lại mật khẩu'}
          </h1>
          <p className={styles.subtitle}>
            {step === 'email' && 'Nhập email để nhận mã OTP đặt lại mật khẩu'}
            {step === 'otp' && 'Nhập mã OTP đã gửi đến email của bạn'}
            {step === 'password' && 'Nhập mật khẩu mới của bạn'}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendOTP(); }} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Email</label>
              <div className={styles.inputWrapper}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.loginButton}
            >
              {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>

            <p className={styles.registerPrompt}>
              <Link href="/login" className={styles.registerLink}>
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP(); }} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mã OTP</label>
              <div className={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    maxLength={1}
                    className={styles.otpInput}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <div className={styles.otpTimer}>
                {otpTimer > 0 && (
                  <span>
                    Mã OTP còn hiệu lực: {formatTime(otpTimer)}
                  </span>
                )}
                {canResend && (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className={styles.resendButton}
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length !== 6}
              className={styles.loginButton}
            >
              {isLoading ? 'Đang xác nhận...' : 'Xác nhận OTP'}
            </button>
          </form>
        )}

        {/* Step 3: Password */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mật khẩu mới</label>
              <div className={styles.inputWrapper}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Xác nhận mật khẩu mới</label>
              <div className={styles.inputWrapper}>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={styles.loginButton}
            >
              <Lock size={18} />
              {isLoading ? 'Đang đặt lại...' : 'Đổi mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
