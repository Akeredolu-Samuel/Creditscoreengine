"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCreditScoreEngine } from "~~/hooks/credit-score/useCreditScoreEngine";

// ── Score visualiser ─────────────────────────────────────────────────────────
function ScoreMeter({ score }: { score: number }) {
  const pct = Math.min(100, (score / 10000) * 100);
  const color = score >= 7500 ? "#10b981" : score >= 5000 ? "#FFD208" : "#ef4444";
  const grade = score >= 8500 ? "Excellent" : score >= 7000 ? "Good" : score >= 5000 ? "Fair" : "Poor";

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between mb-2">
        <span className="text-5xl font-extrabold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-lg font-semibold text-gray-400">/ 10 000</span>
      </div>
      <div className="h-3 w-full rounded-full bg-white/10">
        <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-2 text-sm font-semibold" style={{ color }}>
        {grade} Credit
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LenderPage() {
  const { isConnected } = useAccount();
  const {
    requestAndDecryptScore,
    lenderClearScore,
    lenderScoreHandle,
    isDecryptingLender,
    isProcessing,
    message,
    hasContract,
  } = useCreditScoreEngine();

  const [borrowerAddr, setBorrowerAddr] = useState("");
  const addrValid = isAddress(borrowerAddr);

  const handleRequest = async () => {
    if (!addrValid) return;
    await requestAndDecryptScore(borrowerAddr as `0x${string}`);
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-4xl">🏦</p>
          <h2 className="mt-4 text-xl font-bold text-white">Connect your wallet</h2>
          <p className="mt-2 text-sm text-gray-400">Lenders must connect a wallet to proceed.</p>
          <div className="mt-6 flex justify-center">
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-12 text-white">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <p className="text-sm text-[#FFD208] font-semibold uppercase tracking-widest">Lender Portal</p>
        <h1 className="mt-2 text-3xl font-extrabold">Request Credit Score</h1>
        <p className="mt-2 text-gray-400 text-sm leading-relaxed">
          Enter a borrower address you are authorised for. The contract returns the encrypted score handle; the Zama KMS
          then decrypts it client-side — only the final number is revealed.
        </p>

        {/* Address input */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <label htmlFor="borrower-address" className="block text-sm font-semibold text-white mb-2">
            Borrower Address
          </label>
          <input
            id="borrower-address"
            type="text"
            placeholder="0x…"
            value={borrowerAddr}
            onChange={e => setBorrowerAddr(e.target.value)}
            className={`w-full rounded-xl border bg-black/40 px-4 py-3 font-mono text-sm outline-none transition focus:ring-2 ${
              borrowerAddr && !addrValid
                ? "border-red-500/50 focus:ring-red-500/30 text-red-400"
                : "border-white/20 focus:ring-[#FFD208]/30 text-white"
            }`}
          />
          {borrowerAddr && !addrValid && <p className="mt-1 text-xs text-red-400">Invalid Ethereum address</p>}

          <button
            id="request-score-btn"
            onClick={handleRequest}
            disabled={!addrValid || isProcessing || isDecryptingLender || !hasContract}
            className="mt-4 w-full rounded-xl bg-[#FFD208] py-3 font-bold text-black text-sm transition hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDecryptingLender
              ? "⏳ Decrypting via KMS…"
              : isProcessing
                ? "⏳ Processing…"
                : "🔓 Request & Decrypt Score"}
          </button>
        </div>

        {/* FHE explainer */}
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-purple-300">
          🧮 The contract calls <code>FHE.ge(score, threshold)</code> for threshold checks — returning an{" "}
          <code>ebool</code> — and can return the full encrypted score handle for authorised lenders. Raw factors are{" "}
          <strong>never</strong> accessible.
        </div>

        {/* Handle display */}
        {lenderScoreHandle && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Encrypted Score Handle</p>
            <p className="font-mono text-xs text-gray-300 break-all">{lenderScoreHandle}</p>
          </div>
        )}

        {/* Decrypted score */}
        {lenderClearScore !== undefined && (
          <div className="mt-4 rounded-2xl border border-[#FFD208]/30 bg-[#FFD208]/5 p-6">
            <p className="text-sm font-semibold text-[#FFD208] uppercase tracking-widest mb-1">Decrypted Score</p>
            <ScoreMeter score={Number(lenderClearScore)} />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Min threshold", value: "5 000", pass: Number(lenderClearScore) >= 5000 },
                { label: "Good standing", value: "7 000", pass: Number(lenderClearScore) >= 7000 },
                { label: "Prime rate", value: "8 500", pass: Number(lenderClearScore) >= 8500 },
              ].map(t => (
                <div
                  key={t.label}
                  className={`rounded-xl border p-3 text-xs ${
                    t.pass
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/20 bg-red-500/5 text-red-400"
                  }`}
                >
                  <p className="font-bold">
                    {t.pass ? "✓" : "✗"} {t.value}
                  </p>
                  <p className="text-[10px] mt-1 opacity-70">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">{message}</div>
        )}
      </div>
    </div>
  );
}
