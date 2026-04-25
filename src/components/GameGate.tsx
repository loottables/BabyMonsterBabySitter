"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AuthScreen from "./AuthScreen";
import GameUI from "./GameUI";
import UsernameSetupScreen from "./UsernameSetupScreen";

export default function GameGate() {
  const [session,     setSession]     = useState<Session | null | undefined>(undefined);
  const [hasUsername, setHasUsername] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setHasUsername(undefined); return; }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setHasUsername(!!data?.username));
  }, [session]);

  if (session === undefined || (session && hasUsername === undefined)) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span style={{ fontSize: "8px" }} className="text-monster-muted uppercase tracking-wider animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (!hasUsername) {
    return (
      <UsernameSetupScreen
        user={session.user}
        onComplete={() => setHasUsername(true)}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col py-8">
      <GameUI />
    </div>
  );
}
