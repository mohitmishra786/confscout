import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}));

jest.mock('@/lib/redis', () => ({
  getRedisClient: jest.fn()
}));

describe('Health Check API', () => {
  it('should return 200 when all services are up', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }]);
    (getRedisClient as jest.Mock).mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG')
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('up');
    expect(data.services.database).toBe('up');
    expect(data.services.redis).toBe('up');
  });

  it('should return 503 when database is down', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('DB Down'));
    (getRedisClient as jest.Mock).mockReturnValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.services.database).toBe('down');
  });
});
