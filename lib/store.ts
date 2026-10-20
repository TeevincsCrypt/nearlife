/**
 * Game state persistence. Uses Upstash Redis when configured (required for a shared
 * world across Vercel serverless instances), otherwise an in-process memory store
 * (fine for `npm run dev` and single-instance demos).
 */
import { Redis } from "@upstash/redis";
import { createInitialState } from "./seed";
import type { GameState } from "./types";

const KEY = process.env.NEARLIFE_STATE_KEY || "nearlife:state:v1";
const LOCK_KEY = `${KEY}:lock`;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const storageMode: "redis" | "memory" = redis ? "redis" : "memory";

const g = globalThis as unknown as { __nearlifeState?: GameState; __nearlifeQueue?: Promise<unknown> };

async function load(): Promise<GameState> {
  if (!redis) {
    if (!g.__nearlifeState) g.__nearlifeState = createInitialState(Date.now());
    return g.__nearlifeState;
  }
  const raw = await redis.get<GameState | string>(KEY);
  if (raw) return typeof raw === "string" ? (JSON.parse(raw) as GameState) : raw;
  const fresh = createInitialState(Date.now());
  await redis.set(KEY, JSON.stringify(fresh));
  return fresh;
}

async function save(state: GameState) {
  if (!redis) {
    g.__nearlifeState = state;
    return;
  }
  await redis.set(KEY, JSON.stringify(state));
}

export async function readState(): Promise<GameState> {
  return structuredClone(await load());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!redis) {
    // Serialize mutations within this process.
    const prev = g.__nearlifeQueue ?? Promise.resolve();
    const run = prev.then(fn, fn);
    g.__nearlifeQueue = run.catch(() => undefined);
    return run;
  }
  const token = Math.random().toString(36).slice(2);
  for (let i = 0; i < 50; i++) {
    const ok = await redis.set(LOCK_KEY, token, { nx: true, px: 5000 });
    if (ok) {
      try {
        return await fn();
      } finally {
        const current = await redis.get<string>(LOCK_KEY);
        if (current === token) await redis.del(LOCK_KEY);
      }
    }
    await sleep(80 + Math.random() * 80);
  }
  throw new Error("Game state is busy, try again");
}

/** Load state, apply a mutation, save it. The mutation works on a private copy. */
export async function mutateState<T>(fn: (state: GameState) => T): Promise<{ state: GameState; result: T }> {
  return withLock(async () => {
    const state = structuredClone(await load());
    const result = fn(state);
    await save(state);
    return { state, result };
  });
}

export async function resetState() {
  return withLock(async () => {
    const fresh = createInitialState(Date.now());
    await save(fresh);
    return fresh;
  });
}
