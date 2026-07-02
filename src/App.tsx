import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./store/AuthStore";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { CategoryPage } from "./pages/Category";
import { DutiesTasks } from "./pages/DutiesTasks";
import { CalendarPage } from "./pages/Calendar";
import { Curator } from "./pages/Curator";
import { QuoIntegration } from "./pages/QuoIntegration";
import { InternalDocuments } from "./pages/InternalDocuments";
import { Team } from "./pages/Team";
import { Settings } from "./pages/Settings";
import { type ReactNode } from "react";
import type { SectionKey } from "./types";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}

function RequireAuth({
  children,
  section,
}: {
  children: ReactNode;
  /** If set, the user must have access to this section. */
  section?: SectionKey;
}) {
  const { user, loading, can } = useAuth();
  const location = useLocation();
  if (loading) {
    return <FullScreenLoader />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (section && !can(section)) {
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/category/:categoryId"
        element={
          <RequireAuth>
            <CategoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/duties"
        element={
          <RequireAuth section="duties">
            <DutiesTasks />
          </RequireAuth>
        }
      />
      <Route
        path="/calendar"
        element={
          <RequireAuth section="calendar">
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route
        path="/documents"
        element={
          <RequireAuth section="documents">
            <InternalDocuments />
          </RequireAuth>
        }
      />
      <Route
        path="/curator"
        element={
          <RequireAuth section="curator">
            <Curator />
          </RequireAuth>
        }
      />
      <Route
        path="/quo"
        element={
          <RequireAuth section="quo">
            <QuoIntegration />
          </RequireAuth>
        }
      />
      <Route
        path="/team"
        element={
          <RequireAuth section="team">
            <Team />
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth section="settings">
            <Settings />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
