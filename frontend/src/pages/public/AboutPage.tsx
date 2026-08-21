export function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        About
      </p>
      <h1 className="mt-4 max-w-5xl text-5xl font-black leading-none tracking-tight md:text-7xl">
        Built for the garage customers should have been getting all along.
      </h1>
      <div className="mt-12 max-w-4xl space-y-7 border-y border-mirage-border py-12 text-lg leading-9 text-zinc-300">
        <p>
          Mirage Motorworks was started by a seasoned software engineer and car
          enthusiast who kept seeing the same failure pattern in the industry:
          poor communication from mechanics and dealerships, vague repair
          updates, untrustworthy work, and expensive mishaps around the machines
          he cares about most.
        </p>
        <p>
          The company is being built to be customer-forward and stable from the
          inside out. GarageOS gives every car a living record: what was found,
          what was approved, what changed, what still needs attention, and why
          the work matters.
        </p>
        <p>
          Mirage will sell refurbished enthusiast cars and also take on select
          repair and maintenance work for customer cars. Both sides of the shop
          help harden the software while the business works toward the larger
          goal: a garage, product, and platform driven by better communication.
        </p>
        <p>
          The standard is personal. A Mirage car should be safe and mechanically
          sound enough that he would put his wife and child inside it and drive
          across the country without a second thought about the quality of the
          repair.
        </p>
      </div>
    </main>
  );
}
