# UNCOVER

> **Explore your campus town.** A fog-of-war exploration game that turns your daily walk into an adventure.

Uncover is a mobile-first web app built for students at **Stevens Institute of Technology** in Hoboken, NJ. As you physically walk around campus and the city, the fog lifts — revealing a map of everywhere you've been. Complete zone challenges, earn achievements, and climb the leaderboard against your peers.

---

## The Idea

Most people walk the same three routes every day and never realize what's around the corner. Uncover gamifies exploration: the map starts completely fogged, and only the places *you actually visit* get revealed. Walk more → see more → discover more.

---

## Features

- **Fog-of-War Map** — The world starts hidden. Walk around and reveal it in real time, with a 55-meter reveal radius that clears both sides of every street as you move.
- **Road-Snapped Movement** — Uses the OSRM routing engine to snap your position to the nearest road, keeping the trail clean and realistic.
- **Zone Challenges** — Five explorable zones centered on Hoboken: Stevens campus, Sinatra Park, Elysian Park, the Waterfront, and the full City of Hoboken. Complete each by covering a set percentage of its area.
- **Step & Distance Tracking** — Live step counter and total distance walked, with daily and weekly stats persisted locally.
- **Achievement System** — Unlock achievements (with a satisfying chime) for milestones like first steps, zone completions, and distance records.
- **Quests** — Time-limited challenges to push you to explore specifically.
- **Leaderboard** — Global rankings so you can see how your exploration stacks up against the rest of campus.
- **Auth** — Secure sign-up/login via Supabase. No email confirmation required to start playing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Maps | [Leaflet](https://leafletjs.com) + [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) |
| Routing | [OSRM](https://project-osrm.org) (road-snapping) |
| Hex Grid | [h3-js](https://h3geo.org) |
| Animations | [Motion](https://motion.dev) |
| Backend / Auth | [Supabase](https://supabase.com) |
| Language | TypeScript |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Mapbox](https://mapbox.com) access token

### 1. Clone & install

```bash
git clone https://github.com/your-org/uncover.git
cd uncover
npm install
```

### 2. Set environment variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser. For the best experience, open it on a mobile device or use browser DevTools in mobile view.

---

## Project Structure

```
app/
├── page.tsx                  # Main shell — 4-tab navigation (MAP / QUESTS / RANK / ME)
├── login/page.tsx            # Auth page (login + sign-up)
├── _components/
│   ├── walk-map/WalkMap.tsx  # Core fog-of-war map engine
│   ├── map/MapTab.tsx        # Map tab wrapper
│   ├── quests/QuestsTab.tsx  # Quest list
│   ├── rank/RankTab.tsx      # Leaderboard view
│   ├── profile/ProfileTab.tsx# User profile & stats
│   └── leaderboard/          # Leaderboard UI components
├── _lib/
│   └── supabase/             # Supabase client (browser + server)
└── api/
    └── leaderboard/route.ts  # Leaderboard API route
```

---

## How the Fog Works

The fog is rendered on an HTML `<canvas>` element overlaid on the Leaflet map. On each map move or zoom, the canvas redraws: it fills the entire viewport with a dark fog color, then punches out a circle (using `destination-out` compositing) for every point the user has visited. The result is a smooth, scalable fog that updates live without any server round-trips.

Explored points are persisted to `localStorage` so your progress survives page reloads.

---

## Built at a Hackathon

Uncover was built in ≈24 hours. The goal was simple: make walking around campus feel like playing a video game.
