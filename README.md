# NEARLIFE

NEARLIFE is a browser life simulation inspired by The Sims, built for the NEAR Hackathon 2026 **Games With Real Economies** track. Players and autonomous NPC households share one neighborhood. Every character has needs that decay over time. Every household has a NEAR account that holds a NEP-245 balance of SimBucks and items. Players make goods and services and list them on a public market. NPC agents buy those listings when their own needs require it.

## What it does

Most game economies have prices set by the designer and no one on the other side of a trade. In NEARLIFE, demand comes from simulated needs. A hungry NPC, or another player, buys the cheapest meal on the market with tokens from their own account. If you cook and list meals for less than the NPC chef charges, your meals sell, and you can watch it happen in a public feed that every player sees.

## Demo for judges (about 2 minutes)

Run it locally (`npm install && npm run dev`, then open http://localhost:3000), or open the deployed URL.

| # | Do this | You will see |
|---|---------|--------------|
| 1 | On the home page, click **Sign in with Email or Google** (Privy). With no Privy configured, type a name and click **Play as guest**. | You are signed in. With Privy, a NEAR wallet is created in the background and no wallet popup appears. |
| 2 | In **Create your household**, keep or edit the name and characters (1–4), then click **🏠 Move in**. | Your household page opens with 100 SimBucks and a NEAR account id. "X moved into the neighborhood" appears in the public feed. |
| 3 | On a character, click **🍳 Cook** (costs 5 SB). Wait 15 s for the progress bar to finish. | **Inventory** shows 🍲 Cooked Meal ×2, and the feed shows "made 2× Cooked Meal". |
| 4 | In **List on the public market**, choose Cooked Meal and keep the suggested price, which is 1 SB under the cheapest competing listing. Click **🏷️ List**. | The listing appears under **Active listings** and on **/market**, and "listed 2× 🍲 Cooked Meal" appears in the feed. |
| 5 | Click **🤖 Run NPC tick** a few times, or wait about 30 s. | The feed shows `🤖 Yui (The Nakamuras, NPC) was low on hunger and bought 🍲 Cooked Meal from <your household> for N SB`, with an amber "NPC bought from a player" tag. Your SimBucks go up. The NPC's character card shows its reasoning, e.g. "Hunger 32 → bought Cooked Meal from … for 10 SB". |
| 6 | Open **Neighborhood** (`/`). | All player households and the 5 NPC households appear together with their mood, balance, listings and presence ("Active now" / "Away"). The stats bar counts **NPC buys from players**. |
| 7 | Optional multiplayer check: open a second browser (or an incognito window), sign in as another player, and buy something on **/market**. | The first player sees the new household, its listings and its purchases in their feed. |

Other things to try:
- **💼 Work** earns SimBucks; pay is lower when the character's mood is low.
- Buy 🛏️ Comfy Bed / 🕹️ Arcade Cabinet: owned furniture boosts Rest / Watch TV.
- **copy invite code** on your household lets a friend join it as co-owner.

## Core loop

1. **Needs.** Every character has Hunger, Energy, Social, Fun and Hygiene (0–100). They decay in real time (about 4–7 points/min).
2. **Actions.** Care actions (Rest, Groceries, Shower, Chat, Watch TV) restore needs. **Work** pays SimBucks. Production actions turn SimBucks into goods and services to sell:
   - 🍳 Cook → 2× Cooked Meal (Hunger +55)
   - ☕ Brew → 3× Espresso (Energy +30)
   - 🎉 Plan Party → 3× Party Invite (Social +45, Fun +20)
   - 🎲 Game Night → 2× seats (Fun +45)
   - 🛁 Run Spa → 2× Spa Session (Hygiene +55)
   - 🔨 Craft → furniture
3. **Market.** A listing moves tokens into a market escrow account. A purchase is two NEP-245 transfers: SimBucks buyer → seller and the item escrow → buyer. Anyone can buy: players with a click, NPCs automatically.
4. **NPC agents.** There are five NPC households: a chef, a barista, a party host, an artisan and commuters. Each has its own NEAR implicit account. On every tick (`lib/npc-agent.ts`) each idle NPC character does the first of these that applies:
   - If any need is below 55 (72 when the NPC has savings), it uses an owned item that fixes that need. If it owns none, it **buys the cheapest affordable listing that fixes it, from any seller, players included**. If nothing suitable is listed, it fixes the need at home.
   - If money is low, it works.
   - If its role's market stock is low, it produces goods and lists them.
   - If it is rich, it buys furniture.
5. **Supply and demand.** An NPC listing with no buyer for 90 s drops 10% in price, but never below 85% of base, so players can always undercut. A listing that sells out within a minute raises the NPC's next price by 10%. When many NPCs are hungry, cheap meals sell within one tick.
6. **Shared visibility.** The neighborhood, market, households and activity feed are public. Presence shows each player as "Active now", "Active Xm ago" or "Away".

The world advances lazily. Every `GET /api/state` (each client polls every 3 s) applies decay since the last update, completes finished actions, and runs an NPC tick if 10 s have passed. **Run NPC tick** (`POST /api/npc-tick`) adds 3 minutes of NPC need decay and runs a tick right away, so a demo doesn't have to wait.

## NEAR features used

| Feature | Where | How |
|---|---|---|
| **Social login (Privy)** | `components/auth-provider.tsx`, `lib/auth.ts` | Email and Google login via `@privy-io/react-auth`. After login, the client silently creates a **Privy embedded NEAR wallet** (`useCreateWallet({ chainType: "near" })` from `@privy-io/react-auth/extended-chains`), and its implicit account id becomes the household's NEAR account. Every API request is checked server-side with `verifyAccessToken` from `@privy-io/node` (JWKS). If wallet creation fails, or in guest mode, the server derives a deterministic ed25519 implicit account instead (`lib/accounts.ts`). |
| **NEP-245 multi-token** | `lib/nep245.ts`, `GET /api/nep245` | One multi-token ledger holds the fungible currency `simbucks` and every item type (`meal`, `espresso`, `party_invite`, `game_night`, `spa_session`, `comfy_bed`, `arcade`). It implements `mt_transfer`, `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`, `mt_metadata`, plus mint and burn. Each change emits a standard NEP-297 `EVENT_JSON:{"standard":"nep245","version":"1.0.0","event":"mt_transfer",...}` log. Inspect it at `/api/nep245?method=events`. |
| **Agent NPCs** | `lib/npc-agent.ts`, `lib/seed.ts` | Five autonomous households, each with its own NEAR implicit account and NEP-245 balance. They earn, spend, produce, list and reprice without human input, and trade with each other and with players. |
| **NEAR RPC** | `lib/near.ts`, `GET /api/near/balance` | Household pages show the account's native NEAR balance read live from NEAR RPC (testnet by default), with a link to the block explorer. |
| **On-chain settlement (optional)** | `lib/near.ts` | Set `NEP245_CONTRACT_ID`, `NEAR_OPERATOR_ACCOUNT_ID` and `NEAR_OPERATOR_PRIVATE_KEY` to replay every ledger event against a NEP-245 contract after the response is sent (`after()` in Next.js). Transfers are sent as `mt_transfer(receiver_id, token_id, amount, approval, memo)` with a 1 yocto deposit; mint and burn go to `mt_mint`/`mt_burn`. The operator must be the contract owner and approved for player tokens. Players never sign, and gameplay stays instant. |

### Honest scope notes
- **Off-chain by default.** Without the settlement variables, the NEP-245 ledger runs on the game server (Redis or memory), with NEP-245 semantics and event format.
- **Settlement not tested on a live contract.** On-chain settlement needs a deployed NEP-245 contract that supports operator approvals and owner mint/burn. This repository does not deploy one, and that path has not been run against a live contract.
- **Implicit accounts are unfunded.** They show "not funded" in the explorer until someone sends them NEAR.
- **NEAR Intents** (cross-chain payment) is not included.
- **OutLayer** is not used. NPC agents run as server-side logic driven by ticks.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui-style components (`components/ui`, `components.json`)
- Privy (`@privy-io/react-auth`, `@privy-io/node`)
- `near-api-js` v7 for RPC reads and optional settlement
- `@noble/curves` for implicit-account derivation
- Upstash Redis for shared game state (falls back to in-memory)
- SWR polling for live updates

No Solana libraries are used by this code. Privy installs some as optional transitive dependencies.

## Project structure

```
app/
  page.tsx                  Shared neighborhood: all households + stats + live activity feed
  market/page.tsx           Public market: filter by need / seller, buy, create listings
  household/[id]/page.tsx   Household: characters, needs, actions, inventory, listings, NEAR account
  api/state                 GET  world snapshot (also advances the simulation)
  api/household             POST create household  ·  api/household/join  POST join by invite code
  api/action                POST start an action for a character
  api/use                   POST consume an owned item on a character
  api/listing               POST create listing  ·  DELETE ?id= cancel
  api/buy                   POST buy one unit of a listing
  api/npc-tick              POST manual NPC tick (fast-forward)  ·  GET for Vercel Cron
  api/activity              GET  public activity feed
  api/nep245                GET  NEP-245 views + event log
  api/near/balance          GET  native NEAR balance via RPC
  api/reset                 POST reset world (admin token)
components/                 NeedsBar, CharacterCard, ListingCard, ActivityFeed, HouseholdLot, ...
lib/
  catalog.ts                Items, actions, need decay rates, NPC roles
  engine.ts                 Needs decay, actions, market, world advance, snapshots
  npc-agent.ts              Autonomous NPC decision loop + dynamic pricing
  nep245.ts                 NEP-245 multi-token ledger + events
  near.ts                   NEAR RPC + optional on-chain settlement
  accounts.ts               Implicit NEAR account derivation
  auth.ts / privy.ts        Server token verification / client Privy helpers
  store.ts                  Upstash Redis or memory store with a lock
scripts/simulate.ts         Headless economy simulation (npm run simulate -- 30)
```

## Running locally

```bash
npm install
cp .env.example .env.local   # optional; everything works with no env vars
npm run dev                  # http://localhost:3000
npm run simulate -- 30       # optional: 30 game-minutes of the economy in the terminal
```

With no environment variables the app runs in **guest login + in-memory state + off-chain NEP-245 ledger** mode. Add `NEXT_PUBLIC_PRIVY_APP_ID` for social login.

## Deploying to Vercel

1. Import the repo into Vercel.
2. Add an **Upstash Redis** integration (or set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). This is required on Vercel: serverless instances do not share memory, so without Redis each instance would run its own world.
3. Set `NEXT_PUBLIC_PRIVY_APP_ID`. In the Privy dashboard, enable the Email and Google login methods and add your Vercel domain to the allowed origins.
4. Set `NEARLIFE_ACCOUNT_SECRET` to a random string.
5. Optional: set `NEXT_PUBLIC_ENABLE_GUEST=true` to keep guest login next to Privy, `CRON_SECRET` for the cron route, and `NEARLIFE_ADMIN_TOKEN` for resets.

`vercel.json` registers a daily cron on `/api/npc-tick` (the Hobby plan only allows daily crons). Moment-to-moment simulation is driven by client polling, so the world is live whenever someone has it open.

## Environment variables

All variables are documented in [`.env.example`](./.env.example).

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | for social login | Privy app id. If unset, guest login is used. |
| `PRIVY_VERIFICATION_KEY` | no | PEM verification key. If unset, the server uses Privy's JWKS. |
| `NEXT_PUBLIC_ENABLE_GUEST` | no | Show guest login when Privy is on. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | on Vercel | Shared world state (`KV_REST_API_*` also works). |
| `NEARLIFE_STATE_KEY` | no | Redis key. Change it to start a fresh world. |
| `NEXT_PUBLIC_NEAR_NETWORK`, `NEAR_RPC_URL` | no | `testnet` (default) or `mainnet`, plus a custom RPC. |
| `NEARLIFE_ACCOUNT_SECRET` | yes in prod | Seed for derived NPC and fallback player implicit accounts. |
| `NEARLIFE_ESCROW_ACCOUNT` | no | Market escrow account id used in NEP-245 events. |
| `NEP245_CONTRACT_ID`, `NEAR_OPERATOR_ACCOUNT_ID`, `NEAR_OPERATOR_PRIVATE_KEY` | no | Enable on-chain settlement. |
| `NPC_TICK_MS` | no | NPC tick interval (default 10000). |
| `CRON_SECRET` | no | Protects `GET /api/npc-tick`. |
| `NEARLIFE_ADMIN_TOKEN` | no | Enables `POST /api/reset`. |

## API quick reference (for automated judges)

```bash
curl -s localhost:3000/api/state | jq '.snapshot.stats'
curl -s 'localhost:3000/api/activity?type=purchase&limit=5' | jq '.activity[].text'
curl -s 'localhost:3000/api/nep245?method=events&limit=3' | jq '.events[].log'
curl -s 'localhost:3000/api/nep245?method=mt_supply&token_id=simbucks'

# Play as a guest from the command line
G='x-guest-id: guest_cli00000001'; J='content-type: application/json'
curl -s -XPOST localhost:3000/api/household -H "$G" -H "$J" -d '{"name":"CLI House","characters":[{"name":"Ada"}]}' | jq .result
HID=$(curl -s localhost:3000/api/state -H "$G" | jq -r .snapshot.me.householdId)
curl -s -XPOST localhost:3000/api/action -H "$G" -H "$J" -d "{\"characterId\":\"$HID-0\",\"action\":\"cook\"}" > /dev/null
sleep 16; curl -s localhost:3000/api/state -H "$G" > /dev/null
curl -s -XPOST localhost:3000/api/listing -H "$G" -H "$J" -d '{"itemId":"meal","quantity":2,"price":8}' > /dev/null
for i in 1 2 3; do curl -s -XPOST localhost:3000/api/npc-tick > /dev/null; sleep 2; done
curl -s 'localhost:3000/api/activity?type=purchase&limit=10' | jq -r '.activity[].text' | grep 'CLI House'
```
