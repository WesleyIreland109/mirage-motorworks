export function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        About
      </p>
      <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
        Software for the garage we actually want to run.
      </h1>
      <div className="mt-12 max-w-4xl space-y-7 border-y border-mirage-border py-12 text-lg leading-9 text-zinc-300">
        <p>
          Mirage Motorworks is being built around GarageOS: a software layer for
          enthusiast garages that need better intake, inspection, telemetry,
          documentation, repair tracking, and handoff tools.
        </p>
        <p>
          This page is intentionally stripped back for now while the deeper
          company story is written.
        </p>
      </div>
    </main>
  );
}
