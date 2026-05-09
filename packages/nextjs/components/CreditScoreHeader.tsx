"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";

const NAV = [
  { href: "/",          label: "Dashboard" },
  { href: "/borrower",  label: "Borrower"  },
  { href: "/authorize", label: "Authorize" },
  { href: "/lender",    label: "Lender"    },
];

export function CreditScoreHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D0D]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <span className="font-extrabold text-white text-sm hidden sm:block">
            Credit<span className="text-[#FFD208]">Score</span>
            <span className="ml-1 text-xs font-normal text-gray-500">by Zama FHE</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === n.href
                  ? "bg-[#FFD208]/10 text-[#FFD208]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <RainbowKitCustomConnectButton />
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden border-t border-white/5 px-4 pb-2 pt-1 gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition ${
              pathname === n.href
                ? "bg-[#FFD208]/10 text-[#FFD208]"
                : "text-gray-500 hover:text-white"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
