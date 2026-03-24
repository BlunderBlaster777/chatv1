import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email and password are required' });
      return;
    }
    const user = await authService.register(username, email, password);
    res.status(201).json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ message: 'Logged out' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }
    const tokens = await authService.refreshTokens(refreshToken);
    res.json(tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

export default router;
