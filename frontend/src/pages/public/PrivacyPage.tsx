import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-32">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        Legal
      </p>
      <h1 className="mt-3 text-5xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-7 text-mirage-muted">
        Last updated August 26, 2026. This starter privacy policy explains the
        basic information Mirage Motorworks may collect through the website and
        GarageOS. It should be reviewed by counsel as the product grows.
      </p>

      <div className="mt-12 space-y-10 text-sm leading-7 text-zinc-300">
        <Section title="Information We Collect">
          Mirage may collect information you provide directly, including your
          name, email address, phone number, contact message, account details,
          vehicle information, listing links, inspection notes, service notes,
          telemetry summaries, and files or reports you choose to submit.
        </Section>

        <Section title="How We Use Information">
          We use information to respond to inquiries, operate GarageOS, manage
          vehicle records, send service or progress updates, evaluate potential
          acquisitions, improve Mirage software, troubleshoot issues, and keep
          records related to inventory, repairs, and customer communication.
        </Section>

        <Section title="GarageOS and Vehicle Data">
          GarageOS may store data about vehicles, service tasks, shared garage
          access, telemetry sessions, inspection checklists, OBD scan notes, and
          report links. Some vehicle records may be shared with other authorized
          users when an owner or Mirage staff member enables that access.
        </Section>

        <Section title="Cookies and Authentication">
          GarageOS uses authentication cookies to keep signed-in users connected
          to their accounts. The site may also generate basic technical
          information such as device, browser, IP address, and usage events when
          needed for security, diagnostics, and product improvement.
        </Section>

        <Section title="Service Providers">
          Mirage may use third-party providers for hosting, email delivery,
          analytics, databases, authentication, payment, mapping, AI features,
          and other business operations. These providers may process information
          only as needed to provide their services.
        </Section>

        <Section title="How We Share Information">
          Mirage does not sell personal information. Information may be shared
          with authorized GarageOS users, service providers, legal or safety
          authorities when required, or another party if needed to complete a
          requested vehicle, repair, software, or business transaction.
        </Section>

        <Section title="Data Retention">
          Mirage keeps information for as long as reasonably needed for the
          purposes described here, including business records, vehicle history,
          legal obligations, security, product improvement, and customer support.
        </Section>

        <Section title="Your Choices">
          You can request access, correction, or deletion of your information by
          contacting Mirage. Some records may need to be retained when required
          for legal, security, accounting, warranty, dispute, or vehicle-history
          purposes.
        </Section>

        <Section title="Contact">
          Privacy questions can be sent to{" "}
          <a className="text-mirage-cyan hover:text-white" href="mailto:wesley@miragemw.com">
            wesley@miragemw.com
          </a>
          . You can also use the <Link className="text-mirage-cyan hover:text-white" to="/contact">contact page</Link>.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}
