/** Chat channel helpers shared by the server and the client. */

export const TOWN = "town";
export const CHAT_MAX_LEN = 280;

export function placeChannel(placeId: string) {
  return `place:${placeId}`;
}

export function dmChannel(a: string, b: string) {
  return `dm:${[a, b].sort().join("|")}`;
}

/** Household ids in a DM channel, or null for other channels. */
export function dmMembers(channel: string): [string, string] | null {
  if (!channel.startsWith("dm:")) return null;
  const parts = channel.slice(3).split("|");
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

export function dmPartner(channel: string, me: string) {
  const m = dmMembers(channel);
  if (!m || !m.includes(me)) return null;
  return m[0] === me ? m[1] : m[0];
}

/** Trim, drop control characters and collapse whitespace. */
export function cleanChatText(raw: string) {
  return raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_MAX_LEN);
}
