import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Count of unread direct messages for the current user.
 * Refreshes on realtime message inserts/updates, route changes and window focus.
 */
export function useUnreadMessagesCount(): number {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const refresh = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("read", false);
      if (!cancelled) setCount(count ?? 0);
    };

    void refresh();

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => void refresh(),
      )
      .subscribe();

    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, location.search]);

  return count;
}

/**
 * Count of pending borrow requests received (transactions where the user is
 * the lender). Refreshes on realtime transaction changes, route changes and
 * window focus.
 */
export function usePendingRequestsCount(): number {
  const { user } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const refresh = async () => {
      const { count } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("lender_id", user.id)
        .eq("status", "pending");
      if (!cancelled) setCount(count ?? 0);
    };

    void refresh();

    const channel = supabase
      .channel(`pending-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `lender_id=eq.${user.id}`,
        },
        () => void refresh(),
      )
      .subscribe();

    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, location.search]);

  return count;
}
