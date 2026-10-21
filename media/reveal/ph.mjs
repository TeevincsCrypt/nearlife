import { phonemize } from "./node_modules/kokoro-js/dist/kokoro-ph.js";
import fs from "node:fs";
const lines = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = [];
for (const t of lines) out.push(await phonemize(t, "a"));
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
