"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SignInPanel() {
  const auth = useAuth();
  const [name, setName] = useState("");
  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
      <CardHeader>
        <CardTitle className="text-xl">Move into the neighborhood</CardTitle>
        <CardDescription>
          Sign in with email or Google. A NEAR account is created for you in the background. No wallet popups, no seed phrases.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {auth.privyAvailable && (
          <Button size="lg" onClick={auth.login}>
            ✉️ Sign in with Email or Google
          </Button>
        )}
        {auth.guestAvailable && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              auth.loginAsGuest(name || "Guest");
            }}
          >
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
            <Button type="submit" size="lg" variant={auth.privyAvailable ? "outline" : "default"}>
              {auth.privyAvailable ? "Play as guest" : "Play as guest"}
            </Button>
          </form>
        )}
        {!auth.privyAvailable && (
          <p className="text-muted-foreground text-xs">Privy is not configured on this deployment (set NEXT_PUBLIC_PRIVY_APP_ID), so guest login is enabled.</p>
        )}
      </CardContent>
    </Card>
  );
}
