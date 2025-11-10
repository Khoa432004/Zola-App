import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loginAsync, googleLoginAsync, logoutAsync, clearError } from '@/store/slices/authSlice';
import { LoginRequest, GoogleLoginRequest } from '@/services/api';
import { signInWithPopup, getIdToken } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

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
          throw new Error(result.payload as string || 'Login failed');
        }
        return result;
      } catch (error: any) {
        throw error;
      }
    },
    [dispatch]
  );

  const loginWithGoogle = useCallback(
    async () => {
      try {
        // Step 1: Authenticate with Firebase
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Step 2: Get Firebase ID token
        const idToken = await getIdToken(user);

        // Step 3: Send to backend API via Redux
        const googleData: GoogleLoginRequest = {
          idToken,
          email: user.email || '',
          name: user.displayName || user.email || '',
          avatar: user.photoURL || undefined,
        };

        const resultAction = await dispatch(googleLoginAsync(googleData));
        if (googleLoginAsync.rejected.match(resultAction)) {
          throw new Error(resultAction.payload as string || 'Google login failed');
        }
        return resultAction;
      } catch (error: any) {
        throw error;
      }
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAsync());
      router.push('/login');
    } catch (error: any) {
      router.push('/login');
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

