"use client";

import { useEffect, useState } from "react";

const WEEKLY_KM_GOAL = 5;
const WEEKLY_TILES_GOAL = 3;
const STREAK_GOAL = 7;

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function computeStreak(days: string[]): number {
  if (!days.length) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cursor = new Date(today);
  for (const d of sorted) {
    const expected = cursor.toISOString().slice(0, 10);
    if (d === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

interface QuestState {
  weeklyKm: number;
  weeklyTiles: number;
  streak: number;
}

export default function QuestsTab() {
  const [q, setQ] = useState<QuestState>({ weeklyKm: 0, weeklyTiles: 0, streak: 0 });

  useEffect(() => {
    try {
      const weekStart = getWeekStart();
      const weeklyRaw = localStorage.getItem("walkmap-weekly");
      const weekly = weeklyRaw ? JSON.parse(weeklyRaw) : null;
      const weeklyKm =
        weekly?.weekStart === weekStart
          ? parseFloat((weekly.distMeters / 1000).toFixed(2))
          : 0;
      const weeklyTiles =
        weekly?.weekStart === weekStart ? (weekly.tilesFound as number) : 0;

      const daysRaw = localStorage.getItem("walkmap-days");
      const days: string[] = daysRaw ? JSON.parse(daysRaw) : [];
      const streak = computeStreak(days);

      setQ({ weeklyKm, weeklyTiles, streak });
    } catch {}
  }, []);

  const quests = [
    {
      title: `Walk ${WEEKLY_KM_GOAL} km this week`,
      value: q.weeklyKm,
      goal: WEEKLY_KM_GOAL,
      progress: `${q.weeklyKm} / ${WEEKLY_KM_GOAL} km`,
      done: q.weeklyKm >= WEEKLY_KM_GOAL,
    },
    {
      title: `Find ${WEEKLY_TILES_GOAL} new tiles this week`,
      value: q.weeklyTiles,
      goal: WEEKLY_TILES_GOAL,
      progress: `${q.weeklyTiles} / ${WEEKLY_TILES_GOAL}`,
      done: q.weeklyTiles >= WEEKLY_TILES_GOAL,
    },
    {
      title: `${STREAK_GOAL}-day streak`,
      value: q.streak,
      goal: STREAK_GOAL,
      progress: q.streak >= STREAK_GOAL ? "Done!" : `${q.streak} / ${STREAK_GOAL} days`,
      done: q.streak >= STREAK_GOAL,
    },
  ];

  const daysUntilDrop = Math.max(
    0,
    Math.ceil((new Date("2026-03-15").getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  );

  return (
    <div className="px-6 py-8 space-y-8">

      {/* Next Event Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-quest-card to-quest-dark border border-quest-glow/25 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex justify-end mb-3">
            <span className="text-xs text-quest-muted bg-white/5 rounded-full px-3 py-0.5">
              {daysUntilDrop === 0 ? "Today!" : `${daysUntilDrop} days away`}
            </span>
          </div>
          <p className="text-white font-bold text-lg leading-tight mb-2">
            Campus Town Drop
          </p>
          <p className="text-quest-muted text-sm leading-relaxed">
            Bonus points are getting scattered across explored turf on the 15th. 
            The more ground you&apos;ve covered by then, the more loot lands in your zone.
            Walk more now, cash in later.
          </p>
        </div>
        <div className="border-t border-quest-border px-5 py-3 flex items-center gap-2">
          <span className="text-xs text-quest-muted">Your coverage so far</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-quest-glow/60"
              style={{ width: `${Math.min(100, Math.round((q.weeklyKm / 5) * 100))}%` }}
            />
          </div>
          <span className="text-xs text-quest-glow font-medium">{q.weeklyKm} km</span>
        </div>
      </div>

      {/* Active quests */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Quests</h2>
        <ul className="space-y-3">
          {quests.map((quest) => (
            <li key={quest.title}>
              <div className="w-full rounded-xl border border-quest-border bg-quest-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-white">{quest.title}</p>
                  <p className={`text-sm ml-3 shrink-0 ${quest.done ? "text-quest-glow" : "text-quest-muted"}`}>
                    {quest.progress}
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${quest.done ? "bg-quest-glow" : "bg-quest-accent"}`}
                    style={{ width: `${Math.min(100, (quest.value / quest.goal) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Monthly Tournament Registration */}
      <div className="rounded-2xl border border-quest-border overflow-hidden">
        <div className="bg-quest-card px-5 pt-5 pb-4 border-b border-quest-border">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white tracking-wide text-base">MONTHLY TOURNAMENT</h3>
          </div>
          <p className="text-quest-muted text-sm">
            Compete against explorers across campus. Top walkers win exclusive rewards.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
              <p className="text-xs text-quest-muted mb-0.5">Next tournament</p>
              <p className="text-sm font-semibold text-white">March 15, 2026</p>
            </div>
            <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
              <p className="text-xs text-quest-muted mb-0.5">Registration fee</p>
              <p className="text-sm font-bold text-quest-glow">$5.00</p>
            </div>
          </div>

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
  );
}
