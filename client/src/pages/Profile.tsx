import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useWallet } from '../hooks/useWallet';

export function Profile() {
  const navigate = useNavigate();
  const user = useTelegramUser();
  const { address } = useWallet(user);

  return (
    <div className="p-4 text-white space-y-4">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
      </header>
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-2">
        <div className="text-sm text-white/40">Name</div>
        <div className="font-semibold">{user.firstName || 'User'}</div>
        <div className="text-sm text-white/40 mt-3">Telegram ID</div>
        <div className="font-mono text-sm">{user.telegramId}</div>
        <div className="text-sm text-white/40 mt-3">Address</div>
        <div className="font-mono text-xs break-all">{address || '—'}</div>
      </div>
      <button onClick={() => navigate('/referrals')} className="w-full py-3 rounded-xl bg-white/10 font-medium">Referrals</button>
      <button onClick={() => navigate('/faq')} className="w-full py-3 rounded-xl bg-white/10 font-medium">FAQ</button>
      <button onClick={() => navigate('/admin')} className="w-full py-3 rounded-xl bg-[#8792FF]/20 text-[#8792FF] font-medium">Admin</button>
    </div>
  );
}
