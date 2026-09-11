import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import ClientOverviewPage from "@/pages/ClientOverviewPage";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailsPage from "@/pages/ClientDetailsPage";
import DomainsPage from "@/pages/DomainsPage";
import HostingPage from "@/pages/HostingPage";
import EmailsPage from "@/pages/EmailsPage";
import SharedHostingPage from "@/pages/SharedHostingPage";
import NotFoundPage from "@/pages/NotFoundPage";

function Protected({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout title={title} description={description}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <Protected title="Overview" description="Your infrastructure at a glance">
            <OverviewPage />
          </Protected>
        }
      />
      <Route
        path="/client-overview"
        element={
          <Protected
            title="Client Overview"
            description="Every domain, hosting account, and email, rolled up by client"
          >
            <ClientOverviewPage />
          </Protected>
        }
      />
      <Route
        path="/clients"
        element={
          <Protected title="Clients" description="Manage client accounts">
            <ClientsPage />
          </Protected>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <Protected title="Client Details">
            <ClientDetailsPage />
          </Protected>
        }
      />
      <Route
        path="/domains"
        element={
          <Protected title="Domains" description="Domain registrations & renewals">
            <DomainsPage />
          </Protected>
        }
      />
      <Route
        path="/hosting"
        element={
          <Protected title="Hosting" description="Hosting accounts & renewals">
            <HostingPage />
          </Protected>
        }
      />
      <Route
        path="/emails"
        element={
          <Protected title="Email" description="Email accounts & renewals">
            <EmailsPage />
          </Protected>
        }
      />
      <Route
        path="/shared-hosting"
        element={
          <Protected
            title="Shared Hosting"
            description="Shared hosting plans & servers"
          >
            <SharedHostingPage />
          </Protected>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
