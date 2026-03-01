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
      <div className="rounded-xl border border-white/8 bg-quest-card overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-3">
            <p className="text-white font-semibold text-base leading-tight">
              Campus Town Drop
            </p>
            <span className="text-[10px] text-quest-muted border border-white/8 rounded-full px-2.5 py-1 ml-3 shrink-0">
              {daysUntilDrop === 0 ? "Today" : `${daysUntilDrop}d away`}
            </span>
          </div>
          <p className="text-quest-muted text-sm leading-relaxed">
            Bonus points scatter across explored turf on the 15th.
            The more ground you&apos;ve covered by then, the more loot lands in your zone.
          </p>
        </div>
        <div className="border-t border-white/6 px-5 py-3 flex items-center gap-3">
          <span className="text-[10px] text-quest-muted uppercase tracking-widest">Coverage</span>
          <div className="flex-1 h-px bg-white/8 overflow-visible relative">
            <div
              className="absolute inset-y-0 left-0 h-px bg-quest-accent"
              style={{ width: `${Math.min(100, Math.round((q.weeklyKm / 5) * 100))}%` }}
            />
          </div>
          <span className="text-xs text-white/60">{q.weeklyKm} km</span>
        </div>
      </div>

      {/* Active quests */}
      <div>
        <h2 className="text-[10px] text-quest-muted uppercase tracking-widest mb-4">Quests</h2>
        <ul className="space-y-2">
          {quests.map((quest) => (
            <li key={quest.title}>
              <div className="w-full rounded-lg border border-white/6 bg-quest-card p-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-sm text-white/90">{quest.title}</p>
                  <p className={`text-xs ml-3 shrink-0 tabular-nums ${quest.done ? "text-quest-glow" : "text-quest-muted"}`}>
                    {quest.progress}
                  </p>
                </div>
                <div className="h-px bg-white/8 overflow-visible relative">
                  <div
                    className={`absolute inset-y-0 left-0 h-px transition-all ${quest.done ? "bg-quest-glow" : "bg-quest-accent"}`}
                    style={{ width: `${Math.min(100, (quest.value / quest.goal) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Monthly Tournament Registration */}
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="bg-quest-card px-5 pt-5 pb-4 border-b border-white/6">
          <h3 className="text-xs font-semibold text-white tracking-widest uppercase mb-1">Monthly Tournament</h3>
          <p className="text-quest-muted text-sm">
            Compete against explorers across campus. Top walkers win exclusive rewards.
          </p>
        </div>

        <div className="bg-quest-card px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-white/6 rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-quest-muted uppercase tracking-widest mb-1">Next round</p>
              <p className="text-sm text-white">Mar 15, 2026</p>
            </div>
            <div className="border border-white/6 rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-quest-muted uppercase tracking-widest mb-1">Entry fee</p>
              <p className="text-sm font-semibold text-quest-glow">$5.00</p>
            </div>
          </div>

          <ul className="space-y-1.5 text-sm text-quest-muted">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-quest-accent/60 shrink-0" />
              Ranked by total km walked during the month
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-quest-accent/60 shrink-0" />
              Top 1 earns the prize pool
            </li>
          </ul>

          <button
            type="button"
            className="w-full rounded-lg border border-quest-glow/30 text-quest-glow font-semibold py-2.5 text-xs tracking-widest uppercase hover:bg-quest-glow/8 active:scale-[0.98] transition-all focus:outline-none"
            onClick={() => alert("Tournament registration coming soon!")}
          >
            Register — $5.00
          </button>
        </div>
      </div>
    </div>
  );
}
