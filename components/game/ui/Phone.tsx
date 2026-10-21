"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ACTIONS, CURRENCY, CURRENCY_SYMBOL, ITEMS, NEED_META, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import { PLACES, PLACE_BY_ID } from "@/lib/places";
import type { Character, HouseholdView, NeedKey, StateSnapshot } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn, shortAccount, timeAgo } from "@/lib/utils";
import { txUrl } from "@/lib/near-real";
import { REAL_IDS, RealPanelFor } from "./RealMode";
import { Portrait } from "./Portrait";
import { CloseButton } from "./Sheet";

export type EcoId =
  | "names"
  | "ref"
  | "burrow"
  | "rhea"
  | "jumbo"
  | "nsocial"
  | "sputnik"
  | "outlayer"
  | "meteor"
  | "here"
  | "explorer"
  | "intents"
  | "aurora"
  | "meme";
export type AppId = "jobs" | "market" | "sell" | "bag" | "feed" | "neighbors" | "make" | "wallet" | "leaders" | "places" | "about" | EcoId;

const APPS: Array<{ id: AppId; label: string; emoji: string; color: string }> = [
  { id: "market", label: "Market", emoji: "🛒", color: "#fbbf24" },
  { id: "sell", label: "Sell", emoji: "🏷️", color: "#f472b6" },
  { id: "make", label: "Make", emoji: "🍳", color: "#fb923c" },
  { id: "jobs", label: "Jobs", emoji: "💼", color: "#00ec97" },
  { id: "places", label: "Go Out", emoji: "🗺️", color: "#38bdf8" },
  { id: "bag", label: "Bag", emoji: "🎒", color: "#facc15" },
  { id: "neighbors", label: "Neighbors", emoji: "🏘️", color: "#22d3ee" },
  { id: "leaders", label: "Leaders", emoji: "🏆", color: "#a78bfa" },
  { id: "feed", label: "Feed", emoji: "📡", color: "#60a5fa" },
  { id: "about", label: "About", emoji: "ℹ️", color: "#94a3b8" },
];

/** NEAR ecosystem apps on the Pad. `place` links the app to its building in town. */
const ECO: Record<EcoId | "wallet", { label: string; name: string; emoji: string; color: string; url: string; place?: string; blurb: string }> = {
  wallet: { label: "NEAR Wallet", name: "NEAR Wallet", emoji: "Ⓝ", color: "#00ec97", url: "https://nearblocks.io", place: "near_hq", blurb: "Your Privy-embedded NEAR account: balances, send, receive, history." },
  outlayer: { label: "OutLayer", name: "OutLayer", emoji: "🤖", color: "#60a5fa", url: "https://outlayer.fastnear.com", place: "outlayer", blurb: "FastNEAR's verifiable off-chain compute: code runs in Intel TDX enclaves and returns attested results. Your Sims run agent jobs at the OutLayer Agent Lab." },
  names: { label: "Names", name: "NEAR Name Service", emoji: "🔤", color: "#a3e635", url: "https://nearblocks.io", blurb: "Human-readable .near accounts. Look up any name live on NEAR mainnet." },
  explorer: { label: "Explorer", name: "NEAR Explorer", emoji: "🔎", color: "#94a3b8", url: "https://nearblocks.io", place: "explorer", blurb: "Live chain data from NEAR RPC, plus your account on NearBlocks." },
  ref: { label: "Ref", name: "Ref Finance", emoji: "🔄", color: "#22d3ee", url: "https://app.ref.finance", place: "ref", blurb: "NEAR's original AMM DEX, now part of Rhea Finance. Swap and provide liquidity at Ref Finance HQ." },
  burrow: { label: "Burrow", name: "Burrow", emoji: "🏦", color: "#fbbf24", url: "https://app.burrow.finance", place: "burrow", blurb: "Lending and borrowing, now part of Rhea Finance. Take one SimBucks loan at a time at the Burrow office." },
  rhea: { label: "Rhea", name: "Rhea Finance", emoji: "📈", color: "#f472b6", url: "https://app.rhea.finance", place: "rhea", blurb: "Ref + Burrow merged into Rhea: chain-abstracted trading and lending." },
  jumbo: { label: "Jumbo", name: "Jumbo Exchange", emoji: "🐘", color: "#a3e635", url: "https://jumbo.exchange", place: "jumbo", blurb: "Community DEX on NEAR. Market-make for a small, steady edge." },
  nsocial: { label: "Social", name: "NEAR Social", emoji: "💬", color: "#38bdf8", url: "https://near.social", place: "social", blurb: "On-chain social on NEAR. Post and hang out at the NEAR Social Plaza." },
  sputnik: { label: "Sputnik", name: "Sputnik DAO", emoji: "🏛️", color: "#c4b5fd", url: "https://nearblocks.io/address/sputnik-dao.near", place: "sputnik", blurb: "The DAO factory behind most NEAR DAOs (sputnik-dao.near). Vote at the community hall." },
  meteor: { label: "Meteor", name: "Meteor Wallet", emoji: "☄️", color: "#e879f9", url: "https://wallet.meteorwallet.app", place: "meteor", blurb: "Popular NEAR browser and mobile wallet." },
  here: { label: "HERE", name: "HERE Wallet", emoji: "📲", color: "#facc15", url: "https://www.herewallet.app", place: "here", blurb: "Mobile NEAR wallet with liquid staking." },
  intents: { label: "Intents", name: "NEAR Intents", emoji: "🌐", color: "#34d399", url: "https://near-intents.org", place: "intents", blurb: "Say what you want; solvers route it across chains." },
  aurora: { label: "Aurora", name: "Aurora", emoji: "🌈", color: "#86efac", url: "https://aurora.dev", place: "aurora", blurb: "The EVM on NEAR. Ship Solidity contracts at Aurora Labs." },
  meme: { label: "meme.cooking", name: "meme.cooking", emoji: "🍳", color: "#fb923c", url: "https://meme.cooking", place: "meme", blurb: "Fair-launch memecoin launchpad on NEAR. High risk, high fun." },
};
const ECO_ORDER: Array<EcoId | "wallet"> = ["wallet", "outlayer", "names", "explorer", "ref", "burrow", "rhea", "jumbo", "nsocial", "sputnik", "meteor", "here", "intents", "aurora", "meme"];

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
  onPlace: (placeId: string) => void;
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("well flex items-center gap-3 rounded-2xl p-3 font-semibold text-white", className)}>{children}</div>;
}

function Btn({ children, onClick, disabled, tone = "neon" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "neon" | "ghost" | "red" }) {
  const tones = {
    neon: "btn-gold",
    ghost: "btn-blue",
    red: "border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#ff7a8a] to-[#e23d55] text-white shadow-[0_3px_0_#0d1b5e]",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn("font-display shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-45", tones[tone])}
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
        <span key={k} className="rounded-md bg-[#0d1b5e]/35 px-1.5 text-[11px] text-[#ffd23f]">
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
            {l.initialQuantity > l.quantity && <span className="text-[#ffd23f]"> · {l.initialQuantity - l.quantity} sold</span>}
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
          <div key={a.id} className={cn("flex gap-2.5 rounded-2xl border px-3 py-2 text-sm", mine ? "border-[#0d1b5e] bg-[#0d1b5e]/35" : "border-white/5 bg-white/[0.04]")}>
            <span className="text-xl">{a.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="leading-snug text-slate-100">{a.text}</div>
              <div className="mt-0.5 flex gap-2 font-mono text-[10px] text-slate-500">
                {timeAgo(a.ts, now)}
                {a.txHash && (
                  <a href={txUrl(a.txHash)} target="_blank" rel="noreferrer" className="text-amber-300 underline">
                    on-chain tx ↗
                  </a>
                )}
              </div>
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
              <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-slate-900", online ? "bg-[#3ddc84]" : "bg-slate-600")} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-white">
                {h.name} {h.id === me?.id && <span className="text-xs text-[#ffd23f]">(you)</span>}
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
      <div className="ribbon mx-auto mb-1 w-fit px-4 py-1 text-center">
        <div className="font-display text-xl leading-none text-stroke">TOP HOUSEHOLDS</div>
        <div className="font-display text-xs text-gold">NET WORTH</div>
      </div>
      {ranked.map(({ h, worth }, i) => {
        const medal = ["#ffd23f", "#cfd8e3", "#e8955a"][i];
        const lead = h.characters[0];
        return (
          <div
            key={h.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-[3px] border-[#0d1b5e] p-2 pr-3 shadow-[0_3px_0_#0d1b5e]",
              i === 0 ? "bg-gradient-to-b from-[#8ff0b5] to-[#3ccf7f]" : "bg-gradient-to-b from-[#4f7cf5] to-[#2f5be8]",
              h.id === me?.id && "outline-[3px] outline-[#ffd23f] outline-solid",
            )}
          >
            {medal ? (
              <span
                className="font-display flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] border-[#0d1b5e] text-lg text-white [-webkit-text-stroke:1px_#0d1b5e] [paint-order:stroke_fill]"
                style={{ background: `radial-gradient(circle at 35% 30%, #fff8, ${medal} 60%)` }}
              >
                {i + 1}
              </span>
            ) : (
              <span className="font-display w-9 text-center text-lg text-stroke">{i + 1}</span>
            )}
            <span className="overflow-hidden rounded-lg border-[3px] border-[#0d1b5e]">
              <Portrait look={lead?.look} size={40} />
            </span>
            <span className="font-display min-w-0 flex-1 truncate text-lg text-stroke">{h.name}</span>
            <span className="flex items-center gap-1 rounded-xl border-[3px] border-[#0d1b5e] bg-[#14257a] px-2 py-0.5">
              <span className="text-sm">💎</span>
              <span className="font-display text-base text-stroke">{worth.toLocaleString()}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EcoHeader({ id }: { id: EcoId | "wallet" }) {
  const e = ECO[id];
  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border p-3" style={{ borderColor: `${e.color}55`, background: `${e.color}12` }}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${e.color}25`, color: e.color }}>
        {e.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-white">{e.name}</div>
        <div className="text-xs leading-snug text-slate-300">{e.blurb}</div>
      </div>
    </div>
  );
}

function LinkRow({ url, label }: { url: string; label?: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm">
      <span className="text-slate-200">{label ?? "Open the real app"}</span>
      <span className="font-mono text-xs text-[#ffd23f]">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗</span>
    </a>
  );
}

/** Activity entries for my household at a given place. */
function myVisits(snapshot: StateSnapshot, me: HouseholdView | null, placeName?: string) {
  if (!me || !placeName) return [];
  return snapshot.activity.filter((a) => a.householdId === me.id && a.text.includes(` at ${placeName}`));
}

function WalletApp({ snapshot, me, now, act, toast }: Props) {
  const [tab, setTab] = useState<"send" | "receive" | "history">("history");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(10);
  const [events, setEvents] = useState<Array<{ seq: number; ts: number; log: string; event: { event: string } }>>([]);
  const [near, setNear] = useState<{ near?: string; exists?: boolean; error?: string; explorer?: string } | null>(null);
  useEffect(() => {
    if (!me) return;
    fetch("/api/nep245?method=events&limit=150")
      .then((r) => r.json())
      .then((d) => setEvents((d.events ?? []).filter((e: { log: string }) => e.log.includes(me.accountId)).slice(0, 15)))
      .catch(() => {});
    fetch(`/api/near/balance?account_id=${me.accountId}`)
      .then((r) => r.json())
      .then(setNear)
      .catch(() => {});
  }, [me?.accountId, me?.balance]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return <Row>Move in first.</Row>;
  const neighbors = snapshot.households.filter((h) => h.id !== me.id);
  const cooldown = Math.max(0, (me.lastTopup ?? 0) + 5 * 60_000 - now);
  return (
    <div className="space-y-2">
      <Row className="neon-ring flex-col items-start bg-gradient-to-br from-[#3d6cf2] to-[#2a4ed0]">
        <div className="font-mono text-[10px] tracking-widest text-slate-400">SIMBUCKS · NEP-245</div>
        <div className="font-mono text-3xl font-black text-white">
          {me.balance.toLocaleString()} <span className="text-base text-slate-400">{CURRENCY_SYMBOL}</span>
        </div>
        <div className="text-[11px] break-all text-slate-400">
          {me.accountSource === "privy" ? "Privy embedded NEAR wallet" : "NEAR implicit account"} {shortAccount(me.accountId)}
        </div>
        <div className="text-[11px] text-slate-400">
          Native NEAR:{" "}
          {near?.explorer ? (
            <a href={near.explorer} target="_blank" rel="noreferrer" className="text-[#ffd23f] underline">
              {near.error ? "RPC unavailable" : near.exists ? `${near.near} NEAR` : "0 (not funded yet)"} ↗
            </a>
          ) : (
            "…"
          )}
          {(me.debt ?? 0) > 0 && <span className="ml-2 text-amber-300">· Burrow loan {me.debt} SB</span>}
        </div>
      </Row>
      <RealPanelFor id="wallet" />
      <div className="px-1 pt-1 font-mono text-[10px] font-bold tracking-widest text-slate-500">IN-GAME SIMBUCKS</div>
      <div className="grid grid-cols-3 gap-1.5">
        {(["send", "receive", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("cursor-pointer rounded-xl py-2 text-sm font-bold capitalize", tab === t ? "bg-white text-slate-900" : "bg-white/10 text-slate-300")}
          >
            {t === "send" ? "↗ Send" : t === "receive" ? "↙ Receive" : "History"}
          </button>
        ))}
      </div>
      {tab === "send" && (
        <Row className="flex-col items-stretch">
          {neighbors.length === 0 ? (
            <div className="text-sm text-slate-400">No neighbors yet. Invite a friend to move in.</div>
          ) : (
            <>
              <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-white/10 bg-[#1a2f9a] px-3 py-2 text-sm text-white">
                <option value="">Choose a neighbor…</option>
                {neighbors.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} · {shortAccount(h.accountId)}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-white"
                />
                <span className="text-sm text-slate-400">{CURRENCY_SYMBOL}</span>
                <Btn
                  disabled={!to || amount > me.balance}
                  onClick={async () => {
                    const ok = await act("/api/send", { toHouseholdId: to, amount });
                    if (ok) toast(`Sent ${amount} ${CURRENCY_SYMBOL} (NEP-245 mt_transfer)`, "success");
                  }}
                >
                  Send
                </Btn>
              </div>
            </>
          )}
        </Row>
      )}
      {tab === "receive" && (
        <Row className="flex-col items-start">
          <div className="text-xs text-slate-400">Your account</div>
          <code className="w-full font-mono text-[11px] break-all text-[#ffd23f]">{me.accountId}</code>
          <div className="flex gap-2">
            <Btn tone="ghost" onClick={() => navigator.clipboard?.writeText(me.accountId).then(() => toast("Copied", "success"))}>
              Copy
            </Btn>
            <Btn
              disabled={cooldown > 0}
              onClick={async () => {
                const r = await act<{ amount: number }>("/api/topup");
                if (r) toast(`+${r.amount} ${CURRENCY_SYMBOL} from the testnet faucet`, "success");
              }}
            >
              {cooldown > 0 ? `Faucet ${Math.ceil(cooldown / 60000)}m` : `Faucet +100`}
            </Btn>
          </div>
          <div className="text-[11px] text-slate-500">Neighbors can send to “{me.name}” from their NEAR Wallet app.</div>
        </Row>
      )}
      {tab === "history" && (
        <>
          <Row className="flex-wrap gap-2">
            {Object.entries({ [CURRENCY]: me.balance, ...me.inventory }).map(([id, q]) => (
              <span key={id} className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs">
                {ITEMS[id]?.emoji} {id} · {q}
              </span>
            ))}
          </Row>
          {events.map((e) => (
            <Row key={e.seq} className="flex-col items-start gap-1">
              <div className="font-mono text-xs font-bold text-[#ffd23f]">
                {e.event.event} · {timeAgo(e.ts, now)}
              </div>
              <code className="block w-full overflow-hidden text-[10px] break-all text-slate-500">{e.log.slice(0, 220)}</code>
            </Row>
          ))}
        </>
      )}
    </div>
  );
}

function NamesApp() {
  const [name, setName] = useState("");
  const [res, setRes] = useState<{ accountId: string; exists?: boolean; near?: string; error?: string; explorer?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const lookup = async () => {
    const n = name.trim().toLowerCase().replace(/\.near$/, "");
    if (!n) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/near/balance?network=mainnet&account_id=${encodeURIComponent(`${n}.near`)}`);
      setRes(await r.json());
    } catch {
      setRes({ accountId: `${n}.near`, error: "lookup failed" });
    }
    setLoading(false);
  };
  return (
    <div className="space-y-2">
      <EcoHeader id="names" />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="alice"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-white placeholder:text-slate-600"
        />
        <span className="self-center font-mono text-sm text-slate-400">.near</span>
        <Btn disabled={loading}>{loading ? "…" : "Look up"}</Btn>
      </form>
      {res && (
        <Row className="flex-col items-start">
          <div className="font-mono text-sm font-bold text-white">{res.accountId}</div>
          {res.error ? (
            <div className="text-sm text-amber-300">{res.error === "invalid account id" ? "Not a valid NEAR name" : "NEAR RPC unavailable right now"}</div>
          ) : res.exists ? (
            <div className="text-sm text-slate-300">
              Taken · holds <span className="text-[#ffd23f]">{res.near} NEAR</span> on mainnet
            </div>
          ) : (
            <div className="text-sm text-[#ffd23f]">Available. Nobody owns this name on mainnet yet.</div>
          )}
          {res.explorer && <LinkRow url={res.explorer} label="View on NearBlocks" />}
        </Row>
      )}
    </div>
  );
}

function ExplorerApp({ snapshot, me, onPlace }: Props) {
  const [nets, setNets] = useState<Record<string, { blockHeight?: number; gasPrice?: string; chainId?: string; blockTime?: string; error?: string }>>({});
  useEffect(() => {
    const load = () =>
      (["mainnet", "testnet"] as const).forEach((n) =>
        fetch(`/api/near/network?network=${n}`)
          .then((r) => r.json())
          .then((d) => setNets((o) => ({ ...o, [n]: d })))
          .catch(() => setNets((o) => ({ ...o, [n]: { error: "unavailable" } }))),
      );
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-2">
      <EcoHeader id="explorer" />
      {(["mainnet", "testnet"] as const).map((n) => {
        const d = nets[n];
        return (
          <Row key={n} className="flex-col items-start gap-0.5">
            <div className="font-mono text-[10px] font-bold tracking-widest text-slate-500">{n.toUpperCase()} · LIVE FROM RPC</div>
            {!d ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : d.error ? (
              <div className="text-sm text-amber-300">RPC unavailable</div>
            ) : (
              <>
                <div className="font-mono text-2xl font-black text-white">#{d.blockHeight?.toLocaleString()}</div>
                <div className="text-xs text-slate-400">
                  gas price {d.gasPrice} yocto · {d.blockTime ? new Date(d.blockTime).toLocaleTimeString() : ""}
                </div>
              </>
            )}
          </Row>
        );
      })}
      {me && <LinkRow url={`https://${snapshot.config.network === "mainnet" ? "" : "testnet."}nearblocks.io/address/${me.accountId}`} label="Your account on NearBlocks" />}
      <Btn tone="ghost" onClick={() => onPlace("explorer")}>
        🔎 Go to the Explorer Data Center
      </Btn>
    </div>
  );
}

function OutLayerApp(props: Props) {
  const { snapshot, me, character, now, onPlace } = props;
  const visits = myVisits(snapshot, me, "OutLayer Agent Lab");
  const earned = visits.reduce((s, a) => {
    const m = a.text.match(/\(([+-]\d+) SB net\)/);
    return s + (m ? Number(m[1]) : 0);
  }, 0);
  const running = me?.characters.filter((c) => c.busy?.place === "outlayer" && c.busy.until > now) ?? [];
  return (
    <div className="space-y-2">
      <EcoHeader id="outlayer" />
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Jobs run", String(visits.length)],
          ["Net SB", `${earned >= 0 ? "+" : ""}${earned}`],
          ["Running", String(running.length)],
        ].map(([k, v]) => (
          <Row key={k} className="flex-col items-start gap-0">
            <span className="font-mono text-[10px] text-slate-500">{k}</span>
            <span className="font-mono text-xl font-black text-white">{v}</span>
          </Row>
        ))}
      </div>
      {running.map((c) => (
        <Row key={c.id} className="text-sm">
          🧠 {c.name} is running an agent job… {Math.ceil((c.busy!.until - now) / 1000)}s
        </Row>
      ))}
      <Row className="flex-col items-start text-xs text-slate-300">
        <div className="font-bold text-white">How it maps to the real thing</div>
        <div>
          On real OutLayer, a NEAR contract or HTTPS call sends a WASM job to an Intel TDX enclave, which returns the result plus a hardware attestation (code hash, input hash,
          output). Here, your Sim pays a job fee in SimBucks and earns a payout when the job finishes. The VRF lucky draw stands in for OutLayer&apos;s verifiable randomness.
        </div>
      </Row>
      <RealPanelFor id="outlayer" characterId={character?.id} />
      <button
        disabled={!character}
        onClick={() => onPlace("outlayer")}
        className="btn-neon w-full cursor-pointer rounded-2xl py-3 font-bold disabled:opacity-40"
      >
        🤖 Send {character?.name ?? "a Sim"} to run an agent job
      </button>
      <LinkRow url="https://outlayer.fastnear.com/docs" label="OutLayer docs" />
      {visits.slice(0, 6).map((a) => (
        <Row key={a.id} className="text-xs">
          {a.text}
        </Row>
      ))}
    </div>
  );
}

function makeEcoApp(id: EcoId) {
  return function EcoApp({ snapshot, me, now, onPlace, character }: Props) {
    const e = ECO[id];
    const place = e.place ? PLACE_BY_ID[e.place] : undefined;
    const here = place
      ? snapshot.households.flatMap((h) => h.characters.filter((c) => c.busy?.place === place.id && c.busy.until > now).map((c) => `${c.name} (${h.name})`))
      : [];
    const visits = myVisits(snapshot, me, place?.name);
    return (
      <div className="space-y-2">
        <EcoHeader id={id} />
        {REAL_IDS.has(id) && <RealPanelFor id={id} characterId={character?.id} />}
        {place && (
          <>
            <Row className="flex-col items-start">
              <div className="font-mono text-[10px] font-bold tracking-widest text-slate-500">IN TOWN · {place.name.toUpperCase()}</div>
              {place.actions.map((a) => (
                <div key={a.id} className="text-sm text-slate-200">
                  {a.emoji} {a.label} <span className="text-xs text-slate-400">· {a.help}</span>
                </div>
              ))}
              <div className="text-xs text-slate-400">{here.length ? `Here now: ${here.join(", ")}` : "Nobody there right now."}</div>
            </Row>
            <button onClick={() => onPlace(place.id)} className="btn-neon w-full cursor-pointer rounded-2xl py-3 font-bold">
              Go to {place.short} 🚗 🚆 ✈️
            </button>
          </>
        )}
        <LinkRow url={e.url} />
        {visits.length > 0 && <div className="px-1 pt-1 font-mono text-[11px] font-bold tracking-widest text-slate-500">YOUR VISITS</div>}
        {visits.slice(0, 5).map((a) => (
          <Row key={a.id} className="text-xs">
            {a.text}
          </Row>
        ))}
      </div>
    );
  };
}

function PlacesApp({ now, snapshot, onPlace }: Props) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-xs text-slate-400">Pick a place, then choose car, train or plane. Your Sim leaves home and comes back when done.</p>
      {PLACES.map((p) => {
        const here = snapshot.households.reduce((n, h) => n + h.characters.filter((c) => c.busy?.place === p.id && c.busy.until > now).length, 0);
        return (
          <button key={p.id} onClick={() => onPlace(p.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.05] p-3 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: `${p.color}22`, color: p.color }}>
              {p.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-white">{p.name}</span>
              <span className="block truncate text-xs text-slate-400">{p.actions.map((a) => a.label).join(" · ")}</span>
            </span>
            {here > 0 && <span className="rounded-lg bg-[#0d1b5e]/40 px-2 py-0.5 text-xs font-bold text-[#ffd23f]">{here} here</span>}
          </button>
        );
      })}
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
          <li>🗺️ Go Out → take a car, train or plane to Ref Finance, Burrow, OutLayer, meme.cooking and more.</li>
        </ol>
      </Row>
      <Row className="flex-col items-start">
        <div className="font-bold text-white">On NEAR</div>
        <ul className="list-disc space-y-1 pl-4 text-slate-300">
          <li>Social login (Privy). A NEAR account is created for you, with no wallet popups.</li>
          <li>SimBucks, food, services and furniture are NEP-245 multi-tokens.</li>
          <li>Every trade is a pair of NEP-245 transfers between real players.</li>
          <li>The NEAR ecosystem apps link to the real projects, and Explorer and Names read live NEAR RPC data.</li>
        </ul>
        <div className="text-[11px] text-slate-500">Places and apps named after real projects are fan tributes. NEARLIFE is not affiliated with or endorsed by them.</div>
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
  places: PlacesApp,
  about: AboutApp,
  names: NamesApp,
  explorer: ExplorerApp,
  outlayer: OutLayerApp,
  ref: makeEcoApp("ref"),
  burrow: makeEcoApp("burrow"),
  rhea: makeEcoApp("rhea"),
  jumbo: makeEcoApp("jumbo"),
  nsocial: makeEcoApp("nsocial"),
  sputnik: makeEcoApp("sputnik"),
  meteor: makeEcoApp("meteor"),
  here: makeEcoApp("here"),
  intents: makeEcoApp("intents"),
  aurora: makeEcoApp("aurora"),
  meme: makeEcoApp("meme"),
};

function AppIcon({ emoji, label, color, onClick, featured }: { emoji: string; label: string; color: string; onClick: () => void; featured?: boolean }) {
  return (
    <button onClick={onClick} className="flex cursor-pointer flex-col items-center gap-1 active:scale-90">
      <span
        className="relative flex size-[52px] items-center justify-center rounded-2xl border-[3px] border-[#0d1b5e] text-2xl font-black text-white"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}cc 55%, ${color}99)`, boxShadow: "inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -3px 0 rgba(13,27,94,0.25), 0 4px 0 #0d1b5e" }}
      >
        <span className="drop-shadow-[0_2px_0_rgba(13,27,94,0.55)]">{emoji}</span>
        {featured && (
          <span className="font-display absolute -top-2 -right-2 rounded-md border-2 border-[#7a3d00] bg-[#ffd23f] px-1 text-[9px] leading-tight text-[#7a3d00]">REAL</span>
        )}
      </span>
      <span className="font-display w-full truncate text-center text-[11px] text-stroke">{label}</span>
    </button>
  );
}

/** The NEAR Pad: a dark handheld with the game's apps. */
export function Phone(props: Props) {
  const { app, setApp, now, onClose, character, me, act, toast } = props;
  const clock = gameClock(now);
  const meta = APPS.find((a) => a.id === app) ?? (app !== "home" && app in ECO ? ECO[app as EcoId | "wallet"] : undefined);
  const Screen = app !== "home" ? SCREENS[app] : null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-end justify-center bg-black/55 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div className="phone-in relative w-full max-w-[420px] rounded-[34px] border-[4px] border-[#0d1b5e] bg-gradient-to-b from-[#5fd3ff] to-[#2f5be8] p-2 shadow-[inset_0_3px_0_rgba(255,255,255,0.5),0_6px_0_#0d1b5e]">
        <div className="game-bg relative flex h-[min(80vh,720px)] flex-col overflow-hidden rounded-[26px] border-[3px] border-[#0d1b5e]">
          <div className="relative flex items-center gap-2 border-b-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#3d6cf2] to-[#2a4ed0] px-3 py-2">
            {app === "home" ? (
              <span className="font-display text-xl text-stroke">
                NEAR <span className="text-gold">PAD</span>
              </span>
            ) : (
              <>
                <button onClick={() => setApp("home")} aria-label="Back" className="btn-blue flex size-9 cursor-pointer items-center justify-center rounded-xl text-lg">
                  ↩
                </button>
                <span className="font-display truncate text-xl text-stroke uppercase">{meta?.label}</span>
              </>
            )}
            <span className="font-display ml-auto text-sm text-[#cfe0ff]">
              {clock.hour % 12 || 12}:{String(clock.minute).padStart(2, "0")}
              {clock.hour < 12 ? "AM" : "PM"}
            </span>
            <CloseButton onClick={onClose} />
          </div>

          {app === "home" ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
              {me && (
                <button
                  onClick={() => setApp("wallet")}
                  className="glass mb-4 mt-3 cursor-pointer rounded-2xl p-3 text-left"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{me.name}</span>
                    <span className="font-mono text-[#ffd23f]">Ⓝ {shortAccount(me.accountId)}</span>
                  </div>
                  <div className="font-display text-3xl text-stroke">
                    {me.balance.toLocaleString()} <span className="text-base text-gold">{CURRENCY_SYMBOL}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {props.snapshot.listings.filter((l) => l.sellerHouseholdId === me.id).length} live listings · {props.snapshot.households.length} households in town
                  </div>
                </button>
              )}
              <div className="font-display mb-2 text-base text-stroke">NEARLIFE</div>
              <div className="grid grid-cols-5 gap-x-1.5 gap-y-4">
                {APPS.map((a) => (
                  <AppIcon key={a.id} emoji={a.emoji} label={a.label} color={a.color} onClick={() => setApp(a.id)} />
                ))}
              </div>
              <div className="mt-5 mb-2 flex items-center justify-between">
                <span className="font-display text-base text-stroke">NEAR ECOSYSTEM</span>
                <span className="text-[10px] font-black text-[#ffd23f]">REAL = signs real NEAR txs</span>
              </div>
              <div className="grid grid-cols-5 gap-x-1.5 gap-y-4">
                {ECO_ORDER.map((id) => (
                  <AppIcon key={id} emoji={ECO[id].emoji} label={ECO[id].label} color={ECO[id].color} onClick={() => setApp(id)} featured={REAL_IDS.has(id)} />
                ))}
              </div>
              <button
                onClick={async () => {
                  if (!character || !me) return;
                  const ok = await act("/api/action", { characterId: character.id, action: "socialize" });
                  if (ok) toast(`📞 ${character.name} is calling a neighbor`, "success");
                }}
                className="mt-5 flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#0d1b5e] bg-[#0d1b5e]/35 py-3 font-semibold text-[#ffd23f]"
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
