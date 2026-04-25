"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function AuthScreen() {
  const [mode,            setMode]           = useState<"signin" | "signup" | "forgot">("signin");
  const [email,           setEmail]          = useState("");
  const [password,        setPassword]       = useState("");
  const [confirm,         setConfirm]        = useState("");
  const [username,        setUsername]       = useState("");
  const [usernameStatus,  setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [error,           setError]          = useState("");
  const [message,         setMessage]        = useState("");
  const [loading,         setLoading]        = useState(false);
  const usernameDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  async function checkUsername(val: string) {
    if (!USERNAME_RE.test(val)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", val)
      .maybeSingle();
    setUsernameStatus(data ? "taken" : "available");
  }

  function handleUsernameChange(val: string) {
    setUsername(val);
    setUsernameStatus("idle");
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
    if (val.length < 3) return;
    usernameDebounce.current = setTimeout(() => checkUsername(val), 400);
  }

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
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (error) throw error;
        setMessage("Password reset email sent. Check your inbox.");
      } else if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (!USERNAME_RE.test(username)) throw new Error("Please choose a valid username first.");
        if (usernameStatus === "taken") throw new Error("That username is already taken.");
        if (usernameStatus !== "available") throw new Error("Please wait for the username check to finish.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.toLowerCase() } },
        });
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

  function switchMode(next: "signin" | "signup" | "forgot") {
    setMode(next);
    setConfirm("");
    setUsername("");
    setUsernameStatus("idle");
    setError("");
    setMessage("");
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
        {mode !== "forgot" && (
          <>
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
          </>
        )}

        <form onSubmit={handleEmail} className="flex flex-col gap-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
            />
          )}
          {mode === "signup" && (
            <>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
              />
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  maxLength={20}
                  required
                  className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
                />
                {usernameStatus !== "idle" && (
                  <p className="text-xs" style={{
                    color: usernameStatus === "available" ? "#a8d8a8"
                         : usernameStatus === "taken" || usernameStatus === "invalid" ? "#d8a8a8"
                         : "#a8a8a8",
                  }}>
                    {usernameStatus === "checking"  ? "Checking..."
                   : usernameStatus === "available" ? "Available"
                   : usernameStatus === "taken"     ? "Already taken"
                   : "3–20 chars, letters / numbers / underscores only"}
                  </p>
                )}
              </div>
            </>
          )}
          {error   && <p className="text-xs" style={{ color: "#d8a8a8" }}>{error}</p>}
          {message && <p className="text-xs" style={{ color: "#a8d8a8" }}>{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="flex flex-col gap-1 items-center">
            <button onClick={() => switchMode("signup")} className="text-xs text-monster-muted hover:text-monster-text transition-colors">
              No account? Create one
            </button>
            <button onClick={() => switchMode("forgot")} className="text-xs text-monster-muted hover:text-monster-text transition-colors">
              Forgot password?
            </button>
          </div>
        )}
        {mode === "signup" && (
          <button onClick={() => switchMode("signin")} className="text-xs text-monster-muted hover:text-monster-text transition-colors">
            Have an account? Sign in
          </button>
        )}
        {mode === "forgot" && (
          <button onClick={() => switchMode("signin")} className="text-xs text-monster-muted hover:text-monster-text transition-colors">
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
