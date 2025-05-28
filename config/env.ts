export interface EnvConfig {
  NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY: string;
  BLOB_READ_WRITE_TOKEN: string;
  NEXT_PUBLIC_DEBUG?: string;
}

export function validateEnvironmentVariables(): void {
  const requiredEnvVars: (keyof EnvConfig)[] = [
    'NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

export function getEnvVar(key: keyof EnvConfig): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export const isDebugMode = process.env.NEXT_PUBLIC_DEBUG === 'true';