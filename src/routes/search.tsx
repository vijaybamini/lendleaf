import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { SearchHeader } from "@/components/headers/SearchHeader";
import { BookDiscoveryGrid } from "@/components/BookDiscoveryGrid";
import { BookDetailModal, type BookDetail } from "@/components/BookDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useUserLocation } from "@/hooks/use-location";
import { GENRES } from "@/lib/openLibrary";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string; genre?: string; km?: number } => {
    const kmValue =
      typeof search.km === "number"
        ? search.km
        : typeof search.km === "string"
          ? Number(search.km)
          : NaN;
    return {
      q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
      genre:
        typeof search.genre === "string" && search.genre.length > 0 ? search.genre : undefined,
      km: Number.isFinite(kmValue) && kmValue > 0 ? kmValue : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Search — LendLeaf" }] }),
});

interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  owner_id?: string;
  owner_name?: string | null;
  genre?: string;
}

function SearchPage() {
  const { user } = useAuth();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { location, loading: locLoading, error: locError, detect, clear } = useUserLocation();
  const [q, setQ] = useState(search.q ?? "");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch books and apply text + genre + nearby filters client-side
  const fetchBooks = useCallback(
    async (query: string, genre: string | null, km: number | null) => {
      setIsLoading(true);
      try {
        let queryBuilder = supabase
          .from("books")
          .select("id, title, author, cover_image, owner_id, genre")
          .order("created_at", { ascending: false })
          .limit(100);

        if (user) queryBuilder = queryBuilder.neq("owner_id", user.id);

        const { data, error } = await queryBuilder;
        if (error) {
          toast.error("Couldn't load books");
          setBooks([]);
          return;
        }

        let list = (data ?? []) as Book[];

        if (query.trim()) {
          const term = query.toLowerCase();
          list = list.filter(
            (b) =>
              b.title.toLowerCase().includes(term) ||
              (b.author && b.author.toLowerCase().includes(term)),
          );
        }

        if (genre) {
          list = list.filter((b) => b.genre === genre);
        }

        if (km) {
          if (!location) {
            setBooks([]);
            return;
          }
          const { data: distData, error: distErr } = await supabase.rpc(
            "nearby_book_distances",
            {
              _lat: location.lat,
              _lng: location.lng,
            },
          );
          if (distErr) {
            toast.error("Couldn't load nearby books");
            setBooks([]);
            return;
          }
          const distMap = new Map((distData ?? []).map((d) => [d.book_id, d.distance_km] as const));
          list = list.filter((b) => {
            const d = distMap.get(b.id);
            return typeof d === "number" && d <= km;
          });
        }

        const withOwnerNames = await enrichBooksWithOwnerNames(list);
        setBooks(withOwnerNames);
      } catch (err) {
        console.error("Search error:", err);
        setBooks([]);
      } finally {
        setIsLoading(false);
      }
    },
    [user, location],
  );

  // Helper function to enrich books with owner names
  const enrichBooksWithOwnerNames = async (booksToEnrich: Book[]): Promise<Book[]> => {
    const ownerIds = Array.from(new Set(booksToEnrich.map((b) => b.owner_id).filter(Boolean)));

    if (ownerIds.length === 0) return booksToEnrich;

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds as string[]);

    if (error || !profiles) return booksToEnrich;

    const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

    return booksToEnrich.map((book) => ({
      ...book,
      owner_name: book.owner_id ? profileMap.get(book.owner_id) : null,
    }));
  };

  // Fetch books when query or filters change
  useEffect(() => {
    fetchBooks(search.q ?? "", search.genre ?? null, search.km ?? null);
  }, [search.q, search.genre, search.km, fetchBooks]);

  const submit = (value: string) => {
    navigate({
      to: "/search",
      search: () => ({
        q: value.trim() || undefined,
        genre: search.genre,
        km: search.km,
      }),
    });
  };

  const handleFiltersChange = (filters: { genre: string | null; km: number | null }) => {
    navigate({
      to: "/search",
      search: () => ({
        q: q.trim() || undefined,
        genre: filters.genre ?? undefined,
        km: filters.km ?? undefined,
      }),
    });
  };

  const handleDetectLocation = async () => {
    const loc = await detect();
    if (loc) toast.success(loc.label ? `Location set: ${loc.label}` : "Location set");
    else if (locError) toast.error(locError);
  };

  const handleBookClick = (book: Book) => {
    // Convert Book to BookDetail
    const bookDetail: BookDetail = {
      id: book.id,
      title: book.title,
      author: book.author,
      cover_image: book.cover_image,
      owner_id: book.owner_id || "",
      owner_name: book.owner_name,
      genre: book.genre,
    };
    setSelectedBook(bookDetail);
    setIsModalOpen(true);
  };

  const hasFilters = !!(search.genre || search.km);
  const nearbyPending = !!search.km && !location;
  const emptyMessage = q
    ? `No books match "${q}"`
    : nearbyPending
      ? "Share your location to see nearby books"
      : hasFilters
        ? "No books match these filters"
        : "No books available";

  return (
    <>
      <SearchHeader
        value={q}
        onChange={setQ}
        onSubmit={submit}
        filters={{ genre: search.genre ?? null, km: search.km ?? null }}
        onFiltersChange={handleFiltersChange}
        genreOptions={[...GENRES]}
        locationLabel={location?.label ?? null}
        locationLoading={locLoading}
        locationError={locError}
        onDetectLocation={handleDetectLocation}
        onClearLocation={clear}
      />
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {/* Location prompt for the nearby filter */}
        {nearbyPending && (
          <div className="mb-4 flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm sm:mb-6">
            <MapPin className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-muted-foreground">
              Share your location to see books within {search.km} km.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDetectLocation}
              disabled={locLoading}
            >
              {locLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Use my location"}
            </Button>
          </div>
        )}

        {/* Section header */}
        {hasFilters ? (
          <div className="mb-4 px-0 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              {q
                ? `Results for "${q}"`
                : search.km
                  ? `Books within ${search.km} km`
                  : "Filtered Books"}
            </h2>
            {!nearbyPending && (
              <p className="text-sm text-muted-foreground mt-1">
                Found {books.length} book{books.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        ) : q ? (
          <div className="mb-4 px-0 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Results for "{q}"
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Found {books.length} book{books.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <div className="mb-4 px-0 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Trending Books</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Popular books in the Lend Leaf community
            </p>
          </div>
        )}

        {/* Book Grid */}
        <BookDiscoveryGrid
          books={books}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          showBrowseLink={false}
          onBookClick={handleBookClick}
        />
      </main>

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBook(null);
        }}
      />
    </>
  );
}
