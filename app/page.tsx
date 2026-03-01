"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";
import type { User } from "@supabase/supabase-js";

import Leaderboard from "./_components/leaderboard/Leaderboard";
import type { LeaderboardPeriod, LeaderboardResponse } from "./_types/leaderboard";
import { createClient } from "./_lib/supabase/client";

const WalkMap = lazy(() => import("./_components/walk-map/WalkMap"));

type Tab = "map" | "quests" | "rank" | "me";

const AVATAR_KEY = "walkmap-avatar";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("me");
  const [menuOpen, setMenuOpen] = useState(false);
  const [magicActive, setMagicActive] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [mapFilter, setMapFilter] = useState<"tiles" | "quests">("tiles");
  const menuRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leaderboardPeriod, setLeaderboardPeriod] =
  useState<LeaderboardPeriod>("weekly");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    try { setAvatarUrl(localStorage.getItem(AVATAR_KEY)); } catch {}
  }, []);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarUrl(dataUrl);
      try { localStorage.setItem(AVATAR_KEY, dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.toUpperCase() ??
    "EXPLORER";

  // TEMP: matches mock leaderboard until real data is wired up
  const meUserId = "u3";

  useEffect(() => {
    const format = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    format();
    const id = setInterval(format, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (activeTab !== "rank") return;

    const controller = new AbortController();

    setLeaderboardLoading(true);
    setLeaderboardError(null);

    fetch(`/api/leaderboard?period=${leaderboardPeriod}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Leaderboard fetch failed (HTTP ${res.status})`);
        return res.json() as Promise<LeaderboardResponse>;
      })
      .then((json) => setLeaderboardData(json))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setLeaderboardError(err?.message ?? String(err));
      })
      .finally(() => setLeaderboardLoading(false));

    return () => controller.abort();
  }, [activeTab, leaderboardPeriod]);

  const handleAvatarTap = () => {
    setMagicActive(true);
    setTimeout(() => setMagicActive(false), 1500);
  };

  return (
    <div className="min-h-screen bg-quest-dark text-white font-sans pb-24 relative">
      {/* Magic burst overlay */}
      {magicActive && (
        <div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          aria-hidden
        >
          <div className="animate-magic-burst absolute size-64 rounded-full bg-quest-glow/30 scale-0" />
          <div className="animate-magic-burst-delay absolute size-48 rounded-full bg-quest-accent/40 scale-0" />
          <p className="relative z-10 text-quest-glow font-bold text-xl animate-bounce-in">
            +50 XP!
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 relative">
        <span className="text-sm text-quest-muted tabular-nums">
          {currentTime || "9:41"}
        </span>
        <h1 className="flex items-center gap-1.5 text-quest-glow font-bold text-sm tracking-wider">
          <StarIcon className="size-4" />
          UNCOVER
        </h1>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 text-white hover:text-quest-glow transition-colors rounded-lg hover:bg-white/5"
          >
            <MenuIcon className="size-6" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-quest-border bg-quest-card py-2 shadow-xl z-50">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  /* TODO: navigate to settings */
                  
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  /* TODO: navigate to profile edit */
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5 transition-colors"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full px-4 py-2 text-left text-sm text-quest-muted hover:bg-white/5 hover:text-white transition-colors border-t border-quest-border mt-1 pt-2"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tab content */}
      {activeTab === "me" && (
        <>
          {/* Profile */}
          <section className="flex flex-col items-center px-6 pt-4 pb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow rounded-lg"
              aria-label="Upload profile picture"
            >
              <div
                className={`size-24 rounded-full overflow-hidden transition-all duration-300 ${
                  magicActive
                    ? "shadow-[0_0_40px_rgba(251,191,36,0.6)] scale-110"
                    : "shadow-[0_0_24px_rgba(249,115,22,0.5)]"
                } ring-3 ring-quest-accent`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-quest-accent/90 flex items-center justify-center text-4xl">
                    {"\u{1F4F7}"}
                  </div>
                )}
              </div>
              <span className="text-2xl font-bold tracking-wider text-quest-glow">
                {displayName}
              </span>
              <span className="flex items-center gap-1 text-sm text-quest-muted">
                <StarIcon className="size-3" />
                {avatarUrl ? "TAP TO CHANGE PHOTO" : "TAP TO ADD PHOTO"}
                <StarIcon className="size-3" />
              </span>
            </button>
          </section>

          {/* Level & XP */}
          <section className="px-6 pb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white font-medium">LEVEL 7</span>
              <span className="text-white">4820 / 5000 XP</span>
            </div>
            <div className="h-3 rounded-full bg-quest-card overflow-hidden border border-quest-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-quest-accent to-quest-glow transition-all"
                style={{ width: "96.4%" }}
              />
            </div>
          </section>

          {/* Stats grid */}
          <section className="grid grid-cols-2 gap-3 px-6 pb-8">
            {[
              { label: "KM WALKED", value: "42.8", unit: "km" },
              { label: "TILES FOUND", value: "38", unit: "/120" },
              { label: "SPOTS CLAIMED", value: "2", unit: "spots" },
              { label: "DAYS ACTIVE", value: "18", unit: "days" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-quest-border bg-quest-card p-4"
              >
                <p className="text-xs text-quest-muted uppercase tracking-wide mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-quest-accent">
                  {stat.value}
                  <span className="text-sm font-normal text-white ml-1">
                    {stat.unit}
                  </span>
                </p>
              </div>
            ))}
          </section>

          {/* Badges */}
          <section className="px-6 pb-8">
            <h2 className="text-xs text-quest-muted uppercase tracking-wide mb-4">
              Badges
            </h2>
            <div className="flex gap-4">
              {[
                { name: "7-DAY STREAK", icon: "flame", earned: true },
                { name: "EXPLORER", icon: "map", earned: true },
                { name: "SPEED WALKER", icon: "walk", earned: false },
                { name: "SPOT HUNTER", icon: "star", earned: true },
              ].map((badge) => (
                <button
                  key={badge.name}
                  type="button"
                  className="flex flex-col items-center gap-2 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow rounded-lg"
                  title={badge.earned ? badge.name : `Locked: ${badge.name}`}
                >
                  <div
                    className={`size-14 rounded-xl border border-quest-border flex items-center justify-center transition-colors ${
                      badge.earned
                        ? "bg-quest-card hover:border-quest-accent/50"
                        : "bg-quest-card/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <BadgeIcon type={badge.icon} earned={badge.earned} />
                  </div>
                  <span className="text-[10px] text-white text-center leading-tight">
                    {badge.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === "map" && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen text-quest-muted text-sm">
              Loading map…
            </div>
          }
        >
          <WalkMap />
        </Suspense>
      )}

      {activeTab === "quests" && (
        <div className="px-6 py-8 space-y-8">
          {/* Active quests */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Quests</h2>
            <ul className="space-y-3">
              {[
                { title: "Walk 5 km this week", progress: "3.2 / 5 km", done: false },
                { title: "Find 3 new tiles", progress: "2 / 3", done: false },
                { title: "7-day streak", progress: "Done!", done: true },
              ].map((q, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-quest-border bg-quest-card p-4 text-left hover:border-quest-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow"
                  >
                    <p className="font-medium text-white">{q.title}</p>
                    <p
                      className={`text-sm mt-1 ${
                        q.done ? "text-quest-glow" : "text-quest-muted"
                      }`}
                    >
                      {q.progress}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Monthly Tournament Registration */}
          <div className="rounded-2xl border border-quest-border overflow-hidden">
            {/* Header banner */}
            <div className="bg-quest-card px-5 pt-5 pb-4 border-b border-quest-border">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-white tracking-wide text-base">
                  MONTHLY TOURNAMENT
                </h3>
              </div>
              <p className="text-quest-muted text-sm">
                Compete against explorers across campus. Top walkers win exclusive rewards.
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Details row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                  <p className="text-xs text-quest-muted mb-0.5">Next tournament</p>
                  <p className="text-sm font-semibold text-white">March 2026</p>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                  <p className="text-xs text-quest-muted mb-0.5">Registration fee</p>
                  <p className="text-sm font-bold text-quest-glow">$5.00</p>
                </div>
              </div>

              {/* Prize / info */}
              <ul className="space-y-1.5 text-sm text-quest-muted">
                <li className="flex items-center gap-2">
                  <span className="text-quest-glow text-xs">✦</span>
                  Ranked by total km walked during the month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-quest-glow text-xs">✦</span>
                  Top 1 earns prize pool
                </li>
             
              </ul>

              {/* Register button */}
              <button
                type="button"
                className="w-full rounded-xl bg-quest-glow hover:bg-quest-glow/80 active:scale-95 transition-all text-quest-dark font-bold py-3 text-sm tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow"
                onClick={() => alert("Tournament registration coming soon!")}
              >
                REGISTER FOR $5.00
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rank" && (
      <>
        {leaderboardLoading && (
          <div className="px-6 py-8 text-quest-muted text-sm">
            Loading leaderboard…
          </div>
        )}

        {leaderboardError && (
          <div className="px-6 py-8 text-red-300 text-sm">
            Error: {leaderboardError}
          </div>
        )}

        {leaderboardData && (
          <Leaderboard
            data={leaderboardData}
            meUserId={meUserId}
            period={leaderboardPeriod}
            onChangePeriod={setLeaderboardPeriod}
          />
        )}
      </>
    )}

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl bg-quest-card border-t border-quest-border px-4 py-3 flex justify-around items-center"
        aria-label="Main navigation"
      >
        <NavItem
          icon="map"
          label="MAP"
          active={activeTab === "map"}
          onClick={() => setActiveTab("map")}
        />
        <NavItem
          icon="quests"
          label="QUESTS"
          active={activeTab === "quests"}
          onClick={() => setActiveTab("quests")}
        />
        <NavItem
          icon="rank"
          label="RANK"
          active={activeTab === "rank"}
          onClick={() => setActiveTab("rank")}
        />
        <NavItem
          icon="me"
          label="ME"
          active={activeTab === "me"}
          onClick={() => setActiveTab("me")}
        />
      </nav>
    </div>
  );
}

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Campus tile grid — Stevens Institute, Hoboken NJ
const CAMPUS = { minLng: -74.0269, maxLng: -74.0219, minLat: 40.7418, maxLat: 40.7478, cols: 10, rows: 12 };
const TOTAL_TILES = CAMPUS.cols * CAMPUS.rows; // 120

// 38 tiles already discovered by the player
const DISCOVERED = new Set([
  12, 13, 14, 15,
  22, 23, 24, 25, 26,
  32, 33, 34, 35, 36,
  42, 43, 44, 45, 46,
  52, 53, 54, 55, 56,
  62, 63, 64, 65, 66,
  72, 73, 74, 75,
  82, 83, 84,
  93, 103,
]);

function buildTileGeoJSON() {
  const { minLng, maxLng, minLat, maxLat, cols, rows } = CAMPUS;
  const dLng = (maxLng - minLng) / cols;
  const dLat = (maxLat - minLat) / rows;
  const features = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng0 = minLng + c * dLng, lng1 = lng0 + dLng;
      const lat0 = minLat + r * dLat, lat1 = lat0 + dLat;
      features.push({
        type: "Feature" as const,
        properties: { discovered: DISCOVERED.has(r * cols + c) },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[lng0, lat0], [lng1, lat0], [lng1, lat1], [lng0, lat1], [lng0, lat0]]],
        },
      });
    }
  }
  return { type: "FeatureCollection" as const, features };
}

const QUEST_PINS = [
  { lng: -74.0258, lat: 40.7460, label: "Find 3 new tiles", color: "#fbbf24" },
  { lng: -74.0232, lat: 40.7438, label: "Walk 5 km this week", color: "#f97316" },
];

// OpenStreetMap embed bbox for campus (left, bottom, right, top)
const OSM_BBOX = `${CAMPUS.minLng},${CAMPUS.minLat},${CAMPUS.maxLng},${CAMPUS.maxLat}`;
const OSM_EMBED_URL = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(OSM_BBOX)}&layer=mapnik&marker=40.7448%2C-74.0244`;

function MapView({ mode }: { mode: "tiles" | "quests" }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const useMapbox = Boolean(MAPBOX_ACCESS_TOKEN);

  useEffect(() => {
    if (!useMapbox || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-74.0244, 40.7448],
      zoom: 16,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    map.on("load", () => {
      // Tile grid
      map.addSource("campus-tiles", { type: "geojson", data: buildTileGeoJSON() });
      map.addLayer({
        id: "tiles-fill",
        type: "fill",
        source: "campus-tiles",
        paint: {
          "fill-color": ["case", ["get", "discovered"], "#f97316", "#94a3b8"],
          "fill-opacity": ["case", ["get", "discovered"], 0.22, 0.06],
        },
      });
      map.addLayer({
        id: "tiles-outline",
        type: "line",
        source: "campus-tiles",
        paint: {
          "line-color": ["case", ["get", "discovered"], "#fbbf24", "#94a3b8"],
          "line-opacity": ["case", ["get", "discovered"], 0.5, 0.12],
          "line-width": 1,
        },
      });

      // Quest markers
      QUEST_PINS.forEach(({ lng, lat, label, color }) => {
        const el = document.createElement("div");
        el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 10px ${color};cursor:pointer;`;
        new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(label))
          .addTo(map);
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [useMapbox]);

  // Toggle tile / quest layer visibility when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const tileVis = mode === "tiles" ? "visible" : "none";
    map.setLayoutProperty("tiles-fill", "visibility", tileVis);
    map.setLayoutProperty("tiles-outline", "visibility", tileVis);
  }, [mode]);

  const pct = ((DISCOVERED.size / TOTAL_TILES) * 100).toFixed(1);

  return (
    <div className="rounded-2xl border border-quest-border bg-quest-card overflow-hidden">
      <div className="relative h-[60vh]">
        {useMapbox ? (
          <div ref={mapContainerRef} className="absolute inset-0" />
        ) : (
          <iframe
            title="Campus map (OpenStreetMap)"
            src={OSM_EMBED_URL}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}

        {/* Legend — only for Mapbox (tiles/quests overlay) */}
        {useMapbox && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-black/60 backdrop-blur-sm px-3 py-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-quest-accent" />
              <span className="text-[10px] text-white">Discovered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-sm bg-quest-muted opacity-40" />
              <span className="text-[10px] text-quest-muted">Unexplored</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full border border-white" style={{ background: "#fbbf24" }} />
              <span className="text-[10px] text-quest-muted">Quest</span>
            </div>
          </div>
        )}

        {/* Branding */}
        <div className="pointer-events-none absolute top-3 left-3">
          <div className="rounded-full bg-black/50 px-3 py-1 text-[10px] text-quest-muted backdrop-blur">
            {useMapbox ? "Map powered by Mapbox" : "Map © OpenStreetMap"}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-quest-border">
        <div className="size-2 rounded-full bg-quest-accent shrink-0" />
        <span className="text-xs text-white font-medium shrink-0">
          {DISCOVERED.size} / {TOTAL_TILES} tiles
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-quest-dark overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-quest-accent to-quest-glow"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-quest-muted shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      fill="none"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function BadgeIcon({
  type,
  earned,
}: {
  type: string;
  earned: boolean;
}) {
  const c = earned ? "text-quest-accent" : "text-quest-muted";
  if (type === "flame")
    return (
      <svg
        className={`size-7 ${c}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 23c4.97 0 9-3.59 9-8 0-3.4-2.04-6.24-5-7.4V5c0 1.1-.9 2-2 2s-2-.9-2-2v-.5C9.04 4.76 7 7.6 7 11c0 4.41 4.03 8 9 8z" />
      </svg>
    );
  if (type === "map")
    return (
      <svg
        className={`size-7 ${c}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M8 2v20l6-3 6 3V5l-6-3-6 3z" />
        <path d="M8 2l6 3 6-3M8 22l6-3 6 3" />
      </svg>
    );
  if (type === "walk")
    return (
      <svg
        className={`size-7 ${c}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M13 5l4 4-4 4M6 12h11" />
      </svg>
    );
  return (
    <StarIcon className={earned ? "size-7 text-quest-glow" : `size-7 ${c}`} />
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors border-b-2 border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow ${
        active
          ? "bg-quest-glow/15 text-quest-glow border-quest-glow shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          : "text-quest-muted hover:text-white"
      }`}
    >
      {icon === "map" && <MapNavIcon />}
      {icon === "quests" && <QuestsNavIcon />}
      {icon === "rank" && <RankNavIcon />}
      {icon === "me" && <MeNavIcon active={active} />}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MapNavIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`size-6 ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M2 6l6-3 6 3 6-3v14l-6 3-6-3-6 3V6z" />
      <path d="M8 3v14M16 5v14" />
    </svg>
  );
}

function QuestsNavIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 10h16M8 14h4" />
    </svg>
  );
}

function RankNavIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
    </svg>
  );
}

function MeNavIcon({ active }: { active?: boolean }) {
  const fill = (i: number) => [1, 3, 4, 5, 7].includes(i);
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-0.5 size-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-sm ${
            active ? "bg-quest-glow" : "bg-quest-muted"
          } ${fill(i) ? "opacity-100" : "opacity-40"}`}
        />
      ))}
    </div>
  );
}
