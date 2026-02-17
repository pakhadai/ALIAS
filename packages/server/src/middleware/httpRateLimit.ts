import rateLimit from 'express-rate-limit';

const message = { error: 'Too many requests, please try again later.' };

/** Auth endpoints: 20 requests per 15 minutes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Store endpoints: 60 requests per minute */
export const storeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Push subscription endpoints: 10 requests per minute */
export const pushLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
