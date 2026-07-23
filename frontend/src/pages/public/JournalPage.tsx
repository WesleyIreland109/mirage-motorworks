const posts = [
  ["Buying Guides", "How to evaluate records before a car ever hits a lift."],
  ["Auction Finds", "What looks interesting this week, and what still needs proof."],
  ["Build Stories", "The prep notes, repairs, and small decisions that make a car feel right."],
];

export function JournalPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-orange">
        Garage Journal
      </p>
      <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
        Notes from the floor.
      </h1>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {posts.map(([title, description]) => (
          <article key={title} className="min-h-72 border border-mirage-border bg-mirage-panel p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-mirage-muted">
              Future Series
            </p>
            <h2 className="mt-8 text-3xl font-semibold">{title}</h2>
            <p className="mt-4 leading-7 text-mirage-muted">{description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
