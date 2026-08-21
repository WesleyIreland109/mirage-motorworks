import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { currentUser } from "@/api/client";

export function RequireAuth() {
  const location = useLocation();
  const { data: user, isLoading } = useQuery({ queryKey: ["auth-user"], queryFn: currentUser, retry: false });

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-mirage-bg text-sm text-mirage-muted">Opening GarageOS...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
