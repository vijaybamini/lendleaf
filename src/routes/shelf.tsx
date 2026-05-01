import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search, Plus, Trash2, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { searchOpenLibrary, type OLBook } from "@/lib/openLibrary";

export const Route = createFileRoute("/shelf")({
  component: ShelfPage,
  head: () => ({ meta: [{ title: "My Shelf — LendLeaf" }] }),
});

interface Book {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  cover_image: string | null;
  google_books_id: string | null; // reused as external (Open Library) id
  created_at: string;
}

function ShelfPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setLoadingBooks(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setLoadingBooks(false);
    if (error) {
      toast.error("Couldn't load your shelf");
      return;
    }
    setBooks(data ?? []);
  }, [user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleDelete = async (id: string) => {
    const prev = books;
    setBooks(books.filter((b) => b.id !== id));
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) {
      setBooks(prev);
      toast.error("Couldn't remove book");
    } else {
      toast.success("Removed from shelf");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ownedIsbns = new Set(books.map((b) => b.isbn).filter(Boolean) as string[]);
  const ownedExtIds = new Set(
    books.map((b) => b.google_books_id).filter(Boolean) as string[],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 max-w-6xl py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">My Shelf</h1>
            <p className="text-muted-foreground mt-1">
              {books.length === 0
                ? "Your library is empty. Search for a book to start sharing!"
                : `${books.length} ${books.length === 1 ? "book" : "books"} in your collection`}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-1" /> Add a book
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Find a book</DialogTitle>
              </DialogHeader>
              <BookSearch
                onAdded={() => {
                  fetchBooks();
                  setDialogOpen(false);
                }}
                ownedIsbns={ownedIsbns}
                ownedExtIds={ownedExtIds}
              />
            </DialogContent>
          </Dialog>
        </div>

        {loadingBooks ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : books.length === 0 ? (
          <EmptyShelf onAdd={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} onDelete={() => handleDelete(book.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyShelf({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="paper-card rounded-lg py-16 px-6 text-center">
      <BookOpen className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" strokeWidth={1.25} />
      <h2 className="font-serif text-2xl font-semibold mb-2">Your library is empty</h2>
      <p className="text-muted-foreground max-w-sm mx-auto mb-6">
        Search for a book to start sharing!
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" /> Add your first book
      </Button>
    </div>
  );
}

function BookCard({ book, onDelete }: { book: Book; onDelete: () => void }) {
  return (
    <div className="group">
      <div className="relative aspect-[2/3] rounded-sm overflow-hidden shadow-book bg-muted">
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={`Cover of ${book.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 p-3 text-center">
            <span className="font-serif text-sm text-primary-foreground/90">{book.title}</span>
          </div>
        )}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/90 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          aria-label="Remove book"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <h3 className="font-serif text-sm font-medium mt-3 leading-snug line-clamp-2">{book.title}</h3>
      {book.author && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.author}</p>
      )}
    </div>
  );
}

function BookSearch({
  onAdded,
  ownedIsbns,
  ownedExtIds,
}: {
  onAdded: () => void;
  ownedIsbns: Set<string>;
  ownedExtIds: Set<string>;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OLBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const items = await searchOpenLibrary(q, 12);
      setResults(items);
      if (!items.length) toast.info("No books found — try another query");
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const isOwned = (item: OLBook) =>
    (item.isbn && ownedIsbns.has(item.isbn)) || ownedExtIds.has(item.id);

  const addBook = async (item: OLBook) => {
    if (!user) return;

    // Client-side duplicate guard
    if (isOwned(item)) {
      toast.info("This book is already on your shelf");
      return;
    }

    setAdding(item.id);
    const { error } = await supabase.from("books").insert({
      owner_id: user.id,
      title: item.title,
      author: item.authors.join(", ") || null,
      isbn: item.isbn,
      cover_image: item.coverUrl,
      google_books_id: item.id, // stores Open Library work key
    });
    setAdding(null);

    if (error) {
      // Postgres unique violation (duplicate ISBN or external id for this user)
      console.log(error);
      if (error.code === "23505") {
        toast.info("This book is already on your shelf");
        return;
      }
      toast.error("Couldn't add book");
      return;
    }
    toast.success(`Added "${item.title}" to your shelf`);
    onAdded();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, author, or ISBN…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Search the world's books to fill your shelf.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((item) => {
              const owned = isOwned(item);
              const isAdding = adding === item.id;
              return (
                <li key={item.id} className="flex gap-3 py-3 items-start">
                  <div className="w-12 h-16 flex-shrink-0 bg-muted rounded-sm overflow-hidden">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight line-clamp-2">{item.title}</p>
                    {item.authors.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {item.authors.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={owned ? "outline" : "default"}
                    disabled={owned || isAdding}
                    onClick={() => addBook(item)}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Adding…
                      </>
                    ) : owned ? (
                      "On shelf"
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
