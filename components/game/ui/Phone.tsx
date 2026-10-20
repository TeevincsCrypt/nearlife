"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIONS, CURRENCY, CURRENCY_SYMBOL, ITEMS, NEED_META, ROLE_LABEL, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import type { Character, HouseholdView, NeedKey, StateSnapshot } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn, shortAccount, timeAgo } from "@/lib/utils";

export type AppId = "jobs" | "market" | "sell" | "bag" | "feed" | "neighbors" | "make" | "wallet" | "agents" | "about";

const APPS: Array<{ id: AppId; label: string; emoji: string; bg: string }> = [
  { id: "jobs", label: "Jobs", emoji: "💼", bg: "from-emerald-500 to-green-600" },
  { id: "market", label: "Market", emoji: "🛒", bg: "from-orange-400 to-amber-500" },
  { id: "sell", label: "Sell", emoji: "🏷️", bg: "from-pink-500 to-rose-500" },
  { id: "make", label: "Make", emoji: "🍳", bg: "from-red-500 to-orange-500" },
  { id: "bag", label: "Bag", emoji: "🎒", bg: "from-yellow-400 to-amber-500" },
  { id: "neighbors", label: "Neighbors", emoji: "🏘️", bg: "from-teal-400 to-cyan-600" },
  { id: "agents", label: "Agents", emoji: "🤖", bg: "from-violet-500 to-indigo-600" },
  { id: "about", label: "NEARLIFE", emoji: "ℹ️", bg: "from-slate-600 to-slate-800" },
];
const DOCK: Array<{ id: AppId | "call"; emoji: string; bg: string }> = [
  { id: "call", emoji: "📞", bg: "from-green-400 to-emerald-500" },
  { id: "feed", emoji: "💬", bg: "from-sky-400 to-blue-600" },
  { id: "wallet", emoji: "🪙", bg: "from-amber-300 to-yellow-500" },
  { id: "market", emoji: "🛒", bg: "from-orange-400 to-amber-500" },
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
  onNpcTick: () => void;
  onSignOut: () => void;
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-3 rounded-2xl bg-white/90 p-3 text-slate-800", className)}>{children}</div>;
}

function Btn({ children, onClick, disabled, tone = "green" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "green" | "dark" | "light" | "red" }) {
  const tones = {
    green: "bg-emerald-500 text-white",
    dark: "bg-slate-900 text-white",
    light: "bg-slate-100 text-slate-700",
    red: "bg-rose-100 text-rose-700",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-bold active:scale-95 disabled:cursor-not-allowed disabled:opacity-40", tones[tone])}
    >
      {children}
    </button>
  );
}

function Effects({ itemId }: { itemId: string }) {
  const item = ITEMS[itemId];
  if (item.furniture) return <span className="text-[11px] text-slate-500">{item.description}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {Object.entries(item.effects ?? {}).map(([k, v]) => (
        <span key={k} className="rounded bg-emerald-50 px-1.5 text-[11px] text-emerald-700">
          {NEED_META[k as NeedKey].emoji}+{v}
        </span>
      ))}
    </span>
  );
}

function JobsApp({ snapshot, me, now, act, toast }: Props) {
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot.worldEvent?.id);
  if (!me) return <p className="text-white">Create a household first.</p>;
  return (
    <div className="space-y-2">
      {ev?.workPay && <Row className="bg-amber-100">💰 Payday! Shifts pay {ev.workPay}× right now.</Row>}
      {me.characters.map((c) => {
        const busy = c.busy && c.busy.until > now ? c.busy : null;
        return (
          <Row key={c.id}>
            <span className="text-2xl">{c.avatar}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{c.name}</div>
              <div className="text-xs text-slate-500">{busy ? `${busy.label}… ${Math.ceil((busy.until - now) / 1000)}s` : "Available"}</div>
            </div>
            <Btn
              disabled={!!busy}
              onClick={async () => {
                const ok = await act("/api/action", { characterId: c.id, action: "work" });
                if (ok) toast(`${c.name} went to work 💼`, "success");
              }}
            >
              Office shift
            </Btn>
          </Row>
        );
      })}
      <p className="px-1 text-xs text-white/80">
        A shift takes {ACTIONS.work.durationSec}s and pays ~{ACTIONS.work.pay} {CURRENCY_SYMBOL} (less when your Sim is unhappy). Pay is minted to your household&apos;s NEAR
        account as a NEP-245 token.
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
            className={cn("shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-bold", need === n ? "bg-white text-slate-900" : "bg-white/20 text-white")}
          >
            {n === "all" ? "All" : n === "furniture" ? "🛋️ Furniture" : `${NEED_META[n].emoji} ${NEED_META[n].label}`}
          </button>
        ))}
      </div>
      {list.length === 0 && <Row>Nothing listed right now. NPCs restock every few ticks.</Row>}
      {list.map((l) => {
        const it = ITEMS[l.itemId];
        const seller = byId.get(l.sellerHouseholdId);
        const mine = l.sellerHouseholdId === me?.id;
        return (
          <Row key={l.id}>
            <span className="text-3xl">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                {it.name} <span className="text-xs font-medium text-slate-400">×{l.quantity}</span>
              </div>
              <div className="truncate text-xs text-slate-500">
                {seller?.name ?? "?"} · {seller?.kind === "npc" ? "🤖 NPC" : "🧑 player"}
              </div>
              <Effects itemId={l.itemId} />
            </div>
            {mine ? (
              <Btn tone="light" onClick={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}>
                Cancel
              </Btn>
            ) : (
              <Btn
                disabled={!me || me.balance < l.price}
                onClick={async () => {
                  const ok = await act("/api/buy", { listingId: l.id });
                  if (ok) toast(`Bought ${it.name}. Check your Bag${it.furniture ? " / Buy mode → Stored" : ""}.`, "success");
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
      <div className="px-1 text-sm font-bold text-white">Your stuff</div>
      {sellable.length === 0 && (
        <Row className="text-sm">Nothing to sell yet. Use 🍳 Make (cook, brew, plan a party…) or put furniture in storage from Buy mode.</Row>
      )}
      {sellable.map(([id, q]) => {
        const it = ITEMS[id];
        const c = cheapest(id);
        const suggested = Math.max(1, (c ?? it.basePrice) - 1);
        const price = prices[id] ?? suggested;
        return (
          <Row key={id} className="flex-wrap">
            <span className="text-3xl">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                {it.name} <span className="text-xs text-slate-400">×{q}</span>
              </div>
              <div className="text-[11px] text-slate-500">{c !== null ? `Cheapest on market: ${c} ${CURRENCY_SYMBOL}` : `No competition · base ${it.basePrice} ${CURRENCY_SYMBOL}`}</div>
            </div>
            <input
              type="number"
              min={1}
              max={500}
              value={price}
              onChange={(e) => setPrices({ ...prices, [id]: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-full border border-slate-200 px-2 py-1 text-center text-sm"
            />
            <Btn
              onClick={async () => {
                const ok = await act("/api/listing", { itemId: id, quantity: q, price });
                if (ok) toast(`Listed ${q}× ${it.name} at ${price} ${CURRENCY_SYMBOL}. NPCs buy the cheapest listing when they need it.`, "success");
              }}
            >
              List all
            </Btn>
          </Row>
        );
      })}
      <div className="px-1 pt-2 text-sm font-bold text-white">Live listings ({mine.length})</div>
      {mine.map((l) => (
        <Row key={l.id}>
          <span className="text-2xl">{ITEMS[l.itemId].emoji}</span>
          <div className="flex-1 text-sm">
            <b>{ITEMS[l.itemId].name}</b> ×{l.quantity} @ {l.price} {CURRENCY_SYMBOL}
            {l.initialQuantity > l.quantity && <span className="text-emerald-600"> · {l.initialQuantity - l.quantity} sold</span>}
          </div>
          <Btn tone="light" onClick={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}>
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
      {usable.length === 0 && <Row className="text-sm">Your bag is empty. Buy meals, espresso, party invites or spa sessions on the Market.</Row>}
      {usable.map(([id, q]) => (
        <Row key={id}>
          <span className="text-3xl">{ITEMS[id].emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">
              {ITEMS[id].name} <span className="text-xs text-slate-400">×{q}</span>
            </div>
            <Effects itemId={id} />
          </div>
          <Btn disabled={!character || !!busy} onClick={() => act("/api/use", { characterId: character!.id, itemId: id })}>
            Use{character ? ` · ${character.name}` : ""}
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
      <p className="px-1 text-xs text-white/85">Make things, then list them in 🏷️ Sell. Each one needs the right furniture at home.</p>
      {make.map((a) => {
        const has = !a.requires || me.layout.some((p) => ITEMS[p.itemId]?.furniture?.tag === a.requires);
        const furn = Object.values(ITEMS).find((i) => i.furniture?.tag === a.requires);
        return (
          <Row key={a.id}>
            <span className="text-3xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{a.label}</div>
              <div className="text-[11px] text-slate-500">{has ? a.help : `Needs a ${furn?.name} (Buy mode)`}</div>
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
          <div key={a.id} className={cn("flex gap-2.5 rounded-2xl px-3 py-2 text-sm", mine ? "bg-amber-100 text-slate-800" : "bg-white/90 text-slate-800")}>
            <span className="text-xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="leading-snug">{a.text}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {timeAgo(a.ts, now)}
                {a.householdName && ` · ${a.isNpc ? "🤖" : "🧑"} ${a.householdName}`}
                {a.type === "purchase" && a.isNpc && a.counterpartyIsNpc === false && " · NPC bought from a player"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NeighborsApp({ snapshot, me, now, onVisit }: Props) {
  return (
    <div className="space-y-2">
      {snapshot.households.map((h) => {
        const online = h.kind === "npc" || now - h.lastActive < 60_000;
        return (
          <Row key={h.id}>
            <span className="relative text-2xl">
              {h.kind === "npc" ? "🤖" : "🏠"}
              <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-white", online ? "bg-emerald-500" : "bg-slate-300")} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">
                {h.name} {h.id === me?.id && <span className="text-xs text-amber-600">(you)</span>}
              </div>
              <div className="truncate text-xs text-slate-500">
                {h.kind === "npc" ? (h.role ? ROLE_LABEL[h.role] : "NPC") : online ? "online now" : `seen ${timeAgo(h.lastActive, now)}`} · {h.balance} {CURRENCY_SYMBOL} ·{" "}
                {h.activeListings} listings
              </div>
            </div>
            <Btn tone="dark" onClick={() => onVisit(h.id)}>
              Visit
            </Btn>
          </Row>
        );
      })}
    </div>
  );
}

function AgentsApp({ snapshot, now, onNpcTick }: Props) {
  const npcs = snapshot.households.filter((h) => h.kind === "npc");
  return (
    <div className="space-y-2">
      <Row className="flex-col items-stretch">
        <div className="text-sm">
          NPC households are autonomous agents with their own NEAR accounts. Every {Math.round(snapshot.config.npcTickMs / 1000)}s they check their needs and buy the cheapest
          listing that helps, from players too.
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tick #{snapshot.stats.tickCount} · {timeAgo(snapshot.stats.lastNpcTick, now)} · {snapshot.stats.npcBuysFromPlayers} buys from players
          </span>
          <Btn tone="dark" onClick={onNpcTick}>
            🤖 Run tick
          </Btn>
        </div>
      </Row>
      {npcs.flatMap((h) =>
        h.characters.map((c) => (
          <Row key={c.id} className="items-start">
            <span className="text-2xl">{c.avatar}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">
                {c.name} <span className="font-medium text-slate-400">· {h.name}</span>
              </div>
              <div className="text-xs text-violet-700">{c.thought ?? "Thinking…"}</div>
            </div>
          </Row>
        )),
      )}
    </div>
  );
}

function WalletApp({ me, now, act, toast }: Props) {
  const [events, setEvents] = useState<Array<{ seq: number; ts: number; log: string; event: { event: string; data: Array<Record<string, unknown>> } }>>([]);
  const [near, setNear] = useState<{ near?: string; exists?: boolean; error?: string; explorer?: string } | null>(null);
  useEffect(() => {
    if (!me) return;
    fetch("/api/nep245?method=events&limit=100")
      .then((r) => r.json())
      .then((d) =>
        setEvents(
          (d.events ?? []).filter((e: { log: string }) => e.log.includes(me.accountId)).slice(0, 12),
        ),
      )
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
      <Row className="flex-col items-start bg-gradient-to-br from-slate-900 to-slate-700 text-white">
        <div className="text-xs text-slate-300">SimBucks · NEP-245 token</div>
        <div className="text-3xl font-extrabold">
          {me.balance.toLocaleString()} {CURRENCY_SYMBOL}
        </div>
        <div className="text-[11px] break-all text-slate-300">NEAR account {shortAccount(me.accountId)}</div>
        <div className="text-[11px] text-slate-300">
          {me.accountSource === "privy" ? "Privy embedded NEAR wallet" : "Implicit NEAR account"} ·{" "}
          {near?.explorer ? (
            <a href={near.explorer} target="_blank" rel="noreferrer" className="underline">
              {near.error ? "explorer" : near.exists ? `${near.near} NEAR` : "not funded yet"} ↗
            </a>
          ) : (
            "…"
          )}
        </div>
        <Btn
          tone="green"
          disabled={cooldown > 0}
          onClick={async () => {
            const r = await act<{ amount: number }>("/api/topup");
            if (r) toast(`+${r.amount} ${CURRENCY_SYMBOL} from the testnet faucet`, "success");
          }}
        >
          {cooldown > 0 ? `Faucet in ${Math.ceil(cooldown / 60000)}m` : `+100 ${CURRENCY_SYMBOL} testnet faucet`}
        </Btn>
      </Row>
      <div className="px-1 text-sm font-bold text-white">Token balances</div>
      <Row className="flex-wrap gap-2">
        {Object.entries({ [CURRENCY]: me.balance, ...me.inventory }).map(([id, q]) => (
          <span key={id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
            {ITEMS[id]?.emoji} {id} · {q}
          </span>
        ))}
      </Row>
      <div className="px-1 text-sm font-bold text-white">Recent NEP-245 events</div>
      {events.map((e) => (
        <Row key={e.seq} className="flex-col items-start gap-1">
          <div className="text-xs font-bold">
            {e.event.event} · {timeAgo(e.ts, now)}
          </div>
          <code className="block w-full overflow-hidden text-[10px] break-all text-slate-500">{e.log.slice(0, 220)}</code>
        </Row>
      ))}
    </div>
  );
}

function AboutApp({ snapshot, onNpcTick, onSignOut }: Props) {
  return (
    <div className="space-y-2 text-sm">
      <Row className="flex-col items-start">
        <div className="font-bold">How to play</div>
        <ol className="list-decimal space-y-1 pl-4 text-slate-600">
          <li>Tap furniture to use it: sleep, shower, eat, cook…</li>
          <li>💼 Jobs → work shifts for SimBucks.</li>
          <li>🍳 Make → cook meals, brew coffee, plan parties.</li>
          <li>🏷️ Sell → list them. NPC agents and other players buy what they need.</li>
          <li>Buy furniture to unlock more ways to earn.</li>
          <li>🗺️ Map → visit neighbors and see what everyone is doing.</li>
        </ol>
      </Row>
      <Row className="flex-col items-start">
        <div className="font-bold">On NEAR</div>
        <ul className="list-disc space-y-1 pl-4 text-slate-600">
          <li>Social login (Privy). A NEAR account is made for you, with no wallet popups.</li>
          <li>SimBucks, food, services and furniture are NEP-245 multi-tokens.</li>
          <li>NPC households are agents with their own NEAR accounts that earn and spend.</li>
        </ul>
        <div className="text-xs text-slate-400">
          auth: {snapshot.config.auth} · state: {snapshot.config.storage} · NEP-245: {snapshot.config.settlement} · {snapshot.config.network}
        </div>
      </Row>
      <div className="flex gap-2">
        <Btn tone="dark" onClick={onNpcTick}>
          🤖 Run NPC tick
        </Btn>
        <Btn tone="red" onClick={onSignOut}>
          Sign out
        </Btn>
      </div>
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
  agents: AgentsApp,
  about: AboutApp,
};

export function Phone(props: Props) {
  const { app, setApp, now, onClose, character, me, act, toast } = props;
  const clock = gameClock(now);
  const night = clock.hour < 6 || clock.hour >= 19;
  const meta = APPS.find((a) => a.id === app) ?? (app === "feed" ? { label: "Messages" } : app === "wallet" ? { label: "Wallet" } : null);
  const Screen = app !== "home" ? SCREENS[app] : null;
  const newest = props.snapshot.activity.find((a) => a.type === "purchase");

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-end bg-slate-900/40 px-3 pb-3 backdrop-blur-[2px]">
      <button onClick={onClose} className="mb-3 cursor-pointer self-end rounded-full bg-white px-5 py-2.5 text-lg font-semibold shadow-lg">
        ✕ Close
      </button>
      <div className="phone-in w-full max-w-[400px] rounded-[54px] bg-slate-950 p-3 shadow-2xl">
        <div
          className={cn(
            "relative flex h-[min(72vh,700px)] flex-col overflow-hidden rounded-[44px]",
            night ? "bg-gradient-to-b from-indigo-950 via-violet-900 to-fuchsia-900" : "bg-gradient-to-b from-indigo-600 via-violet-600 to-orange-400",
          )}
        >
          <div className="flex items-center justify-between px-7 pt-3 text-sm font-semibold text-white">
            <span>
              {clock.hour % 12 || 12}:{String(clock.minute).padStart(2, "0")}
              {clock.hour < 12 ? "AM" : "PM"}
            </span>
            <span className="h-7 w-28 rounded-full bg-black" />
            <span>••• 5G ▭</span>
          </div>

          {app === "home" ? (
            <div className="flex flex-1 flex-col px-5 pt-4">
              {newest && (
                <button
                  onClick={() => setApp("feed")}
                  className="flex cursor-pointer items-center gap-3 rounded-3xl bg-black/70 p-3 text-left text-white"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-rose-600 text-xl">{newest.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">Latest trade</span>
                    <span className="line-clamp-2 text-xs text-white/80">{newest.text}</span>
                  </span>
                </button>
              )}
              <div className="mt-5 grid grid-cols-4 gap-x-3 gap-y-4">
                {APPS.map((a) => (
                  <button key={a.id} onClick={() => setApp(a.id)} className="flex cursor-pointer flex-col items-center gap-1.5 active:scale-90">
                    <span className={cn("flex size-[60px] items-center justify-center rounded-[18px] bg-gradient-to-br text-3xl shadow-lg", a.bg)}>{a.emoji}</span>
                    <span className="text-xs font-medium text-white">{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto mb-3 grid grid-cols-4 gap-3 rounded-[28px] bg-white/20 p-3 backdrop-blur">
                {DOCK.map((d) => (
                  <button
                    key={d.id}
                    onClick={async () => {
                      if (d.id !== "call") return setApp(d.id);
                      if (!character || !me) return;
                      const ok = await act("/api/action", { characterId: character.id, action: "socialize" });
                      if (ok) toast(`📞 ${character.name} is calling a neighbor`, "success");
                    }}
                    className={cn("flex aspect-square cursor-pointer items-center justify-center rounded-[18px] bg-gradient-to-br text-3xl shadow active:scale-90", d.bg)}
                  >
                    {d.emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <button onClick={() => setApp("home")} className="cursor-pointer rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                  ‹ Apps
                </button>
                <span className="text-lg font-extrabold text-white">{meta?.label}</span>
                {character && <span className="ml-auto truncate text-xs text-white/80">for {character.name}</span>}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">{Screen && <Screen {...props} />}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
