import { BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  owner_id?: string;
  owner_name?: string | null;
  genre?: string;
}

interface BookDiscoveryGridProps {
  books: Book[];
  isLoading?: boolean;
  variant?: "default" | "library";
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  showBrowseLink?: boolean;
  onEmptyAction?: () => void;
  onBookClick?: (book: Book) => void;
}

export function BookDiscoveryGrid({
  books,
  isLoading = false,
  variant = "default",
  emptyTitle,
  emptyMessage = "No books found",
  emptyActionLabel,
  showBrowseLink = true,
  onEmptyAction,
  onBookClick,
}: BookDiscoveryGridProps) {
  const isLibrary = variant === "library";
  const gridClass = "grid grid-cols-3 gap-px";
  const itemClass = "group relative aspect-[2/3] cursor-pointer overflow-hidden bg-muted";

  if (isLoading) {
    return (
      <div className={gridClass} aria-label="Loading books">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="aspect-[2/3] animate-pulse bg-muted" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center px-4 py-20 text-center ${
          isLibrary ? "rounded-xl border border-border bg-card shadow-paper" : ""
        }`}
      >
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-md ${
            isLibrary
              ? "bg-secondary text-secondary-foreground ring-1 ring-border"
              : "text-muted-foreground/40"
          }`}
        >
          <BookOpen className="h-8 w-8" strokeWidth={1.5} />
        </div>
        {emptyTitle && (
          <h2 className="font-serif text-2xl font-semibold text-foreground">{emptyTitle}</h2>
        )}
        <p className={`max-w-sm text-muted-foreground ${emptyTitle ? "mt-2" : ""}`}>
          {emptyMessage}
        </p>
        {onEmptyAction && emptyActionLabel && (
          <Button type="button" onClick={onEmptyAction} className="mt-6">
            {emptyActionLabel}
          </Button>
        )}
        {showBrowseLink && (
          <Link to="/search" className="mt-4 text-sm text-primary hover:underline font-medium">
            Browse all books →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {books.map((book) => (
        <div key={book.id} onClick={() => onBookClick?.(book)} className={itemClass}>
          {book.cover_image ? (
            <img
              src={book.cover_image}
              alt={book.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 ${
                isLibrary
                  ? "bg-gradient-to-br from-secondary via-card to-muted"
                  : "bg-gradient-to-br from-primary/20 to-primary/5"
              }`}
            >
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary/60 mb-1 sm:mb-2" />
              <p className="text-[10px] sm:text-xs font-medium text-primary/80 text-center line-clamp-2">
                {book.title}
              </p>
            </div>
          )}

          {isLibrary && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-black/35 via-white/10 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0.08)_18%,rgba(255,255,255,0)_42%)] opacity-30 mix-blend-screen" />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
            </>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-sm p-2 sm:p-3 flex flex-col justify-end">
            <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2">{book.title}</p>
            {book.author && (
              <p className="text-zinc-300 text-[10px] sm:text-xs line-clamp-1">{book.author}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
