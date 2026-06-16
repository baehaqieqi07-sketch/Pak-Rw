# Pak RW Dashboard Final v10.10.65

## Scope

Dashboard-only finalization for Pak RW / DESA TULUS. Core Discord bot logic and active member data were preserved.

## Final fixes

1. Replaced the temporary/illustrative backdrop with an optimized realistic village landscape.
2. Rebuilt the Manage Page setup flow into three clear stages: choose Discord targets, edit content, review and save.
3. Added direct searchable channel and role selectors. Readable names are shown while Discord IDs remain the stored values.
4. Added dedicated Welcome bindings for Welcome, Member Tulus, Rules, Chat Warga, and Ticket.
5. Added quick insertion inside the Embed Builder for placeholders, channels, roles, and users.
6. Prevented raw mention text inside Title/Author/Footer by inserting readable names in fields that Discord does not parse as mentions.
7. Improved Feature Center filtering, setup warnings, status summaries, empty states, spacing, typography, and mobile behavior.
8. Redirected legacy dashboard pages to the new React routes.
9. Preserved the legacy dashboard snapshot under `dashboard_archive/` for rollback.
10. Kept the safe allowlist dashboard adapter and rejected secret/config paths outside the allowed dashboard settings.

## Main changed files

```txt
index.js
package.json
package-lock.json
config.json
config.example.json
README.md
ATTRIBUTIONS.md
DASHBOARD_FINAL_v10.10.65.md
dashboard/package.json
dashboard/package-lock.json
dashboard/public/desa-tulus-landscape.webp
dashboard/src/assets/desa-tulus-landscape.webp
dashboard/src/pages/DashboardHome.tsx
dashboard/src/pages/manage/ManagePage.tsx
dashboard/src/components/pickers/DiscordPicker.tsx
dashboard/src/components/embed/EmbedBuilder.tsx
dashboard/src/styles/index.css
dashboard/dist/*
```

## Dashboard components

```txt
AppShell
DashboardHome
ManagePage
DiscordPicker
EmbedBuilder
DiscordPreview
PlaceholderCenter
VillageBackdrop
Button
Card
StatusBadge
Toggle
Toast
```

## Routes

```txt
/dashboard
/dashboard/activity
/dashboard/manage/:feature
/dashboard/channel-manager
/dashboard/role-manager
/dashboard/placeholder-center
/dashboard/banner-manager
/dashboard/command-center
/dashboard/permission-center
/dashboard/logs
/dashboard/backup
/dashboard/settings
```

## API adapter

```txt
GET  /api/dashboard/bootstrap
PUT  /api/dashboard/settings
PUT  /api/dashboard/embed/:key
POST /api/dashboard/test-embed
GET  /api/dashboard/health
GET  /api/discord-picker-data
```

## Verification results

### Production build

```txt
Vite 6.4.3
1599 modules transformed
Build completed successfully
```

### Syntax check

```txt
node --check index.js
node --check ai/brain.js
node --check utils/cooldown.js
node --check db/mongoStore.js
All checks passed
```

### Dashboard enabled smoke test

```txt
GET /login                         200
GET /dashboard without session    302 -> /login
POST /login                        302 -> /dashboard
GET /dashboard with session       200
GET /dashboard/manage/welcome     200
GET /api/dashboard/bootstrap      200
GET production JS asset           200
GET /studio                       302 -> /dashboard
```

### Dashboard disabled smoke test

With `DASHBOARD_ENABLED=false`, no dashboard HTTP listener was opened. The Discord bot startup path remained separate.

### Discord picker limitation during build verification

A real Discord channel/role fetch was not executed because no Discord token or guild secret was included in the build environment. The picker endpoint and empty/offline state were tested. Live names appear after the deployed bot is online with a correct `DISCORD_TOKEN` and `GUILD_ID`.

### Responsive verification

Responsive rules are included for wide desktop, laptop, tablet, and mobile widths. The picker becomes a mobile-safe overlay, the sidebar becomes a drawer, and editor/preview panels collapse into one column. Automated browser screenshots could not be completed in the build environment because its Chromium policy blocked localhost access; production build and route/static asset checks passed.

## Installation

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Optional dashboard rebuild:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

## Railway deployment

1. Push the final files to branch `main`.
2. Keep Root Directory empty.
3. Use `npm start`.
4. Set `DASHBOARD_ENABLED=true`, `DASHBOARD_PASSWORD`, `PORT=3000`, `DISCORD_TOKEN`, `GUILD_ID`, and other secrets in Railway Variables.
5. Wait until Pak RW is online, then open `/dashboard/channel-manager` and press refresh Discord data.

## DisCloud deployment

Keep:

```txt
RAM=100
START=npm start
```

Upload a private deployment ZIP without `node_modules`, `.git`, logs, backups, and active data. Include `.env` only in a private DisCloud upload when no Variables form is available; never commit it to GitHub.

## Rollback

Fast rollback:

```env
DASHBOARD_ENABLED=false
```

Full rollback:

1. Restore the previous Git commit or v10.10.64 ZIP.
2. Keep active MongoDB and persistent data untouched.
3. The old dashboard snapshot remains under `dashboard_archive/` for reference.
