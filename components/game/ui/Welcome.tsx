"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function Welcome() {
  const auth = useAuth();
  const [name, setName] = useState("");
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sheet-in w-full max-w-md rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <svg width="22" height="36" viewBox="0 0 10 16" className="plumbob">
            <polygon points="5,0 10,6 5,16 0,6" fill="#22c55e" />
            <polygon points="5,0 10,6 5,7" fill="white" opacity="0.35" />
          </svg>
          <div>
            <div className="text-3xl font-black tracking-tight">NEARLIFE</div>
            <div className="text-sm text-slate-500">Live, work and trade in a shared neighborhood</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Furnish your home, keep your Sims happy, and sell what you make. NPC neighbors are AI agents with their own wallets. They buy your food and services when
          they need them.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          {auth.privyAvailable && (
            <button onClick={auth.login} className="cursor-pointer rounded-full bg-slate-900 py-3.5 text-lg font-bold text-white active:scale-[0.98]">
              ✉️ Continue with Email or Google
            </button>
          )}
          {auth.guestAvailable && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                auth.loginAsGuest(name || "Guest");
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className={`cursor-pointer rounded-full px-5 py-3 font-bold active:scale-95 ${auth.privyAvailable ? "bg-slate-100 text-slate-700" : "bg-emerald-500 text-white"}`}
              >
                Play as guest
              </button>
            </form>
          )}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">No wallet popups. A NEAR account is created for you.</p>
      </div>
    </div>
  );
}
