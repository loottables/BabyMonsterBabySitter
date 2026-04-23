"use client";

import { useState } from "react";

interface Props {
  hasMonster: boolean;
  onAbandon:  () => void;
  onWipeAll:  () => void;
  onSignOut:  () => void;
  onClose:    () => void;
}

export default function SettingsPanel({ hasMonster, onAbandon, onWipeAll, onSignOut, onClose }: Props) {
  const [confirming, setConfirming] = useState<"abandon" | "wipe" | null>(null);

  function handleAbandon() {
    onAbandon();
    onClose();
  }

  function handleWipe() {
    onWipeAll();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-6 w-full max-w-xs border border-monster-border bg-monster-panel px-6 py-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: "10px" }} className="text-monster-text uppercase tracking-widest">
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{ fontSize: "7px" }}
            className="text-monster-muted hover:text-monster-text uppercase tracking-widest transition-colors"
          >
            [X]
          </button>
        </div>

        {hasMonster && (
          <div className="flex flex-col gap-2 border border-monster-border p-4">
            <p style={{ fontSize: "8px" }} className="text-monster-text uppercase tracking-widest">
              Abandon Monster
            </p>
            <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
              Release your monster and start a new egg. Inventory is unchanged.
            </p>
            {confirming === "abandon" ? (
              <div className="flex flex-col gap-2 mt-2">
                <p style={{ fontSize: "6px" }} className="text-monster-text leading-loose uppercase tracking-widest">
                  Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAbandon}
                    style={{ fontSize: "7px" }}
                    className="flex-1 px-3 py-2 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
                  >
                    Yes, Abandon
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    style={{ fontSize: "7px" }}
                    className="flex-1 px-3 py-2 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming("abandon")}
                style={{ fontSize: "7px" }}
                className="mt-2 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
              >
                Abandon
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 border border-monster-border p-4">
          <p style={{ fontSize: "8px" }} className="text-monster-text uppercase tracking-widest">
            Start Over
          </p>
          <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
            Deletes your monster and all inventory. You will start fresh with 20 kibble.
          </p>
          {confirming === "wipe" ? (
            <div className="flex flex-col gap-2 mt-2">
              <p style={{ fontSize: "6px" }} className="text-monster-text leading-loose uppercase tracking-widest">
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleWipe}
                  style={{ fontSize: "7px" }}
                  className="flex-1 px-3 py-2 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
                >
                  Yes, Wipe
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  style={{ fontSize: "7px" }}
                  className="flex-1 px-3 py-2 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming("wipe")}
              style={{ fontSize: "7px" }}
              className="mt-2 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
            >
              Wipe All Data
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 border border-monster-border p-4">
          <p style={{ fontSize: "8px" }} className="text-monster-text uppercase tracking-widest">
            Account
          </p>
          <button
            onClick={onSignOut}
            style={{ fontSize: "7px" }}
            className="mt-2 px-4 py-3 border border-monster-border bg-monster-panel text-monster-muted uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
