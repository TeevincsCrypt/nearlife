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
| 9 | **City**, then tap the **Ref Finance** pin (or **Pad → Go Out → Ref Finance HQ**). Pick 🚆 **Train**, then **Swap tokens**. | The Sim walks out the door, a train carries them across the map to Ref Finance HQ, and the result ("… swap tokens at Ref Finance HQ (+3 SB net)") lands in everyone's feed. |
| 10 | **Pad → NEAR Wallet → Send**, pick the other player and send 10 SB. | A NEP-245 `mt_transfer` between the two accounts; both players see "sent 10 SB" in the feed. |
| 11 | **Pad → Explorer** and **Pad → Names** (try `near`). | Live mainnet/testnet block height and gas price from NEAR RPC, and a live `.near` name lookup. |

## How the game works

- **Meet other players.** The town is shared. Everyone you see is a real player.
  - **Chat:** the 💬 Chat app on the Pad has town chat, chat with everyone at the place your Sim is at, and direct messages with invites ("Meet me at The 24/7 Club?").
  - **Speech bubbles:** messages pop up as bubbles over your Sim inside places.
  - **Tap a player's Sim** to wave (+social for both), message them or visit their home.
  - **Together bonus:** doing an activity at the same place as other players adds social and fun, and boosts payouts.
- **Travel, then go inside.** Tap a place on the map, pick car, train or plane, and watch your Sim travel. When they arrive you can go inside and do things there.
- **The 24/7 Club.** NEARLIFE's own nightclub, open around the clock: dance (best with friends), grab a mocktail, or DJ a set for tips.
- **Real time.** The clock, day and night follow your own local time.
- **Your progress follows your login.** Log in with email or Google on any device to get back to the same household. If you started as a guest, logging in carries that household over. Pad → About lets you add a second login method so either one works.

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
- **Going out.** 18 real NEAR / crypto ecosystem places are buildings on the map. Tap one (or Pad → Go Out), choose how to get there (🚗 car 3 SB · 5 s, 🚆 train 1 SB · 8 s, ✈️ plane 12 SB · 2 s), and pick an activity. The Sim leaves home, the vehicle crosses the map, and the activity changes needs and SimBucks when it finishes. Other players see who is travelling and who is at each place.

  | Place | What you can do |
  |---|---|
  | NEAR Protocol HQ | Dev office hours (+social, +fun) · Hackathon sprint (earn 20–60 SB) |
  | Ref Finance HQ | Swap tokens (pay 10, get 6–16) · Provide liquidity (lock 25, get 20–36) |
  | Burrow Lending Office | Borrow 50 SB (owe 55) · Repay the loan |
  | Rhea Finance Trading Floor | Trade with leverage (pay 15, get 0–36) · Supply & earn (lock 20, get 21–27) |
  | Jumbo Exchange | Market-make (pay 8, get 6–14) |
  | Aurora Labs | Deploy an EVM contract (earn 14–24) |
  | Sputnik DAO Community Hall | Vote on proposals (+25 social, 2–6 SB) |
  | OutLayer Agent Lab | Run an agent task (pay 6, earn 12–30) · VRF lucky draw (pay 5, get 0–15) |
  | meme.cooking Launchpad | Launch a memecoin (pay 20, get 0–70) |
  | NEAR Social Plaza | Post & hang out (+35 social, +10 fun) |
  | Meteor Wallet Store | Grab merch (+20 fun) |
  | HERE Wallet Kiosk | Liquid-stake (lock 10, get 10–14) |
  | NEAR Intents Cross-chain Hub | Cross-chain swap (pay 10, get 8–15) |
  | NEAR Explorer Data Center | Audit transactions (earn 10–18) |
  | Electric Capital Office | Pitch your project (0–40 SB, usually 0) |
  | NEAR Swimming Pool | Swim (+40 hygiene, +25 fun) |
  | a16z crypto Outpost | Startup school (+social, +fun) |
  | Dragonfly Research Lab | Research a thesis (earn 12–22) |

  The map also has a railway loop with stations and a running train, and an airfield.

- **Inside places.** Tap a place, then **🚪 Go inside**.
  - **Interiors:** every building has a 3D interior themed to what it is: trading desks and a live chart wall at the exchanges, rows of benches and a ballot box at the DAO hall, server racks at OutLayer and the Explorer, a pool with loungers, a launch stage at meme.cooking, a hackathon table at NEAR HQ, and so on.
  - **Stations:** each activity is a glowing station. Every place also has a bar where you can **Hang out** with whoever is there.
  - **Getting there:** tapping a station when your Sim is elsewhere asks how to get there (car, train or plane). Once the Sim arrives it **stays at that place**, so further activities there cost no fare. **🏠 Go home** (or doing anything at home) brings it back.
  - **Shared:** other players' Sims inside the same building show up with name tags and what they're doing.
- **Social.** "Call a neighbor" picks a Sim from another player's household (preferring people who are online). It boosts both Sims' Social, and the call shows in the feed.
- **Leaders.** Households ranked by net worth (SimBucks + furniture).
- **Top up (+).** Testnet faucet (+100 SB every 5 minutes) plus shortcuts to the ways of earning.

The world advances lazily. Every `GET /api/state` (clients poll every 3 s) applies need decay, finishes actions and rotates events.

## The NEAR Pad (in-game phone)

The Pad has two sections.

**NEARLIFE apps:** Market, Sell, Make, Jobs, Go Out, Bag, Neighbors, Leaders, Feed, About.

**NEAR ecosystem apps** (each links to the real project; NEARLIFE is not affiliated with any of them):

| App | What it shows |
|---|---|
| **NEAR Wallet** | Your Privy-embedded NEAR account. SimBucks (NEP-245) and native NEAR balance (live RPC). **Send** SimBucks to another player (`mt_transfer`), **Receive** (your account id + faucet), **History** (your NEP-245 event log). |
| **OutLayer** | What OutLayer is (FastNEAR's TEE-attested off-chain compute), your agent jobs run, net SimBucks earned, jobs running now, and a button to send your Sim to the OutLayer Agent Lab. |
| **Names** | Live `.near` name lookup on NEAR mainnet (taken / available, balance, NearBlocks link). |
| **Explorer** | Live block height, block time and gas price for mainnet and testnet from NEAR RPC, refreshed every 5 s, plus your account on NearBlocks. |
| **Ref, Burrow, Rhea, Jumbo, Social, Sputnik, Meteor, HERE, Intents, Aurora, meme.cooking** | Status card: what the project is, what you can do at its building in town, who is there now, your past visits, a "Go to …" button (car / train / plane), and a link to the real app. |

## Real mode (hybrid)

Every place and app works in-game with SimBucks. A few actions can also be done **for real**: a player signed in with Privy signs an actual NEAR transaction from their own embedded NEAR wallet. Those apps and buildings carry an amber **REAL** tag.

| Where | Real action | On-chain |
|---|---|---|
| Pad → NEAR Wallet | Send real NEAR to any account | `Transfer` |
| NEAR Social plaza / Pad → Social | Post to your NEAR Social profile | `social.near` → `set` (0.01 NEAR storage deposit) |
| Sputnik DAO hall / Pad → Sputnik | Approve or reject proposals of the NEARLIFE DAO | `<dao>.sputnik-dao.near` → `act_proposal` |
| Ref Finance, Rhea Finance, NEAR Intents / Pad → Ref, Rhea, Intents | Live quote, then swap NEAR → USDC/USDT/… on NEAR | NEAR Intents 1Click API quote, then one tx to `wrap.near`: `near_deposit` + `storage_deposit` + `ft_transfer` to the quote's deposit address |
| OutLayer lab / Pad → OutLayer | Run a configured OutLayer job | `outlayer.near` → `request_execution` |

How it works:

1. **Signing stays in the browser.** The browser builds the transaction (`lib/near-real.ts`), and Privy's `useSignRawHash` signs its SHA-256 hash with the player's key. It is then broadcast to NEAR RPC. The server never holds player keys and never sends real transactions.
2. **Confirmation first.** Before anything is signed, a sheet shows the network, the receiver contract, each method, and the total NEAR attached.
3. **Spending is capped.** Each transaction is limited to `NEXT_PUBLIC_REAL_MAX_NEAR` (default 1 NEAR).
4. **The server verifies before rewarding.** `/api/real` only reads the chain: it checks that the signer is the household's own wallet, the receiver contract matches, and the transaction succeeded. Only then does it post to the feed with an explorer link and grant a small, rate-limited SimBucks bonus. Each transaction hash is credited once.

Requirements and limits:

- **Privy sign-in only.** Guest accounts are server-derived, so they can't use real mode.
- **Account must exist on-chain.** The player's implicit account needs some real NEAR before it can sign (Pad → NEAR Wallet shows the address to fund).
- **Mainnet by default** (`NEXT_PUBLIC_REAL_NETWORK`), because that's where NEAR Social, NEAR Intents, OutLayer and most DAOs live.
- **Set-up needed for two actions.** DAO voting needs `NEXT_PUBLIC_NEARLIFE_DAO` (a Sputnik DAO you create, with players added as members). OutLayer needs `NEXT_PUBLIC_OUTLAYER_ARGS` (the JSON for your `request_execution` job), because the job's code must come from a repo you choose.
- **Kept simulated on purpose:**
  - Borrowing, leveraged trading and memecoin launches, because of real-money risk.
  - Electric Capital, a16z crypto, Dragonfly, the pool and the wallet stores, because they're not on-chain services.
  - Aurora, Jumbo and HERE staking.

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
- **In-game place activities are simulated; real mode is opt-in.** The SimBucks activities at each building stay inside the game. The REAL panels are separate, player-signed NEAR transactions (see Real mode). Names and links are fan tributes, not endorsements.
- **Real mode is untested against live contracts.** It was built from the contracts' public interfaces but couldn't be run against mainnet from the build environment. Try each real action with a small amount first, and check the NEAR Intents (1Click) request fields and OutLayer `request_execution` arguments against their current docs.
- **Trading needs other players.** Every trade is between real players, so a solo player can earn (shifts, faucet) and build, but needs neighbors to buy what they make.

## Tech stack

- Next.js 15 (App Router) + TypeScript
- three.js via React Three Fiber + drei for the 3D home and city (all models built from primitives, no asset downloads)
- Tailwind CSS v4, chunky cartoon mobile-game UI (Lilita One + Nunito, blue panels, gold buttons, hex nav)
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
  api/place                 POST send a Sim to a city place (car / train / plane) to do an activity
  api/send                  POST NEAR Wallet send: SimBucks to another household (mt_transfer)
  api/near/network          GET  live block height / gas price (mainnet or testnet)
  api/real                  POST record a player-signed real NEAR tx (verified on-chain first)
  api/activity              GET  public activity feed
  api/nep245                GET  NEP-245 views + event log
  api/near/balance          GET  native NEAR balance via RPC (?network=mainnet for .near names)
components/game/
  Game.tsx                  Views (home / build / city / visit), status strip, dock, Sim card, sheets
  three/Room.tsx            Isometric home: floor, walls with LED strips, furniture, Sims, placement outline
  three/City.tsx            Neighborhood: player homes, 18 ecosystem buildings, railway + train, airfield, trip vehicles
  ui/PlaceSheet.tsx         Place detail: travel mode, activities, who's there, link to the real project
  three/Character3D.tsx     Jointed human Sim with walk / sit / lie poses and mood halo
  three/FurnitureModel.tsx  Furniture models
  three/anchors.tsx         Screen-space labels that follow 3D objects
  ui/Phone.tsx              NEAR Pad: game apps + NEAR ecosystem apps (Wallet, OutLayer, Names, Explorer, …)
  ui/Hud.tsx, Catalogue.tsx, NeedsSheet.tsx, TopUpSheet.tsx, FurnitureMenu.tsx, CreateHousehold.tsx, Welcome.tsx, Portrait.tsx
lib/
  catalog.ts                Items (incl. furniture), actions, decay, neighborhood events, game clock
  layout.ts                 Room grid placement rules, starter layout, room palettes
  places.ts                 The 18 ecosystem places, their activities, and car / train / plane travel
  engine.ts                 Needs, actions, furniture, market, events, world advance, snapshots
  nep245.ts                 NEP-245 multi-token ledger + events
  near.ts                   NEAR RPC + optional on-chain settlement
  near-real.ts              Real mode: build / sign (Privy) / send NEAR txs for Social, DAO, Intents, OutLayer
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
| `NEXT_PUBLIC_REAL_MODE` | no | `false` hides all real-transaction panels (default on). |
| `NEXT_PUBLIC_REAL_NETWORK`, `NEXT_PUBLIC_REAL_RPC_URL` | no | Network for real mode (default `mainnet`, FastNEAR RPC). |
| `NEXT_PUBLIC_REAL_MAX_NEAR` | no | Max NEAR attached per real transaction (default 1). |
| `NEXT_PUBLIC_NEARLIFE_DAO` | for DAO voting | Sputnik DAO account players vote in. |
| `NEXT_PUBLIC_OUTLAYER_CONTRACT`, `NEXT_PUBLIC_OUTLAYER_ARGS`, `NEXT_PUBLIC_OUTLAYER_DEPOSIT_NEAR` | for real OutLayer jobs | OutLayer contract, `request_execution` JSON args, deposit. |

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

Chat (needs a household): `POST /api/chat` with `{"channel":"town","text":"hi"}`, `{"channel":"place:club","text":"…"}` (your Sim must be there), `{"channel":"dm:<idA>|<idB>","text":"…"}`, `{"kind":"wave","targetCharacterId":"…"}` or `{"kind":"invite","toHouseholdId":"…","placeId":"club"}`. Travel with `POST /api/place` `{"characterId":"…","placeId":"club","actionId":"__travel","travel":"car"}`.

## Logos

Project logos in `public/logos/` belong to their respective owners and are used only to identify the real projects the in-game places and apps refer to. NEARLIFE is not affiliated with any of them. Sources: the projects' own public GitHub repos (NEAR wallet-selector, NearSocial/viewer, Nearblocks, near-daos/sputnik-dao-ui, out-layer/dashboard, defuse-protocol/defuse-frontend, electric-capital/crypto-ecosystems), token metadata in ref-finance/ref-sdk, and the DefiLlama/icons repo.
