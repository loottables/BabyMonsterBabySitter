"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

interface Props {
  user: User;
  onComplete: () => void;
}

export default function UsernameSetupScreen({ user, onComplete }: Props) {
  const suggested = ((user.user_metadata?.username as string | undefined) ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  const [username,  setUsername]  = useState(suggested);
  const [status,    setStatus]    = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function checkAvailability(val: string) {
    if (!USERNAME_RE.test(val)) { setStatus("invalid"); return; }
    setStatus("checking");
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", val)
      .maybeSingle();
    setStatus(data ? "taken" : "available");
  }

  function handleChange(val: string) {
    setUsername(val);
    setStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) return;
    debounceRef.current = setTimeout(() => checkAvailability(val), 400);
  }

  useEffect(() => {
    if (suggested.length >= 3) checkAvailability(suggested);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "available") return;
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username: username.toLowerCase() }, { onConflict: "id" });
      if (upsertErr) throw upsertErr;
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const statusMsg =
    status === "checking"  ? "Checking..."                                    :
    status === "available" ? "Available"                                       :
    status === "taken"     ? "Already taken"                                   :
    status === "invalid"   ? "3–20 chars, letters / numbers / underscores only" :
    "";

  const statusColor =
    status === "available"                   ? "#a8d8a8" :
    status === "taken" || status === "invalid" ? "#d8a8a8" :
    "#a8a8a8";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="text-center">
        <span className="text-4xl">👾</span>
        <h1 className="text-xl font-bold text-monster-text tracking-tight mt-2">
          Choose a Username
        </h1>
        <p className="text-xs text-monster-muted mt-1">This is how other trainers will know you</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => handleChange(e.target.value)}
            maxLength={20}
            required
            autoFocus
            className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
          />
          {statusMsg && (
            <p className="text-xs" style={{ color: statusColor }}>{statusMsg}</p>
          )}
        </div>
        {error && <p className="text-xs" style={{ color: "#d8a8a8" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || status !== "available"}
          className="border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Confirm Username"}
        </button>
      </form>
    </div>
  );
}
