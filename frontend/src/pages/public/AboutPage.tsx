export function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        About
      </p>
      <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
        Software for the garage we actually want to run.
      </h1>
      <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="h-full min-h-96 bg-[url('https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=85')] bg-cover bg-center" />
        <div className="space-y-7 text-lg leading-9 text-zinc-300">
          <p>
            Mirage Motorworks is being built around Garage OS: a software layer
            for enthusiast garages that need better intake, inspection,
            telemetry, documentation, repair tracking, and handoff tools.
          </p>
          <p>
            The cars still matter. Manual cars, affordable enthusiast models,
            and OEM+ flips are the live test bench for the product. Every
            acquisition exposes the real work: what is known, what is unknown,
            what needs parts, what a road test proved, and what the next person
            in the garage needs to see.
          </p>
          <p>
            The public experience should feel premium because the operation is
            precise. A good listing is not just photography and price; it is the
            final output of clean records, shared progress, telemetry context,
            and disciplined preparation.
          </p>
        </div>
      </div>
    </main>
  );
}
