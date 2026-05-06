import { BookOpen, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
  emptyMessage?: string;
  showBrowseLink?: boolean;
  onBookClick?: (book: Book) => void;
}

export function BookDiscoveryGrid({
  books,
  isLoading = false,
  emptyMessage = "No books found",
  showBrowseLink = true,
  onBookClick,
}: BookDiscoveryGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" strokeWidth={1.5} />
        <p className="text-muted-foreground">{emptyMessage}</p>
        {showBrowseLink && (
          <Link
            to="/browse"
            className="mt-4 text-sm text-primary hover:underline font-medium"
          >
            Browse all books →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {books.map((book) => (
        <div
          key={book.id}
          onClick={() => onBookClick?.(book)}
          className="group relative overflow-hidden rounded-sm sm:rounded-md bg-muted aspect-[2/3] cursor-pointer"
        >
          {book.cover_image ? (
            <img
              src={book.cover_image}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-2 sm:p-3">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary/60 mb-1 sm:mb-2" />
              <p className="text-[10px] sm:text-xs font-medium text-primary/80 text-center line-clamp-2">
                {book.title}
              </p>
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

          {/* Book info on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-sm p-2 sm:p-3 flex flex-col justify-end">
            <p className="text-white text-xs sm:text-sm font-semibold line-clamp-2">
              {book.title}
            </p>
            {book.author && (
              <p className="text-zinc-300 text-[10px] sm:text-xs line-clamp-1">
                {book.author}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
