"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdBooking } from "@/lib/ads";

const TOKEN_KEY = "nearlife:admin-token";
const fmt = (t?: number) => (t ? new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "–");

/** Owner page: review billboard bookings (needs NEARLIFE_ADMIN_TOKEN). */
export default function AdsAdmin() {
  const [token, setToken] = useState("");
  const [bookings, setBookings] = useState<AdBooking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(TOKEN_KEY) ?? "");
    } catch {}
  }, []);

  const load = useCallback(async (t: string) => {
    setError("");
    const res = await fetch("/api/ads/admin", { headers: { authorization: `Bearer ${t}` } });
    const json = await res.json();
    if (!res.ok) {
      setBookings(null);
      return setError(json.error ?? "Couldn't load");
    }
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch {}
    setBookings(json.bookings);
  }, []);

  async function review(id: string, op: "approve" | "reject" | "stop") {
    const note = op === "approve" ? "" : (prompt(op === "reject" ? "Reason (shown to the advertiser)" : "Why take it down?") ?? "");
    const res = await fetch("/api/ads/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, op, note }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Failed");
    await load(token);
  }

  const now = Date.now();
  return (
    <main className="game-bg min-h-dvh px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="font-display text-3xl text-stroke">Billboard bookings</h1>
        <form
          className="glass-strong flex gap-2 rounded-2xl p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void load(token);
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token (NEARLIFE_ADMIN_TOKEN)"
            className="well min-w-0 flex-1 rounded-xl px-3 py-2 font-bold text-white outline-none placeholder:text-[#9fb6ff]"
          />
          <button className="btn-gold cursor-pointer rounded-xl px-4">Open</button>
        </form>
        {error && <div className="rounded-xl bg-[#ff5a6e]/40 p-2.5 font-bold">{error}</div>}
        {bookings?.length === 0 && <div className="glass-strong rounded-2xl p-4 font-bold">No bookings yet.</div>}
        {bookings?.map((b) => {
          const live = b.status === "approved" && (b.startAt ?? Infinity) <= now && now < (b.endAt ?? 0);
          return (
            <div key={b.id} className="glass-strong space-y-2 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {b.hasImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/ads/${b.id}/image`} alt="" className="size-14 rounded-xl bg-white object-contain" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xl text-stroke">{b.name}</div>
                  <div className="truncate text-sm font-bold text-[#cfe0ff]">{b.tagline}</div>
                </div>
                <span className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${live ? "bg-[#3ddc84] text-[#0d1b5e]" : b.status === "pending" ? "bg-[#ffd23f] text-[#7a3d00]" : b.status === "rejected" ? "bg-[#ff5a6e]" : "bg-[#0d1b5e]"}`}>
                  {live ? "live" : b.status}
                </span>
              </div>
              <div className="grid gap-1 text-xs font-bold text-[#cfe0ff] sm:grid-cols-2">
                <div>
                  Site:{" "}
                  <a href={b.url} target="_blank" rel="noreferrer" className="text-[#ffd23f] underline">
                    {b.url}
                  </a>
                </div>
                <div>Contact: {b.contact}</div>
                <div>
                  Billboard: {b.slot} · {b.days} days · {b.priceNear} Ⓝ
                </div>
                <div>
                  Paid by {b.payer} ·{" "}
                  <a href={`https://nearblocks.io/txns/${b.txHash}`} target="_blank" rel="noreferrer" className="text-[#ffd23f] underline">
                    tx ↗
                  </a>
                </div>
                <div>Booked {fmt(b.createdAt)}</div>
                <div>
                  Runs {fmt(b.startAt)} → {fmt(b.endAt)} · {b.views} views · {b.clicks} clicks
                </div>
                {b.note && <div>Note: {b.note}</div>}
              </div>
              <div className="flex gap-2">
                {b.status === "pending" && (
                  <>
                    <button onClick={() => void review(b.id, "approve")} className="btn-gold cursor-pointer rounded-xl px-3 py-1.5 text-sm">
                      Approve
                    </button>
                    <button onClick={() => void review(b.id, "reject")} className="btn-blue cursor-pointer rounded-xl px-3 py-1.5 text-sm">
                      Reject
                    </button>
                  </>
                )}
                {b.status === "approved" && (
                  <button onClick={() => void review(b.id, "stop")} className="btn-blue cursor-pointer rounded-xl px-3 py-1.5 text-sm">
                    Take down
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
