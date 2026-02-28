"use client";

import { useMemo } from "react";
import type {
  LeaderboardResponse,
  LeaderboardPeriod,
} from "../../_types/leaderboard";
import { formatCompactNumber } from "../../_lib/format";

type Props = {
  data: LeaderboardResponse;
  meUserId?: string;
  period: LeaderboardPeriod;
  onChangePeriod: (p: LeaderboardPeriod) => void;
};

export default function Leaderboard({
  data,
  meUserId,
  period,
  onChangePeriod,
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
            Updated {new Date(data.updatedAtISO).toLocaleString()}
            {meRank ? ` • You are #${meRank}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <PeriodPill
            label="Day"
            active={period === "daily"}
            onClick={() => onChangePeriod("daily")}
          />
          <PeriodPill
            label="Week"
            active={period === "weekly"}
            onClick={() => onChangePeriod("weekly")}
          />
          <PeriodPill
            label="All"
            active={period === "all"}
            onClick={() => onChangePeriod("all")}
          />
        </div>
      </div>

      <div className="rounded-xl border border-quest-border bg-quest-card overflow-hidden">
        {data.rows.map((row) => {
          const highlight = meUserId && row.userId === meUserId;
          return (
            <div
              key={row.userId}
              className={`flex items-center justify-between px-4 py-3 border-b border-quest-border last:border-0 ${
                highlight ? "bg-quest-glow/10" : ""
              }`}
            >
              <span className="text-quest-muted w-10 tabular-nums">
                #{row.rank}
              </span>
              <span className="font-medium text-white flex-1 truncate">
                {row.name}
              </span>
              <span className="text-quest-accent font-bold tabular-nums">
                {formatCompactNumber(row.xp)} XP
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        active
          ? "border-quest-glow text-quest-glow bg-quest-glow/10"
          : "border-quest-border text-quest-muted hover:text-white hover:border-quest-accent/50"
      }`}
    >
      {label}
    </button>
  );
}