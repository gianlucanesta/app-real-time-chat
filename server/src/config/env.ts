import "dotenv/config";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  PORT: Number(process.env.PORT) || 3001,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  MONGO_URI: requireEnv("MONGO_URI"),
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "15m",
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || "7d",
  REFRESH_EXPIRES_MS: 7 * 24 * 60 * 60 * 1000,
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim()),
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;
