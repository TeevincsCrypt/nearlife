/**
 * Headless economy simulation: runs the real engine + NPC agents with a fake clock.
 *   npm run simulate -- 30        (minutes of game time, default 20)
 * Adds one passive "player" household that cooks and lists meals, to show NPC demand for player goods.
 */
import { createInitialState, newCharacter } from "../lib/seed";
import { advance, createListing, startAction } from "../lib/engine";
import { CURRENCY } from "../lib/catalog";
import { mt_balance_of, mt_mint, mt_supply } from "../lib/nep245";
import type { Household } from "../lib/types";
import { starterLayout } from "../lib/layout";

const minutes = Number(process.argv[2] ?? 20);
let now = Date.now();
const state = createInitialState(now);

const player: Household = {
  id: "hh_sim",
  name: "Sim Player",
  kind: "player",
  accountId: "simplayer.testnet",
  accountSource: "derived",
  ownerIds: ["sim"],
  ownerNames: ["sim"],
  color: "#16a34a",
  characters: [newCharacter("hh_sim-0", "Chef Sim", "🧑‍🍳")],
  createdAt: now,
  lastActive: now,
  layout: starterLayout(),
};
state.households[player.id] = player;
mt_mint(state, player.accountId, CURRENCY, 100, "welcome-grant");

const cook = player.characters[0];
for (let t = 0; t < minutes * 60; t += 2) {
  now += 2000;
  player.lastActive = now;
  advance(state, now);
  // The player keeps cooking and lists meals slightly under the NPC chef.
  if (!cook.busy) {
    const meals = mt_balance_of(state, player.accountId, "meal");
    if (meals > 0) createListing(state, player, "meal", meals, 10, now);
    else if (cook.needs.energy < 30) startAction(state, player, cook, "rest", now);
    else if (cook.needs.hunger < 30) {
      if (mt_balance_of(state, player.accountId, CURRENCY) >= 7) startAction(state, player, cook, "eat_home", now);
      else startAction(state, player, cook, "work", now);
    } else if (mt_balance_of(state, player.accountId, CURRENCY) < 5) startAction(state, player, cook, "work", now);
    else startAction(state, player, cook, "cook", now);
  }
}

console.log(`Simulated ${minutes} min, ${state.tickCount} NPC ticks`);
console.log("Stats:", state.stats);
for (const h of Object.values(state.households)) {
  const mood = Math.round(h.characters.reduce((s, c) => s + Object.values(c.needs).reduce((a, b) => a + b, 0) / 5, 0) / h.characters.length);
  console.log(`${h.kind.padEnd(6)} ${h.name.padEnd(14)} ${String(mt_balance_of(state, h.accountId, CURRENCY)).padStart(5)} SB  mood ${mood}`);
}
console.log("SimBucks supply:", mt_supply(state, CURRENCY), "| open listings:", Object.keys(state.listings).length);
const bySeller: Record<string, number> = {};
for (const l of Object.values(state.listings)) bySeller[state.households[l.sellerHouseholdId]?.name ?? "?"] = (bySeller[state.households[l.sellerHouseholdId]?.name ?? "?"] ?? 0) + l.quantity;
console.log("Listed units by seller:", bySeller);
console.log("Recent:");
for (const a of state.activity.slice(0, 8)) console.log("  ", a.text);
