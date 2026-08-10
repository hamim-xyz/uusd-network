import React from 'react';
import { useNavigate } from 'react-router-dom';

export function WithdrawCountdown() {
  const navigate = useNavigate();
  return (
    <div className="p-8 text-center text-white space-y-4">
      <h1 className="text-xl font-bold">Coming soon</h1>
      <p className="text-white/40 text-sm">UUSD on-chain withdraw opens via launchpad later. Use BNB withdraw for now.</p>
      <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl bg-white/10">Back</button>
    </div>
  );
}
