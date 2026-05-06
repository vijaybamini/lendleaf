import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AddBookDialog } from "@/components/AddBookDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookDiscoveryGrid, type Book as GridBook } from "@/components/BookDiscoveryGrid";
import { BookDetailModal, type BookDetail } from "@/components/BookDetailModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — LendLeaf" }] }),
});

interface ProfileRow {
  display_name: string | null;
}

type UserMetadata = {
  avatar_url?: string;
  bio?: string;
  display_name?: string;
  full_name?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
  user_name?: string;
};

const profileBannerUrl =
  "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1600&q=80";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function cleanHandle(value: string) {
  const handle = value.trim().replace(/^@/, "").toLowerCase();
  return handle.replace(/[^a-z0-9._-]/g, "") || "reader";
}

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = Route.useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [books, setBooks] = useState<GridBook[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedBook, setSelectedBook] = useState<BookDetail | null>(null);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);

  const metadata = (user?.user_metadata ?? {}) as UserMetadata;
  const displayName = useMemo(() => {
    return (
      profile?.display_name ??
      metadata.display_name ??
      metadata.full_name ??
      metadata.name ??
      user?.email?.split("@")[0] ??
      "Member"
    );
  }, [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    profile?.display_name,
    user?.email,
  ]);
  const handle = cleanHandle(
    metadata.preferred_username ?? metadata.user_name ?? user?.email?.split("@")[0] ?? displayName,
  );
  const avatarUrl = metadata.avatar_url ?? metadata.picture ?? null;
  const bio =
    metadata.bio ??
    "Obsessed with 19th-century lit. Lending from my personal collection in Hyderabad.";

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, navigate, user]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoadingProfile(true);
    const [profileRes, booksRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("books")
        .select("id, title, author, cover_image, owner_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) toast.error("Couldn't load your profile");
    if (booksRes.error) toast.error("Couldn't load your shelf");

    const loadedProfile = (profileRes.data as ProfileRow | null) ?? null;
    const loadedDisplayName =
      loadedProfile?.display_name ??
      metadata.display_name ??
      metadata.full_name ??
      metadata.name ??
      user.email?.split("@")[0] ??
      "Member";
    const shelfBooks = (booksRes.data ?? []) as GridBook[];

    setProfile(loadedProfile);
    setBooks(shelfBooks.map((book) => ({ ...book, owner_name: loadedDisplayName })));
    setLoadingProfile(false);
  }, [metadata.display_name, metadata.full_name, metadata.name, user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const openBook = (book: GridBook) => {
    setSelectedBook({
      id: book.id,
      title: book.title,
      author: book.author,
      cover_image: book.cover_image,
      owner_id: book.owner_id ?? user?.id ?? "",
      owner_name: book.owner_name ?? displayName,
    });
    setBookModalOpen(true);
  };

  const handleAddToShelf = () => {
    setAddBookOpen(true);
  };

  const handleEditBook = async (
    book: BookDetail,
    updates: { title: string; author: string | null },
  ) => {
    const { data, error } = await supabase
      .from("books")
      .update(updates)
      .eq("id", book.id)
      .eq("owner_id", user.id)
      .select("id, title, author, cover_image, owner_id")
      .single();

    if (error) {
      toast.error(error.message || "Couldn't update book");
      return false;
    }

    const updatedBook: GridBook = {
      ...data,
      owner_name: displayName,
    };

    setBooks((current) => current.map((item) => (item.id === updatedBook.id ? updatedBook : item)));
    setSelectedBook((current) =>
      current?.id === updatedBook.id
        ? {
            ...current,
            title: updatedBook.title,
            author: updatedBook.author,
            cover_image: updatedBook.cover_image,
            owner_id: updatedBook.owner_id ?? user.id,
            owner_name: displayName,
          }
        : current,
    );
    toast.success("Book updated");
    return true;
  };

  const handleRemoveBook = async (book: BookDetail) => {
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", book.id)
      .eq("owner_id", user.id);

    if (error) {
      toast.error(error.message || "Couldn't remove book");
      return false;
    }

    setBooks((current) => current.filter((item) => item.id !== book.id));
    toast.success("Removed from shelf");
    return true;
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="px-3 py-5 sm:px-4 sm:py-8">
        <section className="overflow-hidden border-b border-white/10 pb-5 sm:rounded-xl sm:border sm:bg-card sm:pb-0 sm:shadow-paper">
          <div className="relative">
            <div className="relative aspect-[3/1] overflow-hidden bg-zinc-900">
              <img
                src={profileBannerUrl}
                alt=""
                className="h-full w-full object-cover opacity-75"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070a0f] via-[#070a0f]/20 to-transparent" />
            </div>

            <Button
              type="button"
              size="icon"
              className="fixed right-3 top-[calc(1rem+env(safe-area-inset-top))] z-50 h-11 w-11 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 sm:right-4 sm:top-6 xl:right-[calc((100vw-72rem)/2+1rem)]"
              onClick={handleAddToShelf}
              aria-label="Add book to shelf"
              title="Add book to shelf"
            >
              <Plus className="h-5 w-5" />
            </Button>

            <Avatar className="absolute -bottom-11 left-4 h-24 w-24 border-4 border-[#070a0f] bg-[#070a0f] shadow-xl sm:-bottom-14 sm:left-6 sm:h-28 sm:w-28">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/15 text-2xl font-semibold text-primary sm:text-3xl">
                {initialsOf(displayName)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="px-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16">
            <div className="min-w-0 text-left">
              <h1 className="font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">@{handle}</p>
            </div>

            <div className="mt-5 text-left">
              <ProfileStat label="Books" value={books.length} />
            </div>

            <div className="mt-4 min-w-0 text-left">
              <p className="max-w-xl text-sm leading-6 text-zinc-300">{bio}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <BookDiscoveryGrid
            books={books}
            isLoading={loadingProfile}
            emptyTitle="Your shelf is empty"
            emptyMessage="Your shelf is empty. Add a book to start sharing!"
            emptyActionLabel="Add a book"
            showBrowseLink={false}
            onEmptyAction={handleAddToShelf}
            onBookClick={openBook}
          />
        </section>
      </div>

      <AddBookDialog open={addBookOpen} onOpenChange={setAddBookOpen} onAdded={fetchProfile} />

      <BookDetailModal
        book={selectedBook}
        isOpen={bookModalOpen}
        onEdit={handleEditBook}
        onRemove={handleRemoveBook}
        onClose={() => {
          setBookModalOpen(false);
          setSelectedBook(null);
        }}
      />
    </>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-white">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{label}</div>
    </div>
  );
}
