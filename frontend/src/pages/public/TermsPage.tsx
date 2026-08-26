import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-24 pt-32">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-mirage-cyan">
        Legal
      </p>
      <h1 className="mt-3 text-5xl font-bold text-white">Terms of Service</h1>
      <p className="mt-4 text-sm leading-7 text-mirage-muted">
        Last updated August 26, 2026. These starter terms are provided for the
        Mirage Motorworks website and early GarageOS access. They should be
        reviewed by counsel before the business relies on them.
      </p>

      <div className="mt-12 space-y-10 text-sm leading-7 text-zinc-300">
        <Section title="Use of the Site">
          Mirage Motorworks provides this website for information about its
          automotive projects, software concepts, services, inventory, and
          contact options. You agree not to misuse the site, attempt to disrupt
          it, or submit false, harmful, or unauthorized information.
        </Section>

        <Section title="Vehicle Information">
          Listings, prospect materials, reports, inspection notes, and software
          previews may include estimates, draft content, or sample data. Vehicle
          availability, condition, pricing, mileage, features, and repair status
          may change and should be confirmed directly before any purchase,
          service authorization, or investment decision.
        </Section>

        <Section title="No Professional Advice">
          Checklists, telemetry previews, GarageOS updates, and inspection
          content are tools for organization and communication. They do not
          replace a professional mechanical inspection, legal advice, financial
          advice, insurance review, or safety recall check.
        </Section>

        <Section title="Accounts and GarageOS">
          If you receive access to GarageOS, you are responsible for keeping
          your sign-in credentials secure and for the accuracy of information
          you enter. Mirage may limit, suspend, or remove access if an account
          is used in a way that risks the service, other users, or vehicle data.
        </Section>

        <Section title="Intellectual Property">
          The Mirage Motorworks name, brand assets, site content, product
          concepts, software interfaces, and related materials are owned by
          Mirage Motorworks or its licensors unless otherwise stated. You may
          not copy or reuse them as your own without written permission.
        </Section>

        <Section title="Third-Party Links">
          The site and GarageOS may include links to listings, reports, payment
          providers, maps, email tools, or other third-party services. Mirage is
          not responsible for third-party content, policies, availability, or
          security.
        </Section>

        <Section title="Limitation of Liability">
          To the fullest extent allowed by law, Mirage Motorworks is not liable
          for indirect, incidental, special, consequential, or punitive damages
          arising from use of the site, reliance on site content, or inability
          to access the service.
        </Section>

        <Section title="Contact">
          Questions about these terms can be sent to{" "}
          <a className="text-mirage-cyan hover:text-white" href="mailto:wesley@miragemw.com">
            wesley@miragemw.com
          </a>
          . You can also return to the <Link className="text-mirage-cyan hover:text-white" to="/contact">contact page</Link>.
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
