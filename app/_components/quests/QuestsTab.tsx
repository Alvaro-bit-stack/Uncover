"use client";

export default function QuestsTab() {
  return (
    <div className="px-6 py-8 space-y-8">
      {/* Active quests */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Quests</h2>
        <ul className="space-y-3">
          {[
            { title: "Walk 5 km this week", progress: "3.2 / 5 km", done: false },
            { title: "Find 3 new tiles", progress: "2 / 3", done: false },
            { title: "7-day streak", progress: "Done!", done: true },
          ].map((q, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full rounded-xl border border-quest-border bg-quest-card p-4 text-left hover:border-quest-accent/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-quest-glow"
              >
                <p className="font-medium text-white">{q.title}</p>
                <p className={`text-sm mt-1 ${q.done ? "text-quest-glow" : "text-quest-muted"}`}>
                  {q.progress}
                </p>
              </button>
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
              <p className="text-sm font-semibold text-white">March 2026</p>
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
