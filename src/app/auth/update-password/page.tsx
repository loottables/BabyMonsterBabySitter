"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase sets the session from the URL fragment automatically on load.
    // Wait for the auth state to settle before showing the form.
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated! Redirecting...");
      setTimeout(() => router.push("/"), 2000);
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
          Set New Password
        </h1>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {!ready ? (
          <p className="text-xs text-monster-muted text-center">Verifying reset link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="border border-monster-border bg-monster-panel text-monster-text text-xs px-3 py-2 placeholder:text-monster-muted focus:outline-none focus:border-monster-text"
            />
            {error   && <p className="text-xs" style={{ color: "#d8a8a8" }}>{error}</p>}
            {message && <p className="text-xs" style={{ color: "#a8d8a8" }}>{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="border border-monster-border bg-monster-panel text-monster-text py-2.5 px-4 text-xs uppercase tracking-wider hover:bg-monster-border transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
