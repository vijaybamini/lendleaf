import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Loader2, Send, MessageCircle, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { MessagesHeader } from "@/components/headers/MessagesHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    to: typeof search.to === "string" && search.to.length > 0 ? search.to : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Messages — LendLeaf" },
      { name: "description", content: "Direct messages with other LendLeaf members." },
    ],
  }),
});

interface ProfileLite {
  id: string;
  display_name: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ConversationSummary {
  partnerId: string;
  partner: ProfileLite | null;
  lastMessage: MessageRow;
  unreadCount: number;
}

function timeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initialsOf(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activePartnerId = search.to ?? null;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [activePartner, setActivePartner] = useState<ProfileLite | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Track which partner's messages are currently loaded, so we don't reload on every conversation refresh
  const loadedPartnerRef = useRef<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, read, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.log(error);
      toast.error("Couldn't load conversations");
      setLoadingConvs(false);
      return;
    }

    const rows = (data ?? []) as MessageRow[];
    const map = new Map<string, ConversationSummary>();

    for (const m of rows) {
      const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const existing = map.get(partnerId);
      if (!existing) {
        map.set(partnerId, {
          partnerId,
          partner: null,
          lastMessage: m,
          unreadCount: m.recipient_id === user.id && !m.read ? 1 : 0,
        });
      } else if (m.recipient_id === user.id && !m.read) {
        existing.unreadCount += 1;
      }
    }

    const partnerIds = Array.from(map.keys());
    if (partnerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", partnerIds);
      (profiles ?? []).forEach((p) => {
        const c = map.get(p.id);
        if (c) c.partner = p;
      });
    }

    setConversations(Array.from(map.values()));
    setLoadingConvs(false);
  }, [user]);

  // Initial conversation load
  useEffect(() => {
    if (user) {
      setLoadingConvs(true);
      loadConversations();
    }
  }, [user, loadConversations]);

  // Load messages when active partner changes — guarded so it only runs on actual partner change
  useEffect(() => {
    if (!user) return;
    if (!activePartnerId) {
      setMessages([]);
      setActivePartner(null);
      loadedPartnerRef.current = null;
      return;
    }
    if (loadedPartnerRef.current === activePartnerId) return;

    let cancelled = false;
    setLoadingMsgs(true);

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, read, created_at")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${activePartnerId}),and(sender_id.eq.${activePartnerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);

      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load messages");
        setLoadingMsgs(false);
        return;
      }
      loadedPartnerRef.current = activePartnerId;
      setMessages((data ?? []) as MessageRow[]);
      setLoadingMsgs(false);

      // Mark unread partner messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", activePartnerId)
        .eq("recipient_id", user.id)
        .eq("read", false);

      loadConversations();
    })();

    // Resolve partner profile from cache or fetch
    const known = conversations.find((c) => c.partnerId === activePartnerId)?.partner;
    if (known) {
      setActivePartner(known);
    } else {
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", activePartnerId)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled && data) setActivePartner(data as ProfileLite);
        });
    }

    return () => {
      cancelled = true;
    };
    // Intentionally exclude `conversations` to avoid reload loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartnerId, user, loadConversations]);

  // Keep the active partner profile in sync once conversations load
  useEffect(() => {
    if (!activePartnerId) return;
    const known = conversations.find((c) => c.partnerId === activePartnerId)?.partner;
    if (known) setActivePartner((prev) => prev ?? known);
  }, [conversations, activePartnerId]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          if (activePartnerId && m.sender_id === activePartnerId) {
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
            supabase.from("messages").update({ read: true }).eq("id", m.id);
          }
          loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          if (activePartnerId && m.recipient_id === activePartnerId) {
            setMessages((prev) => {
              if (prev.some((x) => x.id === m.id)) return prev;
              return [...prev, m];
            });
          }
          loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activePartnerId, loadConversations]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime(),
      ),
    [conversations],
  );

  const handleSend = async () => {
    if (!user || !activePartnerId) return;
    const content = draft.trim();
    if (!content) return;
    if (content.length > 2000) {
      toast.error("Message too long");
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: activePartnerId,
        content,
      })
      .select("*")
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message || "Couldn't send");
      return;
    }
    setMessages((prev) => {
      if (prev.some((m) => m.id === (data as MessageRow).id)) return prev;
      return [...prev, data as MessageRow];
    });
    setDraft("");
    loadConversations();
  };

  if (authLoading || !user) {
    return (
      <>
        <MessagesHeader title="Messages" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <MessagesHeader 
        title={activePartnerId && activePartner ? activePartner.display_name || "User" : "Messages"}
        onBack={activePartnerId ? () => navigate({ to: "/messages" }) : undefined}
      />
      <main className="container mx-auto max-w-5xl px-0 sm:px-4 py-0 sm:py-6">
        <div className="sm:paper-card sm:rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[calc(100dvh-56px-64px)] sm:h-[calc(100dvh-120px-64px)] md:h-[calc(100dvh-120px)]">
          {/* Conversation list — hidden on mobile when a chat is open */}
          <aside
            className={`border-r bg-card flex flex-col ${
              activePartnerId ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h1 className="font-serif text-lg font-semibold">Chats</h1>
            </div>
            {loadingConvs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No conversations yet. Start one from a member's profile or a
                borrow request.
              </div>
            ) : (
              <ul className="divide-y overflow-y-auto flex-1">
                {sortedConversations.map((c) => {
                  const isActive = activePartnerId === c.partnerId;
                  const isMine = c.lastMessage.sender_id === user.id;
                  return (
                    <li key={c.partnerId}>
                      <Link
                        to="/messages"
                        search={{ to: c.partnerId }}
                        className={`flex gap-3 items-center px-4 py-3 hover:bg-muted/40 transition-colors ${
                          isActive ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="h-12 w-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {initialsOf(c.partner?.display_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-semibold text-sm truncate">
                              {c.partner?.display_name ?? "Member"}
                            </p>
                            <span
                              className={`text-[10px] flex-shrink-0 ${
                                c.unreadCount > 0
                                  ? "text-primary font-semibold"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {timeShort(c.lastMessage.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isMine && (
                              <span className="flex-shrink-0 text-muted-foreground">
                                {c.lastMessage.read ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                            <p
                              className={`text-xs truncate flex-1 ${
                                c.unreadCount > 0 && !isMine
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {c.lastMessage.content}
                            </p>
                            {c.unreadCount > 0 && (
                              <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Chat panel */}
          <section
            className={`flex-col min-h-0 ${
              activePartnerId ? "flex" : "hidden md:flex"
            }`}
          >
            {!activePartnerId ? (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground p-6 bg-muted/10">
                <div>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Select a conversation to start chatting.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b bg-card flex-shrink-0">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-1"
                    aria-label="Back"
                  >
                    <Link to="/messages" search={{ to: undefined }}>
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {initialsOf(activePartner?.display_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {activePartner?.display_name ?? "Member"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-1 chat-bg"
                >
                  {loadingMsgs ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-8">
                      Say hi to start the conversation.
                    </p>
                  ) : (
                    messages.map((m, idx) => {
                      const mine = m.sender_id === user.id;
                      const prev = messages[idx - 1];
                      const next = messages[idx + 1];
                      const showDay =
                        !prev ||
                        new Date(m.created_at).toDateString() !==
                          new Date(prev.created_at).toDateString();
                      const isLastOfGroup =
                        !next ||
                        next.sender_id !== m.sender_id ||
                        new Date(next.created_at).getTime() -
                          new Date(m.created_at).getTime() >
                          5 * 60_000;
                      return (
                        <div key={m.id}>
                          {showDay && (
                            <div className="flex justify-center my-3">
                              <span className="text-[10px] uppercase tracking-wide bg-background/80 backdrop-blur px-2.5 py-1 rounded-full text-muted-foreground shadow-sm">
                                {dayLabel(m.created_at)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            } ${isLastOfGroup ? "mb-2" : "mb-0.5"}`}
                          >
                            <div
                              className={`max-w-[78%] px-3 py-1.5 text-sm whitespace-pre-wrap break-words shadow-sm relative ${
                                mine
                                  ? `bg-[var(--chat-mine)] text-foreground ${
                                      isLastOfGroup
                                        ? "rounded-2xl rounded-br-md"
                                        : "rounded-2xl"
                                    }`
                                  : `bg-card text-foreground border ${
                                      isLastOfGroup
                                        ? "rounded-2xl rounded-bl-md"
                                        : "rounded-2xl"
                                    }`
                              }`}
                            >
                              <span>{m.content}</span>
                              <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/80 align-bottom float-right mt-1 -mb-0.5">
                                {timeOnly(m.created_at)}
                                {mine && (
                                  m.read ? (
                                    <CheckCheck className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Composer */}
                <div className="border-t p-2 sm:p-3 bg-card flex-shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 items-end"
                  >
                    <Input
                      placeholder="Type a message"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={2000}
                      className="flex-1 rounded-full bg-muted/40 border-0 focus-visible:ring-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sending || !draft.trim()}
                      aria-label="Send"
                      className="rounded-full"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
