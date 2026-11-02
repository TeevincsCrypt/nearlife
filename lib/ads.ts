/**
 * Billboard advertising: NEAR projects book a billboard in the city and pay in NEAR straight to the
 * owner's treasury account. The server checks the payment on-chain, the owner approves the ad, and it
 * runs for the booked days. Bookings and images live in the side store, not the game state.
 */
import { AD_DAYS, AD_SLOTS, type LiveAd } from "./ad-slots";
import { isValidNearAccountId } from "./accounts";
import { nearToYocto } from "./near-real";
import { kvGet, kvMutate, kvSet } from "./store";

export const AD_TREASURY = (process.env.NEARLIFE_AD_TREASURY || "").trim().toLowerCase();
export const AD_NETWORK = (process.env.NEARLIFE_AD_NETWORK === "testnet" ? "testnet" : "mainnet") as "mainnet" | "testnet";
/** Base price per billboard per day, in NEAR (busier spots multiply it). */
export const AD_PRICE_NEAR = Number(process.env.NEARLIFE_AD_PRICE_NEAR || 1);
const AD_RPC = process.env.NEARLIFE_AD_RPC_URL || (AD_NETWORK === "mainnet" ? "https://rpc.mainnet.fastnear.com" : "https://rpc.testnet.fastnear.com");
/** Local testing only: accept bookings without checking the chain. Never set this in production. */
const DEV_SKIP_VERIFY = process.env.NEARLIFE_AD_DEV_SKIP_VERIFY === "1";

const ADS_KEY = `${process.env.NEARLIFE_STATE_KEY || "nearlife:state:v1"}:ads`;
const imageKey = (id: string) => `${ADS_KEY}:img:${id}`;
const DAY = 86_400_000;
const MAX_IMAGE_BYTES = 160_000;

export interface AdBooking {
  id: string;
  slot: string;
  name: string;
  tagline: string;
  url: string;
  color: string;
  contact: string;
  days: number;
  priceNear: number;
  payer: string;
  txHash: string;
  hasImage: boolean;
  status: "pending" | "approved" | "rejected";
  note?: string;
  createdAt: number;
  startAt?: number;
  endAt?: number;
  views: number;
  clicks: number;
}

interface AdsData {
  bookings: AdBooking[];
  usedTx: string[];
}

const empty = (): AdsData => ({ bookings: [], usedTx: [] });

export class AdError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const adsOpen = () => Boolean(AD_TREASURY && isValidNearAccountId(AD_TREASURY) && AD_PRICE_NEAR > 0);

export function adPrice(slotId: string, days: number) {
  const slot = AD_SLOTS.find((s) => s.id === slotId);
  if (!slot) throw new AdError(400, "Pick a billboard");
  return Math.round(AD_PRICE_NEAR * slot.mult * days * 100) / 100;
}

async function load() {
  return (await kvGet<AdsData>(ADS_KEY)) ?? empty();
}

const isLive = (b: AdBooking, now: number) => b.status === "approved" && (b.startAt ?? Infinity) <= now && now < (b.endAt ?? 0);

/** When a slot is next free (the end of its last approved booking). */
function nextFree(bookings: AdBooking[], slotId: string, now: number) {
  return bookings.filter((b) => b.slot === slotId && b.status === "approved").reduce((t, b) => Math.max(t, b.endAt ?? 0), now);
}

export async function publicAds(now = Date.now()) {
  const data = await load();
  const live: LiveAd[] = [];
  for (const slot of AD_SLOTS) {
    const b = data.bookings.find((x) => x.slot === slot.id && isLive(x, now));
    if (b) live.push({ id: b.id, slot: b.slot, name: b.name, tagline: b.tagline, url: b.url, color: b.color, hasImage: b.hasImage });
  }
  return {
    open: adsOpen(),
    treasury: AD_TREASURY,
    network: AD_NETWORK,
    priceNear: AD_PRICE_NEAR,
    days: AD_DAYS,
    slots: AD_SLOTS.map((s) => ({ ...s, pricePerDay: adPrice(s.id, 1), nextFree: nextFree(data.bookings, s.id, now), pending: data.bookings.filter((b) => b.slot === s.id && b.status === "pending").length })),
    live,
  };
}

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Accepts PNG, JPEG or WebP data URLs only (no SVG: it can carry scripts). */
function parseImage(dataUrl: unknown): Buffer | null {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) throw new AdError(400, "Logo must be a PNG, JPG or WebP image");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_IMAGE_BYTES) throw new AdError(400, "Logo is too big (max 160 KB)");
  const png = buf[0] === 0x89 && buf[1] === 0x50;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const webp = buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpg && !webp) throw new AdError(400, "That file isn't a valid image");
  return buf;
}

export function imageType(buf: Buffer) {
  if (buf[0] === 0x89) return "image/png";
  if (buf[0] === 0xff) return "image/jpeg";
  return "image/webp";
}

/** Check on NEAR that `payer` sent at least `priceNear` to the treasury in transaction `txHash`. */
async function verifyPayment(txHash: string, payer: string, priceNear: number) {
  if (DEV_SKIP_VERIFY) return;
  let json: {
    result?: { status?: Record<string, unknown>; transaction?: { signer_id: string; receiver_id: string; actions: Array<Record<string, { deposit?: string }> | string> } };
    error?: { cause?: { name?: string }; message?: string };
  };
  try {
    const res = await fetch(AD_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "nearlife", method: "tx", params: { tx_hash: txHash, sender_account_id: payer, wait_until: "EXECUTED_OPTIMISTIC" } }),
    });
    json = await res.json();
  } catch {
    throw new AdError(502, "Couldn't reach NEAR to check the payment. Try again in a minute.");
  }
  const tx = json.result?.transaction;
  if (!tx) throw new AdError(400, "Transaction not found. Check the hash and the account you paid from.");
  if (tx.signer_id !== payer) throw new AdError(400, "That transaction was sent from a different account");
  if (tx.receiver_id !== AD_TREASURY) throw new AdError(400, `That payment went to ${tx.receiver_id}, not ${AD_TREASURY}`);
  const status = json.result?.status ?? {};
  if (!("SuccessValue" in status || "SuccessReceiptId" in status)) throw new AdError(400, "That transaction failed on-chain");
  let paid = 0n;
  for (const a of tx.actions) if (typeof a === "object" && a.Transfer?.deposit) paid += BigInt(a.Transfer.deposit);
  if (paid < nearToYocto(priceNear)) throw new AdError(400, `That payment is less than the ${priceNear} NEAR price`);
}

export interface BookingInput {
  slot?: string;
  days?: number;
  name?: string;
  tagline?: string;
  url?: string;
  color?: string;
  contact?: string;
  image?: string;
  payer?: string;
  txHash?: string;
}

export async function createBooking(input: BookingInput, now = Date.now()) {
  if (!adsOpen()) throw new AdError(503, "Advertising isn't open yet");
  const slot = AD_SLOTS.find((s) => s.id === input.slot);
  if (!slot) throw new AdError(400, "Pick a billboard");
  const days = Number(input.days);
  if (!AD_DAYS.includes(days)) throw new AdError(400, "Pick how many days");
  const name = clean(input.name, 28);
  if (name.length < 2) throw new AdError(400, "Add your project's name");
  const tagline = clean(input.tagline, 64);
  let url: URL;
  try {
    url = new URL(String(input.url ?? ""));
  } catch {
    throw new AdError(400, "Add your project's website (https://…)");
  }
  if (url.protocol !== "https:" || url.href.length > 200) throw new AdError(400, "The website must start with https://");
  const color = /^#[0-9a-f]{6}$/i.test(String(input.color)) ? String(input.color) : "#2a4ed0";
  const contact = clean(input.contact, 80);
  if (!contact) throw new AdError(400, "Add a contact (Telegram, X or email) so we can reach you");
  const payer = String(input.payer ?? "").trim().toLowerCase();
  if (!isValidNearAccountId(payer)) throw new AdError(400, "Add the NEAR account you paid from");
  const txHash = String(input.txHash ?? "").trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(txHash)) throw new AdError(400, "Paste the payment's transaction hash");
  const image = parseImage(input.image);
  const priceNear = adPrice(slot.id, days);

  const already = await load();
  if (already.usedTx.includes(txHash)) throw new AdError(409, "That payment was already used for a booking");
  await verifyPayment(txHash, payer, priceNear);

  const id = `ad_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  if (image) await kvSet(imageKey(id), image.toString("base64"));
  return kvMutate(ADS_KEY, empty, (data) => {
    if (data.usedTx.includes(txHash)) throw new AdError(409, "That payment was already used for a booking");
    data.usedTx.push(txHash);
    const booking: AdBooking = { id, slot: slot.id, name, tagline, url: url.href, color, contact, days, priceNear, payer, txHash, hasImage: !!image, status: "pending", createdAt: now, views: 0, clicks: 0 };
    data.bookings.push(booking);
    return { id, status: booking.status, priceNear };
  });
}

/** What the advertiser can see about their booking. */
export async function bookingStatus(id: string, now = Date.now()) {
  const b = (await load()).bookings.find((x) => x.id === id);
  if (!b) return null;
  const state = b.status === "approved" ? (isLive(b, now) ? "live" : (b.endAt ?? 0) <= now ? "finished" : "scheduled") : b.status;
  return { id: b.id, name: b.name, slot: b.slot, days: b.days, priceNear: b.priceNear, state, note: b.note, startAt: b.startAt, endAt: b.endAt, views: b.views, clicks: b.clicks };
}

export async function adImage(id: string) {
  const b64 = await kvGet<string>(imageKey(id));
  return b64 ? Buffer.from(b64, "base64") : null;
}

/** Count a view or click on a live ad. */
export async function recordAdEvent(id: string, kind: "view" | "click", now = Date.now()) {
  await kvMutate(ADS_KEY, empty, (data) => {
    const b = data.bookings.find((x) => x.id === id);
    if (!b || !isLive(b, now)) return;
    if (kind === "view") b.views += 1;
    else b.clicks += 1;
  });
}

// ---- owner admin ----

export function isAdmin(req: Request) {
  const token = process.env.NEARLIFE_ADMIN_TOKEN;
  return Boolean(token && req.headers.get("authorization") === `Bearer ${token}`);
}

export async function allBookings() {
  return (await load()).bookings.slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function reviewBooking(id: string, op: "approve" | "reject" | "stop", note: string, now = Date.now()) {
  return kvMutate(ADS_KEY, empty, (data) => {
    const b = data.bookings.find((x) => x.id === id);
    if (!b) throw new AdError(404, "Booking not found");
    if (op === "approve") {
      if (b.status === "approved") return b;
      b.status = "approved";
      b.startAt = nextFree(data.bookings, b.slot, now);
      b.endAt = b.startAt + b.days * DAY;
    } else if (op === "reject") {
      b.status = "rejected";
      b.note = clean(note, 200) || "Not approved";
    } else {
      // Take a live ad down early (e.g. reported); it won't show again.
      b.status = "rejected";
      b.endAt = Math.min(b.endAt ?? now, now);
      b.note = clean(note, 200) || "Removed";
    }
    return b;
  });
}
