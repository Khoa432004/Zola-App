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

/**
 * Optional authentication middleware - tries to verify token but doesn't block if missing/invalid
 */
export const optionalAuthenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // If no header, just continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Optional Auth - No token provided, continuing as guest');
      req.user = undefined;
      return next();
    }

    // Try to verify token
    const token = authHeader.substring(7);
    try {
      const decoded = verifyToken(token);
      const normalizedUser: any = {
        ...(decoded as any),
        uid: (decoded as any).uid || (decoded as any).userId || (decoded as any).id,
      };
      req.user = normalizedUser;
      console.log('Optional Auth - Token verified, userId:', normalizedUser.userId || normalizedUser.uid);
    } catch (error) {
      // Token invalid, continue as guest
      console.log('Optional Auth - Invalid token, continuing as guest');
      req.user = undefined;
    }
    
    next();
  } catch (error: any) {
    // Any error, continue as guest
    console.log('Optional Auth - Error:', error.message, ', continuing as guest');
    req.user = undefined;
    next();
  }
};

/**
 * Middleware kiểm tra user phải có role admin
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Kiểm tra xem user đã được authenticate chưa
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
      });
    }

    // Kiểm tra role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập. Chỉ admin mới được phép.',
      });
    }

    next();
  } catch (error: any) {
    console.log('Admin Check - Error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
    });
  }
};

/**
 * Middleware kiểm tra user phải có role user hoặc admin
 */
export const requireUser = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Kiểm tra xem user đã được authenticate chưa
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để thực hiện thao tác này',
      });
    }

    // Kiểm tra role (cả user và admin đều được phép)
    if (req.user.role !== 'user' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập',
      });
    }

    next();
  } catch (error: any) {
    console.log('User Check - Error:', error.message);
    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập',
    });
  }
};

