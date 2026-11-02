/** Billboards around the city that NEAR projects can book (shared by the server, the map and /advertise). */
export interface AdSlot {
  id: string;
  name: string;
  where: string;
  /** Price multiplier on the base daily price (busier spots cost more). */
  mult: number;
  /** Where the billboard stands on the city map (at a road corner). */
  pos: [number, number];
}

export const AD_SLOTS: AdSlot[] = [
  { id: "center", name: "Town Square", where: "Dead centre of town, where every road meets", mult: 2, pos: [2.1, 2.1] },
  { id: "club", name: "Club Corner", where: "Next to the 24/7 Club", mult: 1.5, pos: [2.1, 14.1] },
  { id: "north", name: "Downtown", where: "On the way to the NEAR HQ and the exchanges", mult: 1, pos: [2.1, -9.9] },
  { id: "west", name: "West Gate", where: "By NEAR Social and the west side homes", mult: 1, pos: [-11.9, 2.1] },
];

export const AD_DAYS = [1, 3, 7, 14, 30];

/** What players see of a running ad. */
export interface LiveAd {
  id: string;
  slot: string;
  name: string;
  tagline: string;
  url: string;
  color: string;
  hasImage: boolean;
}
