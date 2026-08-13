# FoodSpots

Food spot discovery, reviews, and social recommendations. Web only — the REST API is
built so a mobile client can consume it later without backend changes.

- **client/** — React 18 + Vite + Tailwind v4 + React Router v6 + Zustand + MapLibre GL
- **server/** — Express + Prisma + PostgreSQL + Socket.io
- **docs/foodspots.spec.json** — the product spec this is built from

## Setup

### 1. Start PostgreSQL

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
docker compose up -d
```

Prefer a hosted database instead? Skip Docker and put your connection string in
`server/.env` as `DATABASE_URL`.

### 2. Server

```bash
cd server && npm install && cp .env.example .env
```

`.env` already works against the Docker database. Fill in the optional keys when you
want the features they unlock:

| Variable | Unlocks | Without it |
|---|---|---|
| `GOOGLE_MAPS_SERVER_KEY` | Crawl route distance + ETA | Crawls save without ETA |
| `CLOUDINARY_*` | Review photo and video upload | Upload returns 503 |
| `GOOGLE_CLIENT_ID` | Google sign-in | Email/password still works |

Create the tables and load sample data:

```bash
cd server && npx prisma migrate dev --name init && npm run seed
```

### 3. Client

```bash
cd client && npm install && cp .env.example .env
```

`VITE_MAPTILER_KEY` enables the map and heatmap pages — the client renders tiles with
MapLibre GL JS against [MapTiler Cloud](https://cloud.maptiler.com/account/keys/).
Every other page works without it; map pages show a configuration notice instead.
(Routing stays on the Google Directions API server-side, via `GOOGLE_MAPS_SERVER_KEY`.)

### 4. Run

Two terminals:

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

The client runs at http://localhost:5173 and proxies `/api` to the server on port 4000.

## Sample logins

After seeding, any seeded account uses the password `password123`:

- `aditi@foodspots.dev` — owns spots, lists, and a crawl; richest account to explore
- `marcus@foodspots.dev`, `priya@foodspots.dev`, `sameer@foodspots.dev`, and others

Seed data is clustered around central Bengaluru so radius search returns results.
Change `CITY` and the spot coordinates in `server/prisma/seed.js` to use your own city.

## API surface

Everything is mounted under `/api` (see `server/routes/index.js`):

| Prefix | Covers |
|---|---|
| `/auth` | `register`, `login`, `google`, `me` |
| `/spots` | Search and radius lookup, `trending`, `hidden-gems`, spot detail, create/edit/delete, dishes, and `:id/reviews` — which is where a review is created, with media and GPS coords in one multipart request |
| `/reviews` | `:id/helpful`, `:id/not-helpful`, `:id/owner-response` |
| `/lists` | Curated lists, plus adding and removing their spots |
| `/crawls` | Create a crawl, `preview` a route before saving, `:id/route` for the saved one |
| `/notifications` | Listing and read state; live delivery over Socket.io |
| `/users/:id`, `/users/:id/follow`, `/feed`, `/suggested-users`, `/leaderboard` | Profiles, social graph, activity feed, points ranking |

`GET /api/health` returns `{ ok: true }` for smoke checks.

## How key features work

- **Verified visit** — the review form sends the browser's GPS coords; the server
  compares them to the spot with a haversine check and sets `verified_visit` when the
  distance is under 100m. Worth a bonus point.
- **Trending** — spots ranked by review count over the last 7 days.
- **Hidden gems** — `overall_rating >= 4.5` and `review_count < 20`.
- **Maps** — MapLibre GL JS renders MapTiler's `streets-v2` style. Pins and the heatmap
  share one GeoJSON source, so toggling modes swaps layers without refetching.
- **Heatmap** — a MapLibre `heatmap` layer over that source, weighted by review count.
  Weights are normalised client-side, since MapLibre expects 0–1.
- **Food crawl** — ordered stops sent to the Google Directions API as waypoints;
  ordering is preserved rather than optimised, since the user drags stops themselves.
- **Points** — review +1, verified review +2, helpful vote received +1, list +5, crawl +3.
- **Editing a spot** — `PATCH /api/spots/:id` and `DELETE /api/spots/:id` are open to the
  claimed `owner_user_id`, or to `created_by_user_id` while nobody has claimed the place.
  Delete is refused with 409 once the spot has reviews, since the cascade would take
  those reviews, its dishes, list entries and crawl stops with it.

## Schema notes

Three places deviate from the spec's model list, all to fit a relational database:

- `CuratedList.spot_ids[]` and `FoodCrawl.spots_ordered[]` are join tables
  (`list_spots`, `crawl_stops`) instead of arrays — this gives foreign keys, dedupe,
  and an explicit `position` column for crawl ordering.
- A `review_votes` table was added so `POST /reviews/:id/helpful` is idempotent per
  user. The `helpful_count` counters on `Review` remain for cheap reads.
- An `activities` table backs `GET /api/feed`, keeping the feed a single indexed read
  instead of a UNION across reviews, lists, and crawls.
- `Spot.created_by_user_id` was added alongside `owner_user_id`. Ownership is a claim
  the adder opts into, so without it a spot added without ticking "I own or manage this
  place" would have no one able to edit it.
