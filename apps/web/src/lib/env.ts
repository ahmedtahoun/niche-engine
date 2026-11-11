// Production settings check, run once at server start. Missing required values
// stop the server with a clear list instead of failing later in front of a customer.

export interface EnvReport { errors: string[]; warnings: string[] }

export function checkEnv(env: Record<string, string | undefined> = process.env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const has = (k: string) => Boolean(env[k]?.trim());

  if (!has('SESSION_SECRET') || env.SESSION_SECRET!.length < 32) errors.push('SESSION_SECRET: set a random string of 32+ characters (signs customer logins)');
  if (!has('ADMIN_PASSWORD') || env.ADMIN_PASSWORD!.length < 12) errors.push('ADMIN_PASSWORD: set a password of 12+ characters for /admin');
  if (!has('SUPABASE_URL') || !has('SUPABASE_SERVICE_ROLE_KEY')) {
    if (env.ALLOW_DEMO_DATA === '1') warnings.push('Running on DEMO DATA in production (ALLOW_DEMO_DATA=1). Nothing is saved.');
    else errors.push('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY: required, or set ALLOW_DEMO_DATA=1 for a demo-only deployment');
  }
  if (!has('NICHE_DOMAINS')) warnings.push('NICHE_DOMAINS is empty: every domain shows the default niche');

  if (has('TELEGRAM_BOT_TOKEN') !== has('TELEGRAM_WEBHOOK_SECRET')) errors.push('TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must be set together');
  if (!has('TELEGRAM_BOT_TOKEN')) warnings.push('Telegram not configured: sellers will not receive orders');
  if (has('BOSTA_API_KEY') && !has('BOSTA_WEBHOOK_SECRET')) errors.push('BOSTA_WEBHOOK_SECRET: required with BOSTA_API_KEY so delivery updates are accepted');
  if (!has('BOSTA_API_KEY')) warnings.push('Bosta not configured: waybills use DEMO tracking numbers');
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.ADMIN_TELEGRAM_CHAT_IDS) warnings.push('ADMIN_TELEGRAM_CHAT_IDS not set: no team alerts on Telegram (send /myid to the bot to get your number)');
  return { errors, warnings };
}
