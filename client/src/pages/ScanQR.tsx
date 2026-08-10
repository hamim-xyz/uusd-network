import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function ScanQR() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-[#0c0d12] text-white p-4">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-bold mb-2">Scan QR</h1>
      <p className="text-white/40 text-sm">QR scanner placeholder — use address paste on Withdraw for now.</p>
    </div>
  );
}
