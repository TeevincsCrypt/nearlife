"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

interface SlotInfo {
  id: string;
  name: string;
  where: string;
  pricePerDay: number;
  nextFree: number;
  pending: number;
}
interface AdsInfo {
  open: boolean;
  treasury: string;
  network: "mainnet" | "testnet";
  priceNear: number;
  days: number[];
  slots: SlotInfo[];
}
interface Status {
  id: string;
  name: string;
  slot: string;
  days: number;
  priceNear: number;
  state: "pending" | "scheduled" | "live" | "finished" | "rejected";
  note?: string;
  startAt?: number;
  endAt?: number;
  views: number;
  clicks: number;
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());
const COLORS = ["#2a4ed0", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0891b2", "#111827"];
const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const input = "well w-full rounded-xl px-3 py-2.5 font-bold text-white outline-none placeholder:text-[#9fb6ff]";
const label = "mb-1 block text-xs font-black tracking-widest text-[#ffd23f] uppercase";

/** Shrink an uploaded logo to fit in 256×256 so it stays small. */
async function shrinkLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const s = Math.min(256 / img.width, 256 / img.height);
    ctx.drawImage(img, (256 - img.width * s) / 2, (256 - img.height * s) / 2, img.width * s, img.height * s);
    const webp = c.toDataURL("image/webp", 0.9);
    return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="btn-blue shrink-0 cursor-pointer rounded-lg px-2.5 py-1 text-xs"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Preview({ name, tagline, url, color, logo }: { name: string; tagline: string; url: string; color: string; logo: string | null }) {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {}
  return (
    <div className="overflow-hidden rounded-2xl border-[4px] border-[#0d1b5e] shadow-[0_6px_0_#0d1b5e]" style={{ background: `linear-gradient(180deg, ${color}, #0d1b5e)` }}>
      <div className="relative flex aspect-[16/9] items-center gap-4 p-4">
        <span className="font-display absolute top-2 left-2 rounded-md bg-[#ffd23f] px-1.5 text-xs text-[#7a3d00]">AD</span>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-[34%] shrink-0 rounded-2xl bg-white object-contain p-1.5" />
        )}
        <div className="min-w-0">
          <div className="font-display truncate text-3xl text-white [-webkit-text-stroke:4px_#0d1b5e] [paint-order:stroke_fill]">{name || "Your project"}</div>
          <div className="font-display text-lg leading-tight text-[#ffd23f] [-webkit-text-stroke:3px_#0d1b5e] [paint-order:stroke_fill]">{tagline || "Your tagline here"}</div>
        </div>
        {host && <span className="absolute right-3 bottom-2 text-xs font-bold text-[#cfe0ff]">{host}</span>}
      </div>
    </div>
  );
}

function StatusCard({ id }: { id: string }) {
  const { data } = useSWR<Status & { error?: string }>(`/api/ads/${id}`, fetcher, { refreshInterval: 30_000 });
  if (!data) return <div className="glass-strong rounded-3xl p-5 text-white">Loading your booking…</div>;
  if (data.error) return <div className="glass-strong rounded-3xl p-5 text-white">{data.error}</div>;
  const label: Record<Status["state"], string> = {
    pending: "⏳ Payment received. Waiting for review (usually within a day)",
    scheduled: `📅 Approved. Runs ${data.startAt ? fmtDate(data.startAt) : ""} – ${data.endAt ? fmtDate(data.endAt) : ""}`,
    live: `🟢 Live in NEARLIFE until ${data.endAt ? fmtDate(data.endAt) : ""}`,
    finished: "✅ Finished",
    rejected: `❌ Not approved${data.note ? `: ${data.note}` : ""}. Contact us about a refund.`,
  };
  return (
    <div className="glass-strong space-y-3 rounded-3xl p-5 text-white">
      <div className="font-display text-2xl text-stroke">{data.name}</div>
      <div className="well rounded-2xl p-3 text-sm font-bold">{label[data.state]}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Views", data.views],
          ["Clicks", data.clicks],
          ["Paid", `${data.priceNear} Ⓝ`],
        ].map(([k, v]) => (
          <div key={k} className="well rounded-2xl p-2">
            <div className="font-display text-2xl text-gold">{v}</div>
            <div className="text-[11px] font-black text-[#cfe0ff] uppercase">{k}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-[#cfe0ff]">Bookmark this page to check on your ad: views count players who saw it in town, clicks count visits to your site.</div>
    </div>
  );
}

function Advertise() {
  const params = useSearchParams();
  const booking = params.get("booking");
  const { data: info } = useSWR<AdsInfo>("/api/ads", fetcher);
  const { data: world } = useSWR<{ snapshot?: { households: Array<{ lastActive: number }> } }>("/api/state", fetcher);
  const [slot, setSlot] = useState("center");
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [url, setUrl] = useState("https://");
  const [color, setColor] = useState(COLORS[0]);
  const [logo, setLogo] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [payer, setPayer] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(booking);

  useEffect(() => setDone(booking), [booking]);
  const chosen = info?.slots.find((s) => s.id === slot);
  const total = useMemo(() => (chosen ? Math.round(chosen.pricePerDay * days * 100) / 100 : 0), [chosen, days]);
  const players = world?.snapshot?.households.length ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot, days, name, tagline, url, color, contact, image: logo ?? undefined, payer, txHash }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      window.history.replaceState(null, "", `/advertise?booking=${json.id}`);
      setDone(json.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="game-bg min-h-dvh px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <a href="/" className="mx-auto block w-fit rounded-[22px] border-4 border-[#0d1b5e] bg-gradient-to-b from-[#5fd3ff] to-[#2f5be8] px-5 pt-1 pb-2 shadow-[inset_0_3px_0_rgba(255,255,255,0.5),0_5px_0_#0d1b5e]">
          <div className="font-display text-gold text-center text-4xl leading-[0.9] [-webkit-text-stroke:3px_#0d1b5e] [text-shadow:0_4px_0_#0d1b5e]">NEAR</div>
          <div className="font-display text-center text-3xl leading-[0.9] text-white [-webkit-text-stroke:3px_#0d1b5e] [paint-order:stroke_fill] [text-shadow:0_4px_0_#0d1b5e]">LIFE</div>
        </a>
        <div className="text-center">
          <h1 className="font-display text-4xl text-stroke">
            Advertise your <span className="text-gold">NEAR project</span>
          </h1>
          <p className="mt-2 font-bold text-[#cfe0ff]">
            Put your project on a billboard in NEARLIFE&apos;s city. Every player drives past them, and one tap takes them to your site.
            {players > 0 && ` ${players} households live in town right now.`}
          </p>
        </div>

        {done ? (
          <>
            <StatusCard id={done} />
            <button onClick={() => setDone(null)} className="btn-blue mx-auto block cursor-pointer rounded-2xl px-5 py-2.5">
              Book another billboard
            </button>
          </>
        ) : !info ? (
          <div className="glass-strong rounded-3xl p-5">Loading…</div>
        ) : !info.open ? (
          <div className="glass-strong rounded-3xl p-5 text-center font-bold">Billboard bookings open soon. Follow NEARLIFE on X to hear first.</div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <section className="glass-strong space-y-3 rounded-3xl p-5">
              <div className="font-display text-2xl text-stroke">1 · Pick a billboard</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {info.slots.map((s) => {
                  const free = s.nextFree <= Date.now() + 60_000;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSlot(s.id)}
                      className={`cursor-pointer rounded-2xl border-[3px] p-3 text-left ${slot === s.id ? "border-[#ffd23f] bg-[#0d1b5e]/50" : "border-[#0d1b5e] bg-[#0d1b5e]/25"}`}
                    >
                      <div className="font-display text-lg text-stroke">{s.name}</div>
                      <div className="text-xs font-bold text-[#cfe0ff]">{s.where}</div>
                      <div className="mt-1 flex justify-between text-sm font-black">
                        <span className="text-gold">{s.pricePerDay} Ⓝ / day</span>
                        <span className={free ? "text-[#3ddc84]" : "text-[#ffb4bf]"}>{free ? "Free now" : `Free from ${fmtDate(s.nextFree)}`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div>
                <span className={label}>How long</span>
                <div className="flex flex-wrap gap-2">
                  {info.days.map((d) => (
                    <button type="button" key={d} onClick={() => setDays(d)} className={`cursor-pointer rounded-xl px-3 py-1.5 ${days === d ? "btn-gold" : "btn-blue"}`}>
                      {d} day{d > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm font-bold text-[#cfe0ff]">
                If the billboard is booked, yours starts right after. Every ad is checked by the NEARLIFE team before it runs.
              </div>
            </section>

            <section className="glass-strong space-y-3 rounded-3xl p-5">
              <div className="font-display text-2xl text-stroke">2 · Your ad</div>
              <Preview name={name} tagline={tagline} url={url} color={color} logo={logo} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={label}>Project name</span>
                  <input className={input} value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder="e.g. MyDapp" required />
                </label>
                <label>
                  <span className={label}>Website</span>
                  <input className={input} value={url} maxLength={200} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
                </label>
              </div>
              <label className="block">
                <span className={label}>Tagline</span>
                <input className={input} value={tagline} maxLength={64} onChange={(e) => setTagline(e.target.value)} placeholder="One line about what you do" />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <span className={label}>Colour</span>
                  <div className="flex gap-1.5">
                    {COLORS.map((c) => (
                      <button type="button" key={c} onClick={() => setColor(c)} aria-label={c} className={`size-8 cursor-pointer rounded-full border-[3px] ${color === c ? "border-[#ffd23f]" : "border-[#0d1b5e]"}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <label>
                  <span className={label}>Logo (PNG/JPG/WebP)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setLogo(await shrinkLogo(f));
                    }}
                    className="text-sm font-bold text-[#cfe0ff] file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#ffd23f] file:px-3 file:py-1.5 file:font-black file:text-[#7a3d00]"
                  />
                </label>
              </div>
              <label className="block">
                <span className={label}>Contact (Telegram, X or email)</span>
                <input className={input} value={contact} maxLength={80} onChange={(e) => setContact(e.target.value)} placeholder="So we can reach you about your ad" required />
              </label>
            </section>

            <section className="glass-strong space-y-3 rounded-3xl p-5">
              <div className="font-display text-2xl text-stroke">3 · Pay in NEAR</div>
              <div className="well space-y-2 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#cfe0ff]">Total</span>
                  <span className="font-display text-3xl text-gold">{total} Ⓝ</span>
                </div>
                <div className="text-sm font-bold">
                  Send <b className="text-gold">{total} NEAR</b> on NEAR {info.network} to:
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-[#0d1b5e]/50 px-2 py-1.5 text-sm">{info.treasury}</code>
                  <Copy text={info.treasury} />
                </div>
                <div className="text-xs text-[#cfe0ff]">Use any NEAR wallet (Meteor, HERE, MyNearWallet…). Then paste the details of that payment below.</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={label}>Paid from (your account)</span>
                  <input className={input} value={payer} onChange={(e) => setPayer(e.target.value.trim())} placeholder="yourname.near" required />
                </label>
                <label>
                  <span className={label}>Transaction hash</span>
                  <input className={input} value={txHash} onChange={(e) => setTxHash(e.target.value.trim())} placeholder="From your wallet or NearBlocks" required />
                </label>
              </div>
              {error && <div className="rounded-xl border-2 border-[#0d1b5e] bg-[#ff5a6e]/40 p-2.5 text-sm font-bold">{error}</div>}
              <button type="submit" disabled={busy} className="btn-gold w-full cursor-pointer rounded-2xl py-3 text-xl disabled:opacity-60">
                {busy ? "Checking your payment on NEAR…" : "Book my billboard"}
              </button>
              <div className="text-[11px] text-[#cfe0ff]">
                We check the payment on-chain before taking the booking. Ads that break the rules (scams, adult content, impersonation) are rejected and refunded.
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}

export default function AdvertisePage() {
  return (
    <Suspense>
      <Advertise />
    </Suspense>
  );
}
