// Shift Date.now so the game clock reads ~09:00 when the server starts.
const orig = Date.now;
const s = Math.floor(orig() / 1000);
const off = ((((9 * 60) - ((s + 480) % 1440)) % 1440) + 1440) % 1440;
Date.now = () => orig() + off * 1000;
