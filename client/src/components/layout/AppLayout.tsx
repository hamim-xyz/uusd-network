import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useTelegramUser } from '../../hooks/useTelegramUser';
import { useWallet } from '../../hooks/useWallet';
import { LoadingScreen } from './LoadingScreen';
import { AnimatePresence } from 'framer-motion';

export function AppLayout() {
  const location = useLocation();
  const telegramUser = useTelegramUser();
  const { isLoading, needsCreation, isCreating, createWallet } = useWallet(telegramUser);

  const hideNav = ['/deposit', '/withdraw', '/profile', '/referrals', '/faq', '/news', '/language', '/notifications', '/currency', '/scan'].some(
    (p) => location.pathname.startsWith(p)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (needsCreation) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#0c0d12] text-white gap-4">
        <h1 className="text-xl font-bold">Create Wallet</h1>
        <p className="text-white/50 text-sm text-center">Your wallet is linked to your Telegram ID and stored securely.</p>
        <button
          onClick={() => createWallet()}
          disabled={isCreating}
          className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#8792FF] to-[#5b65d4] font-bold disabled:opacity-50"
        >
          {isCreating ? 'Creating…' : 'Create Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0d12] text-white flex flex-col">
      <main className="flex-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
