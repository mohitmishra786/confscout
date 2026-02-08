import { secureFetch } from '@/lib/api';

describe('secureFetch', () => {
  const originalDocument = global.document;

  beforeEach(() => {
    global.fetch = jest.fn();
    jest.useFakeTimers();
    // @ts-expect-error - global.document may not exist in Node environment
    global.document = {
      cookie: ''
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    global.document = originalDocument;
  });

  it('should add CSRF header for POST requests', async () => {
    const mockResponse = new Response(null, { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    global.document.cookie = 'csrf_token=test-token';

    await secureFetch('/api/test', { method: 'POST' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(callHeaders.get('X-CSRF-Token')).toBe('test-token');
  });

  it('should timeout if request takes too long', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise((_, reject) => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        setTimeout(() => reject(error), 1000);
      })
    );

    const fetchPromise = secureFetch('/api/test', { timeout: 500, retries: 0 });
    
    jest.advanceTimersByTime(1000);

    await expect(fetchPromise).rejects.toThrow('The user aborted a request.');
  });

  it('should retry on 429 status code', async () => {
    const rateLimitResponse = new Response(null, { status: 429 });
    const successResponse = new Response(null, { status: 200 });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    const fetchPromise = secureFetch('/api/test', { retryDelay: 100 });
    
    // First attempt fails with 429
    await Promise.resolve(); // Flush microtasks
    jest.advanceTimersByTime(100);
    
    // Second attempt succeeds
    const response = await fetchPromise;
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on network errors', async () => {
    const networkError = new TypeError('Failed to fetch');
    const successResponse = new Response(null, { status: 200 });

    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(successResponse);

    const fetchPromise = secureFetch('/api/test', { retryDelay: 100 });
    
    await Promise.resolve();
    jest.advanceTimersByTime(100);
    
    const response = await fetchPromise;
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
