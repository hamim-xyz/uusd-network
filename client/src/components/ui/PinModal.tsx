import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setUserPin, verifyUserPin, changeUserPin } from '../../lib/pin';

interface Props {
  open: boolean;
  telegramId: string;
  mode: 'set' | 'verify' | 'change';
  onClose: () => void;
  onSuccess: (pin?: string) => void;
}

export function PinModal({ open, telegramId, mode, onClose, onSuccess }: Props) {
  const [digits, setDigits] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDigit = useCallback(async (d: string) => {
    if (busy) return;
    const next = (digits + d).slice(0, 6);
    setDigits(next);
    setError('');
    if (next.length < 6) return;

    setBusy(true);
    try {
      if (mode === 'set') {
        if (step === 'enter') {
          setFirstPin(next);
          setDigits('');
          setStep('confirm');
        } else {
          if (next !== firstPin) {
            setError('PIN mismatch');
            setDigits('');
            setStep('enter');
            setFirstPin('');
          } else {
            await setUserPin(telegramId, next);
            onSuccess(next);
            onClose();
          }
        }
      } else if (mode === 'verify') {
        const ok = await verifyUserPin(telegramId, next);
        if (!ok) {
          setError('Wrong PIN');
          setDigits('');
        } else {
          onSuccess(next);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error');
      setDigits('');
    } finally {
      setBusy(false);
    }
  }, [busy, digits, mode, step, firstPin, telegramId, onSuccess, onClose]);

  const handleDelete = () => setDigits((d) => d.slice(0, -1));

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/70 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          className="w-full max-w-sm bg-[#16171f] rounded-t-3xl sm:rounded-3xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-center font-bold mb-2">
            {mode === 'set' ? (step === 'enter' ? 'Set PIN' : 'Confirm PIN') : 'Enter PIN'}
          </h3>
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i < digits.length ? 'bg-[#8792FF]' : 'bg-white/20'}`} />
            ))}
          </div>
          {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
              <button
                key={k || 'empty'}
                disabled={!k || busy}
                onClick={() => k === '⌫' ? handleDelete() : k && handleDigit(k)}
                className="h-14 rounded-xl bg-white/5 text-lg font-semibold disabled:opacity-30 active:bg-white/10"
              >
                {k}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="w-full mt-4 text-white/40 text-sm">Cancel</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
