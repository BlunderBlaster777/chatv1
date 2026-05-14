import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value) {
    if (isProduction) throw new Error(`Missing required environment variable: ${name}`);
    console.warn(`Warning: ${name} not set – using insecure fallback. Do NOT use in production.`);
    return fallback;
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: requireSecret('JWT_SECRET', 'dev-fallback-secret-change-me'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'dev-fallback-refresh-secret-change-me'),
  jwtExpiresIn: '15m' as const,
  jwtRefreshExpiresIn: '7d' as const,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  directDatabaseUrl: process.env.DIRECT_DATABASE_URL || '',
};
