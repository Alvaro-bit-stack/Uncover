"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "./_lib/supabase/client";
import ProfileTab from "./_components/profile/ProfileTab";
import QuestsTab from "./_components/quests/QuestsTab";
import RankTab from "./_components/rank/RankTab";
import MapTab from "./_components/map/MapTab";

type Tab = "map" | "quests" | "rank" | "me";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("me");
  const [menuOpen, setMenuOpen] = useState(false);
  const [magicActive, setMagicActive] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName =
    (user?.user_metadata?.display_name as string | undefined)?.toUpperCase() ?? "EXPLORER";

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
        <span className="text-xs text-quest-muted tabular-nums tracking-wider">
          {currentTime || "9:41"}
        </span>
        <h1 className="text-quest-glow font-bold text-sm tracking-[0.25em] uppercase">
          Uncover
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
            <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-white/8 bg-quest-card py-1.5 shadow-2xl z-50">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-full px-4 py-2 text-left text-xs tracking-wide text-white/70 hover:text-white hover:bg-white/4 transition-colors"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-full px-4 py-2 text-left text-xs tracking-wide text-white/70 hover:text-white hover:bg-white/4 transition-colors"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full px-4 py-2 text-left text-xs tracking-wide text-quest-muted hover:text-white hover:bg-white/4 transition-colors border-t border-white/6 mt-1 pt-2"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tab content */}
      {activeTab === "me" && (
        <ProfileTab
          displayName={displayName}
          magicActive={magicActive}
          onAvatarTap={handleAvatarTap}
        />
      )}
      {activeTab === "map" && <MapTab />}
      {activeTab === "quests" && <QuestsTab />}
      {activeTab === "rank" && <RankTab />}

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-60 bg-quest-card border-t border-white/8 px-4 py-3 flex justify-around items-center"
        aria-label="Main navigation"
      >
        <NavItem icon="map" label="MAP" active={activeTab === "map"} onClick={() => setActiveTab("map")} />
        <NavItem icon="quests" label="QUESTS" active={activeTab === "quests"} onClick={() => setActiveTab("quests")} />
        <NavItem icon="rank" label="RANK" active={activeTab === "rank"} onClick={() => setActiveTab("rank")} />
        <NavItem icon="me" label="ME" active={activeTab === "me"} onClick={() => setActiveTab("me")} />
      </nav>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 py-1 px-3 transition-colors focus:outline-none ${
        active
          ? "text-quest-glow"
          : "text-quest-muted hover:text-white/70"
      }`}
    >
      {active && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-px bg-quest-glow" />
      )}
      {icon === "map" && <MapNavIcon />}
      {icon === "quests" && <QuestsNavIcon />}
      {icon === "rank" && <RankNavIcon />}
      {icon === "me" && <MeNavIcon active={active} />}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MapNavIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
