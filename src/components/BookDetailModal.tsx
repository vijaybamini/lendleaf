import { useEffect, useState } from "react";
import { X, User, BookOpen, Pencil, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  onEdit?: (
    book: BookDetail,
    updates: { title: string; author: string | null },
  ) => Promise<boolean | void> | boolean | void;
  onRemove?: (book: BookDetail) => Promise<boolean | void> | boolean | void;
}

export function BookDetailModal({ book, onClose, isOpen, onEdit, onRemove }: BookDetailModalProps) {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!book || !isOpen) return;
    let cancelled = false;

    setEditTitle(book.title);
    setEditAuthor(book.author ?? "");
    setIsEditing(false);
    setIsRequesting(false);
    setRequestSent(false);
    setIsSaving(false);
    setIsRemoving(false);

    if (!user || user.id === book.owner_id) return;

    supabase
      .from("transactions")
      .select("id")
      .eq("book_id", book.id)
      .eq("borrower_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRequestSent(Boolean(data));
      });

    return () => {
      cancelled = true;
    };
  }, [book, isOpen, user]);

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
    setRequestSent(true);

    try {
      const { error } = await supabase.rpc("request_borrow", { _book_id: book.id });

      if (error) {
        setRequestSent(false);
        if (error.message?.toLowerCase().includes("already have an open request")) {
          setRequestSent(true);
          toast.info("Request already sent");
          setIsRequesting(false);
          return;
        }
        toast.error(error.message || "Couldn't send request");
        setIsRequesting(false);
        return;
      }

      toast.success(`Request sent to ${book.owner_name || "owner"}!`);
    } catch (err: any) {
      setRequestSent(false);
      toast.error(err.message || "Couldn't send request");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    setIsRequesting(true);
    setRequestSent(false);

    try {
      const { error } = await supabase.rpc("cancel_borrow_request", {
        _book_id: book.id,
      });

      if (error) {
        setRequestSent(true);
        toast.error(error.message || "Couldn't cancel request");
        return;
      }

      toast.success("Request cancelled.");
    } catch (err: any) {
      setRequestSent(true);
      toast.error(err.message || "Couldn't cancel request");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestButtonClick = () => {
    if (requestSent) {
      handleCancelRequest();
      return;
    }
    handleRequestToBorrow();
  };

  const isMine = user?.id === book.owner_id;

  const handleSaveEdit = async () => {
    if (!book || !onEdit) return;
    const title = editTitle.trim();
    const author = editAuthor.trim();

    if (!title) {
      toast.error("Book title is required");
      return;
    }

    setIsSaving(true);
    const result = await onEdit(book, {
      title: title.slice(0, 200),
      author: author ? author.slice(0, 200) : null,
    });
    setIsSaving(false);

    if (result === false) return;
    setIsEditing(false);
  };

  const handleRemove = async () => {
    if (!book || !onRemove) return;
    setIsRemoving(true);
    const result = await onRemove(book);
    setIsRemoving(false);

    if (result === false) return;
    onClose();
  };

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
            {isMine && isEditing ? (
              <div className="mb-3 mt-2 space-y-2">
                <Input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  maxLength={200}
                  className="h-9 border-zinc-700 bg-zinc-950 text-sm text-white"
                  aria-label="Book title"
                />
                <Input
                  value={editAuthor}
                  onChange={(event) => setEditAuthor(event.target.value)}
                  maxLength={200}
                  placeholder="Author"
                  className="h-9 border-zinc-700 bg-zinc-950 text-sm text-white"
                  aria-label="Book author"
                />
              </div>
            ) : (
              <div className="mb-3 mt-2">
                <h3 className="font-serif font-semibold text-white text-base line-clamp-2">
                  {book.title}
                </h3>
                {book.author && <p className="text-zinc-400 text-xs mt-1">{book.author}</p>}
              </div>
            )}

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

            {isMine && !isEditing && (
              <div className="text-xs text-zinc-400 mb-4">This is your book</div>
            )}

            {/* Action Button */}
            {!isMine ? (
              <Button
                onClick={handleRequestButtonClick}
                disabled={isRequesting}
                className={`w-full h-9 text-sm font-semibold transition-all duration-300 ${
                  requestSent
                    ? "bg-zinc-700 hover:bg-zinc-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isRequesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : requestSent ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Cancel Request
                  </>
                ) : (
                  "Request to Borrow"
                )}
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditTitle(book.title);
                        setEditAuthor(book.author ?? "");
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                      className="h-9 border-zinc-700 bg-zinc-800/50 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving || !onEdit}
                      className="h-9 bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      disabled={!onEdit || isRemoving}
                      className="h-9 border-zinc-700 bg-zinc-800/50 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemove}
                      disabled={!onRemove || isRemoving}
                      className="h-9 border-red-900/70 bg-red-950/30 text-sm text-red-200 hover:bg-red-950/60 hover:text-red-100"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remove
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
