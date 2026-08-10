import React, { useState, useEffect } from "react";
import { ChevronLeft, Check, Copy, Info, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWallet } from "../hooks/useWallet";
import { useTelegramUser } from "../hooks/useTelegramUser";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";

export function Deposit() {
  const navigate = useNavigate();
  const telegramUser = useTelegramUser();
  const { address, telegramId, refresh } = useWallet(telegramUser);
  const [copied, setCopied] = useState(false);
  const [bnb, setBnb] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [explorer, setExplorer] = useState("");

  const displayAddress = address || "—";

  const sync = async () => {
    if (!telegramId) return;
    setSyncing(true);
    try {
      const res = await api.getBnbBalance(telegramId);
      setBnb(res.bnb);
      setExplorer(res.explorer || "");
      refresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    sync();
  }, [telegramId]);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full text-white pb-24 relative overflow-y-auto"
    >
      <header className="flex items-center gap-4 p-4 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-white/[0.04] border border-white/[0.05] rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Receive BNB</h1>
      </header>

      <div className="px-4 flex flex-col items-center pt-2 gap-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0B90B]/15 border border-[#F0B90B]/30 text-[#F0B90B] text-xs font-bold">
          BNB Smart Chain (BEP-20 / Native BNB)
        </div>

        <div className="flex flex-col items-center bg-white/[0.04] border border-white/[0.05] p-6 rounded-3xl w-full max-w-[300px]">
          <div className="bg-white p-3 rounded-2xl mb-4">
            {address ? (
              <QRCodeSVG value={address} size={180} level="H" fgColor="#13141a" />
            ) : (
              <div className="w-[180px] h-[180px] bg-gray-200 rounded" />
            )}
          </div>

          <span className="text-sm text-white/60 mb-2">Your BNB deposit address</span>

          <button onClick={handleCopy} className="w-full active:scale-[0.98] transition-transform">
            <span className="block text-[12px] font-mono text-center break-all text-[#8792FF] bg-[#8792FF]/10 border border-[#8792FF]/20 px-3 py-2.5 rounded-xl">
              {displayAddress}
            </span>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-white/40">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Tap to copy</span>
                </>
              )}
            </div>
          </button>
        </div>

        <div className="w-full max-w-[300px] bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-white/40">On-chain BNB</div>
            <div className="text-lg font-bold">{bnb === null ? "…" : `${bnb} BNB`}</div>
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/25"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>

        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#8792FF]"
          >
            <ExternalLink className="w-4 h-4" /> View on BscScan
          </a>
        )}

        <div className="flex items-start gap-3 text-white/60 bg-white/[0.04] p-4 rounded-2xl w-full max-w-[300px] text-[12px] leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-[#F0B90B] mt-0.5" />
          <p>
            Send only <strong className="text-white">BNB</strong> on{" "}
            <strong className="text-white">BNB Smart Chain</strong> to this address. After sending,
            tap <strong className="text-white">Sync</strong> to credit your balance. Wrong network
            may result in lost funds.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
