import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email?: string;
}

export function generateToken(payload: TokenPayload): string {
  if (!JWT_SECRET || JWT_SECRET === 'default-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in environment variables');
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  if (!JWT_SECRET || JWT_SECRET === 'default-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in environment variables');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & TokenPayload;
    if (!decoded.userId) {
      throw new Error('Invalid token payload');
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
}

