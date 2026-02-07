declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_APP_URL?: string;
    DATABASE_URL?: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GROQ_API_KEY?: string;
    ZOHO_USER?: string;
    ZOHO_PASSWORD?: string;
    ZOHO_HOST?: string;
    ZOHO_PORT?: string;
    CRON_SECRET?: string;
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    BCRYPT_ROUNDS?: string;
  }
}
