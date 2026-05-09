"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCreditScoreEngine } from "~~/hooks/credit-score/useCreditScoreEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AuthorizePage() {
  const { isConnected, address } = useAccount();
  const {
    authorizeLender,
    revokeLender,
    decryptOwnScore,
    ownClearScore,
    isDecryptingOwn,
    borrowerHasSubmitted,
    isProcessing,
    message,
    hasContract,
    myScoreHandle,
  } = useCreditScoreEngine();

  const [lenderAddr, setLenderAddr] = useState("");
  const [authorized, setAuthorized] = useState<string[]>([]);
  const addrValid = isAddress(lenderAddr);

  const handleAuthorize = async () => {
    if (!addrValid) return;
    await authorizeLender(lenderAddr as `0x${string}`);
    setAuthorized((prev) => (prev.includes(lenderAddr) ? prev : [...prev, lenderAddr]));
    setLenderAddr("");
  };

  const handleRevoke = async (addr: string) => {
    await revokeLender(addr as `0x${string}`);
    setAuthorized((prev) => prev.filter((a) => a !== addr));
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <p className="text-4xl">🔑</p>
          <h2 className="mt-4 text-xl font-bold text-white">Connect your wallet</h2>
          <p className="mt-2 text-sm text-gray-400">
            Only the borrower can manage lender access.
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
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <p className="text-sm text-[#FFD208] font-semibold uppercase tracking-widest">
          Authorization Center
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Manage Lender Access</h1>
        <p className="mt-2 text-gray-400 text-sm leading-relaxed">
          Grant or revoke a lender&apos;s ability to decrypt your credit score. Your raw factors
          are{" "}
          <span className="text-[#FFD208]">never exposed</span> — only the composite score
          handle is shared via on-chain ACL.
        </p>

        {/* Requirements check */}
        {!borrowerHasSubmitted && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-400">
            ⚠️ You must submit your credit factors first before authorising lenders.
          </div>
        )}

        {/* Own score section */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-white mb-1">Your Encrypted Score</h2>
          <p className="text-xs text-gray-500 mb-4">
            Handle:{" "}
            <span className="font-mono text-gray-400">
              {myScoreHandle ? myScoreHandle.slice(0, 14) + "…" : "—"}
            </span>
          </p>

          {ownClearScore !== undefined ? (
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-gray-500">Your clear score</p>
              <p className="mt-1 text-5xl font-extrabold text-emerald-400 tabular-nums">
                {Number(ownClearScore).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">out of 10 000</p>
            </div>
          ) : (
            <button
              id="decrypt-own-score-btn"
              onClick={decryptOwnScore}
              disabled={!borrowerHasSubmitted || isDecryptingOwn || !hasContract}
              className="w-full rounded-xl border border-[#FFD208]/40 py-3 text-sm font-bold text-[#FFD208] transition hover:bg-[#FFD208]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDecryptingOwn ? "⏳ Decrypting via Zama KMS…" : "🔓 Decrypt My Own Score"}
            </button>
          )}
        </div>

        {/* Authorize form */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-bold text-white mb-4">Authorise a Lender</h2>
          <label
            htmlFor="lender-address-input"
            className="block text-xs text-gray-400 mb-2 uppercase tracking-widest"
          >
            Lender Wallet Address
          </label>
          <input
            id="lender-address-input"
            type="text"
            placeholder="0x…"
            value={lenderAddr}
            onChange={(e) => setLenderAddr(e.target.value)}
            className={`w-full rounded-xl border bg-black/40 px-4 py-3 font-mono text-sm outline-none transition focus:ring-2 ${
              lenderAddr && !addrValid
                ? "border-red-500/50 focus:ring-red-500/30 text-red-400"
                : "border-white/20 focus:ring-[#FFD208]/30 text-white"
            }`}
          />

          <button
            id="authorize-lender-btn"
            onClick={handleAuthorize}
            disabled={!addrValid || isProcessing || !borrowerHasSubmitted || !hasContract}
            className="mt-4 w-full rounded-xl bg-[#FFD208] py-3 font-bold text-black text-sm transition hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "⏳ Authorising…" : "✅ Grant Score Access"}
          </button>
        </div>

        {/* Authorized lender list */}
        {authorized.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-bold text-white mb-4">Authorised Lenders (this session)</h2>
            <div className="space-y-2">
              {authorized.map((addr) => (
                <div
                  key={addr}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                >
                  <span className="font-mono text-xs text-emerald-300">
                    {addr.slice(0, 8)}…{addr.slice(-6)}
                  </span>
                  <button
                    onClick={() => handleRevoke(addr)}
                    disabled={isProcessing}
                    className="rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EIP-712 info */}
        <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-300">
          🔏 Authorization calls <code>FHE.allow(scoreHandle, lender)</code> on-chain, updating
          the Zama ACL contract. Decryption via the KMS requires a valid EIP-712 signature from
          the authorised address — no private keys are sent to the gateway.
        </div>

        {/* Connected as */}
        <div className="mt-4 text-center text-xs text-gray-600 font-mono">
          Acting as: {address?.slice(0, 8)}…{address?.slice(-6)}
        </div>

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
