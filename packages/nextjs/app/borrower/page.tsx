"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCreditScoreEngine } from "~~/hooks/credit-score/useCreditScoreEngine";

// ── Factor descriptor ────────────────────────────────────────────────────────
const FACTORS = [
  {
    key: "paymentHistory" as const,
    label: "Payment History",
    icon: "💳",
    weight: "40%",
    hint: "Track record of on-time payments. 100 = perfect history.",
    good: "high",
  },
  {
    key: "dti" as const,
    label: "Debt-to-Income Ratio",
    icon: "⚖️",
    weight: "30%",
    hint: "Monthly debt vs. gross income. Lower = better. 0 = no debt.",
    good: "low",
  },
  {
    key: "creditAge" as const,
    label: "Credit Age",
    icon: "📅",
    weight: "15%",
    hint: "Average age of all credit accounts (scaled). Higher = better.",
    good: "high",
  },
  {
    key: "utilization" as const,
    label: "Credit Utilization",
    icon: "📊",
    weight: "15%",
    hint: "Percentage of available credit in use. Lower = better.",
    good: "low",
  },
] as const;

type FactorKey = (typeof FACTORS)[number]["key"];

// ── Slider colour helper ─────────────────────────────────────────────────────
function sliderColor(val: number, good: "high" | "low") {
  const pct = good === "high" ? val : 100 - val;
  if (pct >= 75) return "#10b981"; // emerald
  if (pct >= 50) return "#FFD208"; // amber
  return "#ef4444";                 // red
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function BorrowerPage() {
  const { isConnected } = useAccount();
  const { submitFactors, isProcessing, message, borrowerHasSubmitted, hasContract } =
    useCreditScoreEngine();

  const [values, setValues] = useState<Record<FactorKey, number>>({
    paymentHistory: 80,
    dti: 30,
    creditAge: 60,
    utilization: 20,
  });
  const [submitted, setSubmitted] = useState(false);

  // Estimated plain-text preview (shown to user for intuition, not sent in clear)
  const preview =
    values.paymentHistory * 40 +
    (100 - values.dti) * 30 +
    values.creditAge * 15 +
    (100 - values.utilization) * 15;

  const previewGrade =
    preview >= 8500 ? "Excellent" : preview >= 7000 ? "Good" : preview >= 5000 ? "Fair" : "Poor";
  const previewColor =
    preview >= 7500 ? "text-emerald-400" : preview >= 5000 ? "text-amber-400" : "text-red-400";

  const handleSubmit = async () => {
    await submitFactors(values);
    setSubmitted(true);
  };

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-4xl">🔐</p>
          <h2 className="mt-4 text-xl font-bold text-white">Connect your wallet</h2>
          <p className="mt-2 text-sm text-gray-400">
            You need a connected wallet to submit encrypted factors.
          </p>
          <div className="mt-6 flex justify-center">
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-[#FFD208] font-semibold uppercase tracking-widest">
            Borrower Portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Simulated Oracle Data Input</h1>
          <p className="mt-2 text-gray-400 text-sm leading-relaxed">
            In a production environment, these factors would be pulled automatically from an encrypted credit bureau API.
            For this hackathon demo, adjust the sliders below to simulate your profile. Your values are{" "}
            <span className="text-[#FFD208] font-semibold">
              encrypted locally with fhevmjs
            </span>{" "}
            before being sent on-chain — the raw numbers never leave your browser.
          </p>
        </div>

        {/* Already submitted banner */}
        {borrowerHasSubmitted && !submitted && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            ✅ You have already submitted factors. Submitting again will update your score.
          </div>
        )}

        {/* Sliders */}
        <div className="space-y-6">
          {FACTORS.map((f) => {
            const val = values[f.key];
            const color = sliderColor(val, f.good);
            return (
              <div
                key={f.key}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">
                      {f.icon} {f.label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{f.hint}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="text-2xl font-extrabold tabular-nums"
                      style={{ color }}
                    >
                      {val}
                    </span>
                    <p className="text-xs text-gray-500">weight {f.weight}</p>
                  </div>
                </div>

                <input
                  id={`slider-${f.key}`}
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                  }
                  className="mt-4 w-full accent-[#FFD208]"
                  style={{ accentColor: color }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-gray-600">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Score preview */}
        <div className="mt-8 rounded-2xl border border-[#FFD208]/30 bg-[#FFD208]/5 p-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest">
            Local score preview (not sent on-chain)
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className={`text-5xl font-extrabold tabular-nums ${previewColor}`}>
              {preview}
            </span>
            <span className={`mb-1 text-lg font-semibold ${previewColor}`}>
              / 10 000 · {previewGrade}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            ph×40 + (100−dti)×30 + ca×15 + (100−util)×15
          </p>
        </div>

        {/* Encryption notice */}
        <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-purple-300">
          🔒 When you click Submit, fhevmjs will encrypt all four values into{" "}
          <code className="font-mono">euint64</code> ciphertexts and generate a ZK input-proof
          covering them. Only the encrypted handles + proof are broadcast to Sepolia.
        </div>

        {/* Submit */}
        <button
          id="submit-factors-btn"
          onClick={handleSubmit}
          disabled={isProcessing || !hasContract}
          className="mt-6 w-full rounded-xl bg-[#FFD208] py-4 font-bold text-black text-sm transition hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? "⏳ Encrypting & submitting…"
            : borrowerHasSubmitted
              ? "🔄 Update Encrypted Factors"
              : "🔐 Encrypt & Submit Factors"}
        </button>

        {/* Message */}
        {message && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
