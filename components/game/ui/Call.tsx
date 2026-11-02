"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallState, HouseholdView, StateSnapshot } from "@/lib/types";
import { Portrait } from "./Portrait";

type Act = <T = unknown>(path: string, body?: unknown, method?: "POST" | "DELETE") => Promise<T | null>;

const CALL_EVENT = "nearlife:call";

/** Start a voice call with another household (handled by <CallManager />). */
export function startCall(householdId: string) {
  window.dispatchEvent(new CustomEvent(CALL_EVENT, { detail: householdId }));
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  // Optional TURN relay for strict networks (mobile carriers, some offices).
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) servers.push({ urls: turn.split(","), username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL });
  return servers;
}

/** Wait until the connection has gathered its network candidates (or a short timeout), so one offer/answer carries everything. */
function gathered(pc: RTCPeerConnection, ms = 2500) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const t = setTimeout(resolve, ms);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

/** A gentle two-tone ring, generated in the browser. */
function useRingtone() {
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  const start = useCallback(() => {
    stop();
    try {
      ctx.current ??= new AudioContext();
      void ctx.current.resume();
    } catch {
      return;
    }
    const ring = () => {
      const ac = ctx.current;
      if (!ac) return;
      for (const [i, f] of [880, 660, 880, 660].entries()) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = f;
        o.type = "sine";
        const t0 = ac.currentTime + i * 0.18;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
        g.gain.linearRampToValueAtTime(0, t0 + 0.16);
        o.connect(g).connect(ac.destination);
        o.start(t0);
        o.stop(t0 + 0.17);
      }
      navigator.vibrate?.([200, 100, 200]);
    };
    ring();
    timer.current = setInterval(ring, 2000);
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}

type Ui =
  | { mode: "idle" }
  | { mode: "outgoing" | "incoming" | "active"; peer: string; callId?: string; status: string; startedAt?: number; muted: boolean };

/** Runs voice calls: placing, ringing, answering, the in-call bar, and cleanup. */
export function CallManager({
  snapshot,
  me,
  act,
  refresh,
  toast,
}: {
  snapshot: StateSnapshot;
  me: HouseholdView | null;
  act: Act;
  refresh: () => void;
  toast: (t: string, k?: "info" | "error" | "success") => void;
}) {
  const [ui, setUi] = useState<Ui>({ mode: "idle" });
  const [tick, setTick] = useState(0);
  const pc = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const callId = useRef<string | null>(null);
  const ring = useRingtone();
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const hangUpRef = useRef<() => Promise<void>>(async () => {});

  const cleanup = useCallback(() => {
    ring.stop();
    pc.current?.close();
    pc.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (audio.current) audio.current.srcObject = null;
    callId.current = null;
    setUi({ mode: "idle" });
  }, [ring]);

  const newConnection = useCallback(async () => {
    const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    stream.current = media;
    const conn = new RTCPeerConnection({ iceServers: iceServers() });
    media.getTracks().forEach((t) => conn.addTrack(t, media));
    conn.ontrack = (e) => {
      if (audio.current) {
        audio.current.srcObject = e.streams[0];
        void audio.current.play().catch(() => {});
      }
    };
    let dropTimer: ReturnType<typeof setTimeout> | null = null;
    conn.onconnectionstatechange = () => {
      const s = conn.connectionState;
      const status = s === "connected" ? "Connected" : s === "failed" ? "Couldn't connect audio on this network" : s === "disconnected" ? "Reconnecting…" : null;
      if (status) setUi((u) => (u.mode === "idle" ? u : { ...u, status }));
      if (dropTimer) clearTimeout(dropTimer);
      // The other side left (closed the app) or the network can't carry audio: end the call.
      if (s === "failed") dropTimer = setTimeout(() => void hangUpRef.current(), 2500);
      if (s === "disconnected") dropTimer = setTimeout(() => void hangUpRef.current(), 8000);
    };
    pc.current = conn;
    return conn;
  }, []);

  const hangUp = useCallback(async () => {
    const id = callId.current;
    cleanup();
    if (id) await act("/api/call", { op: "end", id });
  }, [act, cleanup]);
  hangUpRef.current = hangUp;

  const placeCall = useCallback(
    async (to: string) => {
      if (!me) return toast("Move in first to call your neighbors", "error");
      if (uiRef.current.mode !== "idle") return toast("You're already on a call", "error");
      setUi({ mode: "outgoing", peer: to, status: "Getting your mic ready…", muted: false });
      try {
        const conn = await newConnection();
        await conn.setLocalDescription(await conn.createOffer());
        await gathered(conn);
        const res = await act<{ id: string }>("/api/call", { op: "start", to, offer: conn.localDescription!.sdp });
        if (!res) return cleanup();
        callId.current = res.id;
        setUi((u) => (u.mode === "outgoing" ? { ...u, callId: res.id, status: "Ringing…" } : u));
      } catch (e) {
        cleanup();
        toast((e as Error).name === "NotAllowedError" ? "Allow microphone access to make calls" : "Couldn't start the call on this device", "error");
      }
    },
    [act, cleanup, me, newConnection, toast],
  );

  const accept = useCallback(async () => {
    const u = uiRef.current;
    if (u.mode !== "incoming" || !u.callId) return;
    ring.stop();
    const call = snapshot.calls.find((c) => c.id === u.callId);
    if (!call?.offer) return cleanup();
    setUi({ ...u, status: "Connecting…" });
    try {
      const conn = await newConnection();
      await conn.setRemoteDescription({ type: "offer", sdp: call.offer });
      await conn.setLocalDescription(await conn.createAnswer());
      await gathered(conn);
      callId.current = call.id;
      const ok = await act("/api/call", { op: "answer", id: call.id, answer: conn.localDescription!.sdp });
      if (!ok) return cleanup();
      setUi({ mode: "active", peer: u.peer, callId: call.id, status: "Connecting…", startedAt: Date.now(), muted: false });
    } catch (e) {
      await act("/api/call", { op: "end", id: call.id });
      cleanup();
      toast((e as Error).name === "NotAllowedError" ? "Allow microphone access to take calls" : "Couldn't answer on this device", "error");
    }
  }, [act, cleanup, newConnection, ring, snapshot.calls, toast]);

  const decline = useCallback(async () => {
    const u = uiRef.current;
    ring.stop();
    setUi({ mode: "idle" });
    if (u.mode === "incoming" && u.callId) await act("/api/call", { op: "end", id: u.callId });
  }, [act, ring]);

  // Calls started from anywhere in the UI.
  useEffect(() => {
    const on = (e: Event) => void placeCall((e as CustomEvent<string>).detail);
    window.addEventListener(CALL_EVENT, on);
    return () => window.removeEventListener(CALL_EVENT, on);
  }, [placeCall]);

  // Follow the call on the server: incoming rings, answers, and endings.
  useEffect(() => {
    if (!me) return;
    const u = uiRef.current;
    if (u.mode === "idle") {
      const incoming = snapshot.calls.find((c) => c.to === me.id && c.status === "ringing");
      if (incoming) {
        setUi({ mode: "incoming", peer: incoming.from, callId: incoming.id, status: "is calling…", muted: false });
        ring.start();
      }
      return;
    }
    const call: CallState | undefined = u.callId ? snapshot.calls.find((c) => c.id === u.callId) : undefined;
    if (!u.callId) return;
    if (!call || call.status === "ended") {
      const peerName = snapshot.households.find((h) => h.id === u.peer)?.name ?? "They";
      const why = call?.endReason;
      if (u.mode === "outgoing") toast(why === "declined" ? `📞 ${peerName} declined` : why === "missed" ? `📞 ${peerName} didn't pick up` : "📞 Call ended");
      else if (u.mode === "active") toast("📞 Call ended");
      cleanup();
      return;
    }
    if (u.mode === "outgoing" && call.status === "active" && call.answer && pc.current && !pc.current.remoteDescription) {
      pc.current
        .setRemoteDescription({ type: "answer", sdp: call.answer })
        .then(() => setUi({ mode: "active", peer: u.peer, callId: call.id, status: "Connecting…", startedAt: Date.now(), muted: false }))
        .catch(() => void hangUp());
    }
  }, [snapshot.calls, me, ring, toast, cleanup, hangUp, snapshot.households]);

  // Poll faster while a call is ringing or live, and tick the timer.
  useEffect(() => {
    if (ui.mode === "idle") return;
    const t = setInterval(() => {
      refresh();
      setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [ui.mode, refresh]);

  const peer = ui.mode === "idle" ? undefined : snapshot.households.find((h) => h.id === ui.peer);
  const elapsed = ui.mode === "active" && ui.startedAt ? Math.max(0, Date.now() - ui.startedAt) : 0;
  void tick;

  return (
    <>
      <audio ref={audio} autoPlay playsInline className="hidden" />
      {ui.mode === "incoming" && (
        <div className="pointer-events-auto absolute inset-0 z-[80] flex items-center justify-center bg-[#0d1b5e]/60 p-4 backdrop-blur-sm">
          <div className="glass-strong sheet-in w-full max-w-sm rounded-[28px] p-5 text-center">
            <div className="mx-auto w-fit animate-bounce rounded-full border-4 border-[#ffd23f] p-1">
              <Portrait look={peer?.characters[0]?.look} size={88} />
            </div>
            <div className="font-display mt-3 text-2xl text-stroke">{peer?.name ?? "A neighbor"}</div>
            <div className="text-sm font-bold text-[#cfe0ff]">📞 is calling you…</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => void decline()} className="font-display cursor-pointer rounded-2xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#ff7a8a] to-[#e23d55] py-3 text-lg text-white shadow-[0_4px_0_#0d1b5e]">
                Decline
              </button>
              <button onClick={() => void accept()} className="font-display cursor-pointer rounded-2xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#5ef0a0] to-[#20b866] py-3 text-lg text-white shadow-[0_4px_0_#0d1b5e]">
                Answer
              </button>
            </div>
          </div>
        </div>
      )}
      {(ui.mode === "outgoing" || ui.mode === "active") && (
        <div className="pointer-events-auto absolute inset-x-2 top-[calc(max(0.5rem,env(safe-area-inset-top))+4.6rem)] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#5ef0a0] to-[#20b866] p-2 pr-2.5 shadow-[0_4px_0_#0d1b5e]">
          <Portrait look={peer?.characters[0]?.look} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-display truncate text-base leading-tight text-stroke">📞 {peer?.name ?? "Calling…"}</div>
            <div className="truncate text-xs font-black text-[#0d1b5e]">
              {ui.mode === "active" && ui.status === "Connected" ? `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0")}` : ui.status}
            </div>
          </div>
          {ui.mode === "active" && (
            <button
              onClick={() => {
                const muted = !ui.muted;
                stream.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
                setUi({ ...ui, muted });
              }}
              aria-label={ui.muted ? "Unmute" : "Mute"}
              className="btn-blue flex size-10 cursor-pointer items-center justify-center rounded-xl text-lg"
            >
              {ui.muted ? "🔇" : "🎙️"}
            </button>
          )}
          <button
            onClick={() => void hangUp()}
            aria-label="Hang up"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#ff7a8a] to-[#e23d55] text-lg shadow-[0_3px_0_#0d1b5e]"
          >
            ⏹
          </button>
        </div>
      )}
    </>
  );
}
