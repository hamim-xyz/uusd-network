import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';

export function WalletNewsPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<any[]>([]);
  useEffect(() => {
    api.getContent().then((c: any) => setNews(c.news || [])).catch(() => {});
  }, []);
  return (
    <div className="p-4 text-white space-y-3">
      <header className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-xl font-bold">News</h1></header>
      {news.map((n, i) => (
        <div key={i} className="bg-white/[0.04] rounded-xl p-3"><div className="font-semibold">{n.title}</div><div className="text-white/50 text-sm">{n.body}</div></div>
      ))}
      {!news.length && <p className="text-white/30 text-sm">No news yet.</p>}
    </div>
  );
}
