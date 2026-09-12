# budget-buddy-site

Public landing page for the **Budget Buddy** Discord — a community for splitting
the cost of family and duo plans.

Live: https://morebenk.github.io/budget-buddy/

## Why this exists

Discord servers are invisible to search engines. Listing sites like DISBOARD
rank you only while you keep bumping every two hours, and every "autobump"
service works by automating your *user* account, which Discord's terms prohibit.
A page you own ranks on its own and needs nothing clicked.

## How it stays current

`export.ts` reads the `#open-slots` forum and writes `slots.json`. A GitHub
Action runs it every 3 hours and commits only when the counts actually change.

**What is published:** per-service counts of open listings, the member count.
**What is never published:** usernames, user ids, message text, prices, regions.
Those belong to the people who wrote them in a server they chose to join;
republishing them to a Google-indexed page is a different thing entirely.

The `EXAMPLE` post is excluded, and `Full` / `Closed` listings are not counted —
the page reports zero rather than inflating.

## Setup

Two repository secrets:

| Secret | Value |
| --- | --- |
| `DISCORD_BOT_TOKEN` | the Channel Steward bot token |
| `DISCORD_GUILD_ID`  | `1091449969698938892` |

The bot only needs to read the forum — View Channels and Read Message History.

Then replace `INVITE_URL` in `index.html` with a real Discord invite. Use one
that **never expires** and has **no use limit**, or the page will quietly stop
working when it lapses.

## Running it locally

```sh
bun export.ts          # falls back to ~/.claude/channels/discord/.env for the token
python3 -m http.server # then open http://localhost:8000
```
