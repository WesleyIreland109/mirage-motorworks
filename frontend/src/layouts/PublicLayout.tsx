import { Instagram, Mail, Menu, Youtube } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { Logo } from "@/components/Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/inventory", label: "Inventory" },
  { to: "/about", label: "About" },
  { to: "/journal", label: "Garage Journal" },
  { to: "/contact", label: "Contact" },
];

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-mirage-bg text-white">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-mirage-bg/72 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `text-xs font-semibold uppercase tracking-[0.22em] transition ${
                    isActive
                      ? "mirage-wordmark"
                      : "text-mirage-muted hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              className="border border-mirage-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-mirage-muted transition hover:border-mirage-cyan hover:text-white"
            >
              Garage OS
            </Link>
          </nav>
          <button
            className="border border-mirage-border p-2 text-mirage-muted md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-mirage-border bg-mirage-secondary">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1fr_auto]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xl text-sm leading-7 text-mirage-muted">
              Carefully selected enthusiast cars, documented and prepared with a
              standard that favors longevity over volume.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-mirage-muted sm:grid-cols-2">
            <Link to="/inventory" className="hover:text-white">
              Inventory
            </Link>
            <Link to="/about" className="hover:text-white">
              About
            </Link>
            <a href="mailto:hello@miragemotorworks.com" className="inline-flex items-center gap-2 hover:text-white">
              <Mail size={15} /> Email
            </a>
            <a href="https://instagram.com" className="inline-flex items-center gap-2 hover:text-white">
              <Instagram size={15} /> Instagram
            </a>
            <a href="https://youtube.com" className="inline-flex items-center gap-2 hover:text-white">
              <Youtube size={15} /> YouTube
            </a>
          </div>
        </div>
        <div className="border-t border-mirage-border px-5 py-5 text-center text-xs uppercase tracking-[0.2em] text-zinc-600">
          © 2026 Mirage Motorworks
        </div>
      </footer>
    </div>
  );
}
