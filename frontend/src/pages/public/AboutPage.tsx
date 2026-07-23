export function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        About
      </p>
      <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
        A small dealership for people who notice the details.
      </h1>
      <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="h-full min-h-96 bg-[url('https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1400&q=85')] bg-cover bg-center" />
        <div className="space-y-7 text-lg leading-9 text-zinc-300">
          <p>
            Mirage Motorworks is being built by a software engineer who believes
            great operations and great taste can live in the same garage. The
            business starts with carefully selected enthusiast cars, then grows
            into the operating system behind every inspection, repair, document,
            expense, lead, and handoff.
          </p>
          <p>
            The public experience is premium first and retro second: a cinematic
            lens on analog machines, not a dealership template wearing neon.
          </p>
          <p>
            The standard is intentionally narrow. Fewer cars, clearer stories,
            better preparation, and no hiding behind vague superlatives.
          </p>
        </div>
      </div>
    </main>
  );
}
