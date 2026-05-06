import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart,
  MessageCircle,
  Loader2,
  BookOpen,
  Send,
  Hash,
  Trash2,
  ImagePlus,
  X as XIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ProfileLite {
  id: string;
  display_name: string | null;
}

interface BookLite {
  id: string;
  title: string;
  author: string | null;
  cover_image: string | null;
}

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  book_id: string | null;
  tagged_book_title: string | null;
  tagged_book_author: string | null;
  hashtags: string[];
  image_url: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface FeedPost extends PostRow {
  author: ProfileLite | null;
  book: BookLite | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w-]+/g) ?? [];
  const tags = matches.map((t) => t.slice(1).toLowerCase());
  return Array.from(new Set(tags));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function renderContent(text: string, onTagClick: (tag: string) => void) {
  const parts = text.split(/(#[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1).toLowerCase();
      return (
        <button
          key={i}
          onClick={() => onTagClick(tag)}
          className="text-primary hover:underline font-medium"
        >
          {part}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, { items: CommentRow[]; authors: Record<string, ProfileLite> }>
  >({});

  // Composer state
  const [newContent, setNewContent] = useState("");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [myBooks, setMyBooks] = useState<BookLite[]>([]);
  const [selectedShelfBookId, setSelectedShelfBookId] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [bookToolsOpen, setBookToolsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data: postData, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.log(error);
      toast.error("Couldn't load posts");
      setLoading(false);
      return;
    }

    const postRows = (postData ?? []) as PostRow[];

    const authorIds = Array.from(new Set(postRows.map((p) => p.author_id)));
    const bookIds = Array.from(
      new Set(postRows.map((p) => p.book_id).filter((b): b is string => !!b)),
    );

    const [authorsRes, booksRes, likesRes, commentsRes] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", authorIds)
        : Promise.resolve({ data: [] as ProfileLite[] }),
      bookIds.length
        ? supabase
            .from("books")
            .select("id, title, author, cover_image")
            .in("id", bookIds)
        : Promise.resolve({ data: [] as BookLite[] }),
      supabase.from("post_likes").select("post_id, user_id"),
      supabase.from("post_comments").select("post_id"),
    ]);

    const authorMap: Record<string, ProfileLite> = {};
    (authorsRes.data ?? []).forEach((a) => (authorMap[a.id] = a));

    const bookMap: Record<string, BookLite> = {};
    (booksRes.data ?? []).forEach((b) => (bookMap[b.id] = b));

    const likeCount: Record<string, number> = {};
    const likedSet = new Set<string>();
    (likesRes.data ?? []).forEach((l) => {
      likeCount[l.post_id] = (likeCount[l.post_id] ?? 0) + 1;
      if (user && l.user_id === user.id) likedSet.add(l.post_id);
    });

    const commentCount: Record<string, number> = {};
    (commentsRes.data ?? []).forEach((c) => {
      commentCount[c.post_id] = (commentCount[c.post_id] ?? 0) + 1;
    });

    const enriched: FeedPost[] = postRows.map((p) => ({
      ...p,
      author: authorMap[p.author_id] ?? null,
      book: p.book_id ? bookMap[p.book_id] ?? null : null,
      likeCount: likeCount[p.id] ?? 0,
      likedByMe: likedSet.has(p.id),
      commentCount: commentCount[p.id] ?? 0,
    }));

    setPosts(enriched);
    setLoading(false);
  }, [user]);

  const fetchMyBooks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("books")
      .select("id, title, author, cover_image")
      .eq("owner_id", user.id);
    setMyBooks((data ?? []) as BookLite[]);
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchMyBooks();
  }, [fetchMyBooks]);

  const visiblePosts = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.hashtags.includes(activeTag));
  }, [posts, activeTag]);

  const trendingTags = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) =>
      p.hashtags.forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)),
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);
  }, [posts]);

  const handleImagePick = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setComposerOpen(true);
  };

  const clearComposer = () => {
    setNewContent("");
    setNewBookTitle("");
    setNewBookAuthor("");
    setSelectedShelfBookId("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setComposerOpen(false);
    setBookToolsOpen(false);
  };

  const handlePost = async () => {
    if (!user) return;
    const content = newContent.trim();
    if (!content && !imageFile) {
      toast.error("Write something or add an image first");
      return;
    }
    if (content.length > 2000) {
      toast.error("Posts must be under 2000 characters");
      return;
    }
    setPosting(true);

    let book_id: string | null = null;
    let tagged_book_title: string | null = null;
    let tagged_book_author: string | null = null;

    if (selectedShelfBookId) {
      const sb = myBooks.find((b) => b.id === selectedShelfBookId);
      if (sb) {
        book_id = sb.id;
        tagged_book_title = sb.title;
        tagged_book_author = sb.author;
      }
    } else if (newBookTitle.trim()) {
      tagged_book_title = newBookTitle.trim().slice(0, 200);
      tagged_book_author = newBookAuthor.trim().slice(0, 200) || null;
    }

    const hashtags = extractHashtags(content);

    // Upload image if present
    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type,
        });
      if (upErr) {
        setPosting(false);
        toast.error(upErr.message || "Couldn't upload image");
        return;
      }
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
      image_url = pub.publicUrl;
    }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content,
      book_id,
      tagged_book_title,
      tagged_book_author,
      hashtags,
      image_url,
    });

    setPosting(false);
    if (error) {
      toast.error(error.message || "Couldn't post");
      return;
    }
    clearComposer();
    toast.success("Posted!");
    fetchPosts();
  };

  const handleLike = async (post: FeedPost) => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }
    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likedByMe ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p,
      ),
    );
    if (post.likedByMe) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
      if (error) {
        toast.error("Couldn't unlike");
        fetchPosts();
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: user.id });
      if (error) {
        toast.error("Couldn't like");
        fetchPosts();
      }
    }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const items = (data ?? []) as CommentRow[];
    const authorIds = Array.from(new Set(items.map((c) => c.author_id)));
    const authors: Record<string, ProfileLite> = {};
    if (authorIds.length) {
      const { data: ad } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", authorIds);
      (ad ?? []).forEach((a) => (authors[a.id] = a));
    }
    setCommentsByPost((prev) => ({ ...prev, [postId]: { items, authors } }));
  };

  const toggleComments = (postId: string) => {
    if (openCommentsFor === postId) {
      setOpenCommentsFor(null);
    } else {
      setOpenCommentsFor(postId);
      if (!commentsByPost[postId]) loadComments(postId);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    if (!user) return;
    const content = text.trim();
    if (!content) return;
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: user.id, content });
    if (error) {
      toast.error("Couldn't add comment");
      return;
    }
    await loadComments(postId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
      ),
    );
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success("Post deleted");
  };

  const viewerName = user
    ? ((user.user_metadata as { display_name?: string })?.display_name ??
      user.email ??
      "?")
    : "?";
  const viewerInitial = viewerName.slice(0, 1).toUpperCase();
  const hasBookDraft = Boolean(
    selectedShelfBookId || newBookTitle.trim() || newBookAuthor.trim(),
  );
  const composerHasDraft = Boolean(newContent.trim() || imageFile || hasBookDraft);
  const composerExpanded = composerOpen || composerHasDraft;
  const showBookTools = bookToolsOpen || hasBookDraft;

  return (
    <div className="grid grid-cols-1 gap-0 sm:gap-5 lg:grid-cols-[1fr_240px] lg:gap-6">
      <div className="space-y-0 sm:space-y-5">
        {trendingTags.length > 0 && (
          <div className="border-b border-border/70 bg-background px-3 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTag(null)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  !activeTag
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                For you
              </button>
              {trendingTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(t === activeTag ? null : t)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    t === activeTag
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Composer */}
        {user ? (
          <div className="border-b border-border bg-card p-3 sm:rounded-xl sm:border sm:p-4 sm:shadow-paper">
            {!composerExpanded && (
              <div className="flex items-center gap-3 sm:hidden">
                
              </div>
            )}

           

            <div className={composerExpanded ? "block" : "hidden sm:block"}>
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {viewerInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <Textarea
                      placeholder="What's on your mind? Use #tags for topics."
                      value={newContent}
                      onFocus={() => setComposerOpen(true)}
                      onChange={(e) => {
                        setComposerOpen(true);
                        setNewContent(e.target.value);
                      }}
                      className="min-h-[96px] resize-none border-0 px-0 text-base shadow-none focus-visible:ring-0 sm:min-h-[70px]"
                      maxLength={2000}
                    />
                    {!composerHasDraft && (
                      <button
                        type="button"
                        onClick={() => setComposerOpen(false)}
                        className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                        aria-label="Close composer"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`mt-2 grid-cols-1 gap-2 sm:grid sm:grid-cols-2 ${
                      showBookTools ? "grid" : "hidden"
                    }`}
                  >
                    {myBooks.length > 0 && (
                      <select
                        value={selectedShelfBookId}
                        onChange={(e) => {
                          setBookToolsOpen(true);
                          setSelectedShelfBookId(e.target.value);
                          if (e.target.value) {
                            setNewBookTitle("");
                            setNewBookAuthor("");
                          }
                        }}
                        className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="">Tag a book from your shelf...</option>
                        {myBooks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.title}
                          </option>
                        ))}
                      </select>
                    )}
                    {!selectedShelfBookId && (
                      <>
                        <Input
                          placeholder="Or tag any book title..."
                          value={newBookTitle}
                          onFocus={() => setBookToolsOpen(true)}
                          onChange={(e) => setNewBookTitle(e.target.value)}
                          maxLength={200}
                        />
                        {newBookTitle && (
                          <Input
                            placeholder="Author (optional)"
                            value={newBookAuthor}
                            onFocus={() => setBookToolsOpen(true)}
                            onChange={(e) => setNewBookAuthor(e.target.value)}
                            maxLength={200}
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Image preview */}
                  {imagePreview && (
                    <div className="relative mt-3 overflow-hidden rounded-xl border bg-muted">
                      <img
                        src={imagePreview}
                        alt="Selected"
                        className="max-h-80 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleImagePick(null)}
                        className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow hover:bg-background"
                        aria-label="Remove image"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setComposerOpen(true);
                          fileInputRef.current?.click();
                        }}
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        title="Add image"
                        aria-label="Add image"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookToolsOpen((open) => !open)}
                        className={`flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors sm:hidden ${
                          showBookTools
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-primary"
                        }`}
                        aria-expanded={showBookTools}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Book</span>
                      </button>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {newContent.length}/2000
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {composerHasDraft && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={clearComposer}
                          disabled={posting}
                          className="rounded-full px-3"
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handlePost}
                        disabled={posting || (!newContent.trim() && !imageFile)}
                        className="rounded-full px-5"
                      >
                        {posting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1.5" /> Post
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b border-border bg-card p-4 text-sm text-muted-foreground flex items-center justify-between flex-wrap gap-3 sm:rounded-xl sm:border sm:shadow-paper">
            <span>Join the conversation — sign in to share your thoughts.</span>
            <div className="flex gap-2">
              <Link to="/login">
                <Button size="sm" variant="outline">
                  Sign in
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Join</Button>
              </Link>
            </div>
          </div>
        )}

        {activeTag && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filtering by</span>
            <span className="font-medium text-primary">#{activeTag}</span>
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="border-y border-border bg-card py-14 px-6 text-center sm:rounded-xl sm:border sm:py-16 sm:shadow-paper">
            <MessageCircle
              className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4"
              strokeWidth={1.25}
            />
            <h2 className="font-serif text-2xl font-semibold mb-2">
              {activeTag ? `No posts tagged #${activeTag}` : "No posts yet"}
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {activeTag
                ? "Be the first to write about this topic."
                : "Be the first to share your thoughts with the community."}
            </p>
          </div>
        ) : (
          <ul className="space-y-0 sm:space-y-5">
            {visiblePosts.map((post) => {
              const isMine = user?.id === post.author_id;
              const displayName = post.author?.display_name ?? "Member";
              const initials = displayName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const commentsState = commentsByPost[post.id];
              return (
                <li
                  key={post.id}
                  className="border-b border-border bg-card sm:rounded-xl sm:border sm:shadow-paper sm:overflow-hidden sm:hover:shadow-md sm:transition-shadow"
                >
                  <article className="flex gap-3 px-3 py-4 sm:px-5">
                    <div className="flex flex-shrink-0 flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center font-semibold text-sm ring-2 ring-background">
                        {initials}
                      </div>
                      {openCommentsFor === post.id && (
                        <div className="mt-3 w-px flex-1 bg-border" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-tight">
                            <span className="font-semibold">{displayName}</span>
                            <span className="mx-1 text-muted-foreground">-</span>
                            <span className="text-muted-foreground">
                              {timeAgo(post.created_at)}
                            </span>
                          </p>
                        </div>

                        {isMine ? (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="-mr-2 -mt-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                            aria-label="Delete post"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      {post.content && (
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed sm:text-base">
                          {renderContent(post.content, (t) => setActiveTag(t))}
                        </p>
                      )}

                      {post.image_url && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted">
                          <img
                            src={post.image_url}
                            alt=""
                            className="max-h-[520px] w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {(post.book || post.tagged_book_title) && (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/35 p-2.5">
                          <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-sm bg-muted shadow-book sm:h-16 sm:w-11">
                            {post.book?.cover_image ? (
                              <img
                                src={post.book.cover_image}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-primary/10">
                                <BookOpen className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5" />
                              Tagged book
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-sm font-semibold leading-tight">
                              {post.book?.title ?? post.tagged_book_title}
                            </p>
                            {(post.book?.author ?? post.tagged_book_author) && (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                by {post.book?.author ?? post.tagged_book_author}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {post.hashtags.length > 0 && (
                        <div className="mt-3 flex gap-1.5 overflow-x-auto sm:flex-wrap">
                          {post.hashtags.slice(0, 6).map((t) => (
                            <button
                              key={t}
                              onClick={() => setActiveTag(t === activeTag ? null : t)}
                              className="whitespace-nowrap rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              #{t}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex max-w-xs items-center justify-between text-muted-foreground">
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex min-h-9 items-center gap-2 rounded-full px-2 transition-colors hover:bg-muted hover:text-primary"
                          aria-label="Comments"
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span className="text-sm font-medium tabular-nums">
                            {post.commentCount}
                          </span>
                        </button>
                        <button
                          onClick={() => handleLike(post)}
                          className={`flex min-h-9 items-center gap-2 rounded-full px-2 transition-colors hover:bg-muted ${
                            post.likedByMe ? "text-rose-500" : "hover:text-rose-500"
                          }`}
                          aria-label="Like"
                        >
                          <Heart
                            className={`h-5 w-5 transition-transform ${
                              post.likedByMe ? "fill-current scale-110" : ""
                            }`}
                          />
                          <span className="text-sm font-medium tabular-nums">
                            {post.likeCount}
                          </span>
                        </button>
                        {user && !isMine ? (
                          <Link
                            to="/messages"
                            search={{ to: post.author_id }}
                            className="flex min-h-9 items-center gap-2 rounded-full px-2 transition-colors hover:bg-muted hover:text-primary"
                            aria-label={`Message ${displayName}`}
                            title={`Message ${displayName}`}
                          >
                            <MessageSquare className="h-5 w-5" />
                            <span className="sr-only">Message</span>
                          </Link>
                        ) : (
                          <span className="h-9 w-9" aria-hidden="true" />
                        )}
                      </div>

                      {openCommentsFor === post.id && (
                        <div className="mt-2 space-y-3 rounded-xl bg-muted/35 p-3">
                          {!commentsState ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <>
                              {commentsState.items.length === 0 ? (
                                <p className="py-2 text-center text-xs text-muted-foreground">
                                  No comments yet. Be the first.
                                </p>
                              ) : (
                                <ul className="space-y-3">
                                  {commentsState.items.map((c) => (
                                    <li key={c.id} className="flex gap-2 text-sm">
                                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-semibold flex-shrink-0">
                                        {(commentsState.authors[c.author_id]
                                          ?.display_name ?? "?")
                                          .slice(0, 1)
                                          .toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0 rounded-2xl bg-background px-3 py-2">
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-sm font-semibold">
                                            {commentsState.authors[c.author_id]
                                              ?.display_name ?? "Member"}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {timeAgo(c.created_at)}
                                          </span>
                                        </div>
                                        <p className="whitespace-pre-wrap break-words text-sm">
                                          {c.content}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {user ? (
                                <CommentBox
                                  onSubmit={(text) => handleAddComment(post.id, text)}
                                />
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  <Link to="/login" className="underline">
                                    Sign in
                                  </Link>{" "}
                                  to comment.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sidebar */}
      <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block self-start">
        <div className="paper-card rounded-xl p-4">
          <h3 className="font-serif font-semibold flex items-center gap-1.5 mb-3">
            <Hash className="h-4 w-4" /> Trending topics
          </h3>
          {trendingTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No topics yet — add #tags to your post to start one.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {trendingTags.map((t) => (
                <li key={t}>
                  <button
                    onClick={() => setActiveTag(t === activeTag ? null : t)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      t === activeTag
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    #{t}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function CommentBox({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Write a comment…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && text.trim()) {
            e.preventDefault();
            setSubmitting(true);
            onSubmit(text).finally(() => {
              setSubmitting(false);
              setText("");
            });
          }
        }}
      />
      <Button
        size="sm"
        disabled={!text.trim() || submitting}
        onClick={() => {
          setSubmitting(true);
          onSubmit(text).finally(() => {
            setSubmitting(false);
            setText("");
          });
        }}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
      </Button>
    </div>
  );
}
