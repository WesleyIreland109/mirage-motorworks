import {
  ArrowLeft,
  BarChart3,
  Car,
  FileText,
  Gauge,
  Receipt,
  Settings,
  Wrench,
  LogOut,
  Activity,
  BadgeDollarSign,
  Users,
  RadioTower,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { currentUser, logout } from "@/api/client";
import { Button } from "@/components/ui/button";

const sharedNav = [
  { to: "/admin", label: "My Garage", icon: Gauge },
  { to: "/admin/telemetry", label: "Telemetry Inbox", icon: RadioTower },
  { to: "/admin/working-on", label: "Working On", icon: Activity },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/settings", label: "Profile", icon: Settings },
];
const adminNav = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/flips", label: "Flips", icon: BadgeDollarSign },
  { to: "/admin/inventory", label: "Public Inventory", icon: Car },
  { to: "/admin/expenses", label: "Expenses", icon: Receipt },
  { to: "/admin/repairs", label: "Repairs", icon: Wrench },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["auth-user"], queryFn: currentUser, retry: false });
  const nav = user?.role === "admin" ? [...sharedNav.slice(0, 3), ...adminNav, ...sharedNav.slice(3)] : sharedNav;

  async function signOut() {
    await logout();
    queryClient.setQueryData(["auth-user"], null);
    navigate("/login", { replace: true });
  }
  return (
    <div className="min-h-screen bg-mirage-bg text-white lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-mirage-border bg-mirage-secondary lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-20 items-center px-5">
          <Logo to="/admin" />
        </div>
        <div className="px-3 pb-3">
          <Link
            to="/"
            className="flex items-center gap-3 border border-white/10 px-4 py-3 text-sm font-medium text-mirage-muted transition hover:border-mirage-cyan hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={18} />
            Client Site
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:block lg:space-y-1 lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  `flex min-w-max items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-black"
                      : "text-mirage-muted hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0">
        <div className="sticky top-0 z-40 flex h-16 items-center border-b border-mirage-border bg-mirage-bg/90 px-5 backdrop-blur-xl lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mirage-muted">
            Garage OS
          </p>
          <Button variant="ghost" className="ml-auto gap-2" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
