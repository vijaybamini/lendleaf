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
  google_books_id: string | null;
  created_at: string;
}

interface GoogleBookResult {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
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

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 container mx-auto px-4 max-w-6xl py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">My Shelf</h1>
            <p className="text-muted-foreground mt-1">
              {books.length === 0
                ? "Your shelf is empty — add your first book."
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
                ownedIds={new Set(books.map((b) => b.google_books_id).filter(Boolean) as string[])}
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
      <h2 className="font-serif text-2xl font-semibold mb-2">A shelf waiting to be filled</h2>
      <p className="text-muted-foreground max-w-sm mx-auto mb-6">
        Search by title or ISBN to add books from your collection.
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
          // eslint-disable-next-line @next/next/no-img-element
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
  ownedIds,
}: {
  onAdded: () => void;
  ownedIds: Set<string>;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12`,
      );
      const data = await res.json();
      setResults(data.items ?? []);
      if (!data.items?.length) toast.info("No books found — try another query");
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const addBook = async (item: GoogleBookResult) => {
    if (!user) return;
    setAdding(item.id);
    const info = item.volumeInfo;
    const isbn =
      info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ??
      info.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier ??
      null;
    const cover = info.imageLinks?.thumbnail?.replace("http://", "https://") ?? null;

    const { error } = await supabase.from("books").insert({
      owner_id: user.id,
      title: info.title ?? "Untitled",
      author: info.authors?.join(", ") ?? null,
      isbn,
      cover_image: cover,
      google_books_id: item.id,
    });
    setAdding(null);

    if (error) {
      toast.error("Couldn't add book");
      return;
    }
    toast.success(`Added "${info.title}" to your shelf`);
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
              const info = item.volumeInfo;
              const owned = ownedIds.has(item.id);
              return (
                <li key={item.id} className="flex gap-3 py-3 items-start">
                  <div className="w-12 h-16 flex-shrink-0 bg-muted rounded-sm overflow-hidden">
                    {info.imageLinks?.smallThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={info.imageLinks.smallThumbnail.replace("http://", "https://")}
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
                    <p className="font-medium text-sm leading-tight line-clamp-2">
                      {info.title ?? "Untitled"}
                    </p>
                    {info.authors && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {info.authors.join(", ")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={owned ? "outline" : "default"}
                    disabled={owned || adding === item.id}
                    onClick={() => addBook(item)}
                  >
                    {adding === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : owned ? (
                      "On shelf"
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Add
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
