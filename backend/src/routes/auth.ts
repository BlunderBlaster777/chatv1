import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
      return;
    }
    const { username, email, password } = parsed.data;
    const user = await authService.register(username, email, password);
    res.status(201).json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await authService.login(parsed.data.email, parsed.data.password);
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
