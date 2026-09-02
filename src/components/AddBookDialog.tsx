import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { searchOpenLibrary, inferGenre, type OLBook } from "@/lib/openLibrary";

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: () => void | Promise<void>;
}

interface OwnedBookRow {
  isbn: string | null;
  google_books_id: string | null;
}

export function AddBookDialog({ open, onOpenChange, onAdded }: AddBookDialogProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OLBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [ownedIsbns, setOwnedIsbns] = useState<Set<string>>(new Set());
  const [ownedExtIds, setOwnedExtIds] = useState<Set<string>>(new Set());

  const fetchOwnedBooks = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("books")
      .select("isbn, google_books_id")
      .eq("owner_id", user.id);

    const rows = (data ?? []) as OwnedBookRow[];
    setOwnedIsbns(new Set(rows.map((book) => book.isbn).filter(Boolean) as string[]));
    setOwnedExtIds(new Set(rows.map((book) => book.google_books_id).filter(Boolean) as string[]));
  }, [user]);

  useEffect(() => {
    if (open) {
      fetchOwnedBooks();
      return;
    }

    setQuery("");
    setResults([]);
    setSearching(false);
    setAdding(null);
  }, [fetchOwnedBooks, open]);

  const isOwned = (item: OLBook) =>
    (item.isbn && ownedIsbns.has(item.isbn)) || ownedExtIds.has(item.id);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setSearching(true);
    try {
      const items = await searchOpenLibrary(trimmedQuery, 12);
      setResults(items);
      if (!items.length) toast.info("No books found. Try another query.");
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const addBook = async (item: OLBook) => {
    if (!user) return;

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
      google_books_id: item.id,
      genre: inferGenre(item.subjects),
    });
    setAdding(null);

    if (error) {
      if (error.code === "23505") {
        toast.info("This book is already on your shelf");
        await fetchOwnedBooks();
        return;
      }
      toast.error("Couldn't add book");
      return;
    }

    if (item.isbn) setOwnedIsbns((current) => new Set(current).add(item.isbn as string));
    setOwnedExtIds((current) => new Set(current).add(item.id));
    toast.success(`Added "${item.title}" to your shelf`);
    onOpenChange(false);
    await onAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add a book</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, author, or ISBN..."
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
            {results.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Search the world's books to fill your shelf.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((item) => {
                  const owned = isOwned(item);
                  const isAdding = adding === item.id;

                  return (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-sm bg-muted">
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">
                          {item.title}
                        </p>
                        {item.authors.length > 0 && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
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
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            Adding...
                          </>
                        ) : owned ? (
                          "On shelf"
                        ) : (
                          <>
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add
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
      </DialogContent>
    </Dialog>
  );
}
