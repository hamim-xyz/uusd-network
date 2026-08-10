import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useSettings } from '../lib/SettingsContext';

export function Language() {
  const navigate = useNavigate();
  const { language, setLanguage } = useSettings();
  return (
    <div className="p-4 text-white space-y-3">
      <header className="flex items-center gap-3"><button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><h1 className="text-xl font-bold">Language</h1></header>
      {['en', 'bn'].map((l) => (
        <button key={l} onClick={() => setLanguage(l)} className={`w-full py-3 rounded-xl text-left px-4 ${language === l ? 'bg-[#8792FF]/20 text-[#8792FF]' : 'bg-white/5'}`}>{l === 'en' ? 'English' : 'বাংলা'}</button>
      ))}
    </div>
  );
}
