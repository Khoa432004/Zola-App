"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { apiService } from "@/services/api"; // ✅ THÊM import này
import styles from "./styles.module.css";

type Step = "email" | "otp" | "password";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ✅ OTP Timer
  const startOtpTimer = () => {
    setOtpTimer(60);
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

  const handleSendOTP = async () => {
    setError("");
    if (!email) return setError("Vui lòng nhập email");

    setIsLoading(true);
    try {
      const res = await apiService.sendOtp({ email });

      if (!res.success) throw new Error(res.message);

      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startOtpTimer();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Không thể gửi OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await apiService.sendOtp({ email });
      if (!res.success) throw new Error(res.message);

      setOtp(["", "", "", "", "", ""]);
      startOtpTimer();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Không thể gửi OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "");
    setOtp(newOtp);

    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || "";

    setOtp(newOtp);
    otpRefs.current[pasted.length - 1]?.focus();
  };

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  const handleVerifyOTP = async () => {
    setError("");
    const otpString = otp.join("");

    if (otpString.length !== 6) return setError("Vui lòng nhập đủ 6 số");

    setIsLoading(true);
    try {
      const res = await apiService.verifyOtp({ email, otp: otpString });
      if (!res.success) throw new Error(res.message);

      setStep("password");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("OTP sai hoặc hết hạn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword)
      return setError("Điền đầy đủ thông tin");

    if (password !== confirmPassword) return setError("Mật khẩu không khớp");

    setIsLoading(true);
    try {
      const res = await apiService.registerFinal({ email, username, password });
      if (!res.success) throw new Error(res.message);

      router.push("/login?registered=true");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Đăng ký thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        {/* HEADER */}
        <div style={{ marginBottom: 32 }}>
          {step !== "email" && (
            <button
              onClick={() => {
                if (step === "otp") setStep("email");
                else if (step === "password") setStep("otp");
                setError("");
              }}
              className={styles.backButton}
            >
              <ArrowLeft size={20} />
              <span>Quay lại</span>
            </button>
          )}

          <h1 className={styles.title}>
            {step === "email" && "Đăng ký"}
            {step === "otp" && "Xác nhận OTP"}
            {step === "password" && "Tạo tài khoản"}
          </h1>

          <p className={styles.subtitle}>
            {step === "email" && "Nhập email để nhận mã OTP"}
            {step === "otp" && "Nhập mã OTP đã gửi đến email của bạn"}
            {step === "password" && "Hoàn tất thông tin để tạo tài khoản"}
          </p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* EMAIL STEP */}
        {step === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOTP();
            }}
            className={styles.form}
          >
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button className={styles.loginButton} disabled={isLoading}>
              {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>

            <p className={styles.registerPrompt}>
              Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
            </p>
          </form>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyOTP();
            }}
            className={styles.form}
          >
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mã OTP</label>

              <div className={styles.otpContainer}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    value={digit}
                    maxLength={1}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    className={styles.otpInput}
                  />
                ))}
              </div>

              <div className={styles.otpTimer}>
                {otpTimer > 0 && <span>OTP còn {otpTimer}s</span>}
                {canResend && (
                  <button
                    type="button"
                    className={styles.resendButton}
                    onClick={handleResendOTP}
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </div>
            </div>

            <button
              className={styles.loginButton}
              disabled={otp.join("").length !== 6 || isLoading}
            >
              {isLoading ? "Đang xác nhận..." : "Xác nhận OTP"}
            </button>
          </form>
        )}

        {/* PASSWORD STEP */}
        {step === "password" && (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Tên người dùng</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Nhập tên người dùng"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mật khẩu</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Xác nhận mật khẩu</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button className={styles.loginButton} disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đăng ký"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
