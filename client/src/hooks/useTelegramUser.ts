import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  telegramId: string | null;
  firstName: string | null;
  username: string | null;
  photoUrl: string | null;
  startParam: string | null;
  isTelegram: boolean;
}

export function useTelegramUser(): TelegramUser {
  const [user, setUser] = useState<TelegramUser>({
    telegramId: null,
    firstName: null,
    username: null,
    photoUrl: null,
    startParam: null,
    isTelegram: false,
  });

  useEffect(() => {
    try {
      if (WebApp.initDataUnsafe?.user) {
        const tUser = WebApp.initDataUnsafe.user;
        setUser({
          telegramId: tUser.id.toString(),
          firstName: tUser.first_name || null,
          username: tUser.username || null,
          photoUrl: (tUser as any).photo_url || null,
          startParam: WebApp.initDataUnsafe.start_param || null,
          isTelegram: true,
        });
        return;
      }
    } catch { /* ignore */ }

    const urlParams = new URLSearchParams(window.location.search);
    const demoId = urlParams.get('tg') || urlParams.get('demo') || 'web_demo_user';
    const start = urlParams.get('start');
    setUser({
      telegramId: demoId,
      firstName: 'Demo User',
      username: 'demo_user',
      photoUrl: null,
      startParam: start,
      isTelegram: false,
    });
  }, []);

  return user;
}
