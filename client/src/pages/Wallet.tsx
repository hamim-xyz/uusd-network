import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { ArrowDownLeft, ArrowUpRight, Copy, Check } from 'lucide-react';

export function Wallet() {
  const navigate = useNavigate();
  const telegramUser = useTelegramUser();
  const { address, balances, activities, refresh } = useWallet(telegramUser);
  const [copied, setCopied] = React.useState(false);

  const bnb = Number(balances?.BNB || 0);
  const uusd = Number(balances?.UUSD || 0);

  const copyAddr = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="pt-4">
        <p className="text-white/40 text-sm">UUSD Network</p>
        <h1 className="text-2xl font-bold">Wallet</h1>
      </div>

      <div className="bg-gradient-to-br from-[#8792FF]/20 to-[#5b65d4]/10 border border-white/10 rounded-3xl p-5 space-y-3">
        <div>
          <div className="text-xs text-white/40">BNB Balance</div>
          <div className="text-3xl font-bold text-[#F0B90B]">{bnb.toFixed(6)} <span className="text-base">BNB</span></div>
        </div>
        <div>
          <div className="text-xs text-white/40">UUSD (presale)</div>
          <div className="text-xl font-semibold">{uusd.toLocaleString()} UUSD</div>
        </div>
        <button onClick={copyAddr} className="flex items-center gap-2 text-xs text-white/50 break-all">
          {address || '—'} {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/deposit')} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#F0B90B]/15 text-[#F0B90B] font-bold border border-[#F0B90B]/25">
          <ArrowDownLeft className="w-4 h-4" /> Receive
        </button>
        <button onClick={() => navigate('/withdraw')} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 font-bold border border-white/10">
          <ArrowUpRight className="w-4 h-4" /> Withdraw
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Activity</h2>
        <button onClick={() => refresh()} className="text-xs text-[#8792FF]">Refresh</button>
      </div>
      <div className="space-y-2">
        {(activities || []).slice(0, 20).map((a: any) => (
          <div key={a.id} className="flex justify-between items-center bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium capitalize">{a.type?.replace('_', ' ')}</div>
              <div className="text-[11px] text-white/40">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</div>
            </div>
            <div className="text-right font-semibold">
              {a.amount} {a.symbol}
            </div>
          </div>
        ))}
        {!activities?.length && <p className="text-white/30 text-sm text-center py-6">No activity yet</p>}
      </div>

      <button onClick={() => navigate('/profile')} className="w-full py-3 text-center text-sm text-white/40">Profile →</button>
    </div>
  );
}
