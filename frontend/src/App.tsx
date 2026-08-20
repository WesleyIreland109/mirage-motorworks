import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { GarageWorkspacePage } from "@/pages/admin/GarageWorkspacePage";
import { DriveReportPage } from "@/pages/public/DriveReportPage";
import { PlaceholderAdminPage } from "@/pages/admin/PlaceholderAdminPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { HomePage } from "@/pages/public/HomePage";
import { InventoryPage } from "@/pages/public/InventoryPage";
import { JournalPage } from "@/pages/public/JournalPage";
import { VehicleUpdatePage } from "@/pages/public/VehicleUpdatePage";
import { VehicleDetailsPage } from "@/pages/public/VehicleDetailsPage";
import { LoginPage } from "@/pages/admin/LoginPage";
import { RegisterPage } from "@/pages/admin/RegisterPage";
import { ProfilePage } from "@/pages/admin/ProfilePage";
import { ForgotPasswordPage } from "@/pages/admin/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/admin/ResetPasswordPage";
import { AdminInventory } from "@/pages/admin/AdminInventory";
import { RequireAuth } from "@/components/RequireAuth";
import { useQuery } from "@tanstack/react-query";
import { currentUser } from "@/api/client";
import { DacoitDriveReportPage } from "@/pages/public/DacoitDriveReportPage";

function HomeRoute() {
  const [searchParams] = useSearchParams();
  const updateSlug = searchParams.get("update");

  if (updateSlug) {
    return <VehicleUpdatePage slugOverride={updateSlug} />;
  }

  return <HomePage />;
}

export function App() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: currentUser,
    retry: false,
  });
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
      <Route
        path="drive-reports/dacoit-20260819"
        element={<DacoitDriveReportPage />}
      />
      <Route path="drive-reports/:token" element={<DriveReportPage />} />
      <Route path="login" element={<LoginPage signedIn={Boolean(user)} />} />
      <Route path="register" element={<RegisterPage signedIn={Boolean(user)} />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="vehicles" element={<Navigate to="/admin" replace />} />
          <Route
            path="working-on"
            element={<GarageWorkspacePage purpose="working_on" />}
          />
          <Route
            path="flips"
            element={<GarageWorkspacePage purpose="flip" />}
          />
          <Route
            path="inventory"
            element={<AdminInventory />}
          />
          <Route
            path="expenses"
            element={<PlaceholderAdminPage title="Expenses" />}
          />
          <Route
            path="repairs"
            element={<PlaceholderAdminPage title="Repairs" />}
          />
          <Route
            path="analytics"
            element={<PlaceholderAdminPage title="Analytics" />}
          />
          <Route
            path="documents"
            element={<PlaceholderAdminPage title="Documents" />}
          />
          <Route
            path="settings"
            element={<ProfilePage />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
