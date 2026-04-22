import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Leaf, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  head: () => ({
    meta: [
      { title: "Browse Books — LendLeaf" },
      {
        name: "description",
        content: "Browse the full LendLeaf library and borrow books from other members using your Leaf Credits.",
      },
    ],
  }),
});

interface BrowseBook {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  isbn: string | null;
  owner_id: string;
  status: string;
}

interface OwnerProfile {
  id: string;
  display_name: string | null;
}

type FilterKey = "all" | "available" | "mine";

function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();

  const [books, setBooks] = useState<BrowseBook[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [requestedBookIds, setRequestedBookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: bookData, error: bookErr } = await supabase
      .from("books")
      .select("id, title, author, cover_image, isbn, owner_id, status")
      .order("created_at", { ascending: false });

    if (bookErr) {
      toast.error("Couldn't load books");
      setLoading(false);
      return;
    }

    const list = bookData ?? [];
    setBooks(list);

    const ownerIds = Array.from(new Set(list.map((b) => b.owner_id)));
    if (ownerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      const map: Record<string, OwnerProfile> = {};
      (profileData ?? []).forEach((p) => {
        map[p.id] = p;
      });
      setOwners(map);
    }

    const { data: txData } = await supabase
      .from("transactions")
      .select("book_id, status")
      .eq("borrower_id", user.id)
      .in("status", ["pending", "accepted", "active"]);
    setRequestedBookIds(new Set((txData ?? []).map((t) => t.book_id)));

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async (book: BrowseBook) => {
    if (!user) return;
    if ((credits ?? 0) <= 0) {
      toast.error("You need at least 1 Leaf Credit to borrow");
      return;
    }
    setRequesting(book.id);
    const { error } = await supabase.rpc("request_borrow", { _book_id: book.id });
    setRequesting(null);

    if (error) {
      toast.error(error.message || "Couldn't send request");
      return;
    }
    setRequestedBookIds((prev) => new Set(prev).add(book.id));
    toast.success("Borrow request sent");
  };

  const visibleBooks = useMemo(() => {
    if (!user) return books;
    if (filter === "available") {
      return books.filter((b) => b.owner_id !== user.id && b.status === "available");
    }
    if (filter === "mine") {
      return books.filter((b) => b.owner_id === user.id);
    }
    return books;
  }, [books, filter, user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noCredits = (credits ?? 0) <= 0;

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All books" },
    { key: "available", label: "Available to borrow" },
    { key: "mine", label: "My books" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 max-w-6xl py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">Browse</h1>
            <p className="text-muted-foreground mt-1">
              The full LendLeaf library
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Leaf className="h-4 w-4" />
            <span>
              {credits ?? 0} Leaf Credit{credits === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {noCredits && (
          <div className="mb-6 paper-card rounded-md p-4 text-sm">
            You're out of Leaf Credits. Lend one of{" "}
            <Link to="/shelf" className="underline font-medium">
              your books
            </Link>{" "}
            to earn more.
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="inline-flex rounded-md border bg-card p-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`px-3 py-1.5 text-sm rounded-sm transition-colors ${
                  filter === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              Showing {visibleBooks.length} of {books.length} book{books.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="paper-card rounded-lg py-16 px-6 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" strokeWidth={1.25} />
            <h2 className="font-serif text-2xl font-semibold mb-2">
              {books.length === 0 ? "No books on LendLeaf yet" : "No books match this filter"}
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {books.length === 0
                ? "When members add books to their shelves, they'll appear here."
                : "Try a different filter to see more books."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleBooks.map((book) => {
              const isMine = book.owner_id === user.id;
              const isLent = book.status !== "available";
              const owner = owners[book.owner_id];
              const requested = requestedBookIds.has(book.id);
              const isRequesting = requesting === book.id;
              return (
                <article
                  key={book.id}
                  className="paper-card rounded-lg p-4 flex gap-4"
                >
                  <div className="w-20 h-28 flex-shrink-0 bg-muted rounded-sm overflow-hidden shadow-book">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={`Cover of ${book.title}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start gap-2">
                      <h3 className="font-serif font-semibold leading-snug line-clamp-2 flex-1">
                        {book.title}
                      </h3>
                      {isMine && (
                        <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">
                          Your book
                        </span>
                      )}
                      {!isMine && isLent && (
                        <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          Lent
                        </span>
                      )}
                    </div>
                    {book.author && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {book.author}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Shared by{" "}
                      <span className="font-medium text-foreground">
                        {isMine ? "You" : owner?.display_name ?? "a member"}
                      </span>
                    </p>
                    <div className="mt-auto pt-3">
                      {isMine ? (
                        <Button size="sm" variant="outline" disabled className="w-full">
                          Your book
                        </Button>
                      ) : isLent ? (
                        <Button size="sm" variant="outline" disabled className="w-full">
                          Currently lent
                        </Button>
                      ) : requested ? (
                        <Button size="sm" variant="outline" disabled className="w-full">
                          <Check className="h-3.5 w-3.5 mr-1" /> Request sent
                        </Button>
                      ) : noCredits ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="block w-full">
                                <Button size="sm" disabled className="w-full pointer-events-none">
                                  <Clock className="h-3.5 w-3.5 mr-1" /> Request to Borrow
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              You need at least 1 Leaf Credit to borrow.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRequest(book)}
                          disabled={isRequesting}
                          className="w-full"
                        >
                          {isRequesting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Requesting…
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 mr-1" /> Request to Borrow
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
