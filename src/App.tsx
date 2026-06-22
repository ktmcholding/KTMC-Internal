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
import { type ReactNode } from "react";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-400">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <FullScreenLoader />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
          <RequireAuth>
            <DutiesTasks />
          </RequireAuth>
        }
      />
      <Route
        path="/calendar"
        element={
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route
        path="/curator"
        element={
          <RequireAuth>
            <Curator />
          </RequireAuth>
        }
      />
      <Route
        path="/quo"
        element={
          <RequireAuth>
            <QuoIntegration />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
