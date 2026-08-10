import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useToast } from '../lib/ToastContext';

export function Rewards() {
  const user = useTelegramUser();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, c] = await Promise.all([
          api.getTasks(),
          user.telegramId ? api.getCompletedTasks(user.telegramId) : Promise.resolve({ completed: [] }),
        ]);
        setTasks(t.tasks || []);
        setCompleted(new Set((c.completed || []).map((x: any) => x.taskId)));
      } catch (e: any) {
        showToast(e.message || 'Failed to load', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.telegramId]);

  const claim = async (taskId: string) => {
    if (!user.telegramId) return;
    try {
      const res = await api.completeTask(user.telegramId, taskId);
      setCompleted((s) => new Set(s).add(taskId));
      showToast(`+${res.reward} ${res.symbol}`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-white/40">Loading…</div>;

  return (
    <div className="p-4 text-white space-y-4">
      <h1 className="text-2xl font-bold pt-4">Rewards</h1>
      {tasks.map((t) => (
        <div key={t.id} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <div className="font-semibold">{t.title}</div>
          <div className="text-sm text-white/50 mt-1">{t.description}</div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[#8792FF] font-bold">+{t.rewardAmount || t.points || 0} {t.rewardSymbol || 'UUSD'}</span>
            {completed.has(t.id) ? (
              <span className="text-emerald-400 text-sm">Claimed</span>
            ) : (
              <button onClick={() => claim(t.id)} className="px-4 py-1.5 rounded-xl bg-[#8792FF]/20 text-[#8792FF] text-sm font-bold">Claim</button>
            )}
          </div>
        </div>
      ))}
      {!tasks.length && <p className="text-white/30 text-center py-8">No tasks yet</p>}
    </div>
  );
}
