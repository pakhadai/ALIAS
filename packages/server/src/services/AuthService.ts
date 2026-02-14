import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  sub: string;       // anonymous user ID (from client localStorage)
  type: 'anonymous';
}

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class AuthService {
  private secret = config.jwt.secret;

  /** Issue a JWT for an anonymous device-based identity */
  createAnonymousToken(deviceId: string): string {
    const payload: TokenPayload = {
      sub: deviceId,
      type: 'anonymous',
    };
    return jwt.sign(payload, this.secret, { expiresIn: TOKEN_EXPIRY_SECONDS });
  }

  /** Verify and decode a JWT */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      return null;
    }
  }
}
