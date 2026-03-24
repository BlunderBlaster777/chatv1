import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class AuthService {
  async register(username: string, email: string, password: string) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new Error('Username or email already in use');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
      select: { id: true, username: true, email: true, avatar: true, status: true, createdAt: true },
    });
    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const refreshTokenValue = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshTokenValue, userId: user.id, expiresAt } });
    await prisma.user.update({ where: { id: user.id }, data: { status: 'ONLINE' } });
    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, status: 'ONLINE' },
    };
  }

  async logout(refreshToken: string) {
    const token = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (token) {
      await prisma.user.update({ where: { id: token.userId }, data: { status: 'OFFLINE' } });
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
    }
  }

  async refreshTokens(refreshToken: string) {
    const tokenRecord = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) throw new Error('Invalid refresh token');
    const accessToken = jwt.sign({ userId: tokenRecord.userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
    const newRefreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: tokenRecord.userId, expiresAt } });
    return { accessToken, refreshToken: newRefreshToken };
  }
}
