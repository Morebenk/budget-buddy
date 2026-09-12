/**
 * Export a public, privacy-safe snapshot of open slots from Discord to slots.json.
 *
 * Deliberately NOT exported: usernames, user ids, message bodies, prices, any
 * free text a member wrote. Those belong to the people who wrote them, in a
 * server they chose to join — republishing them to a Google-indexed page is a
 * different thing entirely. What ships is counts per service, which is all the
 * page needs to be useful.
 */
import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as p from "node:path";

function token(): string {
  const env = process.env.DISCORD_BOT_TOKEN?.trim();
  if (env) return env;
  const file = p.join(homedir(), ".claude", "channels", "discord", ".env");
  const m = readFileSync(file, "utf8").match(/^DISCORD_BOT_TOKEN=(.+)$/m);
  if (!m) throw new Error(`No DISCORD_BOT_TOKEN in env or ${file}`);
  return m[1].trim();
}
const T = token();
const G = process.env.DISCORD_GUILD_ID?.trim() || "1091449969698938892";

async function api(path: string): Promise<any> {
  const r = await fetch("https://discord.com/api/v10" + path, { headers: { Authorization: `Bot ${T}` } });
  if (!r.ok) throw new Error(`${r.status} ${path} — ${(await r.text()).slice(0, 160)}`);
  return r.json();
}

const guild = await api(`/guilds/${G}?with_counts=true`);
const chans: any[] = await api(`/guilds/${G}/channels`);
const forum = chans.find((c) => c.name === "open-slots");
if (!forum) throw new Error("No #open-slots forum found.");

const tagById = new Map<string, string>(forum.available_tags.map((t: any) => [t.id, t.name]));
const STRUCTURAL = new Set(["Offering", "Seeking", "Open", "Full", "Closed"]);

const active = await api(`/guilds/${G}/threads/active`);
const posts = (active.threads ?? []).filter(
  (t: any) => t.parent_id === forum.id && !t.thread_metadata?.archived && !/^EXAMPLE/i.test(t.name),
);

/** service -> { offering, seeking } */
const services: Record<string, { offering: number; seeking: number }> = {};
let offering = 0, seeking = 0;

for (const t of posts) {
  const names = (t.applied_tags ?? []).map((id: string) => tagById.get(id)).filter(Boolean) as string[];
  if (names.includes("Full") || names.includes("Closed")) continue;
  const isSeeking = names.includes("Seeking");
  isSeeking ? seeking++ : offering++;
  for (const n of names) {
    if (STRUCTURAL.has(n)) continue;
    services[n] ??= { offering: 0, seeking: 0 };
    isSeeking ? services[n].seeking++ : services[n].offering++;
  }
}

/** Every service the board supports, so the page can show "none right now" honestly. */
const allServices = forum.available_tags.map((t: any) => t.name).filter((n: string) => !STRUCTURAL.has(n) && n !== "Other");

const out = {
  generated: new Date().toISOString(),
  server: { name: guild.name, members: guild.approximate_member_count ?? null },
  totals: { open: offering + seeking, offering, seeking },
  services: allServices.map((name: string) => ({
    name,
    offering: services[name]?.offering ?? 0,
    seeking: services[name]?.seeking ?? 0,
  })),
};

writeFileSync(p.join(import.meta.dir, "slots.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`slots.json — ${out.totals.open} open (${offering} offering, ${seeking} seeking) across ${allServices.length} services`);
