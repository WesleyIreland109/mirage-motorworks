import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/layouts/AdminLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminInventory } from "@/pages/admin/AdminInventory";
import { PlaceholderAdminPage } from "@/pages/admin/PlaceholderAdminPage";
import { AboutPage } from "@/pages/public/AboutPage";
import { ContactPage } from "@/pages/public/ContactPage";
import { HomePage } from "@/pages/public/HomePage";
import { InventoryPage } from "@/pages/public/InventoryPage";
import { JournalPage } from "@/pages/public/JournalPage";
import { VehicleDetailsPage } from "@/pages/public/VehicleDetailsPage";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/:slug" element={<VehicleDetailsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="journal" element={<JournalPage />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="expenses" element={<PlaceholderAdminPage title="Expenses" />} />
        <Route path="repairs" element={<PlaceholderAdminPage title="Repairs" />} />
        <Route path="analytics" element={<PlaceholderAdminPage title="Analytics" />} />
        <Route path="documents" element={<PlaceholderAdminPage title="Documents" />} />
        <Route path="settings" element={<PlaceholderAdminPage title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
