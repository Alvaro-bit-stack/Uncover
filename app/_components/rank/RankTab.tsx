"use client";

import { useState, useEffect } from "react";
import Leaderboard from "../leaderboard/Leaderboard";
import type { LeaderboardPeriod, LeaderboardResponse } from "../../_types/leaderboard";

const ME_USER_ID = "u3";

export default function RankTab() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/leaderboard?period=${period}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Leaderboard fetch failed (HTTP ${res.status})`);
        return res.json() as Promise<LeaderboardResponse>;
      })
      .then((json) => setData(json))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError(err?.message ?? String(err));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [period]);

  return (
    <>
      {loading && (
        <div className="px-6 py-8 text-quest-muted text-sm">Loading leaderboard…</div>
      )}
      {error && (
        <div className="px-6 py-8 text-red-300 text-sm">Error: {error}</div>
      )}
      {data && (
        <Leaderboard
          data={data}
          meUserId={ME_USER_ID}
          period={period}
          onChangePeriod={setPeriod}
        />
      )}
    </>
  );
}
