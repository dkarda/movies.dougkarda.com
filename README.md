# movies.dougkarda.com

Personal movie site: search and filter TMDB, plus your ratings, genre rankings, stats, watchlist, and favorites from your TMDB account.

## Stack

Vite, React, TypeScript, Tailwind CSS. The TMDB key lives in a Vite env file and is **included in the browser bundle**. `.env` is gitignored; anyone can still extract the key from built JavaScript.

## Setup

1. Create a [TMDB API](https://www.themoviedb.org/settings/api) application.
2. Copy `.env.example` to `.env` and fill in:

```
VITE_TMDB_API_KEY=
VITE_TMDB_ACCESS_TOKEN=
VITE_TMDB_ACCOUNT_ID=
```

- **API key** or **API Read Access Token** is enough for Browse and movie pages.
- **Account id + Read Access Token** are required for Home (your ratings), Rankings, Stats, and Watchlist. Account lists generally need the Bearer token, not the key alone.
- Rate films (and optionally add watchlist/favorites) on [themoviedb.org](https://www.themoviedb.org). This app is read-only.

3. Install and run:

```
npm install
npm run dev
```

Restart the dev server after changing `.env`.

## Caching

TanStack Query keeps responses for about 30 minutes and persists them in `localStorage` for up to a day so repeat visits skip extra TMDB calls.

## Production (hosting.com)

Shared hosting does not run `npm`. Build locally, then upload the **contents of `dist/`** to the `movies.dougkarda.com` document root (including `.htaccess` copied from `public/` for Apache SPA routes).

```
npm run build
```

Do not upload `.env` as a public file; values are already baked into `dist/assets/*.js` at build time. Rebuild whenever credentials change.

## Git

Commit source (not `.env`, not `node_modules`, not `dist`). When you are ready, we can initialize the repo and push.

TMDB [API terms](https://www.themoviedb.org/api-terms-of-use) apply; this site uses their data and images.
