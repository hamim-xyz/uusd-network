/**
 * Telegram WebApp initData validation (HMAC-SHA256)
 */
import crypto from 'crypto';

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

export interface ValidatedInitData {
  user: TelegramWebAppUser;
  authDate: number;
  startParam?: string;
  queryId?: string;
  raw: Record<string, string>;
}

export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400
): ValidatedInitData | null {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculated = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculated !== hash) return null;

    const authDate = Number(params.get('auth_date') || 0);
    if (!authDate) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > maxAgeSeconds) return null;

    let user: TelegramWebAppUser | null = null;
    const userJson = params.get('user');
    if (userJson) {
      user = JSON.parse(userJson);
    }
    if (!user?.id) return null;

    return {
      user,
      authDate,
      startParam: params.get('start_param') || undefined,
      queryId: params.get('query_id') || undefined,
      raw: Object.fromEntries(params),
    };
  } catch {
    return null;
  }
}
