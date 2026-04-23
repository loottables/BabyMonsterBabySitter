"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthScreen() {
  const [mode,     setMode]     = useState<"signin" | "signup">("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);

  const supabase = createClient();

  const oAuth = (provider: "google" | "discord") =>
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center">
        <span className="text-4xl">👾</span>
        <h1 className="text-xl font-bold text-monster-text tracking-tight mt-2">
          BabyMonsterBabySitter
        </h1>
        <p className="text-xs text-monster-muted mt-1">Raise · Train · Survive</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => oAuth("google")}
          className="w-full border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors"
        >
          Sign in with Google
        </button>
        <button
          onClick={() => oAuth("discord")}
          className="w-full border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors"
        >
          Sign in with Discord
        </button>

        <div className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-monster-border" />
          <span className="text-xs text-monster-muted">or</span>
          <div className="flex-1 h-px bg-monster-border" />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
          />
          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
            />
          )}
          {error   && <p className="text-xs" style={{ color: "#d8a8a8" }}>{error}</p>}
          {message && <p className="text-xs" style={{ color: "#a8d8a8" }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setConfirm(""); setError(""); setMessage(""); }}
          className="text-xs text-monster-muted hover:text-monster-text transition-colors"
        >
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
