import { NextResponse } from "next/server";
import { getMockLeaderboard } from "../../_lib/leaderboard.mock";
import type { LeaderboardPeriod } from "../../_types/leaderboard";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as LeaderboardPeriod) ?? "weekly";

  const safe: LeaderboardPeriod =
    period === "daily" || period === "weekly" || period === "all"
      ? period
      : "weekly";

  const data = getMockLeaderboard(safe);
  return NextResponse.json(data);
}