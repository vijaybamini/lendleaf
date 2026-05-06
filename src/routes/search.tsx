import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { SearchHeader } from "@/components/headers/SearchHeader";
import { BookDiscoveryGrid } from "@/components/BookDiscoveryGrid";
import { BookDetailModal, type BookDetail } from "@/components/BookDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
  }),
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
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch books based on search query
  const fetchBooks = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      let result;
      
      if (query.trim()) {
        // Search for specific books
        const searchTerm = query.toLowerCase();
        const { data: searchResults, error } = await supabase
          .from("books")
          .select("id, title, author, cover_image, owner_id")
          .limit(30);

        if (error) {
          toast.error("Couldn't load books");
          setBooks([]);
        } else {
          // Client-side filtering for better UX
          const filtered = (searchResults ?? []).filter((book: Book) =>
            book.title.toLowerCase().includes(searchTerm) ||
            (book.author && book.author.toLowerCase().includes(searchTerm))
          );
          
          // Fetch owner names for filtered books
          const withOwnerNames = await enrichBooksWithOwnerNames(filtered);
          setBooks(withOwnerNames);
        }
      } else {
        // Show trending/popular books (latest books)
        result = await supabase
          .from("books")
          .select("id, title, author, cover_image, owner_id")
          .order("created_at", { ascending: false })
          .limit(30);

        if (result.error) {
          toast.error("Couldn't load books");
          setBooks([]);
        } else {
          // Fetch owner names for result books
          const withOwnerNames = await enrichBooksWithOwnerNames(result.data ?? []);
          setBooks(withOwnerNames);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to enrich books with owner names
  const enrichBooksWithOwnerNames = async (booksToEnrich: Book[]): Promise<Book[]> => {
    const ownerIds = Array.from(new Set(booksToEnrich.map(b => b.owner_id).filter(Boolean)));
    
    if (ownerIds.length === 0) return booksToEnrich;
    
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds as string[]);
    
    if (error || !profiles) return booksToEnrich;
    
    const profileMap = new Map(profiles.map(p => [p.id, p.display_name]));
    
    return booksToEnrich.map(book => ({
      ...book,
      owner_name: book.owner_id ? profileMap.get(book.owner_id) : null,
    }));
  };

  // Fetch books when search query changes
  useEffect(() => {
    fetchBooks(search.q ?? "");
  }, [search.q, fetchBooks]);

  const submit = (value: string) => {
    navigate({
      to: "/search",
      search: () => ({ q: value.trim() || undefined }),
    });
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

  return (
    <>
      <SearchHeader 
        value={q} 
        onChange={setQ}
        onSubmit={submit}
      />
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {/* Section header */}
        {q && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">
              Results for "{q}"
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Found {books.length} book{books.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
        
        {!q && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-100">
              Trending Books
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Popular books in the Lend Leaf community
            </p>
          </div>
        )}

        {/* Book Grid */}
        <BookDiscoveryGrid 
          books={books} 
          isLoading={isLoading}
          emptyMessage={q ? `No books match "${q}"` : "No books available"}
          showBrowseLink={true}
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
