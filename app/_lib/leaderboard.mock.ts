import type { LeaderboardResponse, LeaderboardPeriod } from "../_types/leaderboard";

const base = [
  { userId: "u1", name: "ALEX", xp: 12400 },
  { userId: "u2", name: "JORDAN", xp: 11100 },
  { userId: "u3", name: "ZARA", xp: 4820 },
  { userId: "u4", name: "SAM", xp: 4200 },
  { userId: "u5", name: "RILEY", xp: 3900 },
  { userId: "u6", name: "MORGAN", xp: 3650 },
  { userId: "u7", name: "TAYLOR", xp: 3200 },
  { userId: "u8", name: "CASEY", xp: 2950 },
];

function build(period: LeaderboardPeriod): LeaderboardResponse {
  const rows = [...base]
    .sort((a, b) => b.xp - a.xp)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    period,
    updatedAtISO: new Date().toISOString(),
    rows,
  };
}

export function getMockLeaderboard(period: LeaderboardPeriod): LeaderboardResponse {
  return build(period);
}