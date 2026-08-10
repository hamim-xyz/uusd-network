import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function Notifications() {
  const navigate = useNavigate();
  return (
    <div className="p-4 text-white">
      <header className="flex items-center gap-3 mb-4"><button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-xl font-bold">Notifications</h1></header>
      <p className="text-white/40 text-sm">Notification settings will appear here.</p>
    </div>
  );
}
