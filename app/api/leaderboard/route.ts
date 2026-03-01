import { NextResponse } from "next/server";

type Period = "daily" | "weekly" | "all";

function getMock(period: Period) {
  // later: replace this function with a Supabase query, keep the response shape the same
  const base = [
    { userId: "u1", name: "ALEX", xp: 12400 },
    { userId: "u2", name: "JORDAN", xp: 11100 },
    { userId: "u3", name: "ZARA", xp: 4820 },
    { userId: "u4", name: "SAM", xp: 4200 },
    { userId: "u5", name: "RILEY", xp: 3900 },
  ];

  // optional: tweak values by period (so the toggle looks real)
  const factor =
    period === "daily" ? 0.08 :
    period === "weekly" ? 0.25 :
    1;

  return base
    .map((r) => ({ ...r, xp: Math.round(r.xp * factor) }))
    .sort((a, b) => b.xp - a.xp)
    .map((r, i) => ({ rank: i + 1, ...r }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "weekly") as Period;

  const allowed: Period[] = ["daily", "weekly", "all"];
  const safePeriod: Period = allowed.includes(period) ? period : "weekly";

  return NextResponse.json({
    period: safePeriod,
    updatedAtISO: new Date().toISOString(),
    rows: getMock(safePeriod),
  });
}
