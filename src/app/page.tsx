import GameUI from "@/components/GameUI";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-monster-border py-4 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👾</span>
          <div>
            <h1 className="text-lg font-bold text-monster-text tracking-tight leading-none">
              BabyMonsterBabySitter
            </h1>
            <p className="text-xs text-monster-muted leading-none mt-0.5">
              Raise · Train · Survive
            </p>
          </div>
        </div>
      </header>

      {/* Game */}
      <div className="flex-1 flex flex-col py-8">
        <GameUI />
      </div>

      {/* Footer */}
      <footer className="border-t border-monster-border py-3 px-6 text-center text-xs text-monster-muted shrink-0">
        Your monster keeps aging even when you&apos;re away. Don&apos;t neglect them.
      </footer>
    </main>
  );
}
