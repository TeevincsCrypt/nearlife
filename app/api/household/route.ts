import { deriveImplicitAccount, isValidNearAccountId } from "@/lib/accounts";
import { HttpError, readBody, runGame } from "@/lib/api";
import { CURRENCY, CURRENCY_SYMBOL } from "@/lib/catalog";
import { addActivity, uid } from "@/lib/engine";
import { mt_mint } from "@/lib/nep245";
import { FLOOR_COLORS, WALL_COLORS, starterLayout } from "@/lib/layout";
import { CLOTHES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, mintLayout, newCharacter, randomLook } from "@/lib/seed";
import type { CharacterLook } from "@/lib/types";
import type { Household } from "@/lib/types";

export const dynamic = "force-dynamic";

const STARTING_FUNDS = 150;
const COLORS = ["#16a34a", "#2563eb", "#ea580c", "#9333ea", "#0d9488", "#e11d48", "#ca8a04"];
const AVATARS = ["🧑", "👩", "👨", "🧑🏽", "👩🏻", "👨🏿", "🧑🏼", "👵", "👴", "🧒", "👩🏾", "🧔"];

interface Body {
  name?: string;
  displayName?: string;
  nearAccountId?: string;
  characters?: Array<{ name?: string; avatar?: string; look?: Partial<CharacterLook> }>;
}

function sanitizeLook(look?: Partial<CharacterLook>): CharacterLook {
  const base = randomLook();
  if (!look) return base;
  return {
    skin: SKIN_TONES.includes(look.skin ?? "") ? look.skin! : base.skin,
    hair: HAIR_COLORS.includes(look.hair ?? "") ? look.hair! : base.hair,
    hairStyle: HAIR_STYLES.includes(look.hairStyle as CharacterLook["hairStyle"]) ? look.hairStyle! : base.hairStyle,
    top: CLOTHES.includes(look.top ?? "") ? look.top! : base.top,
    bottom: /^#[0-9a-f]{6}$/i.test(look.bottom ?? "") ? look.bottom! : base.bottom,
  };
}

export async function POST(req: Request) {
  const body = await readBody<Body>(req);
  return runGame(
    req,
    ({ state, now, user, household }) => {
      if (household) throw new HttpError(409, "You already have a household");
      const name = (body.name ?? "").trim().slice(0, 32);
      if (name.length < 2) throw new HttpError(400, "Household name is too short");
      const chars = (body.characters ?? []).filter((c) => (c.name ?? "").trim().length > 0).slice(0, 4);
      if (chars.length < 1) throw new HttpError(400, "Add at least one character");

      // Account: Privy embedded NEAR wallet if the client has one, otherwise a derived implicit account.
      let accountId: string;
      let accountSource: Household["accountSource"];
      const requested = (body.nearAccountId ?? "").trim().toLowerCase();
      if (user!.kind === "privy" && requested && isValidNearAccountId(requested)) {
        const taken = Object.values(state.households).some((h) => h.accountId === requested);
        if (taken) throw new HttpError(409, "That NEAR account already belongs to a household");
        accountId = requested;
        accountSource = "privy";
      } else {
        accountId = deriveImplicitAccount(`player:${user!.userId}`).accountId;
        accountSource = "derived";
      }

      const id = uid("hh");
      const hh: Household = {
        id,
        name,
        kind: "player",
        accountId,
        accountSource,
        ownerIds: [user!.userId],
        ownerNames: [(body.displayName ?? "").trim().slice(0, 24) || "Player"],
        color: COLORS[Object.keys(state.households).length % COLORS.length],
        characters: chars.map((c, i) =>
          newCharacter(
            `${id}-${i}`,
            c.name!.trim().slice(0, 16),
            c.avatar && c.avatar.length <= 16 ? c.avatar : AVATARS[i % AVATARS.length],
            [70, 95],
            sanitizeLook(c.look),
          ),
        ),
        createdAt: now,
        lastActive: now,
        layout: starterLayout(),
        wallColor: WALL_COLORS[Object.keys(state.households).length % WALL_COLORS.length],
        floorColor: FLOOR_COLORS[Object.keys(state.households).length % FLOOR_COLORS.length],
      };
      state.households[id] = hh;
      state.players[user!.userId] = id;
      mt_mint(state, accountId, CURRENCY, STARTING_FUNDS, "welcome-grant");
      mintLayout(state, accountId, hh.layout);
      addActivity(state, {
        householdId: id,
        householdName: name,
        isNpc: false,
        ts: now,
        type: "join",
        emoji: "🏠",
        text: `${name} moved into the neighborhood with ${hh.characters.map((c) => c.name).join(", ")} (+${STARTING_FUNDS} ${CURRENCY_SYMBOL} welcome grant)`,
      });
      return { householdId: id };
    },
    { auth: true },
  );
}
