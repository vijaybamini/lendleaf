import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setCredits(data?.credits ?? 0);
        setLoading(false);
      }
    };
    load();

    // Listen for profile changes (e.g. credits updated after a borrow)
    // Each hook instance needs its own channel topic because this hook is used
    // in multiple places at once (for example the header and the browse page).
    const channel = supabase.channel(`profile-credits-${user.id}-${crypto.randomUUID()}`);
    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as { credits?: number }).credits;
          if (typeof next === "number") setCredits(next);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { credits, loading };
}
