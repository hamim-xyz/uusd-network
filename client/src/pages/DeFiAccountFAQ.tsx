import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';

export function DeFiAccountFAQ() {
  const navigate = useNavigate();
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);
  useEffect(() => {
    api.getContent().then((c: any) => setFaq(c.faq || [])).catch(() => {});
  }, []);
  return (
    <div className="p-4 text-white space-y-3">
      <header className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-xl font-bold">FAQ</h1></header>
      {faq.map((f, i) => (
        <div key={i} className="bg-white/[0.04] rounded-xl p-3"><div className="font-semibold text-sm">{f.q}</div><div className="text-white/50 text-sm mt-1">{f.a}</div></div>
      ))}
      {!faq.length && <p className="text-white/30 text-sm">No FAQ yet.</p>}
    </div>
  );
}
