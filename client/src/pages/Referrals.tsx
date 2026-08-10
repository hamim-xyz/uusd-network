import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useTelegramUser } from '../hooks/useTelegramUser';

export function Referrals() {
  const navigate = useNavigate();
  const user = useTelegramUser();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    if (!user.telegramId) return;
    api.getReferrals(user.telegramId).then((r) => setList(r.referrals || [])).catch(() => {});
  }, [user.telegramId]);

  const link = user.telegramId ? `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/your_bot?start=${user.telegramId}`)}` : '';

  return (
    <div className="p-4 text-white space-y-4">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold">Referrals</h1>
      </header>
      <p className="text-sm text-white/50">Share your link. Friends join via your Telegram ID.</p>
      {link && <a href={link} className="block text-center py-3 rounded-xl bg-[#8792FF]/20 text-[#8792FF] font-bold">Share invite</a>}
      <div className="text-sm text-white/40">Total: {list.length}</div>
      {list.map((r) => (
        <div key={r.id} className="bg-white/[0.04] rounded-xl px-3 py-2 text-sm">
          {r.firstName || r.username || r.referredTelegramId}
        </div>
      ))}
    </div>
  );
}
