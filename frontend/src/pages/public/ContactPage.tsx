import { Send } from "lucide-react";
import { type FormEvent, useState } from "react";

import { sendContactInquiry } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      await sendContactInquiry(form);
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

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
          For GarageOS feedback, telemetry workflow ideas, refurbishment leads,
          select repair or maintenance work, or a specific vehicle dossier,
          send a note. The response will be direct, detailed, and human.
        </p>
        <a
          href="mailto:wesley@miragemw.com"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-mirage-cyan transition hover:text-white"
        >
          <Send size={16} /> wesley@miragemw.com
        </a>
      </div>
      <form className="grid gap-5 border border-mirage-border bg-mirage-panel p-6" onSubmit={submit}>
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            autoComplete="name"
            minLength={2}
            maxLength={120}
            placeholder="Name"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            autoComplete="email"
            maxLength={160}
            placeholder="Email"
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </div>
        <Input
          maxLength={160}
          minLength={2}
          placeholder="Subject"
          required
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value })}
        />
        <Textarea
          maxLength={4000}
          minLength={10}
          placeholder="Tell us what you are trying to track, fix, maintain, import, or restore."
          required
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" className="w-fit" disabled={status === "sending"}>
            <Send size={17} /> {status === "sending" ? "Sending..." : "Send Inquiry"}
          </Button>
          {status === "sent" && (
            <p className="text-sm text-emerald-300" role="status">
              Sent. We&apos;ll respond as soon as possible.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-mirage-orange" role="alert">
              Something stopped that message. Email wesley@miragemw.com directly for now.
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
