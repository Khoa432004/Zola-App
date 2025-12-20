import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loginAsync,
  googleLoginAsync,
  logoutAsync,
  clearError,
} from "@/store/slices/authSlice";
import { LoginRequest, GoogleLoginRequest } from "@/services/api";
import { signInWithPopup, getIdToken } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, token, isLoading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const result = await dispatch(loginAsync(credentials));
        if (loginAsync.rejected.match(result)) {
          // Return rejection info instead of throwing - let UI handle all errors
          return result;
        }
        return result;
      } catch (error: any) {
        // This should rarely happen, but if it does, wrap it in a rejected action shape
        return {
          type: "auth/login/rejected",
          payload: {
            message: error.message || "Login failed",
            code: error.code || "auth/login-error",
          },
        };
      }
    },
    [dispatch]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      // Step 1: Authenticate with Firebase
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Step 2: Get Firebase ID token
      const idToken = await getIdToken(user);

      // Step 3: Send to backend API via Redux
      const googleData: GoogleLoginRequest = {
        idToken,
        email: user.email || "",
        name: user.displayName || user.email || "",
        avatar: user.photoURL || undefined,
      };

      const resultAction = await dispatch(googleLoginAsync(googleData));
      if (googleLoginAsync.rejected.match(resultAction)) {
        // Don't throw for banned accounts - let UI handle it
        const payload = resultAction.payload as
          | { message: string; banned?: boolean }
          | string;
        if (typeof payload === "object" && payload.banned) {
          // Return rejection info instead of throwing
          return resultAction;
        }
        // Throw for other errors
        throw new Error(
          typeof payload === "string"
            ? payload
            : payload.message || "Google login failed"
        );
      }
      return resultAction;
    } catch (error: any) {
      // Handle popup closed by user gracefully - this is not a real error
      if (error?.code === "auth/popup-closed-by-user") {
        // Silently return null to indicate user cancelled
        // Don't throw error, just return null so caller can handle it gracefully
        return null;
      }

      // Log other real errors for debugging
      if (error?.code) {
        console.error("Firebase auth error:", error.code, error.message);
      } else {
        console.error("Google login error:", error);
      }

      // Re-throw other errors
      throw error;
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith("liked_post_") || key.startsWith("liked_")) {
            localStorage.removeItem(key);
          }
        });
      }
      await dispatch(logoutAsync());
      router.push("/login");
    } catch (error: any) {
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith("liked_post_") || key.startsWith("liked_")) {
            localStorage.removeItem(key);
          }
        });
      }
      router.push("/login");
    }
  }, [dispatch, router]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    clearError: clearAuthError,
  };
};
