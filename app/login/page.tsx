"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../_lib/supabase/client";
import TrueFocus from "../_components/reactbits/TrueFocus";

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
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-quest-glow tracking-[0.3em] mb-3">
          UNCOVER
        </h1>

        <div className="w-8 h-px bg-quest-glow/40 mx-auto mb-3" />
       <TrueFocus
          sentence="Explore your campus town"
          manualMode={false}
          blurAmount={5}
          borderColor="#5227FF"
          animationDuration={0.5}
          pauseBetweenAnimations={1}
          wordClassName="text-xs tracking-widest uppercase text-quest-muted font-normal"
        />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-xl border border-white/8 bg-quest-card p-7">
        {/* Mode tabs */}
        <div className="flex border-b border-white/8 mb-7">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-widest uppercase transition-all ${
                mode === m
                  ? "text-quest-glow border-b-2 border-quest-glow -mb-px"
                  : "text-quest-muted hover:text-white"
              }`}
            >
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {mode === "signup" && (
            <div>
              <label className="text-[10px] text-quest-muted uppercase tracking-widest mb-2 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Explorer"
                className="w-full border-0 border-b border-white/12 bg-transparent pb-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-quest-accent/60 transition-colors"
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-quest-muted uppercase tracking-widest mb-2 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="w-full border-0 border-b border-white/12 bg-transparent pb-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-quest-accent/60 transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[10px] text-quest-muted uppercase tracking-widest mb-2 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border-0 border-b border-white/12 bg-transparent pb-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-quest-accent/60 transition-colors"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400/80 text-center border border-red-400/15 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs text-quest-glow/80 text-center border border-quest-glow/15 rounded-lg px-4 py-2.5">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-lg bg-quest-accent text-white font-semibold text-xs tracking-widest uppercase hover:bg-quest-accent/85 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? "—"
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>
      </div>

      <p className="mt-10 text-[10px] text-white/20 text-center tracking-widest uppercase">
        Your campus town adventure awaits
      </p>
    </div>
  );
}
