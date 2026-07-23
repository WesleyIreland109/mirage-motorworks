import { Card } from "@/components/ui/card";

export function PlaceholderAdminPage({ title }: { title: string }) {
  return (
    <section className="px-5 py-8 lg:px-8">
      <div className="border-b border-mirage-border pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mirage-cyan">
          Garage OS
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
      </div>
      <Card className="mt-8 p-6">
        <p className="text-lg font-medium">Planned module</p>
        <p className="mt-3 max-w-2xl leading-7 text-mirage-muted">
          This area is intentionally reserved for the next operating workflow.
          The navigation is in place so the system can grow without reshaping
          the admin shell.
        </p>
      </Card>
    </section>
  );
}
