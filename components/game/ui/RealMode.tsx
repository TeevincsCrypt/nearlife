"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import {
  NEARLIFE_DAO,
  OUTLAYER_ARGS,
  OUTLAYER_CONTRACT,
  OUTLAYER_DEPOSIT_NEAR,
  REAL_MAX_NEAR,
  REAL_MODE_ENABLED,
  REAL_NETWORK,
  SOCIAL_CONTRACT,
  daoProposals,
  daoVoteActions,
  intentsDepositActions,
  intentsQuote,
  intentsSubmitDeposit,
  intentsTokens,
  nearToYocto,
  outlayerActions,
  realBalance,
  signAndSend,
  socialPostActions,
  totalDeposit,
  txUrl,
  yoctoToNear,
  type DaoProposal,
  type RealAction,
} from "@/lib/near-real";
import type { HouseholdView } from "@/lib/types";
import { cn, shortAccount } from "@/lib/utils";

type RealKind = "send" | "social" | "dao" | "intents" | "outlayer";

interface PendingTx {
  kind: RealKind;
  title: string;
  receiverId: string;
  actions: RealAction[];
  detail?: string;
  characterId?: string;
  /** Called after the tx lands (before it is recorded). */
  after?: (txHash: string) => Promise<void> | void;
}

interface RealCtx {
  available: boolean;
  reason: string;
  accountId: string | null;
  request: (tx: PendingTx) => void;
}

const Ctx = createContext<RealCtx>({ available: false, reason: "", accountId: null, request: () => {} });
export const useReal = () => useContext(Ctx);

/** Provides real-mode signing + a confirmation sheet for every real NEAR transaction. */
export function RealTxProvider({ me, authHeaders, children }: { me: HouseholdView | null; authHeaders: () => Promise<Record<string, string>>; children: ReactNode }) {
  const auth = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<PendingTx | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const accountId = me && me.accountSource === "privy" ? me.accountId : null;
  const available = REAL_MODE_ENABLED && Boolean(auth.signNearHash && accountId);
  const reason = !REAL_MODE_ENABLED
    ? "Real mode is turned off on this deployment."
    : auth.method !== "privy"
      ? "Sign in with email or Google (Privy) to use real mode. Guest accounts can't sign real transactions."
      : !accountId
        ? "Your household isn't linked to a Privy NEAR wallet."
        : "";

  const request = useCallback((tx: PendingTx) => {
    setDone(null);
    setPending(tx);
  }, []);

  async function confirm() {
    if (!pending || !auth.signNearHash || !accountId) return;
    setBusy(true);
    try {
      const hash = await signAndSend(accountId, auth.signNearHash, pending.receiverId, pending.actions);
      await pending.after?.(hash);
      const res = await fetch("/api/real", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ kind: pending.kind, txHash: hash, characterId: pending.characterId, detail: pending.detail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) toast(`On-chain ✓, but not recorded in the game: ${json.error ?? res.status}`, "info");
      else toast(`🔗 Done on NEAR ${REAL_NETWORK}${json.result?.reward ? ` · +${json.result.reward} SB` : ""}`, "success");
      setDone(hash);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setBusy(false);
  }

  const deposit = pending ? totalDeposit(pending.actions) : 0n;
  return (
    <Ctx.Provider value={{ available, reason, accountId, request }}>
      {children}
      {pending && (
        <div className="pointer-events-auto absolute inset-0 z-[70] flex items-end justify-center bg-black/60 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
          <div className="sheet-in glass-strong w-full max-w-md overflow-hidden rounded-3xl border border-amber-300/30">
            <div className="h-[3px] bg-gradient-to-r from-amber-300 via-[#00ec97] to-amber-300" />
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-300/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-300">REAL · NEAR {REAL_NETWORK.toUpperCase()}</span>
              </div>
              <div className="text-xl font-extrabold text-white">{pending.title}</div>
              {done ? (
                <>
                  <div className="text-sm text-slate-300">Transaction sent and executed.</div>
                  <a href={txUrl(done)} target="_blank" rel="noreferrer" className="block truncate rounded-xl bg-white/5 px-3 py-2 font-mono text-xs text-[#00ec97]">
                    {done} ↗
                  </a>
                  <button onClick={() => setPending(null)} className="btn-neon w-full cursor-pointer rounded-2xl py-3 font-bold">
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1 rounded-2xl bg-white/5 p-3 font-mono text-xs text-slate-300">
                    <div>
                      from <span className="text-white">{shortAccount(accountId ?? "")}</span>
                    </div>
                    <div>
                      to <span className="text-white">{pending.receiverId}</span>
                    </div>
                    {pending.actions.map((a, i) => (
                      <div key={i}>
                        {a.kind === "transfer" ? "transfer" : `${a.method}()`}
                        {a.deposit ? ` · ${yoctoToNear(a.deposit, 5)} NEAR` : ""}
                      </div>
                    ))}
                    <div className="pt-1 text-amber-300">Total attached: {yoctoToNear(deposit, 5)} NEAR + gas</div>
                  </div>
                  <p className="text-xs text-slate-400">
                    This spends real NEAR from your Privy wallet and can&apos;t be undone. NEARLIFE never holds your keys; Privy asks you to approve the signature.
                  </p>
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => setPending(null)} className="flex-1 cursor-pointer rounded-2xl bg-white/10 py-3 font-bold text-white">
                      Cancel
                    </button>
                    <button disabled={busy} onClick={confirm} className="btn-neon flex-1 cursor-pointer rounded-2xl py-3 font-bold disabled:opacity-50">
                      {busy ? "Signing…" : "Sign & send"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function Shell({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  const real = useReal();
  return (
    <div className="space-y-2 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-amber-300/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-300">REAL</span>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      {real.available ? children : <div className="text-xs text-slate-400">{real.reason}</div>}
      {note && <div className="text-[11px] text-slate-500">{note}</div>}
    </div>
  );
}

const input = "min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const btn = "btn-neon shrink-0 cursor-pointer rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40";

export function RealWalletPanel() {
  const real = useReal();
  const [bal, setBal] = useState<string>("…");
  const [to, setTo] = useState("");
  const [amt, setAmt] = useState("0.01");
  useEffect(() => {
    if (!real.accountId) return;
    realBalance(real.accountId)
      .then((b) => setBal(b === null ? "0 (account not on-chain yet)" : `${yoctoToNear(b)} NEAR`))
      .catch(() => setBal("RPC unavailable"));
  }, [real.accountId]);
  return (
    <Shell title={`NEAR on ${REAL_NETWORK}`} note={`Max ${REAL_MAX_NEAR} NEAR per transaction. Fund this account by sending NEAR to it from any wallet or exchange.`}>
      <div className="font-mono text-lg font-black text-white">{bal}</div>
      <code className="block font-mono text-[10px] break-all text-slate-400">{real.accountId}</code>
      <div className="flex gap-2">
        <input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="recipient.near" className={input} />
        <input value={amt} onChange={(e) => setAmt(e.target.value)} className={cn(input, "w-20 flex-none font-mono")} />
      </div>
      <button
        disabled={!to || !(Number(amt) > 0) || Number(amt) > REAL_MAX_NEAR}
        onClick={() =>
          real.request({ kind: "send", title: `Send ${amt} NEAR to ${to}`, receiverId: to, actions: [{ kind: "transfer", deposit: nearToYocto(amt) }], detail: `to ${to}` })
        }
        className={cn(btn, "w-full")}
      >
        Send real NEAR
      </button>
    </Shell>
  );
}

export function RealSocialPanel({ characterId }: { characterId?: string }) {
  const real = useReal();
  const [text, setText] = useState("Just moved into NEARLIFE 🏠 — a life sim on NEAR.");
  return (
    <Shell title="Post on NEAR Social" note={`Writes to ${SOCIAL_CONTRACT} under your account (0.01 NEAR storage deposit).`}>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} rows={3} className={cn(input, "w-full resize-none")} />
      <button
        disabled={!text.trim() || !real.accountId}
        onClick={() =>
          real.request({ kind: "social", title: "Post on NEAR Social", receiverId: SOCIAL_CONTRACT, actions: socialPostActions(real.accountId!, text.trim()), characterId })
        }
        className={cn(btn, "w-full")}
      >
        Post for real
      </button>
    </Shell>
  );
}

export function RealDaoPanel({ characterId }: { characterId?: string }) {
  const real = useReal();
  const [props, setProps] = useState<DaoProposal[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!NEARLIFE_DAO) return;
    daoProposals(NEARLIFE_DAO)
      .then(setProps)
      .catch(() => setErr("Couldn't load proposals from NEAR RPC."));
  }, []);
  if (!NEARLIFE_DAO)
    return (
      <Shell title="NEARLIFE DAO">
        <div className="text-xs text-slate-400">No DAO configured yet. Create one on Sputnik DAO and set NEXT_PUBLIC_NEARLIFE_DAO (e.g. nearlife.sputnik-dao.near).</div>
      </Shell>
    );
  return (
    <Shell title={`Vote · ${NEARLIFE_DAO}`} note="Only DAO members can vote. Ask the council to add you.">
      {err && <div className="text-xs text-amber-300">{err}</div>}
      {!props && !err && <div className="text-xs text-slate-400">Loading proposals…</div>}
      {props?.length === 0 && <div className="text-xs text-slate-400">No proposals yet.</div>}
      {props?.map((p) => (
        <div key={p.id} className="rounded-xl bg-white/5 p-2">
          <div className="text-xs text-slate-400">
            #{p.id} · {p.status} · by {shortAccount(p.proposer)}
          </div>
          <div className="line-clamp-2 text-sm text-white">{p.description || "(no description)"}</div>
          {p.status === "InProgress" && (
            <div className="mt-1.5 flex gap-2">
              {[true, false].map((yes) => (
                <button
                  key={String(yes)}
                  onClick={() =>
                    real.request({
                      kind: "dao",
                      title: `${yes ? "Approve" : "Reject"} proposal #${p.id}`,
                      receiverId: NEARLIFE_DAO,
                      actions: daoVoteActions(p.id, yes),
                      detail: `#${p.id}`,
                      characterId,
                    })
                  }
                  className={cn("flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-bold", yes ? "bg-[#00ec97]/20 text-[#00ec97]" : "bg-rose-500/15 text-rose-300")}
                >
                  {yes ? "Approve" : "Reject"}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </Shell>
  );
}

const USDC_FALLBACK = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

export function RealSwapPanel({ characterId, via }: { characterId?: string; via?: string }) {
  const real = useReal();
  const toast = useToast();
  const [amt, setAmt] = useState("0.1");
  const [asset, setAsset] = useState(USDC_FALLBACK);
  const [assets, setAssets] = useState<Array<{ id: string; label: string }>>([{ id: USDC_FALLBACK, label: "USDC (NEAR)" }]);
  const [quote, setQuote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    intentsTokens()
      .then((ts) => {
        // Only NEAR-native assets: the output is delivered to the player's own NEAR account.
        const pick = ts.filter((t) => t.blockchain === "near" && t.assetId !== "nep141:wrap.near" && ["USDC", "USDT", "ETH", "BTC", "AURORA", "ZEC", "SOL"].includes(t.symbol)).slice(0, 10);
        if (pick.length) setAssets(pick.map((t) => ({ id: t.assetId, label: `${t.symbol} (NEAR)` })));
      })
      .catch(() => undefined);
  }, []);
  const label = assets.find((a) => a.id === asset)?.label ?? "token";
  const valid = Number(amt) > 0 && Number(amt) <= REAL_MAX_NEAR;
  return (
    <Shell
      title={`Swap NEAR → ${label.split(" ")[0]} via NEAR Intents`}
      note={`${via ? `${via}: ` : ""}routed by NEAR Intents (1Click API), delivered to your NEAR account. Max ${REAL_MAX_NEAR} NEAR.`}
    >
      <div className="flex gap-2">
        <input value={amt} onChange={(e) => setAmt(e.target.value)} className={cn(input, "w-20 flex-none font-mono")} />
        <span className="self-center text-sm text-slate-400">NEAR →</span>
        <select value={asset} onChange={(e) => setAsset(e.target.value)} className={cn(input, "bg-[#0b0d1a]")}>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>
      {quote && <div className="font-mono text-xs text-[#00ec97]">{quote}</div>}
      <div className="flex gap-2">
        <button
          disabled={!valid || loading || !real.accountId}
          onClick={async () => {
            setLoading(true);
            try {
              const q = await intentsQuote({ accountId: real.accountId!, amountYocto: nearToYocto(amt), destinationAsset: asset, dry: true });
              setQuote(`Live quote: ${amt} NEAR → ${q.quote.amountOutFormatted ?? q.quote.amountOut} ${label.split(" ")[0]}${q.quote.amountOutUsd ? ` (~$${q.quote.amountOutUsd})` : ""}`);
            } catch (e) {
              setQuote("");
              toast((e as Error).message, "error");
            }
            setLoading(false);
          }}
          className="flex-1 cursor-pointer rounded-xl bg-white/10 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {loading ? "…" : "Live quote"}
        </button>
        <button
          disabled={!valid || loading || !real.accountId}
          onClick={async () => {
            setLoading(true);
            try {
              const amountYocto = nearToYocto(amt);
              const q = await intentsQuote({ accountId: real.accountId!, amountYocto, destinationAsset: asset, dry: false });
              const dep = q.quote.depositAddress;
              if (!dep) throw new Error("No deposit address returned");
              real.request({
                kind: "intents",
                title: `Swap ${amt} NEAR → ~${q.quote.amountOutFormatted ?? "?"} ${label.split(" ")[0]}`,
                receiverId: "wrap.near",
                actions: intentsDepositActions(dep, amountYocto),
                detail: `${amt} NEAR → ${label.split(" ")[0]}`,
                characterId,
                after: (hash) => intentsSubmitDeposit(hash, dep),
              });
            } catch (e) {
              toast((e as Error).message, "error");
            }
            setLoading(false);
          }}
          className={cn(btn, "flex-1")}
        >
          Swap for real
        </button>
      </div>
    </Shell>
  );
}

export function RealOutLayerPanel({ characterId }: { characterId?: string }) {
  const real = useReal();
  if (!OUTLAYER_ARGS)
    return (
      <Shell title="Real OutLayer job">
        <div className="text-xs text-slate-400">
          No job configured. Set NEXT_PUBLIC_OUTLAYER_ARGS to the JSON arguments of request_execution on {OUTLAYER_CONTRACT} (your WASM repo + commit + input) and
          NEXT_PUBLIC_OUTLAYER_DEPOSIT_NEAR.
        </div>
      </Shell>
    );
  return (
    <Shell title="Run a real OutLayer job" note={`Calls request_execution on ${OUTLAYER_CONTRACT} with ${OUTLAYER_DEPOSIT_NEAR} NEAR; unused compute is refunded by OutLayer.`}>
      <button
        onClick={() => {
          try {
            real.request({ kind: "outlayer", title: "Run an OutLayer job", receiverId: OUTLAYER_CONTRACT, actions: outlayerActions(), characterId });
          } catch {
            /* configuration error shown in the panel */
          }
        }}
        className={cn(btn, "w-full")}
      >
        Run on OutLayer
      </button>
    </Shell>
  );
}

/** Which real panel belongs to a Pad app or a city place. */
export function RealPanelFor({ id, characterId }: { id: string; characterId?: string }) {
  switch (id) {
    case "wallet":
      return <RealWalletPanel />;
    case "social":
    case "nsocial":
      return <RealSocialPanel characterId={characterId} />;
    case "sputnik":
      return <RealDaoPanel characterId={characterId} />;
    case "ref":
      return <RealSwapPanel characterId={characterId} via="At Ref Finance HQ" />;
    case "rhea":
      return <RealSwapPanel characterId={characterId} via="At Rhea Finance" />;
    case "intents":
      return <RealSwapPanel characterId={characterId} />;
    case "outlayer":
      return <RealOutLayerPanel characterId={characterId} />;
    default:
      return null;
  }
}

export const REAL_IDS = new Set(["wallet", "social", "nsocial", "sputnik", "ref", "rhea", "intents", "outlayer"]);
