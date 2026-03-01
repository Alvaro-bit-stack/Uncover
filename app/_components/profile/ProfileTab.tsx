"use client";

import { useState, useEffect, useRef } from "react";

const AVATAR_KEY = "walkmap-avatar";

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
  magicActive: boolean;
  onAvatarTap: () => void;
}

export default function ProfileTab({ displayName, magicActive, onAvatarTap }: ProfileTabProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ km: "0.0", tiles: 0, spots: 0, days: 0 });

  useEffect(() => {
    try { setAvatarUrl(localStorage.getItem(AVATAR_KEY)); } catch {}
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

  return (
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
          className="group flex flex-col items-center gap-2 focus:outline-none"
          aria-label="Upload profile picture"
        >
          <div
            className={`size-24 rounded-full overflow-hidden ring-1 transition-all duration-300 ${
              magicActive
                ? "ring-quest-glow scale-105"
                : "ring-quest-accent/40"
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-quest-accent/90 flex items-center justify-center text-4xl">
                {"\u{1F4F7}"}
              </div>
            )}
          </div>
          <span className="text-2xl font-bold tracking-wider text-white">
            {displayName}
          </span>
          <span className="text-xs text-quest-muted tracking-widest">
            {avatarUrl ? "Change photo" : "Add photo"}
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
