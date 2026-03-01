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
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
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
          <div key={stat.label} className="rounded-xl border border-quest-border bg-quest-card p-4">
            <p className="text-xs text-quest-muted uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-quest-accent">
              {stat.value}
              <span className="text-sm font-normal text-white ml-1">{stat.unit}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Badges */}
      <section className="px-6 pb-8">
        <h2 className="text-xs text-quest-muted uppercase tracking-wide mb-4">Badges</h2>
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
              <span className="text-[10px] text-white text-center leading-tight">{badge.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
