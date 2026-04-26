import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Leaf, Clock, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  validateSearch: (search: Record<string, unknown>): { tab?: "books" | "posts"; q?: string } => ({
    tab: search.tab === "posts" ? "posts" : search.tab === "books" ? "books" : undefined,
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse — LendLeaf" },
      {
        name: "description",
        content:
          "Browse the LendLeaf library and join the community feed to discuss books and ideas.",
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

type FilterKey = "all" | "available";

function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab = search.tab ?? "books";
  const query = search.q ?? "";

  const setTab = (next: "books" | "posts") => {
    navigate({ to: "/browse", search: (prev) => ({ ...prev, tab: next }) });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-3 sm:px-4 max-w-6xl py-6 sm:py-10">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5 sm:mb-6">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold">
              {tab === "posts" ? "Community" : "Browse"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {tab === "posts"
                ? "Thoughts and discussions from members"
                : query
                  ? `Results for "${query}"`
                  : "The full LendLeaf library"}
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <Leaf className="h-4 w-4" />
              <span>
                {credits ?? 0} Leaf Credit{credits === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>

        <div className="inline-flex rounded-md border bg-card p-1 mb-6 sm:mb-8">
          <button
            onClick={() => setTab("books")}
            className={`px-3 sm:px-4 py-1.5 text-sm rounded-sm transition-colors flex items-center gap-1.5 ${
              tab === "books"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Books
          </button>
          <button
            onClick={() => setTab("posts")}
            className={`px-3 sm:px-4 py-1.5 text-sm rounded-sm transition-colors flex items-center gap-1.5 ${
              tab === "posts"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" /> Posts
          </button>
        </div>

        {tab === "posts" ? (
          <Feed />
        ) : authLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <SignInPrompt />
        ) : (
          <BooksList user={user} credits={credits} query={query} />
        )}
      </main>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="paper-card rounded-lg py-16 px-6 text-center">
      <BookOpen
        className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4"
        strokeWidth={1.25}
      />
      <h2 className="font-serif text-2xl font-semibold mb-2">
        Sign in to browse books
      </h2>
      <p className="text-muted-foreground max-w-sm mx-auto mb-5">
        The library is open to LendLeaf members. Join to start lending and
        borrowing.
      </p>
      <div className="flex gap-2 justify-center">
        <Link to="/login">
          <Button variant="outline">Sign in</Button>
        </Link>
        <Link to="/signup">
          <Button>Join</Button>
        </Link>
      </div>
    </div>
  );
}

function BooksList({
  user,
  credits,
  query,
}: {
  user: { id: string };
  credits: number | null;
  query: string;
}) {
  const [books, setBooks] = useState<BrowseBook[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [requestedBookIds, setRequestedBookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("available");

  const fetchData = useCallback(async () => {
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
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequest = async (book: BrowseBook) => {
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
    let list = books;
    if (filter === "available") {
      list = list.filter((b) => b.owner_id !== user.id && b.status === "available");
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author ?? "").toLowerCase().includes(q) ||
          (b.isbn ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [books, filter, user.id, query]);

  const noCredits = (credits ?? 0) <= 0;

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "available", label: "Available to borrow" },
    { key: "all", label: "All books" },
  ];

  return (
    <>
      {noCredits && (
        <div className="mb-5 paper-card rounded-md p-4 text-sm">
          You're out of Leaf Credits. Lend one of{" "}
          <Link to="/shelf" className="underline font-medium">
            your books
          </Link>{" "}
          to earn more.
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 sm:mb-6">
        <div className="inline-flex rounded-md border bg-card p-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-sm transition-colors ${
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
          <p className="text-xs sm:text-sm text-muted-foreground">
            {visibleBooks.length} of {books.length} book
            {books.length === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibleBooks.length === 0 ? (
        <div className="paper-card rounded-lg py-16 px-6 text-center">
          <BookOpen
            className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4"
            strokeWidth={1.25}
          />
          <h2 className="font-serif text-2xl font-semibold mb-2">
            {books.length === 0
              ? "No books on LendLeaf yet"
              : query
                ? "No books match your search"
                : "No books match this filter"}
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {books.length === 0
              ? "When members add books to their shelves, they'll appear here."
              : query
                ? "Try a different title, author, or ISBN."
                : "Try a different filter to see more books."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleBooks.map((book) => {
            const isMine = book.owner_id === user.id;
            const isLent = book.status !== "available";
            const owner = owners[book.owner_id];
            const requested = requestedBookIds.has(book.id);
            const isRequesting = requesting === book.id;
            return (
              <article key={book.id} className="paper-card rounded-lg p-4 flex gap-4">
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
                    <h3 className="font-serif font-semibold leading-snug line-clamp-2 flex-1 text-sm sm:text-base">
                      {book.title}
                    </h3>
                    {isMine && (
                      <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">
                        Yours
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
                              <Button
                                size="sm"
                                disabled
                                className="w-full pointer-events-none"
                              >
                                <Clock className="h-3.5 w-3.5 mr-1" /> Request
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
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />{" "}
                            Requesting…
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 mr-1" /> Request
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
    </>
  );
}
