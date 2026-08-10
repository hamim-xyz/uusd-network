/**
 * BNB on-chain withdraw (BSC) + fee estimate box
 */
import React, { useState, useEffect } from "react";
import { ChevronLeft, ExternalLink, Fuel, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "../hooks/useWallet";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { api } from "../lib/api";
import { hasPinSet } from "../lib/pin";
import { PinModal } from "../components/ui/PinModal";

export function Withdraw() {
  const navigate = useNavigate();
  const telegramUser = useTelegramUser();
  const { address, telegramId, balances, refresh } = useWallet(telegramUser);

  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [feeBnb, setFeeBnb] = useState<string | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [bnbBal, setBnbBal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [txResult, setTxResult] = useState<{ txHash: string; explorerUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [pinOpen, setPinOpen] = useState(false);

  const parsed = Number(amount) || 0;

  useEffect(() => {
    if (!telegramId) return;
    api.getBnbBalance(telegramId).then((r) => setBnbBal(r.bnb)).catch(() => {
      setBnbBal(Number(balances?.BNB || 0));
    });
  }, [telegramId, balances]);

  useEffect(() => {
    if (!address || !toAddress || parsed <= 0) {
      setFeeBnb(null);
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) return;
    const t = setTimeout(async () => {
      setFeeLoading(true);
      try {
        const fee = await api.estimateBnbFee(address, toAddress, String(parsed));
        setFeeBnb(fee.feeBnb);
      } catch {
        setFeeBnb(null);
      } finally {
        setFeeLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [address, toAddress, parsed]);

  const doWithdraw = async (pin?: string) => {
    if (!telegramId) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.bnbWithdraw({
        telegramId,
        toAddress: toAddress.trim(),
        amount: parsed,
        pin,
      });
      setTxResult({ txHash: res.txHash, explorerUrl: res.explorerUrl });
      setBnbBal(res.newBalance);
      refresh?.();
    } catch (e: any) {
      setError(e.message || "Withdraw failed");
    } finally {
      setBusy(false);
      setPinOpen(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!toAddress || parsed <= 0) {
      setError("Enter address and amount");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress.trim())) {
      setError("Invalid BSC address");
      return;
    }
    if (parsed > bnbBal) {
      setError("Insufficient BNB");
      return;
    }
    if (!telegramId) return;
    try {
      const has = await hasPinSet(telegramId);
      if (has) {
        setPinOpen(true);
        return;
      }
    } catch { /* continue */ }
    await doWithdraw();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4 pb-28 px-4 text-white"
    >
      <header className="flex items-center gap-4 mt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white/[0.04] border border-white/[0.05] rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Withdraw BNB</h1>
          <p className="text-[11px] text-[#F0B90B]">BNB Smart Chain</p>
        </div>
      </header>

      {txResult ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
          <p className="font-bold text-emerald-400">Withdraw submitted</p>
          <p className="text-xs font-mono break-all text-white/60">{txResult.txHash}</p>
          <a
            href={txResult.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-[#8792FF] font-medium"
          >
            <ExternalLink className="w-4 h-4" /> View on BscScan
          </a>
          <button
            onClick={() => navigate("/")}
            className="w-full mt-2 py-3 rounded-xl bg-white/10 font-bold text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4">
            <div className="text-xs text-white/40 mb-1">Available</div>
            <div className="text-2xl font-bold">{bnbBal} <span className="text-base text-[#F0B90B]">BNB</span></div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">To address (BSC)</label>
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full bg-[#16171f] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#F0B90B]"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Amount</label>
            <div className="relative">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="any"
                placeholder="0.0"
                className="w-full bg-[#16171f] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F0B90B]"
              />
              <button
                type="button"
                onClick={() => setAmount(String(Math.max(0, bnbBal * 0.99)))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#F0B90B]"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="bg-[#16171f] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <Fuel className="w-4 h-4 text-[#F0B90B]" />
              Network fee
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Estimated gas</span>
              <span className="font-medium">
                {feeLoading ? "…" : feeBnb != null ? `~ ${Number(feeBnb).toFixed(6)} BNB` : "—"}
              </span>
            </div>
            <p className="text-[11px] text-white/35 leading-relaxed">
              Fee is paid in BNB on BNB Smart Chain. Actual fee may vary with network congestion.
            </p>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={busy || parsed <= 0}
            className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-[#F0B90B] to-[#d4a20a] text-black disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {busy ? "Sending…" : "Withdraw BNB"}
          </button>
        </>
      )}

      <PinModal
        open={pinOpen}
        telegramId={telegramId || ""}
        mode="verify"
        onClose={() => setPinOpen(false)}
        onSuccess={(pin) => doWithdraw(pin)}
      />
    </motion.div>
  );
}
