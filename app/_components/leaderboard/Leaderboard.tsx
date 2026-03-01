"use client";

import { useMemo } from "react";
import type { LeaderboardResponse, LeaderboardPeriod } from "../../_types/leaderboard";
import { formatCompactNumber } from "../../_lib/format";

type Props = {
  data: LeaderboardResponse;
  meUserId?: string;
  period: LeaderboardPeriod;
  onChangePeriod: (p: LeaderboardPeriod) => void;
  onViewUser?: (userId: string, name: string) => void;
};

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "daily", label: "Day" },
  { key: "weekly", label: "Week" },
  { key: "all", label: "All" },
];

export default function Leaderboard({ data, meUserId, period, onChangePeriod, onViewUser }: Props) {
  const meRank = useMemo(() => {
    if (!meUserId) return null;
    return data.rows.find((r) => r.userId === meUserId)?.rank ?? null;
  }, [data.rows, meUserId]);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">RANKINGS</h2>
            {meRank != null && (
              <p className="text-[11px] text-quest-muted mt-1.5 tracking-widest uppercase">
                Your position — <span className="text-white font-bold">#{meRank}</span>
              </p>
            )}
          </div>

          {/* Period tabs */}
          <div className="flex items-center gap-1 mt-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangePeriod(key)}
                className={`text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded transition-all ${
                  period === key
                    ? "text-quest-dark bg-white"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4">
        {data.rows.map((row) => {
          const isMe = meUserId != null && row.userId === meUserId;
          const isFirst = row.rank === 1;
          const isTop3 = row.rank <= 3;

          return (
            <button
              key={row.userId}
              type="button"
              onClick={() => onViewUser?.(row.userId, row.name)}
              className={`w-full flex items-center gap-4 px-4 rounded-xl mb-1 text-left transition-all active:scale-[0.98] ${
                isFirst
                  ? "py-5 bg-white"
                  : isTop3
                  ? "py-4 bg-quest-card"
                  : "py-3 bg-transparent"
              }`}
            >
              {/* Rank */}
              <span
                className={`tabular-nums font-black leading-none shrink-0 ${
                  isFirst
                    ? "text-3xl text-quest-dark"
                    : isTop3
                    ? "text-xl text-white/40"
                    : "text-sm text-white/20 w-6 text-center"
                }`}
              >
                {isFirst ? "01" : `${row.rank < 10 ? "0" : ""}${row.rank}`}
              </span>

              {/* Name */}
              <span
                className={`flex-1 truncate font-bold tracking-tight ${
                  isFirst
                    ? "text-lg text-quest-dark"
                    : isTop3
                    ? "text-base text-white"
                    : "text-sm text-white/60"
                } ${isMe && !isFirst ? "text-quest-accent" : ""}`}
              >
                {row.name}
                {isMe && (
                  <span className={`ml-2 text-[9px] font-black tracking-widest uppercase ${isFirst ? "text-quest-dark/40" : "text-quest-accent/50"}`}>
                    YOU
                  </span>
                )}
              </span>

              {/* XP */}
              <span
                className={`tabular-nums font-black shrink-0 ${
                  isFirst
                    ? "text-base text-quest-dark"
                    : isTop3
                    ? "text-sm text-white/70"
                    : "text-xs text-white/25"
                }`}
              >
                {formatCompactNumber(row.xp)}
                <span className={`ml-1 text-[9px] font-bold ${isFirst ? "text-quest-dark/50" : "text-white/20"}`}>XP</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[9px] text-white/10 tracking-widest uppercase py-6">
        Tap a player to view their map
      </p>
    </div>
  );
}
