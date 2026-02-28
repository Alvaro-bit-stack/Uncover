"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../_lib/supabase/client";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username.trim() || email.split("@")[0].toUpperCase(),
          },
        },
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Email confirmation disabled — user is logged in immediately
        router.push("/");
        router.refresh();
      } else {
        // Email confirmation required
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-quest-dark flex flex-col items-center justify-center px-6">
      {/* Branding */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <StarIcon className="size-5 text-quest-glow" />
          <h1 className="text-2xl font-bold text-quest-glow tracking-widest">
            CAMPUSQUEST
          </h1>
          <StarIcon className="size-5 text-quest-glow" />
        </div>
        <p className="text-quest-muted text-sm">
          Explore your campus. Claim your territory.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-quest-border bg-quest-card p-6 shadow-xl">
        {/* Mode tabs */}
        <div className="flex gap-2 mb-6">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                mode === m
                  ? "bg-quest-glow/20 text-quest-glow border-quest-glow/40"
                  : "text-quest-muted border-quest-border hover:text-white"
              }`}
            >
              {m === "login" ? "LOGIN" : "SIGN UP"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <label className="text-[10px] text-quest-muted uppercase tracking-wide mb-1.5 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="EXPLORER"
                className="w-full rounded-xl border border-quest-border bg-quest-dark px-4 py-3 text-sm text-white placeholder:text-quest-muted/50 focus:outline-none focus:border-quest-accent transition-colors"
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-quest-muted uppercase tracking-wide mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="w-full rounded-xl border border-quest-border bg-quest-dark px-4 py-3 text-sm text-white placeholder:text-quest-muted/50 focus:outline-none focus:border-quest-accent transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[10px] text-quest-muted uppercase tracking-wide mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-xl border border-quest-border bg-quest-dark px-4 py-3 text-sm text-white placeholder:text-quest-muted/50 focus:outline-none focus:border-quest-accent transition-colors"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-quest-glow text-center bg-quest-glow/10 border border-quest-glow/20 rounded-xl px-4 py-2.5">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-xl bg-quest-accent text-white font-bold text-sm tracking-wide hover:bg-quest-accent/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "LOGIN"
              : "CREATE ACCOUNT"}
          </button>
        </form>
      </div>

      <p className="mt-8 text-[10px] text-quest-muted text-center">
        Your campus adventure awaits.
      </p>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
