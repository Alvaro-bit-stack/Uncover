export type LeaderboardPeriod = "daily" | "weekly" | "all";

export type LeaderboardRow = {
  userId: string;
  rank: number;
  name: string;
  xp: number; // keep as number; format in UI
  tilesFound?: number;
  daysActive?: number;
};

export type LeaderboardResponse = {
  period: LeaderboardPeriod;
  updatedAtISO: string;
  rows: LeaderboardRow[];
};