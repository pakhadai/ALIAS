import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { config } from '../config';

export type TokenPayload = {
  sub: string;   // userId (UUID)
  type: 'anonymous' | 'google' | 'apple';
  email?: string;
};

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const googleClient = new OAuth2Client(config.google.clientId);

export class AuthService {
  private secret = config.jwt.secret;

  /** Issue a JWT */
  createToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: TOKEN_EXPIRY_SECONDS });
  }

  /** Issue a JWT for an anonymous device-based identity (legacy compat) */
  createAnonymousToken(userId: string): string {
    return this.createToken({ sub: userId, type: 'anonymous' });
  }

  /** Verify and decode a JWT */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.secret) as TokenPayload;
    } catch {
      return null;
    }
  }

  /** Verify a Google ID token, return { googleId, email, name } or null */
  async verifyGoogleToken(idToken: string): Promise<{ googleId: string; email: string; name: string } | null> {
    if (!config.google.clientId) {
      console.error('[Auth] GOOGLE_CLIENT_ID is not set — set it in .env and restart the server');
      return null;
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email) return null;
      return { googleId: p.sub, email: p.email, name: p.name || p.email };
    } catch (err) {
      console.error('[Auth] Google token verification failed:', (err as Error).message);
      return null;
    }
  }

  /** Verify an Apple identity token, return { appleId, email } or null */
  async verifyAppleToken(idToken: string): Promise<{ appleId: string; email: string } | null> {
    if (!config.apple.clientId) return null;
    try {
      const p = await appleSignin.verifyIdToken(idToken, {
        audience: config.apple.clientId,
        ignoreExpiration: false,
      });
      return { appleId: p.sub, email: p.email || '' };
    } catch {
      return null;
    }
  }
}
