import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-5 pb-24 pt-36 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-pink">
          Contact
        </p>
        <h1 className="mt-4 text-5xl font-black leading-none tracking-tight md:text-7xl">
          Bring the car, the data, or the workflow.
        </h1>
        <p className="mt-7 text-lg leading-8 text-mirage-muted">
          For Garage OS feedback, telemetry workflow ideas, flip leads, or a
          specific vehicle dossier, send a note. The response will be direct,
          detailed, and human.
        </p>
      </div>
      <form className="grid gap-5 border border-mirage-border bg-mirage-panel p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Input placeholder="Name" />
          <Input type="email" placeholder="Email" />
        </div>
        <Input placeholder="Subject" />
        <Textarea placeholder="Tell us what you are trying to track, fix, import, or flip." />
        <Button type="button" className="w-fit">
          <Send size={17} /> Send Inquiry
        </Button>
      </form>
    </main>
  );
}
