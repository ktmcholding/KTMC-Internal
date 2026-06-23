import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthStore";
import { isSupabaseConfigured } from "../lib/supabase";
import { logActivity } from "../lib/api";

const HEARTBEAT_MS = 60_000; // record active time once per minute

function labelForPath(path: string): string {
  if (path === "/") return "Overview";
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "category" && seg[1]) return `Category: ${seg[1]}`;
  return seg.map((s) => s.replace(/-/g, " ")).join(" / ") || path;
}

/**
 * Silent, admin-only work tracking. While a signed-in user has the app open and
 * focused, this records page views and a periodic "heartbeat" so admins can see
 * active time and time-per-section. Renders nothing and shows no indication to
 * the user. Only runs when connected to the backend.
 */
export function ActivityTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const userRef = useRef(user);
  userRef.current = user;

  // Log navigation between sections.
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    void logActivity(
      user.id,
      user.email,
      "navigate",
      labelForPath(location.pathname),
      location.pathname
    );
  }, [location.pathname, user]);

  // Heartbeat while the tab is visible (measures active working time).
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const u = userRef.current;
      if (!u) return;
      void logActivity(
        u.id,
        u.email,
        "heartbeat",
        labelForPath(window.location.pathname),
        window.location.pathname
      );
    };
    tick(); // immediate beat on mount
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [user]);

  return null;
}
