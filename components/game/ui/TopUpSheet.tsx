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
    { emoji: "🍳", title: "Make & sell", sub: "Cook, brew, plan parties: NPCs buy them", app: "make" as const },
    { emoji: "🏷️", title: "List on the market", sub: "Players and NPC agents pay you directly", app: "sell" as const },
  ];
  return (
    <Sheet title="Top up wallet" icon="💳" subtitle={`Balance ${household.balance.toLocaleString()} ${CURRENCY_SYMBOL}`} onClose={onHide}>
      <div className="space-y-3 pb-2">
        <button
          disabled={cooldown > 0}
          onClick={onFaucet}
          className="flex w-full cursor-pointer items-center gap-4 rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-4 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-4xl">🚰</span>
          <span className="flex-1">
            <span className="block text-lg font-bold">+100 {CURRENCY_SYMBOL} testnet faucet</span>
            <span className="block text-sm text-slate-500">Free while NEARLIFE runs on testnet. Once every 5 min.</span>
          </span>
          <span className="rounded-full bg-slate-900 px-4 py-2 font-bold text-white">{cooldown > 0 ? `${Math.ceil(cooldown / 60000)}m` : "Claim"}</span>
        </button>
        {ways.map((w) => (
          <button key={w.title} onClick={() => onOpen(w.app)} className="flex w-full cursor-pointer items-center gap-4 rounded-3xl bg-slate-50 p-4 text-left">
            <span className="text-4xl">{w.emoji}</span>
            <span className="flex-1">
              <span className="block text-lg font-bold">{w.title}</span>
              <span className="block text-sm text-slate-500">{w.sub}</span>
            </span>
            <span className="text-slate-400">›</span>
          </button>
        ))}
        <button onClick={() => onOpen("wallet")} className="w-full cursor-pointer rounded-2xl bg-slate-900 p-3 text-left text-sm text-slate-200">
          🪙 SimBucks is a NEP-245 token held by your NEAR account <code className="text-white">{shortAccount(household.accountId)}</code>. Open Wallet ›
        </button>
      </div>
    </Sheet>
  );
}
