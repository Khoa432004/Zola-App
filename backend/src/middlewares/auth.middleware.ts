import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Middleware xác thực JWT token
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    console.log('Auth Middleware - Authorization header:', authHeader ? authHeader.substring(0, 20) + '...' : 'NO HEADER');

    // Kiểm tra Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {

      console.log('Auth Middleware - Missing or invalid Bearer format');

      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực',
      });
    }

    // Extract token và verify
    const token = authHeader.substring(7);
    console.log('Auth Middleware - Token extracted:', token.substring(0, 20) + '...');

    const decoded = verifyToken(token);
    console.log('Auth Middleware - Token verified successfully:', decoded);

    // Normalize token payload to include `uid` for compatibility with controllers
    const normalizedUser: any = {
      ...(decoded as any),
      uid: (decoded as any).uid || (decoded as any).userId || (decoded as any).id,
    };

    req.user = normalizedUser;
    next();
  } catch (error: any) {
    console.log('Auth Middleware - Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }
};


