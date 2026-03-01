"use client";

import { useState, useEffect } from "react";

const AVATAR_KEY = "walkmap-avatar";

// Pixel art seeds — shown in the picker
const PIXEL_AVATARS = [
  "Shadow","Blaze","Nova","Pixel","Ghost","Storm","Viper","Echo",
  "Frost","Drift","Sage","Rune","Flux","Crypt","Dusk","Ember",
  "Glitch","Hawk","Iris","Jinx","Kira","Lore","Mist","Neon",
  "Orion","Prism","Quinn","Rift","Sable","Titan","Ultra","Volt",
  "Wren","Xenon","Yuki","Zara","Ace","Byte","Comet","Delta",
  "Edge","Faze","Grid","Haze","Icon","Jade","Knox","Lyra",
  "Mars","Night","Opal","Punk","Quill","Rex","Sync","Thorn",
  "Duck",
];

// Special overrides — use a real image instead of DiceBear
const AVATAR_OVERRIDES: Record<string, string> = {
  Duck: "https://openmoji.org/data/color/svg/1F986.svg",
};

function pixelUrl(seed: string) {
  if (AVATAR_OVERRIDES[seed]) return AVATAR_OVERRIDES[seed];
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function BadgeIcon({ type, earned }: { type: string; earned: boolean }) {
  const c = earned ? "text-quest-accent" : "text-quest-muted";
  if (type === "flame")
    return (
      <svg className={`size-7 ${c}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 23c4.97 0 9-3.59 9-8 0-3.4-2.04-6.24-5-7.4V5c0 1.1-.9 2-2 2s-2-.9-2-2v-.5C9.04 4.76 7 7.6 7 11c0 4.41 4.03 8 9 8z" />
      </svg>
    );
  if (type === "map")
    return (
      <svg className={`size-7 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M8 2v20l6-3 6 3V5l-6-3-6 3z" />
        <path d="M8 2l6 3 6-3M8 22l6-3 6 3" />
      </svg>
    );
  if (type === "walk")
    return (
      <svg className={`size-7 ${c}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M13 5l4 4-4 4M6 12h11" />
      </svg>
    );
  return <StarIcon className={earned ? "size-7 text-quest-glow" : `size-7 ${c}`} />;
}

interface ProfileTabProps {
  displayName: string;
}

function isValidSeed(v: string | null): v is string {
  return !!v && !v.startsWith("data:") && !v.startsWith("blob:");
}

export default function ProfileTab({ displayName }: ProfileTabProps) {
  const [avatarSeed, setAvatarSeed] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ km: "0.0", tiles: 0, spots: 0, days: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AVATAR_KEY);
      if (isValidSeed(stored)) setAvatarSeed(stored);
      else if (stored) localStorage.removeItem(AVATAR_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("walkmap-state");
      const state = raw ? JSON.parse(raw) : null;
      const km = state?.totalDist ? (state.totalDist / 1000).toFixed(1) : "0.0";
      const tiles = state?.exploredPoints ? (state.exploredPoints as unknown[]).length : 0;
      const achRaw = localStorage.getItem("walkmap-achievements");
      const spots = achRaw ? (JSON.parse(achRaw) as unknown[]).length : 0;
      const daysRaw = localStorage.getItem("walkmap-days");
      const days = daysRaw ? (JSON.parse(daysRaw) as unknown[]).length : 0;
      setStats({ km, tiles, spots, days });
    } catch {}
  }, []);

  function selectAvatar(seed: string) {
    setAvatarSeed(seed);
    try { localStorage.setItem(AVATAR_KEY, seed); } catch {}
    setPickerOpen(false);
    setSearch("");
  }

  const filtered = PIXEL_AVATARS.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Avatar Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-200 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => { setPickerOpen(false); setSearch(""); }}
          />
          {/* Sheet */}
          <div className="relative mt-auto rounded-t-2xl bg-quest-card border-t border-white/8 flex flex-col max-h-[75vh]">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-white/15" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/70">Choose Avatar</p>
              <button
                type="button"
                onClick={() => { setPickerOpen(false); setSearch(""); }}
                className="text-white/30 hover:text-white/70 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            {/* Search */}
            <div className="px-5 pb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search avatars..."
                autoFocus
                className="w-full bg-quest-dark border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-quest-accent/40 transition-colors"
              />
            </div>
            {/* Grid */}
            <div className="overflow-y-auto px-5 pb-6">
              {filtered.length === 0 ? (
                <p className="text-sm text-quest-muted text-center py-8">No avatars found</p>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {filtered.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => selectAvatar(seed)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                        avatarSeed === seed
                          ? "border-quest-accent bg-quest-accent/10"
                          : "border-white/6 hover:border-white/20 bg-quest-dark/50"
                      }`}
                    >
                      <img
                        src={pixelUrl(seed)}
                        alt={seed}
                        className="size-12"
                        loading="lazy"
                      />
                      <span className="text-[9px] text-white/40 truncate w-full text-center">{seed}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <section className="flex flex-col items-center px-6 pt-4 pb-6">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-2 focus:outline-none"
          aria-label="Choose pixel art avatar"
        >
          <div
            className="size-24 rounded-full overflow-hidden ring-1 ring-quest-accent/40 bg-quest-dark transition-all duration-300"
          >
            {avatarSeed ? (
              <img src={pixelUrl(avatarSeed)} alt={avatarSeed} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🎮
              </div>
            )}
          </div>
          <span className="text-2xl font-bold tracking-wider text-white">
            {displayName}
          </span>
          <span className="text-xs text-quest-muted tracking-widest">
            {avatarSeed ? `${avatarSeed} · Change` : "Pick your avatar"}
          </span>
        </button>
      </section>

      {/* Level & XP */}
      <section className="px-6 pb-6">
        <div className="flex justify-between text-xs mb-2.5">
          <span className="text-quest-muted uppercase tracking-widest">Level 7</span>
          <span className="text-white/50">4820 / 5000 XP</span>
        </div>
        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full bg-quest-accent transition-all"
            style={{ width: "96.4%" }}
          />
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-px bg-white/6 border border-white/6 rounded-xl overflow-hidden mx-6 mb-8">
        {[
          { label: "KM Walked", value: stats.km, unit: "km" },
          { label: "Tiles Found", value: String(stats.tiles), unit: "/120" },
          { label: "Spots Claimed", value: String(stats.spots), unit: "spots" },
          { label: "Days Active", value: String(stats.days), unit: "days" },
        ].map((stat) => (
          <div key={stat.label} className="bg-quest-card p-4">
            <p className="text-[10px] text-quest-muted uppercase tracking-widest mb-1.5">{stat.label}</p>
            <p className="text-2xl font-bold text-white">
              {stat.value}
              <span className="text-xs font-normal text-quest-muted ml-1">{stat.unit}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Badges */}
      <section className="px-6 pb-8">
        <h2 className="text-[10px] text-quest-muted uppercase tracking-widest mb-4">Badges</h2>
        <div className="flex gap-3">
          {[
            { name: "7-Day Streak", icon: "flame", earned: true },
            { name: "Explorer", icon: "map", earned: true },
            { name: "Speed Walker", icon: "walk", earned: false },
            { name: "Spot Hunter", icon: "star", earned: true },
          ].map((badge) => (
            <button
              key={badge.name}
              type="button"
              className="flex flex-col items-center gap-2 flex-1 focus:outline-none"
              title={badge.earned ? badge.name : `Locked: ${badge.name}`}
            >
              <div
                className={`size-13 rounded-lg border flex items-center justify-center transition-colors ${
                  badge.earned
                    ? "border-white/10 bg-quest-card"
                    : "border-white/4 bg-quest-card opacity-30 cursor-not-allowed"
                }`}
              >
                <BadgeIcon type={badge.icon} earned={badge.earned} />
              </div>
              <span className="text-[9px] text-white/50 text-center leading-tight">{badge.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
