import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  X,
  Loader2,
  Handshake,
  Inbox,
  Clock,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Hourglass,
  PackageCheck,
  Undo2,
} from "lucide-react";
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
      { name: "description", content: "Manage incoming borrow requests for books on your shelf and confirm books you're borrowing." },
    ],
  }),
});

type TxStatus = "pending" | "accepted" | "active" | "completed" | "rejected";

interface TxRow {
  id: string;
  status: TxStatus;
  created_at: string;
  book_id: string;
  borrower_id: string;
  lender_id: string;
  lender_confirmed: boolean;
  borrower_confirmed: boolean;
  lender_returned: boolean;
  borrower_returned: boolean;
  book: { id: string; title: string; author: string | null; cover_image: string | null } | null;
  counterparty: { id: string; display_name: string | null } | null;
}

function statusBadge(tx: TxRow, viewerIsLender: boolean) {
  if (tx.status === "accepted") {
    const myConfirmed = viewerIsLender ? tx.lender_confirmed : tx.borrower_confirmed;
    const theirConfirmed = viewerIsLender ? tx.borrower_confirmed : tx.lender_confirmed;
    if (myConfirmed && !theirConfirmed) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-200">
          Waiting for other party
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-200">
        Accepted — awaiting handover
      </Badge>
    );
  }

  if (tx.status === "active") {
    const myReturned = viewerIsLender ? tx.lender_returned : tx.borrower_returned;
    const theirReturned = viewerIsLender ? tx.borrower_returned : tx.lender_returned;
    if (myReturned && !theirReturned) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-200">
          Waiting on return confirmation
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-primary/15 text-primary border-primary/20">
        Active loan
      </Badge>
    );
  }

  const map: Record<TxStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-100 text-amber-900 border-amber-200" },
    accepted: { label: "Accepted", className: "bg-blue-100 text-blue-900 border-blue-200" },
    active: { label: "Active", className: "bg-primary/15 text-primary border-primary/20" },
    completed: { label: "Returned", className: "bg-muted text-muted-foreground border-border" },
    rejected: { label: "Rejected", className: "bg-muted text-muted-foreground border-border" },
  };
  const v = map[tx.status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}

async function fetchTransactions(
  userId: string,
  side: "incoming" | "outgoing",
): Promise<TxRow[]> {
  const filterColumn = side === "incoming" ? "lender_id" : "borrower_id";
  const { data: txs, error } = await supabase
    .from("transactions")
    .select(
      "id, status, created_at, book_id, borrower_id, lender_id, lender_confirmed, borrower_confirmed, lender_returned, borrower_returned",
    )
    .eq(filterColumn, userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const list = txs ?? [];
  const bookIds = Array.from(new Set(list.map((t) => t.book_id)));
  // counterparty = the OTHER user
  const counterIds = Array.from(
    new Set(list.map((t) => (side === "incoming" ? t.borrower_id : t.lender_id))),
  );

  const [booksRes, profilesRes] = await Promise.all([
    bookIds.length
      ? supabase.from("books").select("id, title, author, cover_image").in("id", bookIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; author: string | null; cover_image: string | null }> }),
    counterIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", counterIds)
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
    lender_id: t.lender_id,
    lender_confirmed: t.lender_confirmed,
    borrower_confirmed: t.borrower_confirmed,
    lender_returned: t.lender_returned,
    borrower_returned: t.borrower_returned,
    book: bookMap.get(t.book_id) ?? null,
    counterparty:
      profileMap.get(side === "incoming" ? t.borrower_id : t.lender_id) ?? null,
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
  const outgoingKey = ["outgoing-requests", user?.id] as const;

  const { data: incoming = [], isLoading: incomingLoading } = useQuery({
    queryKey: incomingKey,
    queryFn: () => fetchTransactions(user!.id, "incoming"),
    enabled: !!user,
  });

  const { data: outgoing = [], isLoading: outgoingLoading } = useQuery({
    queryKey: outgoingKey,
    queryFn: () => fetchTransactions(user!.id, "outgoing"),
    enabled: !!user,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incoming-requests"] });
    queryClient.invalidateQueries({ queryKey: ["outgoing-requests"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["book-details"] });
    queryClient.invalidateQueries({ queryKey: ["credits"] });
  };

  // Accept / Reject — only on incoming
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
      const previous = queryClient.getQueryData<TxRow[]>(incomingKey);
      queryClient.setQueryData<TxRow[]>(incomingKey, (old) =>
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

  // Confirm handover — works for both lender and borrower (mutual confirmation)
  const handoverMutation = useMutation({
    mutationFn: async ({ id }: { id: string; side: "incoming" | "outgoing" }) => {
      const { error } = await supabase.rpc("confirm_handover", { _transaction_id: id });
      if (error) throw error;
    },
    onMutate: async ({ id, side }) => {
      const key = side === "incoming" ? incomingKey : outgoingKey;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TxRow[]>(key);
      queryClient.setQueryData<TxRow[]>(key, (old) =>
        (old ?? []).map((r) => {
          if (r.id !== id) return r;
          const lender_confirmed = side === "incoming" ? true : r.lender_confirmed;
          const borrower_confirmed = side === "outgoing" ? true : r.borrower_confirmed;
          const bothConfirmed = lender_confirmed && borrower_confirmed;
          return {
            ...r,
            lender_confirmed,
            borrower_confirmed,
            status: bothConfirmed ? ("active" as const) : r.status,
          };
        }),
      );
      return { previous, key };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous && ctx.key) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(err.message || "Confirmation failed");
    },
    onSuccess: (_data, { id, side }) => {
      // Look up freshest snapshot to decide which toast to show
      const key = side === "incoming" ? incomingKey : outgoingKey;
      const list = queryClient.getQueryData<TxRow[]>(key) ?? [];
      const tx = list.find((r) => r.id === id);
      if (tx?.status === "active") {
        toast.success("Handover complete — enjoy! 🌿");
      } else {
        toast.success("Confirmed. Waiting for the other party.");
      }
    },
    onSettled: invalidateAll,
  });

  // Confirm return — works for both lender and borrower (mutual confirmation)
  const returnMutation = useMutation({
    mutationFn: async ({ id }: { id: string; side: "incoming" | "outgoing" }) => {
      const { error } = await supabase.rpc("confirm_return", { _transaction_id: id });
      if (error) throw error;
    },
    onMutate: async ({ id, side }) => {
      const key = side === "incoming" ? incomingKey : outgoingKey;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TxRow[]>(key);
      queryClient.setQueryData<TxRow[]>(key, (old) =>
        (old ?? []).map((r) => {
          if (r.id !== id) return r;
          const lender_returned = side === "incoming" ? true : r.lender_returned;
          const borrower_returned = side === "outgoing" ? true : r.borrower_returned;
          const bothReturned = lender_returned && borrower_returned;
          return {
            ...r,
            lender_returned,
            borrower_returned,
            status: bothReturned ? ("completed" as const) : r.status,
          };
        }),
      );
      return { previous, key };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous && ctx.key) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error(err.message || "Return confirmation failed");
    },
    onSuccess: (_data, { id, side }) => {
      const key = side === "incoming" ? incomingKey : outgoingKey;
      const list = queryClient.getQueryData<TxRow[]>(key) ?? [];
      const tx = list.find((r) => r.id === id);
      if (tx?.status === "completed") {
        toast.success("Return complete — book is back on the shelf 🌿");
      } else {
        toast.success("Return confirmed. Waiting for the other party.");
      }
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

  // Incoming buckets (lender's perspective)
  const incomingPending = incoming.filter((r) => r.status === "pending");
  const incomingAccepted = incoming.filter((r) => r.status === "accepted");
  const incomingActive = incoming.filter((r) => r.status === "active");
  const incomingHistory = incoming.filter((r) =>
    ["completed", "rejected"].includes(r.status),
  );

  // Outgoing buckets (borrower's perspective)
  const outgoingPending = outgoing.filter((r) => r.status === "pending");
  const outgoingAccepted = outgoing.filter((r) => r.status === "accepted");
  const outgoingActive = outgoing.filter((r) => r.status === "active");
  const outgoingHistory = outgoing.filter((r) =>
    ["completed", "rejected"].includes(r.status),
  );

  const respondingId = respondMutation.isPending
    ? respondMutation.variables?.id
    : undefined;
  const handoverId = handoverMutation.isPending
    ? handoverMutation.variables?.id
    : undefined;
  const returnId = returnMutation.isPending
    ? returnMutation.variables?.id
    : undefined;

  const isLoading = incomingLoading || outgoingLoading;
  const totalCount = incoming.length + outgoing.length;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container mx-auto px-4 max-w-4xl py-10">
        <div className="mb-8">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold">Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage borrow requests and confirm handovers — both sides must confirm to complete a loan.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalCount === 0 ? (
          <div className="paper-card rounded-lg py-16 px-6 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" strokeWidth={1.25} />
            <h2 className="font-serif text-2xl font-semibold mb-2">No requests yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When you request a book or someone asks to borrow yours, it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* INCOMING (you are the lender) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownLeft className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-semibold">Incoming</h2>
                <span className="text-sm text-muted-foreground">— books people want from you</span>
              </div>

              <div className="space-y-8">
                <Section title="Pending" icon={<Clock className="h-4 w-4" />} count={incomingPending.length}>
                  {incomingPending.length === 0 ? (
                    <EmptyHint>No pending requests.</EmptyHint>
                  ) : (
                    incomingPending.map((r) => {
                      const busy = respondingId === r.id;
                      return (
                        <RequestRow key={r.id} req={r} viewerIsLender>
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

                <Section title="Awaiting handover" icon={<Handshake className="h-4 w-4" />} count={incomingAccepted.length}>
                  {incomingAccepted.length === 0 ? (
                    <EmptyHint>No accepted requests waiting on handover.</EmptyHint>
                  ) : (
                    incomingAccepted.map((r) => {
                      const busy = handoverId === r.id;
                      const alreadyConfirmed = r.lender_confirmed;
                      return (
                        <RequestRow key={r.id} req={r} viewerIsLender>
                          {alreadyConfirmed ? (
                            <Button size="sm" variant="outline" disabled>
                              <Hourglass className="h-3.5 w-3.5 mr-1" /> Waiting for borrower
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                handoverMutation.mutate({ id: r.id, side: "incoming" })
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Confirming…</>
                              ) : (
                                <><Handshake className="h-3.5 w-3.5 mr-1" /> I handed over the book</>
                              )}
                            </Button>
                          )}
                        </RequestRow>
                      );
                    })
                  )}
                </Section>

                <Section title="Active loans" icon={<PackageCheck className="h-4 w-4" />} count={incomingActive.length}>
                  {incomingActive.length === 0 ? (
                    <EmptyHint>No books currently lent out.</EmptyHint>
                  ) : (
                    incomingActive.map((r) => {
                      const busy = returnId === r.id;
                      const alreadyReturned = r.lender_returned;
                      return (
                        <RequestRow key={r.id} req={r} viewerIsLender>
                          {alreadyReturned ? (
                            <Button size="sm" variant="outline" disabled>
                              <Hourglass className="h-3.5 w-3.5 mr-1" /> Waiting for borrower to confirm return
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                returnMutation.mutate({ id: r.id, side: "incoming" })
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Confirming…</>
                              ) : (
                                <><Undo2 className="h-3.5 w-3.5 mr-1" /> I got the book back</>
                              )}
                            </Button>
                          )}
                        </RequestRow>
                      );
                    })
                  )}
                </Section>

                {incomingHistory.length > 0 && (
                  <Section title="History" icon={<CheckCircle2 className="h-4 w-4" />} count={incomingHistory.length}>
                    {incomingHistory.map((r) => (
                      <RequestRow key={r.id} req={r} viewerIsLender />
                    ))}
                  </Section>
                )}
              </div>
            </div>

            {/* OUTGOING (you are the borrower) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-semibold">Outgoing</h2>
                <span className="text-sm text-muted-foreground">— books you've asked to borrow</span>
              </div>

              <div className="space-y-8">
                <Section title="Pending" icon={<Clock className="h-4 w-4" />} count={outgoingPending.length}>
                  {outgoingPending.length === 0 ? (
                    <EmptyHint>No pending requests sent.</EmptyHint>
                  ) : (
                    outgoingPending.map((r) => (
                      <RequestRow key={r.id} req={r} viewerIsLender={false} />
                    ))
                  )}
                </Section>

                <Section title="Confirm pickup" icon={<Handshake className="h-4 w-4" />} count={outgoingAccepted.length}>
                  {outgoingAccepted.length === 0 ? (
                    <EmptyHint>Nothing waiting for your confirmation.</EmptyHint>
                  ) : (
                    outgoingAccepted.map((r) => {
                      const busy = handoverId === r.id;
                      const alreadyConfirmed = r.borrower_confirmed;
                      return (
                        <RequestRow key={r.id} req={r} viewerIsLender={false}>
                          {alreadyConfirmed ? (
                            <Button size="sm" variant="outline" disabled>
                              <Hourglass className="h-3.5 w-3.5 mr-1" /> Waiting for lender
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                handoverMutation.mutate({ id: r.id, side: "outgoing" })
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Confirming…</>
                              ) : (
                                <><Check className="h-3.5 w-3.5 mr-1" /> I received the book</>
                              )}
                            </Button>
                          )}
                        </RequestRow>
                      );
                    })
                  )}
                </Section>

                {outgoingHistory.length > 0 && (
                  <Section title="History" icon={<CheckCircle2 className="h-4 w-4" />} count={outgoingHistory.length}>
                    {outgoingHistory.map((r) => (
                      <RequestRow key={r.id} req={r} viewerIsLender={false} />
                    ))}
                  </Section>
                )}
              </div>
            </div>
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
  viewerIsLender,
  children,
}: {
  req: TxRow;
  viewerIsLender: boolean;
  children?: React.ReactNode;
}) {
  const counterLabel = viewerIsLender ? "Requested by" : "Lender";
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
              {counterLabel}{" "}
              <span className="font-medium text-foreground">
                {req.counterparty?.display_name ?? "a member"}
              </span>
            </p>
          </div>
          <div>{statusBadge(req, viewerIsLender)}</div>
        </div>
        {children && <div className="mt-3 flex gap-2 flex-wrap">{children}</div>}
      </div>
    </article>
  );
}
