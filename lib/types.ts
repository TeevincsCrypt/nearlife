export type NeedKey = "hunger" | "energy" | "social" | "fun" | "hygiene";
export type Needs = Record<NeedKey, number>;

export const NEED_KEYS: NeedKey[] = ["hunger", "energy", "social", "fun", "hygiene"];

export type NpcRole = "chef" | "barista" | "host" | "artisan" | "commuter";

export interface BusyState {
  action: string;
  label: string;
  startedAt: number;
  until: number;
  /** Item consumed/used, if any (for display). */
  itemId?: string;
  /** uid of the placed furniture being used (for the 3D view). */
  at?: string;
}

export interface CharacterLook {
  skin: string;
  hair: string;
  hairStyle: "short" | "long" | "afro" | "bald" | "bun";
  top: string;
  bottom: string;
}

export interface PlacedFurniture {
  uid: string;
  itemId: string;
  x: number;
  z: number;
  /** Quarter turns (0-3). */
  rot: number;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  look?: CharacterLook;
  needs: Needs;
  busy?: BusyState | null;
  /** Last decision an NPC agent made, shown in the UI. */
  thought?: string;
}

export interface Household {
  id: string;
  name: string;
  kind: "player" | "npc";
  /** NEAR account that holds this household's NEP-245 tokens. */
  accountId: string;
  /** Where the account came from: Privy embedded wallet or server-derived implicit account. */
  accountSource: "privy" | "derived";
  ownerIds: string[];
  ownerNames: string[];
  role?: NpcRole;
  color: string;
  characters: Character[];
  createdAt: number;
  lastActive: number;
  /** NPC pricing memory per item id (dynamic pricing). */
  priceMemory?: Record<string, number>;
  /** Furniture placed in the home (8×8 grid). */
  layout: PlacedFurniture[];
  wallColor?: string;
  floorColor?: string;
  lastTopup?: number;
}

export interface Listing {
  id: string;
  sellerHouseholdId: string;
  sellerAccountId: string;
  itemId: string;
  price: number;
  quantity: number;
  initialQuantity: number;
  createdAt: number;
  lastSoldAt?: number;
  lastRepricedAt?: number;
}

export type ActivityType =
  | "listing"
  | "purchase"
  | "action"
  | "production"
  | "social"
  | "join"
  | "price"
  | "system";

export interface ActivityEvent {
  id: string;
  ts: number;
  type: ActivityType;
  householdId?: string;
  householdName?: string;
  isNpc?: boolean;
  text: string;
  emoji: string;
  amount?: number;
  counterpartyHouseholdId?: string;
  counterpartyIsNpc?: boolean;
  txHash?: string;
}

/** NEP-245 event (NEP-297 envelope) as it would appear in an on-chain log. */
export interface Nep245Event {
  standard: "nep245";
  version: "1.0.0";
  event: "mt_mint" | "mt_burn" | "mt_transfer";
  data: Array<{
    owner_id?: string;
    old_owner_id?: string;
    new_owner_id?: string;
    token_ids: string[];
    amounts: string[];
    memo?: string;
  }>;
}

export interface LoggedNep245Event {
  seq: number;
  ts: number;
  event: Nep245Event;
  txHash?: string;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastAdvance: number;
  lastNpcTick: number;
  lastForcedTick?: number;
  tickCount: number;
  households: Record<string, Household>;
  listings: Record<string, Listing>;
  /** NEP-245 ledger: accountId -> tokenId -> amount */
  balances: Record<string, Record<string, number>>;
  activity: ActivityEvent[];
  nep245Log: LoggedNep245Event[];
  nep245Seq: number;
  /** On-chain settlement receipts (only when on-chain settlement is enabled). */
  settlements: Array<{ ts: number; seq: number; txHash?: string; error?: string }>;
  /** userId -> householdId */
  players: Record<string, string>;
  worldEvent?: { id: string; startedAt: number; endsAt: number };
  stats: {
    trades: number;
    volume: number;
    npcBuysFromPlayers: number;
    playerBuysFromNpcs: number;
    playerToPlayer: number;
  };
}

export interface HouseholdView extends Household {
  balance: number;
  inventory: Record<string, number>;
  activeListings: number;
  mood: number;
}

export interface StateSnapshot {
  now: number;
  households: HouseholdView[];
  listings: Listing[];
  activity: ActivityEvent[];
  stats: GameState["stats"] & { tickCount: number; lastNpcTick: number };
  worldEvent: { id: string; startedAt: number; endsAt: number } | null;
  me: { userId: string; householdId: string | null } | null;
  config: {
    auth: "privy" | "guest" | "privy+guest";
    storage: "redis" | "memory";
    settlement: "ledger" | "onchain";
    network: string;
    nep245Contract: string;
    escrowAccount: string;
    npcTickMs: number;
  };
}
