"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function Welcome() {
  const auth = useAuth();
  const [name, setName] = useState("");
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sheet-in glass-strong w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        <div className="h-[3px] bg-gradient-to-r from-[#00ec97] via-[#22d3ee] to-[#a78bfa]" />
        <div className="p-6">
          <div className="font-mono text-[11px] font-bold tracking-[0.3em] text-[#00ec97]">A NEAR LIFE SIM</div>
          <div className="mt-1 text-4xl font-black tracking-tight text-white">
            NEAR<span className="neon-text">LIFE</span>
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Move into a shared neighborhood. Furnish your place, keep your Sims happy, make things and sell them to your neighbors. Everything you own is a token on NEAR.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            {auth.privyAvailable && (
              <button onClick={auth.login} className="btn-neon cursor-pointer rounded-2xl py-3.5 text-lg font-bold active:scale-[0.98]">
                Continue with Email or Google
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
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[#00ec97]"
                />
                <button
                  type="submit"
                  className={`cursor-pointer rounded-2xl px-5 py-3 font-bold active:scale-95 ${auth.privyAvailable ? "bg-white/10 text-slate-200" : "btn-neon"}`}
                >
                  Play as guest
                </button>
              </form>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">No wallet popups. A NEAR account is created for you.</p>
        </div>
      </div>
    </div>
  );
}
