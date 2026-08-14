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
  const [pendingTxId, setPendingTxId] = useState<string | null>(null);
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
    setPendingTxId(null);
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
        if (cancelled) return;
        setRequestSent(Boolean(data));
        setPendingTxId(data?.id ?? null);
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
    if (!pendingTxId) {
      toast.error("No pending request to cancel");
      return;
    }

    setIsRequesting(true);
    setRequestSent(false);

    try {
      const { error } = await supabase.rpc("cancel_borrow_request", {
        _transaction_id: pendingTxId,
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
          className="w-[320px] bg-card rounded-2xl overflow-hidden shadow-2xl pointer-events-auto border border-border animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Book Cover - Compact */}
          <div className="relative bg-muted rounded-t-2xl flex items-center justify-center py-3">
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
                  className="h-9 border-border bg-background text-sm text-foreground"
                  aria-label="Book title"
                />
                <Input
                  value={editAuthor}
                  onChange={(event) => setEditAuthor(event.target.value)}
                  maxLength={200}
                  placeholder="Author"
                  className="h-9 border-border bg-background text-sm text-foreground"
                  aria-label="Book author"
                />
              </div>
            ) : (
              <div className="mb-3 mt-2">
                <h3 className="font-serif font-semibold text-foreground text-base line-clamp-2">
                  {book.title}
                </h3>
                {book.author && <p className="text-muted-foreground text-xs mt-1">{book.author}</p>}
              </div>
            )}

            {/* Owner Info - Compact Row */}
            {!isMine && (
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-primary/30 text-primary flex items-center justify-center flex-shrink-0 text-[10px]">
                  <User className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">Shared by</p>
                  <p className="text-xs font-medium text-foreground truncate">
                    {book.owner_name || "Owner"}
                  </p>
                </div>
              </div>
            )}

            {isMine && !isEditing && (
              <div className="text-xs text-muted-foreground mb-4">This is your book</div>
            )}

            {/* Action Button */}
            {!isMine ? (
              <Button
                onClick={handleRequestButtonClick}
                disabled={isRequesting}
                className={`w-full h-9 text-sm font-semibold transition-all duration-300 ${
                  requestSent
                    ? "bg-muted text-foreground hover:bg-accent"
                    : "bg-primary hover:bg-primary/90"
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
                      className="h-9 border-border bg-card text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving || !onEdit}
                      className="h-9 bg-primary text-sm font-semibold hover:bg-primary/90"
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
                      className="h-9 border-border bg-card text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemove}
                      disabled={!onRemove || isRemoving}
                      className="h-9 border-red-200 bg-red-50 text-sm text-red-700 hover:bg-red-100 hover:text-red-800"
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
