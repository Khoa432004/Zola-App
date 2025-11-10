"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { forgotPasswordAsync, verifyOTPAsync, resetPasswordAsync, clearError } from "@/store/slices/authSlice"
import Link from "next/link"
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react"
import styles from "./styles.module.css"

type Step = "email" | "otp" | "password"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [otpTimer, setOtpTimer] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [emailForReset, setEmailForReset] = useState("")
  const [otpForReset, setOtpForReset] = useState("")

  const [otpAttempts, setOtpAttempts] = useState(0)
  const [maxOtpAttempts] = useState(5)
  const [sendAttempts, setSendAttempts] = useState(0)
  const [maxSendAttempts] = useState(3)
  const [otpExpired, setOtpExpired] = useState(false)
  const [otpBlocked, setOtpBlocked] = useState(false)
  const otpIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (otpExpired || otpBlocked) {
      dispatch(clearError())
    }
  }, [otpExpired, otpBlocked, dispatch])

  const startOtpTimer = () => {
    setOtpBlocked(false)
    setOtpExpired(false)
    setOtpAttempts(0)
    setOtp(["", "", "", "", "", ""])
    dispatch(clearError())

    setOtpTimer(300) // 5 minutes
    setCanResend(false)

    if (otpIntervalRef.current) {
      clearInterval(otpIntervalRef.current)
    }

    otpIntervalRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(otpIntervalRef.current!)
          setCanResend(true)
          setOtpExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (otpIntervalRef.current) {
        clearInterval(otpIntervalRef.current)
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleSendOTP = async () => {
    dispatch(clearError())
    if (!email) {
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return
    }

    if (sendAttempts >= maxSendAttempts) {
      return
    }

    const result = await dispatch(forgotPasswordAsync({ email }))

    if (forgotPasswordAsync.fulfilled.match(result)) {
      setEmailForReset(email)
      setSendAttempts((result.payload as any).sendAttempts || 1)
      setStep("otp")
      startOtpTimer()
    }
  }

  const handleResendOTP = async () => {
    if (!canResend) return

    if (sendAttempts >= maxSendAttempts) {
      return
    }

    const result = await dispatch(forgotPasswordAsync({ email: emailForReset }))

    if (forgotPasswordAsync.fulfilled.match(result)) {
      setSendAttempts((result.payload as any).sendAttempts || sendAttempts + 1)
      startOtpTimer() 
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = value.replace(/\D/g, "")
    setOtp(newOtp)

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = [...otp]

    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || ""
    }

    setOtp(newOtp)
    const nextIndex = Math.min(pastedData.length, 5)
    otpRefs.current[nextIndex]?.focus()
  }

  useEffect(() => {
    if (step === "otp") {
      otpRefs.current[0]?.focus()
    }
  }, [step])

  const handleVerifyOTP = async () => {
    dispatch(clearError())

    if (otpAttempts >= maxOtpAttempts || otpBlocked || otpExpired) {
      return
    }

    const otpString = otp.join("")
    if (!otpString || otpString.length !== 6) {
      return
    }

    const result = await dispatch(verifyOTPAsync({ email: emailForReset, otp: otpString }))

    if (verifyOTPAsync.fulfilled.match(result)) {
      setOtpForReset(otpString)
      setStep("password")
    } else {
      // Tăng số lần thử trước
      const newAttempts = otpAttempts + 1
      setOtpAttempts(newAttempts)

      const errorMessage = (result.payload as any)?.message || ""
      
      // Kiểm tra nếu đã nhập sai quá 5 lần
      if (newAttempts >= maxOtpAttempts || errorMessage.includes("quá nhiều lần")) {
        setOtpBlocked(true)
        if (otpIntervalRef.current) {
          clearInterval(otpIntervalRef.current)
        }
        setOtpTimer(0)
        setCanResend(true)
      } else {
        // Parse số lần còn lại từ error message (nếu có)
        const attemptMatch = errorMessage.match(/Còn (\d+) lần thử/)
        if (attemptMatch) {
          const remainingAttempts = Number.parseInt(attemptMatch[1])
          setOtpAttempts(maxOtpAttempts - remainingAttempts)
        }
      }
    }
  }

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = []

    if (pass.length < 8) {
      errors.push("Mật khẩu phải có ít nhất 8 ký tự")
    }

    if (!/[A-Z]/.test(pass)) {
      errors.push("Mật khẩu phải có ít nhất 1 chữ in hoa")
    }

    if (!/[a-z]/.test(pass)) {
      errors.push("Mật khẩu phải có ít nhất 1 chữ thường")
    }

    if (!/[0-9]/.test(pass)) {
      errors.push("Mật khẩu phải có ít nhất 1 chữ số")
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) {
      errors.push("Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)")
    }

    return errors
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (value) {
      setPasswordErrors(validatePassword(value))
    } else {
      setPasswordErrors([])
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearError())

    if (!password || !confirmPassword) {
      return
    }

    const errors = validatePassword(password)
    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }

    if (password !== confirmPassword) {
      return
    }

    const result = await dispatch(
      resetPasswordAsync({
        email: emailForReset,
        otp: otpForReset,
        newPassword: password,
        confirmPassword: confirmPassword,
      }),
    )

    if (resetPasswordAsync.fulfilled.match(result)) {
      router.push("/login?passwordReset=true")
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div style={{ marginBottom: 32 }}>
          {step !== "email" && (
            <button
              onClick={() => {
                if (step === "otp") setStep("email")
                else if (step === "password") setStep("otp")
                dispatch(clearError())
              }}
              className={styles.backButton}
            >
              <ArrowLeft size={20} />
              <span>Quay lại</span>
            </button>
          )}
          <h1 className={styles.title}>
            {step === "email" && "Quên mật khẩu"}
            {step === "otp" && "Xác nhận OTP"}
            {step === "password" && "Đặt lại mật khẩu"}
          </h1>
          <p className={styles.subtitle}>
            {step === "email" && "Nhập email để nhận mã OTP đặt lại mật khẩu"}
            {step === "otp" && "Nhập mã OTP đã gửi đến email của bạn"}
            {step === "password" && "Nhập mật khẩu mới của bạn"}
          </p>
        </div>


        {step === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendOTP()
            }}
            className={styles.form}
          >
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

            {sendAttempts > 0 && sendAttempts < maxSendAttempts && (
              <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
                Bạn đã gửi {sendAttempts}/{maxSendAttempts} lần
              </p>
            )}

            {sendAttempts >= maxSendAttempts && (
              <div className={styles.errorMessage} style={{ marginBottom: 16 }}>
                Bạn đã vượt quá số lần gửi OTP. Vui lòng thử lại sau 1 giờ.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || sendAttempts >= maxSendAttempts}
              className={styles.loginButton}
            >
              {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
            </button>

            <p className={styles.registerPrompt}>
              <Link href="/login" className={styles.registerLink}>
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}

        {step === "otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerifyOTP()
            }}
            className={styles.form}
          >
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mã OTP</label>

              {(otpExpired || otpBlocked || error) && (
                  <div className={styles.errorMessage} style={{ marginBottom: 16 }}>
                    {otpExpired 
                      ? "Mã OTP đã hết hạn. Vui lòng gửi lại mã OTP mới."
                      : otpBlocked 
                      ? "Bạn đã nhập sai mã OTP quá nhiều lần. Vui lòng gửi lại mã OTP mới."
                      : error
                    }
                  </div>
                )}

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
                    disabled={isLoading || otpBlocked || otpExpired}
                  />
                ))}
              </div>
              <div className={styles.otpTimer}>
                {otpTimer > 0 && !otpExpired && <span>Mã OTP còn hiệu lực: {formatTime(otpTimer)}</span>}
                {(canResend || otpExpired || otpBlocked) && (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading || sendAttempts >= maxSendAttempts}
                    className={styles.resendButton}
                  >
                    Gửi lại mã OTP
                  </button>
                )}
              </div>
            </div>

            {!otpBlocked && !otpExpired && (
              <button type="submit" disabled={isLoading || otp.join("").length !== 6} className={styles.loginButton}>
                {isLoading ? "Đang xác nhận..." : "Xác nhận OTP"}
              </button>
            )}
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Mật khẩu mới</label>
              <div className={styles.inputWrapper} style={{ position: "relative" }}> 
                <input
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                  className={styles.input}
                  style={{ paddingRight: "40px" }}  
                  disabled={isLoading}
                />
                {/* THÊM BUTTON CON MẮT */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    color: "#666",
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordErrors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {passwordErrors.map((err, index) => (
                    <p key={index} style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {password && passwordErrors.length === 0 && (
                <p style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>✓ Mật khẩu hợp lệ</p>
              )}  
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Xác nhận mật khẩu mới</label>
              <div className={styles.inputWrapper} style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className={styles.input}
                  style={{ paddingRight: "40px" }}
                  disabled={isLoading}
                />
                {/* THÊM BUTTON CON MẮT */}
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    color: "#666",
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>• Mật khẩu xác nhận không khớp</p>
              )}

              {confirmPassword && password === confirmPassword && passwordErrors.length === 0 && (
                <p style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>✓ Mật khẩu khớp</p>
              )}

            </div>

            <button type="submit" 
              disabled={isLoading || passwordErrors.length > 0 || password !== confirmPassword || !password}
              className={styles.loginButton}>
              <Lock size={18} />
              {isLoading ? "Đang đặt lại..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
