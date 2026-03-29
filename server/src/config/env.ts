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
  CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),
  MAILJET_API_KEY: requireEnv("MAILJET_API_KEY"),
  MAILJET_API_SECRET: requireEnv("MAILJET_API_SECRET"),
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  // Google OAuth2
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:3001/api/auth/google/callback",
  // Facebook OAuth2
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || "",
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || "",
  FACEBOOK_CALLBACK_URL:
    process.env.FACEBOOK_CALLBACK_URL ||
    "http://localhost:3001/api/auth/facebook/callback",
  // Microsoft OAuth2
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || "",
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || "",
  MICROSOFT_CALLBACK_URL:
    process.env.MICROSOFT_CALLBACK_URL ||
    "http://localhost:3001/api/auth/microsoft/callback",
  // GitHub OAuth2
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  GITHUB_CALLBACK_URL:
    process.env.GITHUB_CALLBACK_URL ||
    "http://localhost:3001/api/auth/github/callback",
} as const;
