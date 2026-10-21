"use client";

import { CURRENCY_SYMBOL } from "@/lib/catalog";
import type { HouseholdView } from "@/lib/types";
import { shortAccount } from "@/lib/utils";
import { Sheet } from "./Sheet";

export function TopUpSheet({
  household,
  now,
  onFaucet,
  onOpen,
  onHide,
}: {
  household: HouseholdView;
  now: number;
  onFaucet: () => void;
  onOpen: (app: "jobs" | "make" | "sell" | "wallet") => void;
  onHide: () => void;
}) {
  const cooldown = Math.max(0, (household.lastTopup ?? 0) + 5 * 60_000 - now);
  const ways = [
    { emoji: "💼", title: "Work a shift", sub: `~24 ${CURRENCY_SYMBOL} per shift, more on Payday`, app: "jobs" as const },
    { emoji: "🍳", title: "Make things", sub: "Cook, brew, plan parties, craft furniture", app: "make" as const },
    { emoji: "🏷️", title: "Sell to neighbors", sub: "Other players pay you directly in SimBucks", app: "sell" as const },
  ];
  return (
    <Sheet title="Wallet" icon="◈" subtitle={`${household.balance.toLocaleString()} ${CURRENCY_SYMBOL} · NEP-245`} onClose={onHide}>
      <div className="space-y-2.5 pb-2">
        <button
          disabled={cooldown > 0}
          onClick={onFaucet}
          className="neon-ring flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-[#0d1b5e]/35 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-3xl">🚰</span>
          <span className="flex-1">
            <span className="block font-bold text-white">+100 {CURRENCY_SYMBOL} testnet faucet</span>
            <span className="block text-sm text-slate-400">Free while NEARLIFE runs on testnet. Once every 5 min.</span>
          </span>
          <span className="btn-neon rounded-xl px-3 py-2 font-mono font-bold">{cooldown > 0 ? `${Math.ceil(cooldown / 60000)}m` : "Claim"}</span>
        </button>
        {ways.map((w) => (
          <button key={w.title} onClick={() => onOpen(w.app)} className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-white/[0.04] p-4 text-left">
            <span className="text-3xl">{w.emoji}</span>
            <span className="flex-1">
              <span className="block font-bold text-white">{w.title}</span>
              <span className="block text-sm text-slate-400">{w.sub}</span>
            </span>
            <span className="text-slate-500">›</span>
          </button>
        ))}
        <button onClick={() => onOpen("wallet")} className="w-full cursor-pointer rounded-2xl border border-white/10 p-3 text-left text-sm text-slate-400">
          SimBucks is a NEP-245 token held by your NEAR account <code className="text-[#ffd23f]">{shortAccount(household.accountId)}</code>. Open token wallet ›
        </button>
      </div>
    </Sheet>
  );
}
