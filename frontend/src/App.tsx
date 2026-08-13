import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { PlaceholderAdminPage } from "@/pages/admin/PlaceholderAdminPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { HomePage } from "@/pages/public/HomePage";
import { InventoryPage } from "@/pages/public/InventoryPage";
import { JournalPage } from "@/pages/public/JournalPage";
import { VehicleUpdatePage } from "@/pages/public/VehicleUpdatePage";
import { VehicleDetailsPage } from "@/pages/public/VehicleDetailsPage";
import { LoginPage } from "@/pages/admin/LoginPage";
import { RequireAuth } from "@/components/RequireAuth";
import { useQuery } from "@tanstack/react-query";
import { currentUser } from "@/api/client";

function HomeRoute() {
  const [searchParams] = useSearchParams();
  const updateSlug = searchParams.get("update");

  if (updateSlug) {
    return <VehicleUpdatePage slugOverride={updateSlug} />;
  }

  return <HomePage />;
}

export function App() {
  const { data: user } = useQuery({ queryKey: ["auth-user"], queryFn: currentUser, retry: false });
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomeRoute />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/:slug" element={<VehicleDetailsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="journal" element={<JournalPage />} />
      </Route>
      <Route path="updates/:slug" element={<VehicleUpdatePage />} />
      <Route path="login" element={<LoginPage signedIn={Boolean(user)} />} />
      <Route element={<RequireAuth />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="vehicles" element={<AdminDashboard />} />
          <Route path="expenses" element={<PlaceholderAdminPage title="Expenses" />} />
          <Route path="repairs" element={<PlaceholderAdminPage title="Repairs" />} />
          <Route path="analytics" element={<PlaceholderAdminPage title="Analytics" />} />
          <Route path="documents" element={<PlaceholderAdminPage title="Documents" />} />
          <Route path="settings" element={<PlaceholderAdminPage title="Settings" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
