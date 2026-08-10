import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';
import { useTelegramUser } from '../hooks/useTelegramUser';

interface SettingsCtx {
  language: string;
  currency: string;
  t: (key: string) => string;
  setLanguage: (l: string) => void;
  setCurrency: (c: string) => void;
}

const SettingsContext = createContext<SettingsCtx>({
  language: 'en',
  currency: 'USD',
  t: (k) => k,
  setLanguage: () => {},
  setCurrency: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const user = useTelegramUser();
  const [language, setLanguageState] = useState('en');
  const [currency, setCurrencyState] = useState('USD');

  useEffect(() => {
    if (!user.telegramId) return;
    api.getUserSettings(user.telegramId).then((s) => {
      if (s.language) setLanguageState(s.language);
      if (s.currency) setCurrencyState(s.currency);
    }).catch(() => {});
  }, [user.telegramId]);

  const setLanguage = (l: string) => {
    setLanguageState(l);
    if (user.telegramId) api.updateUserSettings(user.telegramId, { language: l }).catch(() => {});
  };
  const setCurrency = (c: string) => {
    setCurrencyState(c);
    if (user.telegramId) api.updateUserSettings(user.telegramId, { currency: c }).catch(() => {});
  };

  return (
    <SettingsContext.Provider value={{ language, currency, t: (k) => k, setLanguage, setCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
