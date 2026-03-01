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

const PillBtn = (props: { label: string; active: boolean; press: () => void }) => (
  <button
    type="button"
    onClick={props.press}
    className={
      "text-xs px-3 py-1 rounded-full border transition-colors " +
      (props.active
        ? "border-quest-glow text-quest-glow bg-quest-glow/10"
        : "border-quest-border text-quest-muted hover:text-white hover:border-quest-accent/50")
    }
  >
    {props.label}
  </button>
);

const ChevronIcon = () => (
  <svg
    width={16}
    height={16}
    className="text-quest-muted shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export default function Leaderboard({
  data,
  meUserId,
  period,
  onChangePeriod,
  onViewUser,
}: Props) {
  const meRank = useMemo(() => {
    if (!meUserId) return null;
    const row = data.rows.find((r) => r.userId === meUserId);
    return row?.rank ?? null;
  }, [data.rows, meUserId]);

  return (
    <div className="px-6 py-8">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Leaderboard</h2>
          <p className="text-xs text-quest-muted mt-1">
            {"Updated " + new Date(data.updatedAtISO).toLocaleString() + (meRank != null ? " \u2022 You are #" + meRank : "")}
          </p>
        </div>
        <div className="flex gap-2">
          <PillBtn label="Day" active={period === "daily"} press={() => onChangePeriod("daily")} />
          <PillBtn label="Week" active={period === "weekly"} press={() => onChangePeriod("weekly")} />
          <PillBtn label="All" active={period === "all"} press={() => onChangePeriod("all")} />
        </div>
      </div>

      <div className="rounded-xl border border-quest-border bg-quest-card overflow-hidden">
        {data.rows.map((row) => {
          const isMe = meUserId != null && row.userId === meUserId;
          return (
            <button
              key={row.userId}
              type="button"
              onClick={() => onViewUser?.(row.userId, row.name)}
              className={
                "w-full flex items-center justify-between px-4 py-3 border-b border-quest-border last:border-0 text-left transition-colors hover:bg-white/5" +
                (isMe ? " bg-quest-glow/10" : "")
              }
            >
              <span className="text-quest-muted w-10 tabular-nums">{"#" + row.rank}</span>
              <span className="font-medium text-white flex-1 truncate">{row.name}</span>
              <span className="text-quest-accent font-bold tabular-nums mr-3">
                {formatCompactNumber(row.xp) + " XP"}
              </span>
              <ChevronIcon />
            </button>
          );
        })}
      </div>

      <p className="text-center text-quest-muted mt-3" style={{ fontSize: 10 }}>
        Tap a player to view their explored map
      </p>
    </div>
  );
}
