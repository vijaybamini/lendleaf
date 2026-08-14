import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  X,
  Loader2,
  Handshake,
  Hourglass,
  Undo2,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SimpleHeader } from "@/components/headers/SimpleHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  return `${Math.floor(d / 30)}mo`;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function RequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

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
      toast.success(accept ? "Request accepted" : "Request declined");
    },
    onSettled: invalidateAll,
  });

  const handoverMutation = useMutation({
    mutationFn: async ({ id }: { id: string; side: "incoming" | "outgoing" }) => {
      const { error } = await supabase.rpc("confirm_handover", { _transaction_id: id });
      if (error) throw error;
    },
    onError: (err: Error) => toast.error(err.message || "Confirmation failed"),
    onSuccess: () => toast.success("Confirmed 🌿"),
    onSettled: invalidateAll,
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id }: { id: string; side: "incoming" | "outgoing" }) => {
      const { error } = await supabase.rpc("confirm_return", { _transaction_id: id });
      if (error) throw error;
    },
    onError: (err: Error) => toast.error(err.message || "Return confirmation failed"),
    onSuccess: () => toast.success("Return confirmed 🌿"),
    onSettled: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.rpc("cancel_borrow_request", {
        _transaction_id: id,
      });
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: outgoingKey });
      const previous = queryClient.getQueryData<TxRow[]>(outgoingKey);
      queryClient.setQueryData<TxRow[]>(outgoingKey, (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
      );
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(outgoingKey, ctx.previous);
      toast.error(err.message || "Couldn't cancel request");
    },
    onSuccess: () => {
      toast.success("Request cancelled");
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

  const list = tab === "incoming" ? incoming : outgoing;
  const isLoading = tab === "incoming" ? incomingLoading : outgoingLoading;

  // Sort: actionable first (pending for incoming, or accepted/active needing you), then rest.
  const actionable = list.filter((r) => {
    if (tab === "incoming") {
      if (r.status === "pending") return true;
      if (r.status === "accepted" && !r.lender_confirmed) return true;
      if (r.status === "active" && !r.lender_returned) return true;
      return false;
    } else {
      if (r.status === "pending") return true;
      if (r.status === "accepted" && !r.borrower_confirmed) return true;
      if (r.status === "active" && !r.borrower_returned) return true;
      return false;
    }
  });
  const waiting = list.filter((r) => !actionable.includes(r) && !["completed", "rejected"].includes(r.status));
  const history = list.filter((r) => ["completed", "rejected"].includes(r.status));

  return (
    <>
      <SimpleHeader title="Requests" showBack={false} />

      <main className="flex-1 w-full max-w-2xl md:max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="sticky top-14 sm:top-16 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex border-t border-border">
            <TabButton active={tab === "incoming"} onClick={() => setTab("incoming")}>
              Incoming {incoming.length > 0 && <span className="text-muted-foreground">({incoming.length})</span>}
            </TabButton>
            <TabButton active={tab === "outgoing"} onClick={() => setTab("outgoing")}>
              Sent {outgoing.length > 0 && <span className="text-muted-foreground">({outgoing.length})</span>}
            </TabButton>
          </div>
        </div>

        {/* Intro line, like IG's "The people below have requested to message you..." */}
        <div className="px-4 py-3 text-[13px] text-muted-foreground leading-relaxed border-b border-border">
          {tab === "incoming" ? (
            <>The people below have requested to borrow a book from your shelf. They <span className="font-medium text-foreground">won't know</span> you've seen their request until you accept it.</>
          ) : (
            <>Books you've asked to borrow. The owner will review your request and confirm the handover with you.</>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-20 px-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
              <Handshake className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold mb-1">No requests</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {tab === "incoming"
                ? "When someone asks to borrow a book from your shelf, it'll show up here."
                : "Books you request to borrow will appear here."}
            </p>
          </div>
        ) : (
          <div>
            {actionable.map((r) => (
              <RequestItem
                key={r.id}
                req={r}
                side={tab}
                busy={
                  (respondMutation.isPending && respondMutation.variables?.id === r.id) ||
                  (handoverMutation.isPending && handoverMutation.variables?.id === r.id) ||
                  (returnMutation.isPending && returnMutation.variables?.id === r.id) ||
                  (cancelMutation.isPending && cancelMutation.variables?.id === r.id)
                }
                onAccept={() => respondMutation.mutate({ id: r.id, accept: true })}
                onReject={() => respondMutation.mutate({ id: r.id, accept: false })}
                onHandover={() => handoverMutation.mutate({ id: r.id, side: tab })}
                onReturn={() => returnMutation.mutate({ id: r.id, side: tab })}
                onCancel={() => cancelMutation.mutate({ id: r.id })}
              />
            ))}

            {waiting.length > 0 && (
              <>
                <SectionLabel>Waiting</SectionLabel>
                {waiting.map((r) => (
                  <RequestItem key={r.id} req={r} side={tab} waiting />
                ))}
              </>
            )}

            {history.length > 0 && (
              <>
                <SectionLabel>Earlier</SectionLabel>
                {history.map((r) => (
                  <RequestItem key={r.id} req={r} side={tab} historical />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 h-11 text-sm font-medium relative transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t border-border mt-1">
      {children}
    </div>
  );
}

function RequestItem({
  req,
  side,
  busy,
  waiting,
  historical,
  onAccept,
  onReject,
  onHandover,
  onReturn,
  onCancel,
}: {
  req: TxRow;
  side: "incoming" | "outgoing";
  busy?: boolean;
  waiting?: boolean;
  historical?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onHandover?: () => void;
  onReturn?: () => void;
  onCancel?: () => void;
}) {
  const name = req.counterparty?.display_name ?? "a member";
  const bookTitle = req.book?.title ?? "Untitled";

  // Compose preview / subtitle line based on state
  let preview = "";
  if (historical) {
    preview = req.status === "completed" ? `Returned · ${bookTitle}` : `Declined · ${bookTitle}`;
  } else if (req.status === "pending") {
    preview = side === "incoming"
      ? `wants to borrow "${bookTitle}"`
      : `requested "${bookTitle}"`;
  } else if (req.status === "accepted") {
    preview = side === "incoming"
      ? req.lender_confirmed
        ? `Waiting for ${name} to confirm pickup`
        : `Accepted · confirm when you've handed over "${bookTitle}"`
      : req.borrower_confirmed
        ? `Waiting for ${name} to confirm handover`
        : `Accepted · confirm when you've received "${bookTitle}"`;
  } else if (req.status === "active") {
    preview = side === "incoming"
      ? req.lender_returned
        ? `Waiting for ${name} to confirm return`
        : `On loan · confirm when you get "${bookTitle}" back`
      : req.borrower_returned
        ? `Waiting for ${name} to confirm return`
        : `Borrowing "${bookTitle}" · mark as returned when done`;
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors">
      {/* Avatar with book thumbnail badge */}
      <Link
        to="/messages"
        search={{ to: req.counterparty?.id ?? "" }}
        className="relative flex-shrink-0"
        aria-label={`Message ${name}`}
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {initialsOf(req.counterparty?.display_name)}
        </div>
        {/* Mini book cover as IG-style story ring badge */}
        <div className="absolute -bottom-1 -right-1 w-7 h-9 rounded-sm overflow-hidden border-2 border-background shadow-sm bg-muted">
          {req.book?.cover_image ? (
            <img
              src={req.book.cover_image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
              <BookOpen className="h-3 w-3 text-primary" />
            </div>
          )}
        </div>
      </Link>

      {/* Main content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-sm truncate">{name}</span>
          <span className="text-xs text-muted-foreground">· {timeAgo(req.created_at)}</span>
        </div>
        <p className={cn(
          "text-sm text-muted-foreground leading-snug mt-0.5 line-clamp-2",
          historical && "text-muted-foreground/70",
        )}>
          {preview}
        </p>

        {/* Action buttons — IG-style full-width pair */}
        {!waiting && !historical && (
          <div className="mt-2.5 flex gap-2">
            {req.status === "pending" && side === "incoming" && (
              <>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold"
                  onClick={onAccept}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 h-8 text-xs font-semibold"
                  onClick={onReject}
                  disabled={busy}
                >
                  Decline
                </Button>
              </>
            )}

            {req.status === "pending" && side === "outgoing" && (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-8 text-xs font-semibold"
                onClick={onCancel}
                disabled={busy}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel request"}
              </Button>
            )}

            {req.status === "accepted" && side === "incoming" && !req.lender_confirmed && (
              <Button size="sm" className="flex-1 h-8 text-xs font-semibold" onClick={onHandover} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><Handshake className="h-3.5 w-3.5 mr-1.5" />I handed it over</>)}
              </Button>
            )}
            {req.status === "accepted" && side === "outgoing" && !req.borrower_confirmed && (
              <Button size="sm" className="flex-1 h-8 text-xs font-semibold" onClick={onHandover} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><Check className="h-3.5 w-3.5 mr-1.5" />I received it</>)}
              </Button>
            )}

            {req.status === "active" && side === "incoming" && !req.lender_returned && (
              <Button size="sm" className="flex-1 h-8 text-xs font-semibold" onClick={onReturn} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><Undo2 className="h-3.5 w-3.5 mr-1.5" />Got it back</>)}
              </Button>
            )}
            {req.status === "active" && side === "outgoing" && !req.borrower_returned && (
              <Button size="sm" className="flex-1 h-8 text-xs font-semibold" onClick={onReturn} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><Undo2 className="h-3.5 w-3.5 mr-1.5" />I returned it</>)}
              </Button>
            )}

            <Button asChild size="sm" variant="ghost" className="h-8 px-2">
              <Link to="/messages" search={{ to: req.counterparty?.id ?? "" }} aria-label="Message">
                <MessageCircle className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {waiting && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hourglass className="h-3 w-3" />
            <span>Waiting on the other side</span>
          </div>
        )}
      </div>

      {/* For pending incoming, IG shows a small X on the right — mirror that */}
      {req.status === "pending" && side === "incoming" && !busy && (
        <button
          onClick={onReject}
          className="p-1 -mr-1 text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Decline"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
