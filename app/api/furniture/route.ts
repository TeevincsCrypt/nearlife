import { HttpError, readBody, runGame } from "@/lib/api";
import { buyFurniture, moveFurniture, placeOwnedFurniture, sellBackFurniture, storeFurniture } from "@/lib/engine";

export const dynamic = "force-dynamic";

interface Body {
  op?: "buy" | "place" | "move" | "store" | "sell";
  itemId?: string;
  uid?: string;
  x?: number;
  z?: number;
  rot?: number;
}

/** Buy mode: buy from the catalogue, place owned furniture, move, store or sell back. */
export async function POST(req: Request) {
  const b = await readBody<Body>(req);
  const x = Math.floor(Number(b.x ?? -1));
  const z = Math.floor(Number(b.z ?? -1));
  const rot = ((Math.floor(Number(b.rot ?? 0)) % 4) + 4) % 4;
  return runGame(
    req,
    ({ state, now, household }) => {
      const hh = household!;
      switch (b.op) {
        case "buy":
          return buyFurniture(state, hh, b.itemId ?? "", x, z, rot, now);
        case "place":
          return placeOwnedFurniture(state, hh, b.itemId ?? "", x, z, rot, now);
        case "move":
          moveFurniture(hh, b.uid ?? "", x, z, rot, now);
          return null;
        case "store":
          storeFurniture(hh, b.uid ?? "", now);
          return null;
        case "sell":
          return { refund: sellBackFurniture(state, hh, b.uid ?? "", now) };
        default:
          throw new HttpError(400, "Unknown op");
      }
    },
    { household: true },
  );
}
