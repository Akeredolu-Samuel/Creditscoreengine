"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useCreditScoreEngine } from "~~/hooks/credit-score/useCreditScoreEngine";

export default function Home() {
  const { isConnected, address } = useAccount();
  const { borrowerHasSubmitted, ownClearScore, myScoreHandle } = useCreditScoreEngine();

  /* ── Score badge ─────────────────────────────────────────────── */
  const scoreNum = ownClearScore !== undefined ? Number(ownClearScore) : null;
  const scoreColor =
    scoreNum === null
      ? "text-gray-400"
      : scoreNum >= 7500
        ? "text-emerald-400"
        : scoreNum >= 5000
          ? "text-amber-400"
          : "text-red-400";

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#FFD208]/30">
      {/* ── Background Elements ────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FFD208]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="px-6 py-32 text-center">
          <div className="flex justify-center mb-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#FFD208]/20 bg-[#FFD208]/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FFD208] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD208] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD208]"></span>
              </span>
              Powered by Zama FHE
            </p>
          </div>

          <h1 className="mt-4 text-6xl font-black leading-[1.1] tracking-tighter md:text-8xl">
            The Future of
            <br />
            <span className="bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              Private Trust.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg text-gray-400 font-medium">
            Confidential Credit Score Engine is the first Web3-native bureau that computes
            <span className="text-white"> encrypted creditworthiness </span>
            without ever seeing your bank balance.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {!isConnected ? (
              <RainbowKitCustomConnectButton />
            ) : (
              <Link
                href="/borrower"
                className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-[#FFD208] px-8 py-4 text-sm font-bold text-black transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">Get Your Score</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </Link>
            )}
            <Link
              href="/lender"
              className="rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/10"
            >
              Lender Portal
            </Link>
          </div>
        </section>

        {/* ── Technical visualization ────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold tracking-tight">
                Privacy is no longer
                <br />
                <span className="text-[#FFD208]">an option. It&apos;s the standard.</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Traditional credit scoring forces you to leak your entire financial life to central authorities. With{" "}
                <strong>Fully Homomorphic Encryption (FHE)</strong>, we perform math on ciphertexts. Your raw data stays
                on your machine; only the <em>encrypted result</em> moves.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                  <div className="text-2xl mb-2">🔒</div>
                  <h4 className="font-bold text-white text-sm">End-to-End Encryption</h4>
                  <p className="text-xs text-gray-500 mt-1">Data is never decrypted on any server.</p>
                </div>
                <div className="p-4 rounded-2xl border border-white/5 bg-white/5">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-bold text-white text-sm">On-Chain Proofs</h4>
                  <p className="text-xs text-gray-500 mt-1">Verifiable math without data exposure.</p>
                </div>
              </div>
            </div>

            <div className="relative aspect-square max-w-md mx-auto w-full group">
              <div className="absolute inset-0 bg-[#FFD208]/20 rounded-full blur-[100px] group-hover:bg-[#FFD208]/30 transition-all" />
              <div className="relative h-full w-full rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 flex flex-col justify-center overflow-hidden">
                {/* Simulated Ciphertext Stream */}
                <div className="space-y-3 font-mono text-[10px] text-[#FFD208]/40">
                  <p className="animate-pulse">0x84f...921: ENC_PAYMENT_HISTORY (32.4s ago)</p>
                  <p>0xa12...ef0: COMPUTE_WEIGHTED_SUM (Running...)</p>
                  <p className="text-white/60">0x551...33b: OUTPUT_SCORE_HANDLE (Ready)</p>
                </div>

                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#FFD208]/30 animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl">🔐</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Encrypted State</p>
                  <p className="text-xl font-mono mt-1 text-[#FFD208]">0x...8F72A</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Connected dashboard ───────────────────────────────────── */}
        {isConnected && (
          <section className="mx-auto max-w-6xl px-6 pb-32">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">Your Dashboard</h2>
                <p className="text-gray-500 mt-1">Real-time status of your confidential score</p>
              </div>
              <div className="hidden sm:block rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[10px] text-gray-400">
                <span className="text-[#FFD208]">Address:</span> {address?.slice(0, 6)}…{address?.slice(-4)}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatTile
                icon="📋"
                label="Factors submitted"
                value={borrowerHasSubmitted ? "Verified ✓" : "Required"}
                highlight={borrowerHasSubmitted}
              />
              <StatTile
                icon="🔒"
                label="Score handle"
                value={myScoreHandle ? myScoreHandle.slice(0, 10) + "…" : "Pending"}
                highlight={Boolean(myScoreHandle)}
              />
              <StatTile
                icon="📊"
                label="Decrypted score"
                value={scoreNum !== null ? String(scoreNum) : "Locked"}
                valueClass={scoreColor}
                highlight={scoreNum !== null}
              />
              <StatTile
                icon="📈"
                label="Score grade"
                value={
                  scoreNum === null
                    ? "Unknown"
                    : scoreNum >= 8500
                      ? "Elite"
                      : scoreNum >= 7000
                        ? "Prime"
                        : scoreNum >= 5000
                          ? "Standard"
                          : "Subprime"
                }
                highlight={scoreNum !== null}
              />
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/borrower"
                className="rounded-2xl bg-white px-8 py-4 text-sm font-bold text-black transition hover:bg-gray-200"
              >
                {borrowerHasSubmitted ? "Refresh Data" : "Begin Submission"}
              </Link>
              <Link
                href="/authorize"
                className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Lender Management
              </Link>
            </div>
          </section>
        )}

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 bg-black px-6 py-20">
          <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="col-span-1 lg:col-span-2">
              <h3 className="text-xl font-bold bg-gradient-to-r from-[#FFD208] to-amber-500 bg-clip-text text-transparent">
                Confidential Credit Engine
              </h3>
              <p className="mt-4 text-gray-500 max-w-sm">
                Built for the Zama Builder Track 2026. Leveraging TFHE-rs to bring institutional-grade privacy to
                decentralized finance.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-4">Technology</h4>
              <ul className="text-gray-500 text-sm space-y-2">
                <li>fhevm-solidity 0.11.1</li>
                <li>TFHE-rs Precompiles</li>
                <li>ZK-Input Proofs</li>
                <li>Sepolia Testnet</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-4">Links</h4>
              <ul className="text-gray-500 text-sm space-y-2">
                <li>
                  <Link href="/borrower" className="hover:text-white">
                    Borrower Portal
                  </Link>
                </li>
                <li>
                  <Link href="/lender" className="hover:text-white">
                    Lender Portal
                  </Link>
                </li>
                <li>
                  <Link href="/authorize" className="hover:text-white">
                    Authorizations
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto max-w-6xl mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-600 font-mono">DEV3_VERSION_1.0.4_BUILDER_TRACK</p>
            <div className="flex gap-6 text-gray-600">
              <div className="h-4 w-4 bg-[#FFD208]/20 rounded-sm" />
              <div className="h-4 w-4 bg-[#FFD208]/40 rounded-sm" />
              <div className="h-4 w-4 bg-[#FFD208]/60 rounded-sm" />
              <div className="h-4 w-4 bg-[#FFD208]/80 rounded-sm" />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  valueClass,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`relative group rounded-3xl border p-6 transition-all duration-300 ${
        highlight
          ? "border-[#FFD208]/30 bg-[#FFD208]/5 shadow-[0_0_20px_rgba(255,210,8,0.05)]"
          : "border-white/5 bg-white/2 hover:border-white/10"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{icon}</span>
        {highlight && <div className="h-2 w-2 rounded-full bg-[#FFD208] animate-pulse" />}
      </div>
      <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${valueClass ?? "text-white"}`}>{value}</p>

      {/* Decorative hover effect */}
      <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-1 w-8 bg-[#FFD208]/20 rounded-full" />
      </div>
    </div>
  );
}
