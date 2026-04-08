import type { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

/**
 * Wraps an async Express route handler so that any thrown error is caught,
 * logged, and results in a 500 response instead of an unhandled rejection.
 * Required for Express 4 which does not automatically handle async errors.
 */
export function asyncRoute(fn: AsyncHandler) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[Route] Unhandled error:', (err as Error).message, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
      next(err);
    }
  };
}
