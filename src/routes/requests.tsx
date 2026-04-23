import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, X, Loader2, Handshake, Inbox, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/requests")({
  component: RequestsPage,
  head: () => ({
    meta: [
      { title: "Requests — LendLeaf" },
      { name: "description", content: "Manage incoming borrow requests for books on your shelf." },
    ],
  }),
});

type TxStatus = "pending" | "accepted" | "active" | "completed" | "rejected";

interface IncomingRequest {
  id: string;
  status: TxStatus;
  created_at: string;
  book_id: string;
  borrower_id: string;
  book: { id: string; title: string; author: string | null; cover_image: string | null } | null;
  borrower: { id: string; display_name: string | null } | null;
}

function statusBadge(status: TxStatus) {
  const map: Record<TxStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-900 border-amber-200" },
    accepted: { label: "Accepted — awaiting handover", className: "bg-blue-100 text-blue-900 border-blue-200" },
    active: { label: "Active", className: "bg-primary/15 text-primary border-primary/20" },
    completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
    rejected: { label: "Rejected", className: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

async function fetchIncomingRequests(userId: string): Promise<IncomingRequest[]> {
  const { data: txs, error } = await supabase
    .from("transactions")
    .select("id, status, created_at, book_id, borrower_id")
    .eq("lender_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const list = txs ?? [];
  const bookIds = Array.from(new Set(list.map((t) => t.book_id)));
  const borrowerIds = Array.from(new Set(list.map((t) => t.borrower_id)));

  const [booksRes, profilesRes] = await Promise.all([
    bookIds.length
      ? supabase.from("books").select("id, title, author, cover_image").in("id", bookIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; author: string | null; cover_image: string | null }> }),
    borrowerIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", borrowerIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
  ]);

  const bookMap = new Map((booksRes.data ?? []).map((b) => [b.id, b]));
  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));

  return list.map((t) => ({
    id: t.id,
    status: t.status as TxStatus,
    created_at: t.created_at,
    book_id: t.book_id,
    borrower_id: t.borrower_id,
    book: bookMap.get(t.book_id) ?? null,
    borrower: profileMap.get(t.borrower_id) ?? null,
  }));
}

function RequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const incomingKey = ["incoming-requests", user?.id] as const;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: incomingKey,
    queryFn: () => fetchIncomingRequests(user!.id),
    enabled: !!user,
  });

  // Invalidate the related caches a mutation might affect
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incoming-requests"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["outgoing-requests"] });
    queryClient.invalidateQueries({ queryKey: ["book-details"] });
    queryClient.invalidateQueries({ queryKey: ["credits"] });
  };

  // Accept / Reject mutation — optimistic
  const respondMutation = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc("respond_to_request", {
        _transaction_id: id,
        _accept: accept,
      });
      if (error) throw error;
    },
    onMutate: async ({ id, accept }) => {
      await queryClient.cancelQueries({ queryKey: incomingKey });
      const previous = queryClient.getQueryData<IncomingRequest[]>(incomingKey);
      queryClient.setQueryData<IncomingRequest[]>(incomingKey, (old) =>
        (old ?? []).map((r) =>
          r.id === id ? { ...r, status: accept ? "accepted" : "rejected" } : r,
        ),
      );
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(incomingKey, ctx.previous);
      toast.error(err.message || "Action failed");
    },
    onSuccess: (_data, { accept }) => {
      toast.success(accept ? "Request accepted" : "Request rejected");
    },
    onSettled: invalidateAll,
  });

  // Confirm handover mutation — optimistic flip to "active"
  const handoverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("confirm_handover", { _transaction_id: id });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: incomingKey });
      const previous = queryClient.getQueryData<IncomingRequest[]>(incomingKey);
      queryClient.setQueryData<IncomingRequest[]>(incomingKey, (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, status: "active" as const } : r)),
      );
      return { previous };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(incomingKey, ctx.previous);
      toast.error(err.message || "Handover failed");
    },
    onSuccess: () => {
      toast.success("Credit transferred — enjoy lending! 🌿");
    },
    onSettled: invalidateAll,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const accepted = requests.filter((r) => r.status === "accepted");
  const history = requests.filter((r) => ["active", "completed", "rejected"].includes(r.status));

  // Track per-row pending state — variables holds the in-flight payload
  const respondingId =
    respondMutation.isPending ? respondMutation.variables?.id : undefined;
  const handoverId =
    handoverMutation.isPending ? handoverMutation.variables : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 max-w-4xl py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage borrow requests for books on your shelf
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="paper-card rounded-lg py-16 px-6 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" strokeWidth={1.25} />
            <h2 className="font-serif text-2xl font-semibold mb-2">No requests yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When members ask to borrow your books, they'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            <Section title="Incoming requests" icon={<Clock className="h-4 w-4" />} count={pending.length}>
              {pending.length === 0 ? (
                <EmptyHint>No pending requests.</EmptyHint>
              ) : (
                pending.map((r) => {
                  const busy = respondingId === r.id;
                  return (
                    <RequestRow key={r.id} req={r}>
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ id: r.id, accept: true })}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><Check className="h-3.5 w-3.5 mr-1" /> Accept</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondMutation.mutate({ id: r.id, accept: false })}
                        disabled={busy}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </RequestRow>
                  );
                })
              )}
            </Section>

            <Section title="Awaiting handover" icon={<Handshake className="h-4 w-4" />} count={accepted.length}>
              {accepted.length === 0 ? (
                <EmptyHint>No accepted requests waiting on handover.</EmptyHint>
              ) : (
                accepted.map((r) => {
                  const busy = handoverId === r.id;
                  return (
                    <RequestRow key={r.id} req={r}>
                      <Button
                        size="sm"
                        onClick={() => handoverMutation.mutate(r.id)}
                        disabled={busy}
                      >
                        {busy ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Confirming…</>
                        ) : (
                          <><Handshake className="h-3.5 w-3.5 mr-1" /> Confirm Physical Handover</>
                        )}
                      </Button>
                    </RequestRow>
                  );
                })
              )}
            </Section>

            {history.length > 0 && (
              <Section title="History" icon={<CheckCircle2 className="h-4 w-4" />} count={history.length}>
                {history.map((r) => (
                  <RequestRow key={r.id} req={r} />
                ))}
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-xs">({count})</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper-card rounded-md p-4 text-sm text-muted-foreground">{children}</div>
  );
}

function RequestRow({
  req,
  children,
}: {
  req: IncomingRequest;
  children?: React.ReactNode;
}) {
  return (
    <article className="paper-card rounded-lg p-4 flex gap-4 items-start">
      <div className="w-14 h-20 flex-shrink-0 bg-muted rounded-sm overflow-hidden shadow-book">
        {req.book?.cover_image ? (
          <img
            src={req.book.cover_image}
            alt={`Cover of ${req.book.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-serif font-semibold leading-snug truncate">
              {req.book?.title ?? "Untitled"}
            </h3>
            {req.book?.author && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{req.book.author}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Requested by{" "}
              <span className="font-medium text-foreground">
                {req.borrower?.display_name ?? "a member"}
              </span>
            </p>
          </div>
          <div>{statusBadge(req.status)}</div>
        </div>
        {children && <div className="mt-3 flex gap-2 flex-wrap">{children}</div>}
      </div>
    </article>
  );
}
