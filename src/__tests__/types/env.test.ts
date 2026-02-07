describe('Environment Variables', () => {
  it('should have properly typed environment variables available in tests', () => {
    // These variables are set in src/__tests__/setup.ts
    expect(process.env.GROQ_API_KEY).toBeDefined();
    expect(typeof process.env.GROQ_API_KEY).toBe('string');
    
    // NODE_ENV is set by Jest
    expect(process.env.NODE_ENV).toBe('test');
  });
});
