# SkyLite: How It All Fits Together

One page for running, changing and using SkyLite at home. `README.md` is the upstream project overview; this file is how _our_ setup works.

## What runs where

|                               | URL                     | Defined in                                             | Image                | Database                         |
| ----------------------------- | ----------------------- | ------------------------------------------------------ | -------------------- | -------------------------------- |
| **Prod** (family uses this)   | `http://<server>:3002`  | `~/docker-compose.yml` (project `homelab-docker`)      | `skylite-ux:prod`    | `homelab-docker-skylite-ux-db-1` |
| **Staging** (test here first) | `http://<server>:3004`  | `.devcontainer/docker-compose.yml` (profile `staging`) | `skylite-ux:staging` | `devcontainer-db-1`              |
| Dev server (optional)         | `http://localhost:3003` | `.devcontainer/docker-compose.yml` (`app`)             | dev container        | `devcontainer-db-1`              |

Staging and prod have **separate databases**, so testing never touches family data. Every container runs `prisma migrate deploy` on start, so schema changes apply themselves.

## Workflow: change → staging → prod

```bash
# 1. Build and start staging (run compose from .devcontainer)
cd ~/SkyLite-UX
docker build -q -t skylite-ux:staging .
cd .devcontainer && docker compose -p devcontainer --profile staging up -d --no-build staging

# 2. Check it
docker logs -f devcontainer-staging-1    # look for "Notifications:" and migration lines
# open http://<server>:3004 and test; name test data "ZZ Test ..." and delete it after

# 3. Commit, then promote to prod (only after staging looks right)
docker exec homelab-docker-skylite-ux-db-1 pg_dump -U skylite_admin -d skylite --clean --if-exists \
  > ~/docker-backups/skylite-prod/skylite-$(date +%F-%H%M).sql
docker tag skylite-ux:prod skylite-ux:prod-previous   # keep a way back
docker tag skylite-ux:staging skylite-ux:prod
docker compose -p homelab-docker -f ~/docker-compose.yml up -d --no-deps skylite-ux
```

Always pass `-p homelab-docker -f ~/docker-compose.yml`; without them compose starts a second copy of the homelab.

Rollback: `docker tag skylite-ux:prod-previous skylite-ux:prod`, run the same `up` command, and if the release changed data, restore the backup with `docker exec -i homelab-docker-skylite-ux-db-1 psql -U skylite_admin -d skylite < <backup>.sql`.

Only prod sends ntfy reminders; keep the `NUXT_NTFY_*` lines out of `staging.env` or every reminder arrives twice.

The build needs ~3 GB of memory (`Dockerfile` sets the Node heap to 3072 MB). If it gets killed on this box, add swap.

## Configuration

Secrets live in env files that git ignores (`*.env`). Staging reads `.devcontainer/staging.env`; prod reads `~/skylite-prod.env`.

| Variable                                                                  | What it does                                                                                                         | Default                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `TZ` + `NUXT_PUBLIC_TZ`                                                   | Timezone. Set **both**: `TZ` drives the midnight resets, `NUXT_PUBLIC_TZ` drives display, reminders and routine days | `America/Los_Angeles`    |
| `NUXT_PARENT_PIN`                                                         | 4-digit parent PIN, checked on the server (old name `NUXT_PUBLIC_PARENT_PIN` still works)                            | `1111`                   |
| `NUXT_NTFY_URL`, `NUXT_NTFY_TOPIC`                                        | Phone reminders via ntfy (same server as Home Assistant is fine, use a new topic)                                    | off                      |
| `NUXT_NTFY_TOKEN`                                                         | Only if the ntfy server needs a login                                                                                | –                        |
| `NUXT_NTFY_EVENT_LEAD_MINUTES`, `_MORNING_TIME`, `_EVENING_TIME`          | Reminder timing                                                                                                      | `30`, `07:00`, `19:30`   |
| `NUXT_GEMINI_API_KEY` (`NUXT_GEMINI_MODEL`, `NUXT_GEMINI_FALLBACK_MODEL`) | Turns on "Import from email or flyer"                                                                                | off (`gemini-3.5-flash`) |
| `NUXT_KINDERCARE_SESSION` | KinderCare daycare menu (the `_himama_session` cookie) | off |

Settings → **Phone Reminders** shows whether ntfy is on and has "Send test" / "Send today's plan" buttons.

## Features

**Calendar.** Native events plus iCal/webcal feeds (per-person colours). Month, week, day, two-week and agenda views; each device remembers its view.

- _Conflict warnings:_ a warning chip in the header when two timed events overlap for the same person; the event dialog warns before you save.
- _AI import:_ paste an email or upload a flyer/PDF/screenshot, Gemini suggests events, you review and tick which to add. Only shown when a key is set. On Gemini's free tier Google may use what you send.

**To-dos and chores.** Chores are to-dos with points and an optional repeat (daily, chosen weekdays, or monthly). 26 ready-made chore templates. Snooze and skip-next are supported. Ticking one with points shows a celebration and adds points to that person's column.

**Routines** (`/routines`). Ordered step checklists per child (or everyone) on chosen weekdays, e.g. After school: snack, Seesaw, Level Learning, piano (20-min timer), pack backpack. Steps can have a countdown timer that chimes and ticks itself. Finishing all steps awards the routine's points **once per day**. Adding/editing needs the parent PIN.

**Points, leaderboard, rewards.**

- Each person has all-time, today and this-week points. Today resets at midnight; the week resets Sunday midnight (`server/plugins/03.choreScheduler.ts`).
- `/leaderboard` ranks by today, week or all time.
- `/rewards` is the shop: kids spend all-time points on rewards (45 templates, 15–250 pts). Parents approve or cancel redemptions in Settings → Rewards; cancelling refunds points.

**School menu** (`/schoolMenu`, replaces the old meal planner). Breakfast and lunch for the next two weeks from a School Nutrition and Fitness web menu (the `…/webmenus2/#/view?id=…` link districts publish). Add it in Settings → Integrations → Meal → Add Integration → School Menu, paste the link (any month; later months are found automatically) and pick the kid(s). Before 2 PM the big card shows today; after that, the next school day. Menus are read live and cached for 3 hours, with no background sync.

- _KinderCare (daycare):_ Meal → **KinderCare**, pick the kid. It reads the weekly calendar at `classroom.kindercare.com` (breakfast, lunch, snacks, closures) using `NUXT_KINDERCARE_SESSION`, the `_himama_session` cookie copied from a logged-in browser (DevTools → Application → Cookies). It's unofficial, so it can break if KinderCare changes the site, and the cookie is full account access, so keep it only in the env files. When it expires, the card says "KinderCare login expired": paste a fresh cookie into `~/skylite-prod.env` (and `.devcontainer/staging.env`) and restart.

**Phone reminders (ntfy).** "In 30 min: …" before each timed event, a "Today" summary at 07:00 and a "Tomorrow" summary at 19:30 (events, due to-dos, routines). Subscribe to the topic in the ntfy app.

**Parent mode.** Triple-tap the logo and enter the PIN. Unlocks editing for 10 minutes. Five wrong PINs lock it for a minute.

**Per-device preferences** (Settings): theme, font and start page, saved in that browser only.

## Installing on tablets and phones

- **iPad / iPhone:** Safari → Share → Add to Home Screen.
- **Android:** Chrome → ⋮ → Install app (or Add to Home screen).
- **Desktop:** install icon in the Chrome/Edge address bar.
- **Wall tablet:** turn on Guided Access (iOS) or Screen Pinning (Android) and disable auto-sleep.

Over plain `http://192.168.x.x` you get a home-screen shortcut but no offline mode; full PWA needs HTTPS.

## Troubleshooting

- **Resets happen at the wrong hour:** the container is missing `TZ`.
- **No phone reminders:** Settings → Phone Reminders → Send test. Staging logs say `Notifications: ntfy is not configured` if the env vars are missing. Check the app is subscribed to the exact topic (case-sensitive) on the same server.
- **Import button missing:** no `NUXT_GEMINI_API_KEY`, or staging wasn't restarted after adding it.
- **`docker compose` says no staging service:** run it from `.devcontainer`.
- **Forgot the PIN:** set `NUXT_PARENT_PIN` and restart.
- **Recover an old doc:** the earlier feature notes were removed in favour of this file; `git log --diff-filter=D --name-only -- '*.md'` lists them and `git checkout <commit>^ -- <file>` restores one.
