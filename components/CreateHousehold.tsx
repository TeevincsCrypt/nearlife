"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { useGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATARS = ["🧑", "👩", "👨", "🧑🏽", "👩🏻", "👨🏿", "🧑🏼", "👩🏾", "🧔", "👵", "👴", "🧒", "👱‍♀️", "🧑‍🎤", "🧑‍🍳", "🧑‍🎨"];
const NAMES = ["Sam", "Robin", "Alex", "Jo", "Kai", "Noa", "Remy", "Ari", "Max", "Lee", "Dani", "Quinn"];

export function CreateHousehold() {
  const auth = useAuth();
  const { act } = useGame();
  const router = useRouter();
  const [name, setName] = useState(`${auth.displayName || "My"}'s House`);
  const [chars, setChars] = useState([{ name: NAMES[Math.floor(Math.random() * NAMES.length)], avatar: AVATARS[0] }]);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await act<{ householdId: string }>("/api/household", {
      name,
      characters: chars,
      displayName: auth.displayName,
      nearAccountId: auth.nearAddress ?? undefined,
    });
    setBusy(false);
    if (res?.householdId) router.push(`/household/${res.householdId}`);
  }

  async function join() {
    setBusy(true);
    const res = await act<{ householdId: string }>("/api/household/join", { householdId: invite.trim(), displayName: auth.displayName });
    setBusy(false);
    if (res?.householdId) router.push(`/household/${res.householdId}`);
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-white to-amber-50">
      <CardHeader>
        <CardTitle className="text-xl">Create your household</CardTitle>
        <CardDescription>
          1–4 characters. You start with 100 SimBucks (a NEP-245 token) in your NEAR account
          {auth.nearAddress ? " (your Privy NEAR wallet)" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hh-name">Household name</Label>
          <Input id="hh-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Characters</Label>
          {chars.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-secondary text-xl"
                title="Change look"
                onClick={() =>
                  setChars(chars.map((x, j) => (j === i ? { ...x, avatar: AVATARS[(AVATARS.indexOf(x.avatar) + 1) % AVATARS.length] } : x)))
                }
              >
                {c.avatar}
              </button>
              <Input value={c.name} maxLength={16} onChange={(e) => setChars(chars.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              {chars.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setChars(chars.filter((_, j) => j !== i))}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          {chars.length < 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setChars([...chars, { name: NAMES[Math.floor(Math.random() * NAMES.length)], avatar: AVATARS[(chars.length * 3) % AVATARS.length] }])
              }
            >
              + Add character
            </Button>
          )}
        </div>
        <Button size="lg" disabled={busy} onClick={create}>
          🏠 Move in
        </Button>
        <div className="border-t pt-4">
          <Label htmlFor="invite" className="mb-1.5">
            …or join a friend&apos;s household with its invite code
          </Label>
          <div className="flex gap-2">
            <Input id="invite" placeholder="hh_xxxxxxxx" value={invite} onChange={(e) => setInvite(e.target.value)} />
            <Button variant="outline" disabled={busy || !invite.trim()} onClick={join}>
              Join
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
