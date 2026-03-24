import { AuthService } from '../services/auth.service';

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register throws if user exists', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findFirst.mockResolvedValue({ id: '1', username: 'test', email: 'test@test.com' });
    await expect(service.register('test', 'test@test.com', 'password')).rejects.toThrow('Username or email already in use');
  });
});
