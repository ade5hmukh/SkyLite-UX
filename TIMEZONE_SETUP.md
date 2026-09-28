# Timezone Configuration

## Current Setup: Pacific Time (PT)

The application is now configured to use **Pacific Time (America/Los_Angeles)**.

## How It Works

- **Storage**: All timestamps are stored in **UTC** in the database (PostgreSQL)
- **Display**: Times are converted to Pacific Time when displayed to users
- **Calendar Events**: All calendar events (including routines/chores) are converted from UTC to PT

## Configuration Files Updated

1. **nuxt.config.ts** - Default timezone changed to `America/Los_Angeles`
2. **docker-compose.yml** - Environment variable `NUXT_PUBLIC_TZ` set to `America/Los_Angeles`

## Local Development

If you need to use a different timezone for local development:

1. Create a `.env` file in the project root (it's gitignored):
   ```bash
   NUXT_PUBLIC_TZ="America/Los_Angeles"
   ```

2. Or override it when running the dev server:
   ```bash
   NUXT_PUBLIC_TZ="America/New_York" npm run dev
   ```

## Docker Deployment

When deploying with Docker, the timezone is set in `docker-compose.yml`.

To override:
```bash
docker-compose up -d --build
```

Or set an environment variable before starting:
```bash
export NUXT_PUBLIC_TZ="America/Los_Angeles"
docker-compose up -d
```

## Valid Timezone Values

Use IANA timezone names from: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

Common US timezones:
- `America/Los_Angeles` - Pacific Time (PT)
- `America/Denver` - Mountain Time (MT)
- `America/Chicago` - Central Time (CT)
- `America/New_York` - Eastern Time (ET)

## Verification

To verify the timezone is working correctly:

1. Check the activity log in Settings - times should show in PT
2. Create a calendar event - the time should be in PT
3. Check routine/chore completion times - should be in PT

## Technical Details

- The app uses `ical.js` for timezone conversions
- Timezone data is fetched from `tz.add-to-calendar-technology.com`
- All date/time components use the configured timezone automatically
- The `NuxtTime` component handles timezone-aware formatting


