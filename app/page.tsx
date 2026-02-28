"use client";

import { useState, useEffect, useRef } from "react";

type Tab = "map" | "quests" | "rank" | "me";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("me");
  const [menuOpen, setMenuOpen] = useState(false);
  const [magicActive, setMagicActive] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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
          CAMPUSQUEST
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
                  /* TODO: sign out */
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
            <button
              type="button"
              onClick={handleAvatarTap}
              className="group flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow rounded-lg"
              aria-label="Tap avatar for magic"
            >
              <div
                className={`size-24 rounded-lg bg-quest-accent/90 grid grid-cols-4 grid-rows-4 gap-0.5 p-1 transition-all duration-300 ${
                  magicActive
                    ? "shadow-[0_0_40px_rgba(251,191,36,0.6)] scale-110"
                    : "shadow-[0_0_24px_rgba(249,115,22,0.5)]"
                }`}
              >
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={`size-4 rounded-sm transition-colors ${
                      magicActive ? "bg-quest-glow" : "bg-quest-accent"
                    }`}
                    style={{
                      opacity: i % 4 === 0 || i < 4 ? 1 : 0.7,
                    }}
                  />
                ))}
              </div>
              <span className="text-2xl font-bold tracking-wider text-quest-glow">
                ZARA
              </span>
              <span className="flex items-center gap-1 text-sm text-quest-muted">
                <StarIcon className="size-3" />
                TAP AVATAR FOR MAGIC
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
        <div className="px-6 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="size-20 rounded-2xl border border-quest-border bg-quest-card flex items-center justify-center mb-4">
            <MapNavIcon className="text-quest-muted" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Map</h2>
          <p className="text-quest-muted text-sm max-w-xs">
            Explore campus and discover tiles. Map view coming soon.
          </p>
        </div>
      )}

      {activeTab === "quests" && (
        <div className="px-6 py-8">
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
      )}

      {activeTab === "rank" && (
        <div className="px-6 py-8">
          <h2 className="text-lg font-bold text-white mb-4">Leaderboard</h2>
          <div className="rounded-xl border border-quest-border bg-quest-card overflow-hidden">
            {[
              { rank: 1, name: "ALEX", xp: "12.4k" },
              { rank: 2, name: "JORDAN", xp: "11.1k" },
              { rank: 3, name: "ZARA", xp: "4.8k", highlight: true },
              { rank: 4, name: "SAM", xp: "4.2k" },
              { rank: 5, name: "RILEY", xp: "3.9k" },
            ].map((row) => (
              <div
                key={row.rank}
                className={`flex items-center justify-between px-4 py-3 border-b border-quest-border last:border-0 ${
                  row.highlight ? "bg-quest-glow/10" : ""
                }`}
              >
                <span className="text-quest-muted w-8">#{row.rank}</span>
                <span className="font-medium text-white">{row.name}</span>
                <span className="text-quest-accent font-bold">{row.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-quest-card border-t border-quest-border px-4 py-3 flex justify-around items-center"
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
