import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Leaf, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCredits } from "@/hooks/use-credits";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
  head: () => ({
    meta: [
      { title: "Browse Books — LendLeaf" },
      {
        name: "description",
        content: "Borrow books from other LendLeaf members using your Leaf Credits.",
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
}

interface OwnerProfile {
  id: string;
  display_name: string | null;
}

function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();

  const [books, setBooks] = useState<BrowseBook[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [requestedBookIds, setRequestedBookIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: bookData, error: bookErr } = await supabase
      .from("books")
      .select("id, title, author, cover_image, isbn, owner_id")
      .neq("owner_id", user.id)
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
      .in("status", ["pending", "active"]);
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
    const { error } = await supabase.from("transactions").insert({
      book_id: book.id,
      lender_id: book.owner_id,
      borrower_id: user.id,
      status: "pending",
    });
    setRequesting(null);

    if (error) {
      toast.error(error.message || "Couldn't send request");
      return;
    }
    setRequestedBookIds((prev) => new Set(prev).add(book.id));
    toast.success("Borrow request sent");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noCredits = (credits ?? 0) <= 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 max-w-6xl py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">Browse</h1>
            <p className="text-muted-foreground mt-1">
              Books shared by other LendLeaf members
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <div className="paper-card rounded-lg py-16 px-6 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" strokeWidth={1.25} />
            <h2 className="font-serif text-2xl font-semibold mb-2">No books to borrow yet</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              When other members add books to their shelves, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
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
                    <h3 className="font-serif font-semibold leading-snug line-clamp-2">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {book.author}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Shared by{" "}
                      <span className="font-medium text-foreground">
                        {owner?.display_name ?? "a member"}
                      </span>
                    </p>
                    <div className="mt-auto pt-3">
                      {requested ? (
                        <Button size="sm" variant="outline" disabled className="w-full">
                          <Check className="h-3.5 w-3.5 mr-1" /> Request sent
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRequest(book)}
                          disabled={noCredits || isRequesting}
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
