import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Shield } from 'lucide-react';

export function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('uusd_admin_token'));
  const [users, setUsers] = useState<any[]>([]);
  const [dash, setDash] = useState<any>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.adminLogin(user, pass);
      sessionStorage.setItem('uusd_admin_token', res.token);
      setAuthed(true);
      load();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const load = async () => {
    try {
      const [d, u] = await Promise.all([api.adminDashboard(), api.adminUsers()]);
      setDash(d);
      setUsers(u.users || []);
    } catch {}
  };

  React.useEffect(() => { if (authed) load(); }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#0c0d12] text-white">
        <form onSubmit={login} className="w-full max-w-sm bg-[#16171f] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col items-center"><Shield className="w-10 h-10 text-[#8792FF] mb-2" /><h1 className="font-bold text-lg">Admin Login</h1></div>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-[#8792FF] font-bold">Login</button>
          <button type="button" onClick={() => navigate('/')} className="w-full text-white/30 text-sm">Back</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0c0d12] text-white p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin</h1>
        <button onClick={() => { sessionStorage.removeItem('uusd_admin_token'); setAuthed(false); }} className="text-red-400 text-sm">Logout</button>
      </div>
      {dash && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl font-bold">{dash.totalUsers}</div><div className="text-xs text-white/40">Users</div></div>
          <div className="bg-white/5 rounded-xl p-3"><div className="text-2xl font-bold">{dash.totalWallets}</div><div className="text-xs text-white/40">Wallets</div></div>
        </div>
      )}
      <h2 className="font-semibold">Users</h2>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {users.map((u) => (
          <div key={u.telegramId} className="bg-white/[0.04] rounded-xl px-3 py-2 text-sm flex justify-between">
            <div>
              <div className="font-medium">{u.firstName || u.username || u.telegramId}</div>
              <div className="text-[11px] text-white/30 font-mono">{u.address?.slice(0, 12)}…</div>
            </div>
            <div className="text-right">{Number(u.balance || 0).toFixed(2)} UUSD</div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/')} className="w-full py-2 text-white/40 text-sm">Back to App</button>
    </div>
  );
}
