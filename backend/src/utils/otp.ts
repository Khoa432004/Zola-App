import crypto from "crypto"

/**
 * Tạo mã OTP 6 chữ số ngẫu nhiên
 */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * Tính thời gian hết hạn OTP (10 phút từ bây giờ)
 */
export const getOTPExpiry = (): Date => {
  const now = new Date()
  return new Date(now.getTime() + 5 * 60 * 1000)
}

/**
 * Kiểm tra OTP còn hạn hay không
 */
export const isOTPValid = (expiryTime: any): boolean => {
  let expiryDate: Date

  if (!expiryTime) {
    console.log("OTP expiry time is null/undefined")
    return false
  }

  // Convert to Date if it's a Firestore Timestamp or other type
  if (expiryTime instanceof Date) {
    expiryDate = expiryTime
  } else if (typeof expiryTime === "object" && expiryTime.toDate) {
    // Firestore Timestamp
    expiryDate = expiryTime.toDate()
  } else if (typeof expiryTime === "number") {
    expiryDate = new Date(expiryTime)
  } else {
    console.log("OTP expiry time has unexpected type:", typeof expiryTime)
    return false
  }

  const now = new Date()
  const isValid = now < expiryDate

  console.log("OTP Validation - Now:", now.toISOString(), "Expiry:", expiryDate.toISOString(), "Valid:", isValid)

  return isValid
}
