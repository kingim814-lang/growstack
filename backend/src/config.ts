function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  frontendUrl: getRequiredEnv("FRONTEND_URL"),
  clerkSecretKey: getRequiredEnv("CLERK_SECRET_KEY"),
  clerkPublishableKey: getRequiredEnv("CLERK_PUBLISHABLE_KEY"),
};