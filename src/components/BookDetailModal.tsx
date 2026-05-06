import { useState } from "react";
import { X, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export interface BookDetail {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  owner_id: string;
  owner_name?: string | null;
  genre?: string;
}

interface BookDetailModalProps {
  book: BookDetail | null;
  onClose: () => void;
  isOpen: boolean;
}

export function BookDetailModal({ book, onClose, isOpen }: BookDetailModalProps) {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  if (!isOpen || !book) return null;

  const handleRequestToBorrow = async () => {
    if (!user) {
      toast.error("Please sign in to request books");
      return;
    }

    if (user.id === book.owner_id) {
      toast.error("You can't request your own book");
      return;
    }

    setIsRequesting(true);

    try {
      // Create a new transaction request
      const { error } = await supabase.from("transactions").insert({
        book_id: book.id,
        borrower_id: user.id,
        lender_id: book.owner_id,
        status: "pending",
      });

      if (error) {
        toast.error(error.message || "Couldn't send request");
        setIsRequesting(false);
        return;
      }

      setRequestSent(true);
      toast.success(`Request sent to ${book.owner_name || "owner"}!`);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setRequestSent(false);
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Couldn't send request");
      setIsRequesting(false);
    }
  };

  const isMine = user?.id === book.owner_id;

  return (
    <>
      {/* Backdrop with Heavy Blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - Centered Floating Card */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        onClick={onClose}
      >
        <div
          className="w-[320px] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl pointer-events-auto border border-zinc-800 animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Book Cover - Compact */}
          <div className="relative bg-black rounded-t-2xl flex items-center justify-center py-3">
            {book.cover_image ? (
              <img
                src={book.cover_image}
                alt={book.title}
                className="w-full max-h-[350px] object-contain"
              />
            ) : (
              <div className="w-full h-40 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <BookOpen className="h-10 w-10 text-primary/60 mb-2" />
                <p className="text-xs text-primary/80 text-center px-3 line-clamp-2">
                  {book.title}
                </p>
              </div>
            )}
          </div>

          {/* Content Section - Compact */}
          <div className="p-4">
            {/* Title and Author */}
            <div className="mb-3 mt-2">
              <h3 className="font-serif font-semibold text-white text-base line-clamp-2">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-zinc-400 text-xs mt-1">
                  {book.author}
                </p>
              )}
            </div>

            {/* Owner Info - Compact Row */}
            {!isMine && (
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-primary/30 text-primary flex items-center justify-center flex-shrink-0 text-[10px]">
                  <User className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-zinc-500">Shared by</p>
                  <p className="text-xs font-medium text-white truncate">
                    {book.owner_name || "Owner"}
                  </p>
                </div>
              </div>
            )}

            {isMine && (
              <div className="text-xs text-zinc-400 mb-4">
                This is your book
              </div>
            )}

            {/* Action Button */}
            {!isMine ? (
              <Button
                onClick={handleRequestToBorrow}
                disabled={isRequesting || requestSent}
                className={`w-full h-9 text-sm font-semibold transition-all duration-300 ${
                  requestSent
                    ? "bg-emerald-600 hover:bg-emerald-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {requestSent ? "✓ Request Sent!" : "Request to Borrow"}
              </Button>
            ) : (
              <Button
                disabled
                variant="outline"
                className="w-full h-9 text-sm border-zinc-700 text-zinc-400 bg-zinc-800/50"
              >
                Your Book
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
