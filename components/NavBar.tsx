"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { useGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Plumbob } from "./Plumbob";
import { CURRENCY_SYMBOL } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function NavBar() {
  const auth = useAuth();
  const { myHousehold } = useGame();
  const path = usePathname();
  const links = [
    { href: "/", label: "Neighborhood" },
    { href: "/market", label: "Market" },
    ...(myHousehold ? [{ href: `/household/${myHousehold.id}`, label: "My Household" }] : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Plumbob mood={90} size={10} />
          <span className="text-lg">NEARLIFE</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("rounded-md px-3 py-1.5 hover:bg-secondary", path === l.href && "bg-secondary font-medium")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {myHousehold && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900 tabular-nums">
              🪙 {myHousehold.balance} {CURRENCY_SYMBOL}
            </span>
          )}
          {auth.authenticated ? (
            <>
              <span className="text-muted-foreground hidden sm:inline">
                {auth.displayName}
                {auth.method === "guest" && " (guest)"}
              </span>
              <Button size="sm" variant="outline" onClick={() => auth.logout()}>
                Sign out
              </Button>
            </>
          ) : auth.privyAvailable ? (
            <Button size="sm" onClick={auth.login}>
              Sign in
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
