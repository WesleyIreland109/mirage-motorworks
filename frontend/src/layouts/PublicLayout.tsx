import { Instagram, Mail, Menu, X, Youtube } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import { Logo } from "@/components/Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/inventory", label: "Inventory" },
  { to: "/about", label: "About" },
  { to: "/garage-os", label: "GarageOS" },
  { to: "/telemetry-dashboard", label: "Telemetry Dashboard" },
  { to: "/investor-prospectus", label: "Investor Prospectus" },
];

export function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-mirage-bg text-white">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-mirage-bg/72 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `text-[11px] font-semibold uppercase tracking-[0.14em] transition xl:text-xs xl:tracking-[0.2em] ${
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
              className="border border-mirage-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mirage-muted transition hover:border-mirage-cyan hover:text-white xl:text-xs xl:tracking-[0.2em]"
            >
              App Login
            </Link>
          </nav>
          <button
            className="border border-mirage-border p-2 text-mirage-muted transition hover:border-mirage-cyan hover:text-white lg:hidden"
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div
          id="mobile-navigation"
          className={`border-t border-white/10 bg-mirage-bg/95 px-5 pb-5 pt-2 shadow-glass backdrop-blur-xl transition lg:hidden ${
            isMobileMenuOpen ? "block" : "hidden"
          }`}
        >
          <nav className="grid gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `border border-transparent px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? "border-white/10 bg-white text-black"
                      : "text-mirage-muted hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              onClick={closeMobileMenu}
              className="mt-2 border border-mirage-border px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-mirage-muted transition hover:border-mirage-cyan hover:bg-white/[0.06] hover:text-white"
            >
              App Login
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-mirage-border bg-mirage-secondary">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1fr_auto]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xl text-sm leading-7 text-mirage-muted">
              GarageOS, telemetry workflows, instant shop updates, select repair
              and maintenance work, and refurbished enthusiast-car inventory
              powered by software at the core of the business.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-mirage-muted sm:grid-cols-2">
            <Link to="/inventory" className="hover:text-white">
              Inventory
            </Link>
            <Link to="/about" className="hover:text-white">
              About
            </Link>
            <Link to="/garage-os" className="hover:text-white">
              GarageOS
            </Link>
            <Link to="/telemetry-dashboard" className="hover:text-white">
              Telemetry
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
