"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIONS, CURRENCY, CURRENCY_SYMBOL, ITEMS, NEED_META, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import type { Character, HouseholdView, NeedKey, StateSnapshot } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn, shortAccount, timeAgo } from "@/lib/utils";

export type AppId = "jobs" | "market" | "sell" | "bag" | "feed" | "neighbors" | "make" | "wallet" | "leaders" | "about";

const APPS: Array<{ id: AppId; label: string; emoji: string; color: string }> = [
  { id: "jobs", label: "Jobs", emoji: "💼", color: "#00ec97" },
  { id: "market", label: "Market", emoji: "🛒", color: "#fbbf24" },
  { id: "sell", label: "Sell", emoji: "🏷️", color: "#f472b6" },
  { id: "make", label: "Make", emoji: "🍳", color: "#fb923c" },
  { id: "bag", label: "Bag", emoji: "🎒", color: "#facc15" },
  { id: "neighbors", label: "Neighbors", emoji: "🏘️", color: "#22d3ee" },
  { id: "leaders", label: "Leaders", emoji: "🏆", color: "#a78bfa" },
  { id: "feed", label: "Feed", emoji: "📡", color: "#60a5fa" },
  { id: "wallet", label: "Wallet", emoji: "◈", color: "#00ec97" },
  { id: "about", label: "About", emoji: "ℹ️", color: "#94a3b8" },
];

type Act = <T = unknown>(path: string, body?: unknown, method?: "POST" | "DELETE") => Promise<T | null>;

interface Props {
  snapshot: StateSnapshot;
  me: HouseholdView | null;
  character: Character | null;
  now: number;
  app: AppId | "home";
  setApp: (a: AppId | "home") => void;
  act: Act;
  toast: (t: string, k?: "info" | "error" | "success") => void;
  onVisit: (id: string) => void;
  onClose: () => void;
  onSignOut: () => void;
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.05] p-3 text-slate-200", className)}>{children}</div>;
}

function Btn({ children, onClick, disabled, tone = "neon" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "neon" | "ghost" | "red" }) {
  const tones = {
    neon: "btn-neon",
    ghost: "bg-white/10 text-slate-200",
    red: "bg-rose-500/15 text-rose-300",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-35", tones[tone])}
    >
      {children}
    </button>
  );
}

function Effects({ itemId }: { itemId: string }) {
  const item = ITEMS[itemId];
  if (item.furniture) return <span className="text-[11px] text-slate-400">{item.description}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {Object.entries(item.effects ?? {}).map(([k, v]) => (
        <span key={k} className="rounded-md bg-[#00ec97]/10 px-1.5 text-[11px] text-[#00ec97]">
          {NEED_META[k as NeedKey].emoji}+{v}
        </span>
      ))}
    </span>
  );
}

function JobsApp({ snapshot, me, now, act, toast }: Props) {
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot.worldEvent?.id);
  if (!me) return <Row>Move in first.</Row>;
  return (
    <div className="space-y-2">
      {ev?.workPay && <Row className="border-amber-300/30 bg-amber-300/10 text-amber-200">💰 Payday! Shifts pay {ev.workPay}× right now.</Row>}
      {me.characters.map((c) => {
        const busy = c.busy && c.busy.until > now ? c.busy : null;
        return (
          <Row key={c.id}>
            <span className="text-2xl">{c.avatar}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">{c.name}</div>
              <div className="text-xs text-slate-400">{busy ? `${busy.label}… ${Math.ceil((busy.until - now) / 1000)}s` : "Available"}</div>
            </div>
            <Btn
              disabled={!!busy}
              onClick={async () => {
                const ok = await act("/api/action", { characterId: c.id, action: "work" });
                if (ok) toast(`${c.name} went to work 💼`, "success");
              }}
            >
              Shift
            </Btn>
          </Row>
        );
      })}
      <p className="px-1 text-xs text-slate-400">
        A shift takes {ACTIONS.work.durationSec}s and pays ~{ACTIONS.work.pay} {CURRENCY_SYMBOL} (less when your Sim is unhappy), minted to your NEAR account as a NEP-245 token.
      </p>
    </div>
  );
}

function MarketApp({ snapshot, me, act, toast }: Props) {
  const [need, setNeed] = useState<NeedKey | "all" | "furniture">("all");
  const byId = new Map(snapshot.households.map((h) => [h.id, h]));
  const list = snapshot.listings
    .filter((l) => {
      const it = ITEMS[l.itemId];
      if (need === "all") return true;
      if (need === "furniture") return Boolean(it.furniture);
      return (it.effects?.[need] ?? 0) > 0;
    })
    .sort((a, b) => a.price - b.price);
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {(["all", ...NEED_KEYS, "furniture"] as const).map((n) => (
          <button
            key={n}
            onClick={() => setNeed(n)}
            className={cn("shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold", need === n ? "bg-white text-slate-900" : "bg-white/10 text-slate-300")}
          >
            {n === "all" ? "All" : n === "furniture" ? "🛋️ Furniture" : `${NEED_META[n].emoji} ${NEED_META[n].label}`}
          </button>
        ))}
      </div>
      {list.length === 0 && <Row className="text-sm">No listings yet. Be the first: make something and list it in 🏷️ Sell.</Row>}
      {list.map((l) => {
        const it = ITEMS[l.itemId];
        const seller = byId.get(l.sellerHouseholdId);
        const mine = l.sellerHouseholdId === me?.id;
        return (
          <Row key={l.id}>
            <span className="text-3xl">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">
                {it.name} <span className="text-xs font-medium text-slate-500">×{l.quantity}</span>
              </div>
              <div className="truncate text-xs text-slate-400">by {seller?.name ?? "a former neighbor"}</div>
              <Effects itemId={l.itemId} />
            </div>
            {mine ? (
              <Btn tone="ghost" onClick={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}>
                Cancel
              </Btn>
            ) : (
              <Btn
                disabled={!me || me.balance < l.price}
                onClick={async () => {
                  const ok = await act("/api/buy", { listingId: l.id });
                  if (ok) toast(`Bought ${it.name}. Check your Bag${it.furniture ? " or Build → Stored" : ""}.`, "success");
                }}
              >
                {l.price} {CURRENCY_SYMBOL}
              </Btn>
            )}
          </Row>
        );
      })}
    </div>
  );
}

function SellApp({ snapshot, me, act, toast }: Props) {
  const sellable = useMemo(
    () =>
      me
        ? Object.entries(me.inventory)
            .map(([id, q]) => [id, ITEMS[id]?.furniture ? q - placedCount(me.layout, id) : q] as const)
            .filter(([id, q]) => q > 0 && ITEMS[id])
        : [],
    [me],
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  if (!me) return null;
  const mine = snapshot.listings.filter((l) => l.sellerHouseholdId === me.id);
  const cheapest = (itemId: string) => {
    const others = snapshot.listings.filter((l) => l.itemId === itemId && l.sellerHouseholdId !== me.id).map((l) => l.price);
    return others.length ? Math.min(...others) : null;
  };
  return (
    <div className="space-y-2">
      <div className="px-1 font-mono text-[11px] font-bold tracking-widest text-slate-500">YOUR STUFF</div>
      {sellable.length === 0 && <Row className="text-sm">Nothing to sell yet. Use 🍳 Make, or put furniture in storage from Build mode.</Row>}
      {sellable.map(([id, q]) => {
        const it = ITEMS[id];
        const c = cheapest(id);
        const price = prices[id] ?? Math.max(1, (c ?? it.basePrice) - 1);
        return (
          <Row key={id} className="flex-wrap">
            <span className="text-3xl">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">
                {it.name} <span className="text-xs text-slate-500">×{q}</span>
              </div>
              <div className="text-[11px] text-slate-400">{c !== null ? `Cheapest listed: ${c} ${CURRENCY_SYMBOL}` : `Suggested ${it.basePrice} ${CURRENCY_SYMBOL}`}</div>
            </div>
            <input
              type="number"
              min={1}
              max={500}
              value={price}
              onChange={(e) => setPrices({ ...prices, [id]: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-sm text-white"
            />
            <Btn
              onClick={async () => {
                const ok = await act("/api/listing", { itemId: id, quantity: q, price });
                if (ok) toast(`Listed ${q}× ${it.name} at ${price} ${CURRENCY_SYMBOL}`, "success");
              }}
            >
              List
            </Btn>
          </Row>
        );
      })}
      <div className="px-1 pt-2 font-mono text-[11px] font-bold tracking-widest text-slate-500">LIVE LISTINGS ({mine.length})</div>
      {mine.map((l) => (
        <Row key={l.id}>
          <span className="text-2xl">{ITEMS[l.itemId].emoji}</span>
          <div className="flex-1 text-sm">
            <b className="text-white">{ITEMS[l.itemId].name}</b> ×{l.quantity} @ {l.price} {CURRENCY_SYMBOL}
            {l.initialQuantity > l.quantity && <span className="text-[#00ec97]"> · {l.initialQuantity - l.quantity} sold</span>}
          </div>
          <Btn tone="ghost" onClick={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}>
            Cancel
          </Btn>
        </Row>
      ))}
    </div>
  );
}

function BagApp({ me, character, now, act }: Props) {
  if (!me) return null;
  const usable = Object.entries(me.inventory).filter(([id, q]) => q > 0 && ITEMS[id]?.effects);
  const busy = character?.busy && character.busy.until > now;
  return (
    <div className="space-y-2">
      {usable.length === 0 && <Row className="text-sm">Empty. Buy meals, espresso, party invites or spa sessions on the Market, or make your own.</Row>}
      {usable.map(([id, q]) => (
        <Row key={id}>
          <span className="text-3xl">{ITEMS[id].emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white">
              {ITEMS[id].name} <span className="text-xs text-slate-500">×{q}</span>
            </div>
            <Effects itemId={id} />
          </div>
          <Btn disabled={!character || !!busy} onClick={() => act("/api/use", { characterId: character!.id, itemId: id })}>
            Use
          </Btn>
        </Row>
      ))}
    </div>
  );
}

function MakeApp({ me, character, now, act, toast }: Props) {
  if (!me) return null;
  const busy = character?.busy && character.busy.until > now;
  const make = Object.values(ACTIONS).filter((a) => a.category === "produce");
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-slate-400">Make things, then list them in 🏷️ Sell. Each one needs the right furniture at home.</p>
      {make.map((a) => {
        const has = !a.requires || me.layout.some((p) => ITEMS[p.itemId]?.furniture?.tag === a.requires);
        const furn = Object.values(ITEMS).find((i) => i.furniture?.tag === a.requires);
        return (
          <Row key={a.id}>
            <span className="text-3xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">{a.label}</div>
              <div className="text-[11px] text-slate-400">{has ? a.help : `Needs a ${furn?.name} (Build mode)`}</div>
            </div>
            <Btn
              disabled={!has || !character || !!busy || me.balance < a.cost}
              onClick={async () => {
                const ok = await act("/api/action", { characterId: character!.id, action: a.id });
                if (ok) toast(`${character!.name} is ${a.verb}`, "success");
              }}
            >
              {a.cost ? `${a.cost} ${CURRENCY_SYMBOL}` : "Go"}
            </Btn>
          </Row>
        );
      })}
    </div>
  );
}

function FeedApp({ snapshot, me, now }: Props) {
  return (
    <div className="space-y-1.5">
      {snapshot.activity.slice(0, 50).map((a) => {
        const mine = me && (a.householdId === me.id || a.counterpartyHouseholdId === me.id);
        return (
          <div key={a.id} className={cn("flex gap-2.5 rounded-2xl border px-3 py-2 text-sm", mine ? "border-[#00ec97]/30 bg-[#00ec97]/10" : "border-white/5 bg-white/[0.04]")}>
            <span className="text-xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="leading-snug text-slate-100">{a.text}</div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-500">{timeAgo(a.ts, now)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NeighborsApp({ snapshot, me, now, onVisit }: Props) {
  if (snapshot.households.length <= 1) return <Row className="text-sm">You&apos;re the first one here. Share the link with friends so they can move in next door.</Row>;
  return (
    <div className="space-y-2">
      {snapshot.households.map((h) => {
        const online = now - h.lastActive < 60_000;
        return (
          <Row key={h.id}>
            <span className="relative text-2xl">
              🏠
              <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-slate-900", online ? "bg-[#00ec97]" : "bg-slate-600")} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-white">
                {h.name} {h.id === me?.id && <span className="text-xs text-[#00ec97]">(you)</span>}
              </div>
              <div className="truncate text-xs text-slate-400">
                {online ? "online now" : `seen ${timeAgo(h.lastActive, now)}`} · {h.characters.length} Sim{h.characters.length === 1 ? "" : "s"} · {h.activeListings} listings
              </div>
            </div>
            {h.id !== me?.id && (
              <Btn tone="ghost" onClick={() => onVisit(h.id)}>
                Visit
              </Btn>
            )}
          </Row>
        );
      })}
    </div>
  );
}

function LeadersApp({ snapshot, me }: Props) {
  const ranked = [...snapshot.households]
    .map((h) => {
      const furnitureValue = h.layout.reduce((s, p) => s + (ITEMS[p.itemId]?.furniture?.storePrice ?? 0), 0);
      return { h, worth: h.balance + furnitureValue };
    })
    .sort((a, b) => b.worth - a.worth);
  return (
    <div className="space-y-2">
      <Row className="justify-between text-xs text-slate-400">
        <span>
          {snapshot.stats.trades} trades · {snapshot.stats.volume} {CURRENCY_SYMBOL} volume
        </span>
        <span>net worth = SB + furniture</span>
      </Row>
      {ranked.map(({ h, worth }, i) => (
        <Row key={h.id} className={h.id === me?.id ? "neon-ring" : undefined}>
          <span className={cn("w-7 text-center font-mono text-lg font-black", i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-500")}>
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-white">{h.name}</div>
            <div className="text-xs text-slate-400">
              {h.layout.length} pieces of furniture · mood {h.mood}
            </div>
          </div>
          <span className="font-mono font-bold text-[#00ec97]">{worth.toLocaleString()}</span>
        </Row>
      ))}
    </div>
  );
}

function WalletApp({ me, now, act, toast }: Props) {
  const [events, setEvents] = useState<Array<{ seq: number; ts: number; log: string; event: { event: string } }>>([]);
  const [near, setNear] = useState<{ near?: string; exists?: boolean; error?: string; explorer?: string } | null>(null);
  useEffect(() => {
    if (!me) return;
    fetch("/api/nep245?method=events&limit=100")
      .then((r) => r.json())
      .then((d) => setEvents((d.events ?? []).filter((e: { log: string }) => e.log.includes(me.accountId)).slice(0, 12)))
      .catch(() => {});
    fetch(`/api/near/balance?account_id=${me.accountId}`)
      .then((r) => r.json())
      .then(setNear)
      .catch(() => {});
  }, [me?.accountId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return null;
  const cooldown = Math.max(0, (me.lastTopup ?? 0) + 5 * 60_000 - now);
  return (
    <div className="space-y-2">
      <Row className="neon-ring flex-col items-start bg-gradient-to-br from-[#00ec97]/15 to-[#a78bfa]/10">
        <div className="font-mono text-[10px] tracking-widest text-slate-400">SIMBUCKS · NEP-245</div>
        <div className="font-mono text-3xl font-black text-white">
          {me.balance.toLocaleString()} <span className="text-base text-slate-400">{CURRENCY_SYMBOL}</span>
        </div>
        <div className="text-[11px] break-all text-slate-400">
          {me.accountSource === "privy" ? "Privy embedded NEAR wallet" : "NEAR implicit account"} {shortAccount(me.accountId)} ·{" "}
          {near?.explorer ? (
            <a href={near.explorer} target="_blank" rel="noreferrer" className="text-[#00ec97] underline">
              {near.error ? "explorer" : near.exists ? `${near.near} NEAR` : "not funded yet"} ↗
            </a>
          ) : (
            "…"
          )}
        </div>
        <Btn
          disabled={cooldown > 0}
          onClick={async () => {
            const r = await act<{ amount: number }>("/api/topup");
            if (r) toast(`+${r.amount} ${CURRENCY_SYMBOL} from the testnet faucet`, "success");
          }}
        >
          {cooldown > 0 ? `Faucet in ${Math.ceil(cooldown / 60000)}m` : `+100 ${CURRENCY_SYMBOL} testnet faucet`}
        </Btn>
      </Row>
      <div className="px-1 font-mono text-[11px] font-bold tracking-widest text-slate-500">TOKENS</div>
      <Row className="flex-wrap gap-2">
        {Object.entries({ [CURRENCY]: me.balance, ...me.inventory }).map(([id, q]) => (
          <span key={id} className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs">
            {ITEMS[id]?.emoji} {id} · {q}
          </span>
        ))}
      </Row>
      <div className="px-1 font-mono text-[11px] font-bold tracking-widest text-slate-500">NEP-245 EVENTS</div>
      {events.map((e) => (
        <Row key={e.seq} className="flex-col items-start gap-1">
          <div className="font-mono text-xs font-bold text-[#00ec97]">
            {e.event.event} · {timeAgo(e.ts, now)}
          </div>
          <code className="block w-full overflow-hidden text-[10px] break-all text-slate-500">{e.log.slice(0, 220)}</code>
        </Row>
      ))}
    </div>
  );
}

function AboutApp({ snapshot, onSignOut }: Props) {
  return (
    <div className="space-y-2 text-sm">
      <Row className="flex-col items-start">
        <div className="font-bold text-white">How to play</div>
        <ol className="list-decimal space-y-1 pl-4 text-slate-300">
          <li>Tap furniture to use it: sleep, shower, eat, cook…</li>
          <li>💼 Jobs → work shifts for SimBucks.</li>
          <li>🍳 Make → cook meals, brew coffee, plan parties.</li>
          <li>🏷️ Sell → list them for other players to buy.</li>
          <li>🛠 Build → furnish your home to unlock more ways to earn.</li>
          <li>🌆 City → visit neighbors and see what everyone is up to.</li>
        </ol>
      </Row>
      <Row className="flex-col items-start">
        <div className="font-bold text-white">On NEAR</div>
        <ul className="list-disc space-y-1 pl-4 text-slate-300">
          <li>Social login (Privy). A NEAR account is created for you, with no wallet popups.</li>
          <li>SimBucks, food, services and furniture are NEP-245 multi-tokens.</li>
          <li>Every trade is a pair of NEP-245 transfers between real players.</li>
        </ul>
        <div className="font-mono text-[10px] text-slate-500">
          auth {snapshot.config.auth} · state {snapshot.config.storage} · nep245 {snapshot.config.settlement} · {snapshot.config.network}
        </div>
      </Row>
      <Btn tone="red" onClick={onSignOut}>
        Sign out
      </Btn>
    </div>
  );
}

const SCREENS: Record<AppId, (p: Props) => ReactNode> = {
  jobs: JobsApp,
  market: MarketApp,
  sell: SellApp,
  bag: BagApp,
  feed: FeedApp,
  neighbors: NeighborsApp,
  make: MakeApp,
  wallet: WalletApp,
  leaders: LeadersApp,
  about: AboutApp,
};

/** The NEAR Pad: a dark handheld with the game's apps. */
export function Phone(props: Props) {
  const { app, setApp, now, onClose, character, me, act, toast } = props;
  const clock = gameClock(now);
  const meta = APPS.find((a) => a.id === app);
  const Screen = app !== "home" ? SCREENS[app] : null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center bg-black/55 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div className="phone-in relative w-full max-w-[420px] rounded-[30px] border border-white/10 bg-[#0a0c18] p-2 shadow-[0_0_60px_rgba(0,236,151,0.15)]">
        <div className="relative flex h-[min(80vh,720px)] flex-col overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_top,#1b2148,#0b0d1a_60%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative flex items-center gap-2 px-4 pt-3 pb-2">
            {app === "home" ? (
              <span className="font-mono text-xs font-bold tracking-[0.25em] text-[#00ec97]">NEAR PAD</span>
            ) : (
              <>
                <button onClick={() => setApp("home")} className="cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-sm font-semibold text-slate-200">
                  ‹
                </button>
                <span className="text-lg font-extrabold text-white">{meta?.label}</span>
              </>
            )}
            <span className="ml-auto font-mono text-xs text-slate-400">
              {clock.hour % 12 || 12}:{String(clock.minute).padStart(2, "0")}
              {clock.hour < 12 ? "am" : "pm"}
            </span>
            <button onClick={onClose} aria-label="Close" className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-slate-300">
              ✕
            </button>
          </div>

          {app === "home" ? (
            <div className="relative flex flex-1 flex-col px-4 pb-4">
              {me && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-xs text-slate-400">{me.name}</div>
                  <div className="font-mono text-2xl font-black text-white">
                    {me.balance.toLocaleString()} <span className="text-sm text-[#00ec97]">{CURRENCY_SYMBOL}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {props.snapshot.listings.filter((l) => l.sellerHouseholdId === me.id).length} live listings · {props.snapshot.households.length} households in town
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {APPS.map((a) => (
                  <button key={a.id} onClick={() => setApp(a.id)} className="flex cursor-pointer flex-col items-center gap-1.5 active:scale-90">
                    <span
                      className="flex size-14 items-center justify-center rounded-2xl border bg-white/[0.04] text-2xl"
                      style={{ borderColor: `${a.color}66`, boxShadow: `0 0 16px ${a.color}33, inset 0 0 12px ${a.color}1a`, color: a.color }}
                    >
                      {a.emoji}
                    </span>
                    <span className="text-[11px] font-medium text-slate-300">{a.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={async () => {
                  if (!character || !me) return;
                  const ok = await act("/api/action", { characterId: character.id, action: "socialize" });
                  if (ok) toast(`📞 ${character.name} is calling a neighbor`, "success");
                }}
                className="mt-auto flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#00ec97]/40 bg-[#00ec97]/10 py-3 font-semibold text-[#00ec97]"
              >
                📞 Call a neighbor {character ? `as ${character.name}` : ""}
              </button>
            </div>
          ) : (
            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-6">{Screen && <Screen {...props} />}</div>
          )}
        </div>
      </div>
    </div>
  );
}
