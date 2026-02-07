import { z } from 'zod';

const envSchema = z.object({
  // Base
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().min(1),
  
  // Redis (Optional but recommended for production)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Auth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  
  // External APIs
  GROQ_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  
  // App Config
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => issue.path.join('.'));
      console.error('❌ Invalid environment variables:', missingVars.join(', '));
      // In production, we should probably throw and crash, but in dev/test we might be more lenient
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Invalid environment variables: ${missingVars.join(', ')}`);
      }
    }
    return process.env as unknown as Env;
  }
}

export const env = validateEnv();
