# NEARLIFE

NEARLIFE is a mobile-first 3D life simulation for the NEAR Hackathon 2026 **Games With Real Economies** track. Players move into one shared neighborhood. Each player furnishes a home, looks after their Sims' needs, works shifts, makes goods and services, and trades them with other players. Every household has a NEAR account. SimBucks, food, services and furniture are NEP-245 tokens held by that account.

Every household in the world is a real player. There are no scripted or computer-controlled neighbors.

## What it does

Needs create demand, and the people meeting that demand are other players. A Sim gets hungry, so its player buys a meal from the cheapest neighbor on the night market. Someone else's Sim is bored, so they buy a Game Night seat you made. Each trade is two NEP-245 transfers between player accounts, and every trade is visible to the whole neighborhood in the live ticker, the Feed and the trade screen in the city.

## Demo (about 2 minutes, best on a phone)

Open the deployed URL, or run locally with `npm install && npm run dev` and open http://localhost:3000. Use two browsers (or one normal window and one private window) to play as two neighbors.

| # | Do this | You will see |
|---|---------|--------------|
| 1 | **Player A:** tap **Continue with Email or Google** (Privy), or type a name and tap **Play as guest**. | Signed in. With Privy, a NEAR wallet is created in the background. |
| 2 | Customize your Sim (skin, hairstyle, hair color, top; up to 4 Sims) in the live 3D preview, then tap **Move in**. | A 3D isometric flat with a mattress, fridge, cooker, shower and chair. The top strip shows the game clock, neighborhood event and balance (150 SB). The Sim card bottom-left shows mood and five need meters. |
| 3 | Tap the **cooker** → **Cook** (5 SB), or **Pad → Make → Cook**. | The Sim walks to the cooker and a timer bubble counts down. After 15 s you own 2 Cooked Meals (NEP-245 tokens). |
| 4 | **Pad → Sell → List.** | The listing appears in the LIVE ticker, Feed, and Night Market. |
| 5 | **Player B:** sign in, move in, open **Pad → Market**, and buy Player A's meal. | Player A's SimBucks go up. Both players see "<B> bought 🍲 Cooked Meal from <A> for N SB" in the ticker and the Feed. |
| 6 | Either player: tap **City** in the dock. | The neighborhood map shows each player's home with a pin (online / recently active / away), empty plots ready for the next player, the Night Market, Work Hub, Plaza and the live trade screen. |
| 7 | Tap the other player's house. | You walk into their 3D home and see their Sims and furniture. You can shop their listings from there. |
| 8 | **Build** in the dock → **Fun → TV** → tap the floor → confirm. | The TV is placed (the outline turns green or red to show whether it fits). Tap any piece to move, turn, store or sell it back. |

## How the game works

- **Sims.** Stylised humans with jointed arms and legs who walk, sit at chairs and sofas, lie on beds, and leave the house for work shifts. A neon halo above the selected Sim shows its mood.
- **Needs.** Hunger, Energy, Social, Fun and Hygiene drop in real time. Mood (their average) scales work pay.
- **Home and furniture.** Each home is an 8×8 grid, and actions need furniture:

  | Action | Needs |
  |---|---|
  | Sleep | bed |
  | Groceries | fridge |
  | Cook | cooker |
  | Brew | coffee machine |
  | Shower | shower or bathtub |
  | Watch TV | TV or arcade |
  | Plan Party | party speaker |
  | Game Night | card table |
  | Run Spa | massage table |
  | Craft | workbench |

  Better pieces (Comfy Bed, Bathtub, Arcade) add a bonus. Furniture is a NEP-245 token: buy it from the Build catalogue, store it, list it on the market, or sell it back for half price.
- **Earning.**
  - Pad → Jobs: work shifts at the Work Hub.
  - Pad → Make: turn SimBucks and furniture into meals, espresso, party invites, game-night seats, spa sessions and crafted furniture.
  - Pad → Sell: list what you made for other players.
- **Market.** Listings are public. Listed tokens sit in a market escrow account until bought or cancelled.
- **Neighborhood events** rotate every 4 minutes:
  - ⚡ Power cut: TVs, coffee machines and speakers don't work.
  - 🍲 Food festival: hunger drops faster.
  - 💰 Payday: shifts pay 1.5×.
  - 🥵 Heatwave: hygiene and energy drop faster.
- **Clock.** 1 real second = 1 game minute, so a full day/night cycle takes 24 minutes.
- **Social.** "Call a neighbor" picks a Sim from another player's household (preferring people who are online). It boosts both Sims' Social, and the call shows in the feed.
- **Leaders.** Households ranked by net worth (SimBucks + furniture).
- **Top up (+).** Testnet faucet (+100 SB every 5 minutes) plus shortcuts to the ways of earning.

The world advances lazily. Every `GET /api/state` (clients poll every 3 s) applies need decay, finishes actions and rotates events.

## NEAR features used

| Feature | Where | How |
|---|---|---|
| **Social login (Privy)** | `components/auth-provider.tsx`, `lib/auth.ts` | Email and Google login via `@privy-io/react-auth`. After login the client silently creates a **Privy embedded NEAR wallet** (`useCreateWallet({ chainType: "near" })` from `@privy-io/react-auth/extended-chains`), and its implicit account id becomes the household's NEAR account. Every API request is checked server-side with `verifyAccessToken` from `@privy-io/node` (JWKS). If wallet creation fails, or in guest mode, the server derives a deterministic ed25519 implicit account instead (`lib/accounts.ts`). |
| **NEP-245 multi-token** | `lib/nep245.ts`, `GET /api/nep245` | One multi-token ledger holds the currency `simbucks`, consumables and services (`meal`, `espresso`, `party_invite`, `game_night`, `spa_session`) and every furniture type (`mattress`, `comfy_bed`, `tv`, `arcade`, …). Placed furniture is backed by real token balances. The ledger implements `mt_transfer`, `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`, `mt_metadata`, plus mint and burn. Each change emits a standard NEP-297 `EVENT_JSON:{"standard":"nep245","version":"1.0.0",...}` log. Inspect it at `/api/nep245?method=events` or in Pad → Wallet. |
| **NEAR RPC** | `lib/near.ts`, `GET /api/near/balance` | Pad → Wallet shows the account's native NEAR balance read from NEAR RPC (testnet by default), with an explorer link. |
| **On-chain settlement (optional)** | `lib/near.ts` | Set `NEP245_CONTRACT_ID`, `NEAR_OPERATOR_ACCOUNT_ID` and `NEAR_OPERATOR_PRIVATE_KEY` to replay every ledger event against a NEP-245 contract after each response (`after()` in Next.js). Transfers are sent as `mt_transfer(receiver_id, token_id, amount, approval, memo)` with a 1 yocto deposit; mint and burn go to `mt_mint`/`mt_burn`. The operator must own the contract and be approved for player tokens. Players never sign, and gameplay stays instant. |

### Scope notes
- **Off-chain by default.** Without the settlement variables, the NEP-245 ledger runs on the game server (Redis or memory) with NEP-245 semantics and event format.
- **Settlement not tested on a live contract.** On-chain settlement needs a deployed NEP-245 contract that supports operator approvals and owner mint/burn. This repository does not deploy one, and that path has not been run against a live contract.
- **Implicit accounts are unfunded.** They show "not funded" in the explorer until someone sends them NEAR.
- **Not included:** NEAR Intents (cross-chain payment).
- **Trading needs other players.** Every trade is between real players, so a solo player can earn (shifts, faucet) and build, but needs neighbors to buy what they make.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- three.js via React Three Fiber + drei for the 3D home and city (all models built from primitives, no asset downloads)
- Tailwind CSS v4, dark "night-market" glass UI
- Privy (`@privy-io/react-auth`, `@privy-io/node`)
- `near-api-js` v7 for RPC reads and optional settlement
- `@noble/curves` for implicit-account derivation
- Upstash Redis for shared game state (falls back to in-memory)
- SWR polling for live updates

No Solana libraries are used by this code. Privy installs some as optional transitive dependencies.

## Project structure

```
app/
  page.tsx                  Full-screen game (client-only)
  api/state                 GET  world snapshot (also advances the simulation)
  api/household             POST create household  ·  api/household/join  POST join by invite code
  api/action                POST start an action (optionally at a specific piece of furniture)
  api/furniture             POST buy / place / move / store / sell-back furniture
  api/use                   POST consume an owned item on a Sim
  api/listing               POST create listing  ·  DELETE ?id= cancel
  api/buy                   POST buy one unit of a listing
  api/topup                 POST testnet SimBucks faucet
  api/activity              GET  public activity feed
  api/nep245                GET  NEP-245 views + event log
  api/near/balance          GET  native NEAR balance via RPC
components/game/
  Game.tsx                  Views (home / build / city / visit), status strip, dock, Sim card, sheets
  three/Room.tsx            Isometric home: floor, walls with LED strips, furniture, Sims, placement outline
  three/City.tsx            Neighborhood: player homes, open plots, night market, work hub, plaza, trade screen
  three/Character3D.tsx     Jointed human Sim with walk / sit / lie poses and mood halo
  three/FurnitureModel.tsx  Furniture models
  three/anchors.tsx         Screen-space labels that follow 3D objects
  ui/Phone.tsx              NEAR Pad: Jobs, Market, Sell, Make, Bag, Neighbors, Leaders, Feed, Wallet, About
  ui/Hud.tsx, Catalogue.tsx, NeedsSheet.tsx, TopUpSheet.tsx, FurnitureMenu.tsx, CreateHousehold.tsx, Welcome.tsx, Portrait.tsx
lib/
  catalog.ts                Items (incl. furniture), actions, decay, neighborhood events, game clock
  layout.ts                 Room grid placement rules, starter layout, room palettes
  engine.ts                 Needs, actions, furniture, market, events, world advance, snapshots
  nep245.ts                 NEP-245 multi-token ledger + events
  near.ts                   NEAR RPC + optional on-chain settlement
  accounts.ts               Implicit NEAR account derivation
  auth.ts / privy.ts        Server token verification / client Privy helpers
  store.ts                  Upstash Redis or memory store with a lock
```

## Running locally

```bash
npm install
cp .env.example .env.local   # optional; everything works with no env vars
npm run dev                  # http://localhost:3000
```

With no environment variables the app runs in **guest login + in-memory state + off-chain NEP-245 ledger** mode. Add `NEXT_PUBLIC_PRIVY_APP_ID` for social login.

## Deploying to Vercel

1. Import the repo into Vercel (`vercel.json` pins the Next.js framework preset).
2. Add an **Upstash Redis** integration (or set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). This is required for a shared neighborhood: serverless instances don't share memory.
3. Set `NEXT_PUBLIC_PRIVY_APP_ID`. In the Privy dashboard, enable Email and Google login and add your Vercel domain to the allowed origins.
4. Set `NEARLIFE_ACCOUNT_SECRET` to a random string.
5. Optional: set `NEXT_PUBLIC_ENABLE_GUEST=true` to keep guest login next to Privy, and `NEARLIFE_ADMIN_TOKEN` to enable resets.

Worlds saved by earlier versions are migrated automatically: the old scripted households and their listings are removed, and rooms move to the new palette.

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
| `NEARLIFE_ACCOUNT_SECRET` | yes in prod | Seed for fallback player implicit accounts. |
| `NEARLIFE_ESCROW_ACCOUNT` | no | Market escrow account id used in NEP-245 events. |
| `NEP245_CONTRACT_ID`, `NEAR_OPERATOR_ACCOUNT_ID`, `NEAR_OPERATOR_PRIVATE_KEY` | no | Enable on-chain settlement. |
| `NEARLIFE_ADMIN_TOKEN` | no | Enables `POST /api/reset`. |

## API quick reference

```bash
curl -s localhost:3000/api/state | jq '.snapshot.stats'
curl -s 'localhost:3000/api/activity?type=purchase&limit=5' | jq '.activity[].text'
curl -s 'localhost:3000/api/nep245?method=events&limit=3' | jq '.events[].log'

# Two players trading from the command line
J='content-type: application/json'
A='x-guest-id: guest_cliseller001'; B='x-guest-id: guest_clibuyer0001'
curl -s -XPOST localhost:3000/api/household -H "$A" -H "$J" -d '{"name":"Seller House","characters":[{"name":"Ada"}]}' > /dev/null
curl -s -XPOST localhost:3000/api/household -H "$B" -H "$J" -d '{"name":"Buyer House","characters":[{"name":"Tolu"}]}' > /dev/null
HID=$(curl -s localhost:3000/api/state -H "$A" | jq -r .snapshot.me.householdId)
curl -s -XPOST localhost:3000/api/action -H "$A" -H "$J" -d "{\"characterId\":\"$HID-0\",\"action\":\"cook\"}" > /dev/null
sleep 16; curl -s localhost:3000/api/state -H "$A" > /dev/null
LID=$(curl -s -XPOST localhost:3000/api/listing -H "$A" -H "$J" -d '{"itemId":"meal","quantity":2,"price":8}' | jq -r .result.id)
curl -s -XPOST localhost:3000/api/buy -H "$B" -H "$J" -d "{\"listingId\":\"$LID\"}" > /dev/null
curl -s 'localhost:3000/api/activity?type=purchase&limit=5' | jq -r '.activity[].text'
```
