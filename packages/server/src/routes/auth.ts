import { Router, type IRouter } from 'express';
import { AuthService } from '../services/AuthService';

const router: IRouter = Router();
const authService = new AuthService();

/** POST /api/auth/anonymous — get a JWT for an anonymous session */
router.post('/anonymous', (req, res) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 10) {
    res.status(400).json({ error: 'deviceId is required (min 10 chars)' });
    return;
  }

  const token = authService.createAnonymousToken(deviceId);
  res.json({ token });
});

export default router;
