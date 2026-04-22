"use client";

interface Props {
  hasMonster: boolean;
  onAbandon:  () => void;
  onWipeAll:  () => void;
  onClose:    () => void;
}

export default function SettingsPanel({ hasMonster, onAbandon, onWipeAll, onClose }: Props) {
  function handleAbandon() {
    if (confirm("Abandon your monster? A new egg will start its timer from scratch. Your inventory is kept.")) {
      onAbandon();
      onClose();
    }
  }

  function handleWipe() {
    if (confirm("Delete ALL data? Your monster and entire inventory will be permanently lost.")) {
      onWipeAll();
      onClose();
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
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
            <button
              onClick={handleAbandon}
              style={{ fontSize: "7px" }}
              className="mt-2 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
            >
              Abandon
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border border-monster-border p-4">
          <p style={{ fontSize: "8px" }} className="text-monster-text uppercase tracking-widest">
            Start Over
          </p>
          <p style={{ fontSize: "6px" }} className="text-monster-muted leading-loose">
            Deletes your monster and all inventory. You will start fresh with 20 kibble.
          </p>
          <button
            onClick={handleWipe}
            style={{ fontSize: "7px" }}
            className="mt-2 px-4 py-3 border border-monster-border bg-monster-panel text-monster-text uppercase tracking-widest hover:bg-monster-border active:scale-95 transition-all"
          >
            Wipe All Data
          </button>
        </div>

      </div>
    </div>
  );
}
