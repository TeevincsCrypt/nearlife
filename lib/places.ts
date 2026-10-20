/**
 * Real NEAR / crypto ecosystem places in the neighborhood. Sims travel there (car, train or
 * plane) and do something that changes their needs and SimBucks. These are in-game tributes:
 * NEARLIFE is not affiliated with any of these projects.
 */
import type { Needs } from "./types";

export type TravelMode = "car" | "train" | "plane";

export const TRAVEL: Record<TravelMode, { label: string; emoji: string; cost: number; seconds: number; effects: Partial<Needs> }> = {
  car: { label: "Car", emoji: "🚗", cost: 3, seconds: 5, effects: {} },
  train: { label: "Train", emoji: "🚆", cost: 1, seconds: 8, effects: { social: 4 } },
  plane: { label: "Plane", emoji: "✈️", cost: 12, seconds: 2, effects: { fun: 4, energy: -3 } },
};

export interface PlaceAction {
  id: string;
  label: string;
  emoji: string;
  /** SimBucks paid on arrival (burned, or locked into the activity). */
  cost: number;
  durationSec: number;
  effects: Partial<Needs>;
  /** SimBucks paid out on completion: uniform random in [min, max]. */
  payout?: [number, number];
  /** Item tokens granted on completion. */
  gives?: { itemId: string; qty: number };
  /** Special handling (Burrow loans). */
  special?: "borrow" | "repay";
  help: string;
}

export type BuildingStyle = "tower" | "office" | "lab" | "hall" | "kiosk" | "pool" | "datacenter" | "store" | "exchange" | "launchpad" | "hub";

export interface PlaceDef {
  id: string;
  name: string;
  short: string;
  emoji: string;
  color: string;
  style: BuildingStyle;
  /** World position on the city map. */
  pos: [number, number];
  height: number;
  description: string;
  url: string;
  actions: PlaceAction[];
}

export const BURROW_LOAN = 50;
export const BURROW_REPAY = 55;

export const PLACES: PlaceDef[] = [
  {
    id: "near_hq",
    name: "NEAR Protocol HQ",
    short: "NEAR HQ",
    emoji: "Ⓝ",
    color: "#00ec97",
    style: "tower",
    pos: [-20, -18],
    height: 12,
    description: "Home of the NEAR Foundation. Builders drop by for office hours and hackathons.",
    url: "https://near.org",
    actions: [
      { id: "office_hours", label: "Dev office hours", emoji: "🧑‍💻", cost: 0, durationSec: 12, effects: { social: 20, fun: 10 }, help: "+20 social, +10 fun" },
      { id: "hackathon", label: "Hackathon sprint", emoji: "🏆", cost: 0, durationSec: 25, effects: { energy: -25, hunger: -10, fun: 15 }, payout: [20, 60], help: "Tiring. Wins 20–60 SB" },
    ],
  },
  {
    id: "ref",
    name: "Ref Finance HQ",
    short: "Ref Finance",
    emoji: "🔄",
    color: "#22d3ee",
    style: "exchange",
    pos: [20, -18],
    height: 6,
    description: "NEAR's original AMM DEX (now part of Rhea Finance). Swap and provide liquidity.",
    url: "https://app.ref.finance",
    actions: [
      { id: "swap", label: "Swap tokens", emoji: "🔄", cost: 10, durationSec: 8, effects: { fun: 8 }, payout: [6, 16], help: "Pay 10, get back 6–16 SB" },
      { id: "lp", label: "Provide liquidity", emoji: "💧", cost: 25, durationSec: 20, effects: { fun: 5 }, payout: [20, 36], help: "Lock 25, earn 20–36 SB" },
    ],
  },
  {
    id: "burrow",
    name: "Burrow Lending Office",
    short: "Burrow",
    emoji: "🏦",
    color: "#fbbf24",
    style: "office",
    pos: [26, -6],
    height: 5,
    description: "Lending and borrowing on NEAR (now part of Rhea Finance). One loan at a time.",
    url: "https://app.burrow.finance",
    actions: [
      { id: "borrow", label: `Borrow ${BURROW_LOAN} SB`, emoji: "💸", cost: 0, durationSec: 6, effects: {}, special: "borrow", help: `Get ${BURROW_LOAN} SB now, owe ${BURROW_REPAY}` },
      { id: "repay", label: `Repay ${BURROW_REPAY} SB`, emoji: "✅", cost: 0, durationSec: 6, effects: { fun: 5 }, special: "repay", help: "Clear your loan" },
    ],
  },
  {
    id: "rhea",
    name: "Rhea Finance Trading Floor",
    short: "Rhea Finance",
    emoji: "📈",
    color: "#f472b6",
    style: "exchange",
    pos: [20, 18],
    height: 7,
    description: "Ref and Burrow merged into Rhea: chain-abstracted trading and lending.",
    url: "https://app.rhea.finance",
    actions: [
      { id: "perps", label: "Trade with leverage", emoji: "📈", cost: 15, durationSec: 10, effects: { fun: 15, energy: -5 }, payout: [0, 36], help: "Pay 15, get back 0–36 SB" },
      { id: "lend", label: "Supply & earn", emoji: "🪙", cost: 20, durationSec: 22, effects: {}, payout: [21, 27], help: "Lock 20, earn 21–27 SB" },
    ],
  },
  {
    id: "jumbo",
    name: "Jumbo Exchange",
    short: "Jumbo",
    emoji: "🐘",
    color: "#a3e635",
    style: "exchange",
    pos: [-26, 6],
    height: 5,
    description: "Community DEX on NEAR. Make markets for a small, steady edge.",
    url: "https://jumbo.exchange",
    actions: [{ id: "mm", label: "Market-make", emoji: "⚖️", cost: 8, durationSec: 12, effects: { energy: -5 }, payout: [6, 14], help: "Pay 8, get back 6–14 SB" }],
  },
  {
    id: "aurora",
    name: "Aurora Labs",
    short: "Aurora",
    emoji: "🌈",
    color: "#86efac",
    style: "lab",
    pos: [-20, 18],
    height: 6,
    description: "The EVM on NEAR. Ship a Solidity contract and get paid.",
    url: "https://aurora.dev",
    actions: [{ id: "evm_job", label: "Deploy an EVM contract", emoji: "⚙️", cost: 0, durationSec: 18, effects: { energy: -12, fun: 5 }, payout: [14, 24], help: "Earns 14–24 SB" }],
  },
  {
    id: "sputnik",
    name: "Sputnik DAO Community Hall",
    short: "Sputnik DAO",
    emoji: "🏛️",
    color: "#c4b5fd",
    style: "hall",
    pos: [-32, -6],
    height: 5,
    description: "Where NEAR DAOs vote. Show up, vote, get a small stipend.",
    url: "https://nearblocks.io/address/sputnik-dao.near",
    actions: [{ id: "vote", label: "Vote on proposals", emoji: "🗳️", cost: 0, durationSec: 10, effects: { social: 25, fun: 5 }, payout: [2, 6], help: "+25 social, 2–6 SB" }],
  },
  {
    id: "outlayer",
    name: "OutLayer Agent Lab",
    short: "OutLayer",
    emoji: "🤖",
    color: "#60a5fa",
    style: "lab",
    pos: [32, 6],
    height: 6,
    description: "Verifiable off-chain compute for NEAR (TEE-attested). Run agent jobs for a fee.",
    url: "https://outlayer.fastnear.com",
    actions: [
      { id: "agent_task", label: "Run an agent task", emoji: "🧠", cost: 6, durationSec: 20, effects: { energy: -5 }, payout: [12, 30], help: "Pay 6, earn 12–30 SB" },
      { id: "vrf", label: "VRF lucky draw", emoji: "🎲", cost: 5, durationSec: 6, effects: { fun: 15 }, payout: [0, 15], help: "Verifiable random: 0–15 SB" },
    ],
  },
  {
    id: "meme",
    name: "meme.cooking Launchpad",
    short: "meme.cooking",
    emoji: "🍳",
    color: "#fb923c",
    style: "launchpad",
    pos: [32, -18],
    height: 5,
    description: "Fair-launch memecoin kitchen on NEAR. Most memes flop. Some don't.",
    url: "https://meme.cooking",
    actions: [{ id: "launch", label: "Launch a memecoin", emoji: "🚀", cost: 20, durationSec: 12, effects: { fun: 30 }, payout: [0, 70], help: "Pay 20, get back 0–70 SB" }],
  },
  {
    id: "social",
    name: "NEAR Social Plaza",
    short: "NEAR Social",
    emoji: "💬",
    color: "#38bdf8",
    style: "hub",
    pos: [-7, 5.5],
    height: 1,
    description: "Open plaza for posts, likes and hanging out with neighbors.",
    url: "https://near.social",
    actions: [{ id: "post", label: "Post & hang out", emoji: "📣", cost: 0, durationSec: 10, effects: { social: 35, fun: 10 }, help: "+35 social, +10 fun" }],
  },
  {
    id: "meteor",
    name: "Meteor Wallet Store",
    short: "Meteor Wallet",
    emoji: "☄️",
    color: "#e879f9",
    style: "store",
    pos: [-32, 18],
    height: 4,
    description: "Pick up merch and wallet tips.",
    url: "https://wallet.meteorwallet.app",
    actions: [{ id: "merch", label: "Grab merch", emoji: "🧢", cost: 5, durationSec: 6, effects: { fun: 20 }, help: "Pay 5, +20 fun" }],
  },
  {
    id: "here",
    name: "HERE Wallet Kiosk",
    short: "HERE Wallet",
    emoji: "📲",
    color: "#facc15",
    style: "kiosk",
    pos: [6, 18],
    height: 3,
    description: "Mobile wallet kiosk. Stake a little, earn a little.",
    url: "https://www.herewallet.app",
    actions: [{ id: "stake", label: "Liquid-stake", emoji: "🥩", cost: 10, durationSec: 15, effects: {}, payout: [10, 14], help: "Lock 10, earn 10–14 SB" }],
  },
  {
    id: "intents",
    name: "NEAR Intents Cross-chain Hub",
    short: "NEAR Intents",
    emoji: "🌐",
    color: "#34d399",
    style: "hub",
    pos: [7, -26],
    height: 6,
    description: "Say what you want, solvers find the route across chains.",
    url: "https://near-intents.org",
    actions: [{ id: "xswap", label: "Cross-chain swap", emoji: "🌐", cost: 10, durationSec: 9, effects: { fun: 6 }, payout: [8, 15], help: "Pay 10, get back 8–15 SB" }],
  },
  {
    id: "explorer",
    name: "NEAR Explorer Data Center",
    short: "Explorer",
    emoji: "🔎",
    color: "#94a3b8",
    style: "datacenter",
    pos: [-7, -26],
    height: 4,
    description: "Racks of indexers. Help audit transactions.",
    url: "https://nearblocks.io",
    actions: [{ id: "audit", label: "Audit transactions", emoji: "🔎", cost: 0, durationSec: 15, effects: { energy: -10 }, payout: [10, 18], help: "Earns 10–18 SB" }],
  },
  {
    id: "electric",
    name: "Electric Capital Office",
    short: "Electric Capital",
    emoji: "⚡",
    color: "#fde047",
    style: "office",
    pos: [-20, -30],
    height: 7,
    description: "Pitch your side project. Rarely a grant, always good practice.",
    url: "https://www.electriccapital.com",
    actions: [{ id: "pitch", label: "Pitch your project", emoji: "🎤", cost: 0, durationSec: 15, effects: { energy: -15, social: 10 }, payout: [0, 40], help: "0–40 SB, usually 0" }],
  },
  {
    id: "pool",
    name: "NEAR Swimming Pool",
    short: "Swimming Pool",
    emoji: "🏊",
    color: "#22d3ee",
    style: "pool",
    pos: [7, 5.5],
    height: 1,
    description: "The neighborhood pool. Cheap, refreshing, social.",
    url: "https://near.org",
    actions: [{ id: "swim", label: "Go for a swim", emoji: "🏊", cost: 3, durationSec: 12, effects: { hygiene: 40, fun: 25, energy: -10, social: 10 }, help: "+40 hygiene, +25 fun" }],
  },
  {
    id: "a16z",
    name: "a16z crypto Outpost",
    short: "a16z crypto",
    emoji: "🅰️",
    color: "#fb7185",
    style: "office",
    pos: [20, -30],
    height: 8,
    description: "Crypto startup school sessions for anyone who walks in.",
    url: "https://a16zcrypto.com",
    actions: [{ id: "school", label: "Startup school", emoji: "🎓", cost: 0, durationSec: 14, effects: { energy: -10, social: 15, fun: 10 }, help: "+15 social, +10 fun" }],
  },
  {
    id: "dragonfly",
    name: "Dragonfly Research Lab",
    short: "Dragonfly",
    emoji: "🐉",
    color: "#2dd4bf",
    style: "lab",
    pos: [32, 18],
    height: 6,
    description: "Write a research thesis for a modest bounty.",
    url: "https://www.dragonfly.xyz",
    actions: [{ id: "research", label: "Research a thesis", emoji: "📑", cost: 0, durationSec: 16, effects: { energy: -15, fun: 5 }, payout: [12, 22], help: "Earns 12–22 SB" }],
  },
];

// Every place has somewhere to just hang out with whoever else is there.
for (const p of PLACES) {
  p.actions.push({
    id: "hang",
    label: "Hang out",
    emoji: "🥤",
    cost: 0,
    durationSec: 8,
    effects: { social: 15, fun: 8 },
    help: "+15 social, +8 fun with whoever is here",
  });
}

export const PLACE_BY_ID: Record<string, PlaceDef> = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export function placeActionId(placeId: string, actionId: string) {
  return `place:${placeId}:${actionId}`;
}

export function parsePlaceAction(id: string) {
  if (!id.startsWith("place:")) return null;
  const [, placeId, actionId] = id.split(":");
  const place = PLACE_BY_ID[placeId];
  const action = place?.actions.find((a) => a.id === actionId);
  return place && action ? { place, action } : null;
}
